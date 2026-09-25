import React, { useState, useEffect, useCallback, useId, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  BarChart3,
  Megaphone,
  X,
  RotateCcw,
  Check,
  Sliders,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  getStoredConsent,
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
  // 1. Stored consent state
  const [consent, setConsent] = useState<ConsentRecord | null>(() => getStoredConsent());

  // 2. UI Display States
  const [isInitialBannerVisible, setIsInitialBannerVisible] = useState<boolean>(false);
  const [isAcceptedInfoBannerOpen, setIsAcceptedInfoBannerOpen] = useState<boolean>(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<boolean>(false);

  // 3. Dynamic Viewport & Footer Detection States
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);
  const [isFooterVisible, setIsFooterVisible] = useState<boolean>(false);

  // 4. Granular Category Toggles for Full Preferences Modal
  const [customCategories, setCustomCategories] = useState<CookieCategories>(() => {
    const stored = getStoredConsent();
    return stored ? stored.categories : { ...DEFAULT_CATEGORIES };
  });

  const headingId = useId();
  const descId = useId();
  const preferencesTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Route awareness (hide on print view)
  const isPrintView = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('print').matches;

  // Initialize consent state on component mount
  useEffect(() => {
    const stored = getStoredConsent();
    setConsent(stored);

    if (stored) {
      setCustomCategories(stored.categories);
      setIsInitialBannerVisible(false);
      setIsAcceptedInfoBannerOpen(false);
    } else {
      // Undecided / First visit
      const collapsed = isBannerTemporarilyCollapsed();
      if (!collapsed) {
        const timer = setTimeout(() => {
          setIsInitialBannerVisible(true);
        }, 500);
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
        setIsInitialBannerVisible(false);
      }
    });

    const handleOpenRequest = () => {
      const current = getStoredConsent();
      if (current) {
        setCustomCategories(current.categories);
      }
      setIsPreferencesOpen(true);
      setIsInitialBannerVisible(false);
      setIsAcceptedInfoBannerOpen(false);
    };

    window.addEventListener('zenemoo_open_consent_preferences', handleOpenRequest);

    return () => {
      cleanup();
      window.removeEventListener('zenemoo_open_consent_preferences', handleOpenRequest);
    };
  }, []);

  // Mobile On-Screen Keyboard Detection via Visual Viewport API
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const heightDiff = window.innerHeight - vv.height;
      setIsKeyboardOpen(heightDiff > 140);
    };

    const vv = window.visualViewport;
    vv.addEventListener('resize', handleViewportChange);
    vv.addEventListener('scroll', handleViewportChange);

    return () => {
      vv.removeEventListener('resize', handleViewportChange);
      vv.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  // Footer Visibility Detection via IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const footerEl = document.getElementById('zenemoo-footer') || document.querySelector('footer');
    if (!footerEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.05,
      }
    );

    observer.observe(footerEl);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Keyboard shortcut: Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showWithdrawConfirm) {
          setShowWithdrawConfirm(false);
        } else if (isPreferencesOpen) {
          setIsPreferencesOpen(false);
          preferencesTriggerRef.current?.focus();
        } else if (isAcceptedInfoBannerOpen) {
          setIsAcceptedInfoBannerOpen(false);
          preferencesTriggerRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreferencesOpen, isAcceptedInfoBannerOpen, showWithdrawConfirm]);

  // Handle Accept All
  const handleAcceptAll = useCallback(() => {
    const record = saveConsent('accept_all');
    setConsent(record);
    setCustomCategories({ ...ACCEPTED_ALL_CATEGORIES });
    setIsInitialBannerVisible(false);
    setIsAcceptedInfoBannerOpen(false);
    setIsPreferencesOpen(false);
    setShowWithdrawConfirm(false);
  }, []);

  // Handle Reject All
  const handleRejectAll = useCallback(() => {
    const record = saveConsent('reject_all');
    setConsent(record);
    setCustomCategories({ ...REJECTED_ALL_CATEGORIES });
    setIsInitialBannerVisible(false);
    setIsAcceptedInfoBannerOpen(false);
    setIsPreferencesOpen(false);
    setShowWithdrawConfirm(false);
  }, []);

  // Handle Save Custom Preferences
  const handleSaveCustom = useCallback(() => {
    const record = saveConsent('custom', customCategories);
    setConsent(record);
    setIsInitialBannerVisible(false);
    setIsAcceptedInfoBannerOpen(false);
    setIsPreferencesOpen(false);
    setShowWithdrawConfirm(false);
  }, [customCategories]);

  // Handle Temporary Collapse (User clicks 'X' on initial banner)
  // Closes initial banner and keeps user in UNDECIDED state without opening full preferences
  const handleCollapseInitialBanner = useCallback(() => {
    setBannerTemporarilyCollapsed(true);
    setIsInitialBannerVisible(false);
    setIsPreferencesOpen(false);
  }, []);

  // Handle Explicit Open of Full Preferences Modal
  const handleOpenPreferences = useCallback(() => {
    const current = getStoredConsent();
    if (current) {
      setCustomCategories(current.categories);
    }
    setIsPreferencesOpen(true);
    setIsInitialBannerVisible(false);
    setIsAcceptedInfoBannerOpen(false);
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

  // Determine if floating trigger / banners should be hidden (when footer is visible or mobile keyboard is active)
  const shouldHideFloatingTrigger = isFooterVisible || isKeyboardOpen;

  const isAccepted = consent?.status === 'accepted' || consent?.status === 'custom';

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. INITIAL COMPACT BANNER (STATE 1: UNDECIDED / FIRST VISIT ONLY)         */}
      {/* ========================================================================= */}
      {isInitialBannerVisible && !consent && !isKeyboardOpen && (
        <aside
          role="region"
          aria-labelledby={headingId}
          aria-describedby={descId}
          className="fixed z-50 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:right-auto md:bottom-6 md:left-6 max-w-[calc(100vw-24px)] sm:max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-300 font-sans select-none"
        >
          <div className="relative rounded-2xl sm:rounded-3xl bg-[#080c16]/95 backdrop-blur-2xl border border-cyan-500/30 p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-white overflow-hidden group">
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400" />

            {/* Collapse Button (Closes banner without choosing; leaves floating 'Consent Preferences' trigger) */}
            <button
              onClick={handleCollapseInitialBanner}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              title="Close banner"
              aria-label="Close cookie consent banner without choosing"
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

            {/* Action Buttons: [ Accept ] [ Reject All ] [ Preferences ] */}
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
      {/* 2. FLOATING TRIGGERS (WHEN INITIAL BANNER IS NOT VISIBLE)                 */}
      {/* ========================================================================= */}
      {!isInitialBannerVisible && !isAcceptedInfoBannerOpen && !isPreferencesOpen && !shouldHideFloatingTrigger && (
        <div className="fixed z-40 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 md:bottom-6 md:left-6 transition-all duration-300 animate-in fade-in select-none">
          {isAccepted ? (
            /* 2A. ACCEPTED STATE: ONLY [ ✓ Consent Active ] PILL */
            <button
              ref={preferencesTriggerRef}
              onClick={() => setIsAcceptedInfoBannerOpen(true)}
              aria-label="View active cookie consent details"
              className="group flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#080c16]/90 hover:bg-[#0c1222] border border-emerald-500/40 hover:border-emerald-400 backdrop-blur-xl shadow-xl shadow-black/70 text-slate-200 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              title="Cookie consent is active. Click to view details or manage."
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-[11px] sm:text-xs font-mono font-medium tracking-wide text-emerald-300 group-hover:text-emerald-200">
                Consent Active
              </span>
            </button>
          ) : (
            /* 2B. COLLAPSED UNDECIDED OR REJECTED STATE: [ Consent Preferences ] PILL */
            <button
              ref={preferencesTriggerRef}
              onClick={handleOpenPreferences}
              aria-label="Open cookie and privacy consent preferences"
              className="group flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#080c16]/90 hover:bg-[#0c1222] border border-cyan-500/30 hover:border-cyan-400/60 backdrop-blur-xl shadow-xl shadow-cyan-950/40 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              title="Click to open full cookie preferences"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform shrink-0" />
              <span className="text-[11px] sm:text-xs font-mono font-medium tracking-wide">
                Consent Preferences
              </span>
              {consent?.status === 'rejected' && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-slate-400"
                  title="Status: Strict Necessary Only (Rejected)"
                />
              )}
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SMALL ACCEPTED INFORMATION BANNER (SHOWN ONLY ON CLICKING CONSENT ACTIVE) */}
      {/* ========================================================================= */}
      {isAccepted && isAcceptedInfoBannerOpen && !isPreferencesOpen && !shouldHideFloatingTrigger && (
        <aside
          role="region"
          aria-label="Active Cookie Consent Information"
          className="fixed z-50 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:right-auto md:bottom-6 md:left-6 max-w-[calc(100vw-24px)] sm:max-w-sm w-full animate-in fade-in slide-in-from-bottom-3 duration-200 font-sans select-none"
        >
          <div className="relative rounded-2xl sm:rounded-3xl bg-[#080c16]/95 backdrop-blur-2xl border border-emerald-500/40 p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-white overflow-hidden group">
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

            {/* Close Button: Returns to only [ Consent Active ] pill */}
            <button
              onClick={() => setIsAcceptedInfoBannerOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              title="Close information banner"
              aria-label="Close information banner"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3 pr-6">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-display font-bold text-xs sm:text-sm text-white leading-snug flex items-center gap-1.5">
                  <span>Consent is active</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-sans">
                  Your selected cookie preferences are currently enabled on Zenemoo.
                </p>
              </div>
            </div>

            {/* Actions: [ Withdraw Consent ] [ Preferences ] */}
            <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                onClick={handleConfirmWithdraw}
                className="px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-mono text-amber-400 hover:text-amber-300 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 focus:outline-none focus:ring-1 focus:ring-amber-400"
                title="Revoke cookie consent and return to undecided state"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Withdraw Consent</span>
              </button>

              <button
                onClick={() => {
                  setIsAcceptedInfoBannerOpen(false);
                  handleOpenPreferences();
                }}
                className="px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-mono font-bold text-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                title="Open full cookie preferences panel"
              >
                <Sliders className="w-3 h-3" />
                <span>Preferences</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* 4. FULL PREFERENCES MODAL (OPENS ONLY ON EXPLICIT 'PREFERENCES' CLICK)    */}
      {/* ========================================================================= */}
      {isPreferencesOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 font-sans"
        >
          <div
            className="relative rounded-3xl bg-[#080d1a] border border-cyan-500/30 max-w-xl w-full flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-slate-200 overflow-hidden"
            style={{ maxHeight: 'min(90dvh, calc(100svh - 2rem))' }}
          >
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400 z-10" />

            {/* 4A. FIXED HEADER (DOES NOT SCROLL AWAY) */}
            <div className="flex items-start justify-between gap-4 p-4 sm:p-6 border-b border-white/10 bg-[#080d1a]/95 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="consent-modal-title" className="text-base sm:text-lg font-bold font-display text-white leading-snug">
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

            {/* 4B. SCROLLABLE CONTENT BODY (ONLY THIS SECTION SCROLLS) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
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

              {/* Privacy Links & Withdraw Consent Option */}
              <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <a
                    href="/privacy"
                    onClick={handlePrivacyClick}
                    className="text-cyan-400 hover:underline inline-flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    Privacy Policy <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-slate-600">&bull;</span>
                  <a
                    href="/terms"
                    onClick={handleTermsClick}
                    className="text-slate-300 hover:underline inline-flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-cyan-400"
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
                        className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400"
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
            </div>

            {/* 4C. FIXED BOTTOM ACTION BAR (DOES NOT SCROLL AWAY) */}
            <div className="p-3.5 sm:p-5 border-t border-white/10 bg-[#080d1a]/95 backdrop-blur-md shrink-0 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2">
              <button
                onClick={handleRejectAll}
                className="flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer text-center whitespace-nowrap active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Reject All Optional
              </button>

              <button
                onClick={handleSaveCustom}
                className="flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-mono font-bold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 transition-all cursor-pointer text-center whitespace-nowrap active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                Save Preferences
              </button>

              <button
                onClick={handleAcceptAll}
                className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs font-mono font-bold text-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400"
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

