import React, { useState, useEffect, useCallback, useId } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  BarChart3,
  Megaphone,
  X,
  ChevronRight,
  RotateCcw,
  Check,
  Sliders,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  getStoredConsent,
  hasUserDecidedConsent,
  isBannerTemporarilyCollapsed,
  setBannerTemporarilyCollapsed,
  saveConsent,
  withdrawConsent,
  onConsentChange,
  ConsentRecord,
  CookieCategories,
  DEFAULT_CATEGORIES,
  ACCEPTED_ALL_CATEGORIES,
  REJECTED_ALL_CATEGORIES,
} from '../services/cookieConsentService';

interface ZenemooCookieConsentProps {
  onNavigatePrivacy?: () => void;
  onNavigateTerms?: () => void;
}

export const ZenemooCookieConsent: React.FC<ZenemooCookieConsentProps> = ({
  onNavigatePrivacy,
  onNavigateTerms,
}) => {
  // Stored consent state
  const [consent, setConsent] = useState<ConsentRecord | null>(() => getStoredConsent());
  
  // UI Display States
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<boolean>(false);

  // Granular Category Toggles for Preferences Modal
  const [customCategories, setCustomCategories] = useState<CookieCategories>(() => {
    const stored = getStoredConsent();
    return stored ? stored.categories : { ...DEFAULT_CATEGORIES };
  });

  const headingId = useId();
  const descId = useId();

  // Route awareness (hide full banner on embedded print or specific standalone views if needed)
  const isPrintView = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('print').matches;

  // Initialize consent UI on component mount
  useEffect(() => {
    const stored = getStoredConsent();
    setConsent(stored);

    if (stored) {
      setCustomCategories(stored.categories);
      setIsBannerVisible(false);
    } else {
      // No consent yet recorded
      const collapsed = isBannerTemporarilyCollapsed();
      if (!collapsed) {
        // Show expanded banner with a gentle 600ms entrance delay
        const timer = setTimeout(() => {
          setIsBannerVisible(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Listen for consent updates across tabs/windows and direct open requests
  useEffect(() => {
    const cleanup = onConsentChange((record) => {
      setConsent(record);
      setCustomCategories(record.categories);
      if (record.status !== 'undecided') {
        setIsBannerVisible(false);
      }
    });

    const handleOpenRequest = () => {
      const current = getStoredConsent();
      if (current) {
        setCustomCategories(current.categories);
      }
      setIsPreferencesOpen(true);
      setIsBannerVisible(false);
    };

    window.addEventListener('zenemoo_open_consent_preferences', handleOpenRequest);

    return () => {
      cleanup();
      window.removeEventListener('zenemoo_open_consent_preferences', handleOpenRequest);
    };
  }, []);

  // Keyboard shortcut: close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showWithdrawConfirm) {
          setShowWithdrawConfirm(false);
        } else if (isPreferencesOpen) {
          setIsPreferencesOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreferencesOpen, showWithdrawConfirm]);

  // Handle Accept All
  const handleAcceptAll = useCallback(() => {
    const record = saveConsent('accept_all');
    setConsent(record);
    setCustomCategories({ ...ACCEPTED_ALL_CATEGORIES });
    setIsBannerVisible(false);
    setIsPreferencesOpen(false);
    setShowWithdrawConfirm(false);
  }, []);

  // Handle Reject All
  const handleRejectAll = useCallback(() => {
    const record = saveConsent('reject_all');
    setConsent(record);
    setCustomCategories({ ...REJECTED_ALL_CATEGORIES });
    setIsBannerVisible(false);
    setIsPreferencesOpen(false);
    setShowWithdrawConfirm(false);
  }, []);

  // Handle Save Custom Preferences
  const handleSaveCustom = useCallback(() => {
    const record = saveConsent('custom', customCategories);
    setConsent(record);
    setIsBannerVisible(false);
    setIsPreferencesOpen(false);
    setShowWithdrawConfirm(false);
  }, [customCategories]);

  // Handle Temporary Collapse (User clicks 'X' without deciding)
  const handleCollapseBanner = useCallback(() => {
    setBannerTemporarilyCollapsed(true);
    setIsBannerVisible(false);
  }, []);

  // Handle Open Preferences Modal
  const handleOpenPreferences = useCallback(() => {
    const current = getStoredConsent();
    if (current) {
      setCustomCategories(current.categories);
    }
    setIsPreferencesOpen(true);
    setIsBannerVisible(false);
  }, []);

  // Handle Open Privacy Policy
  const handlePrivacyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigatePrivacy) {
      onNavigatePrivacy();
    } else {
      window.history.pushState(null, '', '/privacy');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    setIsPreferencesOpen(false);
  };

  // Handle Open Terms
  const handleTermsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateTerms) {
      onNavigateTerms();
    } else {
      window.history.pushState(null, '', '/terms');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    setIsPreferencesOpen(false);
  };

  // Handle Withdraw Consent Action
  const handleConfirmWithdraw = useCallback(() => {
    withdrawConsent();
  }, []);

  if (isPrintView) return null;

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. EXPANDED INITIAL CONSENT PANEL (BOTTOM-LEFT ON DESKTOP, RESPONSIVE)    */}
      {/* ========================================================================= */}
      {isBannerVisible && !consent && (
        <aside
          role="region"
          aria-labelledby={headingId}
          aria-describedby={descId}
          className="fixed z-50 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:right-auto md:bottom-6 md:left-6 max-w-[calc(100vw-24px)] sm:max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300 font-sans"
        >
          <div className="relative rounded-2xl sm:rounded-3xl bg-[#080c16]/95 backdrop-blur-2xl border border-cyan-500/30 p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-white overflow-hidden group">
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400" />

            {/* Collapse / Close Button (Does NOT imply accept/reject) */}
            <button
              onClick={handleCollapseBanner}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              title="Minimize consent banner"
              aria-label="Minimize cookie consent banner without choosing"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Header Content */}
            <div className="flex items-start gap-3 sm:gap-3.5 pr-6">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 shrink-0 text-cyan-400 shadow-inner mt-0.5">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 id={headingId} className="font-display font-bold text-xs sm:text-sm text-white leading-snug">
                    Privacy &amp; Cookie Preferences
                  </h2>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 uppercase tracking-wide">
                    DPDP 2023
                  </span>
                </div>

                <p id={descId} className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-sans">
                  Zenemoo uses essential cookies for secure sessions, Cloudflare Turnstile anti-bot checks, and basic functionality. We also use optional analytics to improve our AI data tools.{' '}
                  <a
                    href="/privacy"
                    onClick={handlePrivacyClick}
                    className="text-cyan-400 hover:underline font-semibold inline-flex items-center gap-0.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    Privacy Policy <ExternalLink className="w-2.5 h-2.5 inline-block" />
                  </a>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3.5 sm:mt-4 pt-3 border-t border-white/10 flex flex-wrap sm:flex-nowrap items-center gap-2">
              <button
                onClick={handleAcceptAll}
                className="flex-1 min-w-[90px] px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-mono font-bold text-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept</span>
              </button>

              <button
                onClick={handleRejectAll}
                className="flex-1 min-w-[90px] px-3 py-2 rounded-xl text-[11px] sm:text-xs font-mono text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer text-center whitespace-nowrap active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <span>Reject All</span>
              </button>

              <button
                onClick={handleOpenPreferences}
                className="w-full sm:w-auto px-3 py-2 rounded-xl text-[11px] sm:text-xs font-mono text-cyan-300 hover:text-cyan-200 bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/30 transition-all cursor-pointer text-center flex items-center justify-center gap-1 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                title="Configure individual cookie categories"
              >
                <Sliders className="w-3 h-3 text-cyan-400" />
                <span>Preferences</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPACT "CONSENT PREFERENCES" FLOATING BADGE (BOTTOM-LEFT)            */}
      {/* ========================================================================= */}
      {(!isBannerVisible || consent) && (
        <div className="fixed z-40 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 md:bottom-6 md:left-6">
          <button
            onClick={handleOpenPreferences}
            aria-label="Open cookie and privacy consent preferences"
            className="group flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl bg-[#080c16]/90 hover:bg-[#0c1222] border border-cyan-500/30 hover:border-cyan-400/60 backdrop-blur-xl shadow-xl shadow-cyan-950/40 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono font-medium tracking-wide">
              Consent Preferences
            </span>
            {consent && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  consent.status === 'accepted'
                    ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                    : consent.status === 'rejected'
                    ? 'bg-slate-400'
                    : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                }`}
                title={`Consent Status: ${consent.status}`}
              />
            )}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DETAILED CONSENT PREFERENCES & WITHDRAWAL MODAL                        */}
      {/* ========================================================================= */}
      {isPreferencesOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto font-sans"
        >
          <div className="relative rounded-3xl bg-[#080d1a] border border-cyan-500/30 max-w-xl w-full my-auto p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-slate-200 space-y-5 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="consent-modal-title" className="text-base sm:text-lg font-bold font-display text-white">
                    Privacy &amp; Cookie Preferences
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Zenemoo Data Solutions &bull; India DPDP Act &amp; GDPR Compliant
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPreferencesOpen(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
                aria-label="Close preferences modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Status Overview Banner */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-slate-300">
                  Current Status:{' '}
                  <strong className="text-white uppercase">
                    {consent ? consent.status : 'Undecided / Unset'}
                  </strong>
                </span>
              </div>
              {consent?.timestamp && (
                <span className="text-[10px] text-slate-500 hidden sm:inline-block">
                  Updated: {new Date(consent.timestamp).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Category Cards List */}
            <div className="space-y-3 text-xs font-sans">
              {/* Category 1: Strictly Necessary */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Strictly Necessary Cookies</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                    Always Active
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Required for core platform security, encrypted JWT authentication, Cloudflare Turnstile anti-bot verification on forms, and saving your consent preferences. These cannot be disabled.
                </p>
              </div>

              {/* Category 2: Performance & Analytics */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Analytics &amp; Performance</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customCategories.analytics}
                      onChange={(e) =>
                        setCustomCategories((prev) => ({ ...prev, analytics: e.target.checked }))
                      }
                      className="sr-only peer"
                      aria-label="Toggle analytics cookies"
                    />
                    <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500" />
                  </label>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Allows us to count visits and traffic sources to measure and improve platform responsiveness and dataset exploration speed. No personal identifying information is sold.
                </p>
              </div>

              {/* Category 3: Marketing & Outreach */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Megaphone className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Marketing &amp; Announcements</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customCategories.marketing}
                      onChange={(e) =>
                        setCustomCategories((prev) => ({ ...prev, marketing: e.target.checked }))
                      }
                      className="sr-only peer"
                      aria-label="Toggle marketing cookies"
                    />
                    <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500" />
                  </label>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Used to evaluate campaign efficiency when discovering our talent registration opportunities and newsletter dispatches.
                </p>
              </div>
            </div>

            {/* Privacy Links */}
            <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-3">
                <a
                  href="/privacy"
                  onClick={handlePrivacyClick}
                  className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  Privacy Policy <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span className="text-slate-600">&bull;</span>
                <a
                  href="/terms"
                  onClick={handleTermsClick}
                  className="text-slate-300 hover:underline inline-flex items-center gap-1"
                >
                  Terms &amp; Conditions <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* Withdraw Consent Button */}
              {consent && consent.status !== 'undecided' && (
                <div>
                  {!showWithdrawConfirm ? (
                    <button
                      onClick={() => setShowWithdrawConfirm(true)}
                      className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      title="Revoke optional consent and reset preferences"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Withdraw consent</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 animate-in fade-in duration-150">
                      <span className="text-amber-300 text-[10px]">Reset &amp; Reload?</span>
                      <button
                        onClick={handleConfirmWithdraw}
                        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer"
                      >
                        Yes, Withdraw
                      </button>
                      <button
                        onClick={() => setShowWithdrawConfirm(false)}
                        className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Footer Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 pt-2">
              <button
                onClick={handleRejectAll}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer text-center whitespace-nowrap active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Reject All Optional
              </button>

              <button
                onClick={handleSaveCustom}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 transition-all cursor-pointer text-center whitespace-nowrap active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                Save Preferences
              </button>

              <button
                onClick={handleAcceptAll}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ZenemooCookieConsent;
