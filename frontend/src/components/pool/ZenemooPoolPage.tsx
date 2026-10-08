import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  User,
  Mail,
  Briefcase,
  Users,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Info,
  Clock,
  HelpCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { poolApi, PoolItem, PoolOptionItem } from '../../services/poolApi';
import { SeoImage } from '../../seo/components/SeoImage';

interface LocalPoolProfile {
  email: string;
  name: string;
  participantType: string;
}

const STORAGE_KEY = 'zenemoo_pool_profile';

const PARTICIPANT_TYPES = [
  { id: 'Individual', label: 'Individual Contributor', desc: 'Working independently on freelance / project tasks' },
  { id: 'Vendor / Agency', label: 'Vendor / Agency', desc: 'Managing an agency team or delivering bulk deliverables' },
  { id: 'Team Leader', label: 'Team Leader', desc: 'Leading a group of linguistic or annotation specialists' },
  { id: 'Other', label: 'Other', desc: 'Institution, student, or other participant' },
];

interface ZenemooPoolPageProps {
  initialPublicId?: string | null;
  onNavigateHome?: () => void;
  onBack?: () => void;
  onNavigateTalentRegistration?: () => void;
  onNavigateHistory?: () => void;
}

export const ZenemooPoolPage: React.FC<ZenemooPoolPageProps> = ({
  initialPublicId,
  onNavigateHome,
  onBack,
  onNavigateTalentRegistration,
  onNavigateHistory,
}) => {
  const handleGoHome = onNavigateHome || onBack;
  const [profile, setProfile] = useState<LocalPoolProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [tempEmail, setTempEmail] = useState(profile?.email || '');
  const [tempType, setTempType] = useState(profile?.participantType || 'Individual');
  const [tempName, setTempName] = useState(profile?.name || '');
  const [onboardingError, setOnboardingError] = useState('');

  // Pools state
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [directPool, setDirectPool] = useState<PoolItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Interaction state
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string[]>>({});
  const [customTextMap, setCustomTextMap] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMap, setSubmitSuccessMap] = useState<Record<string, { message: string; updated?: boolean }>>({});
  const [submitErrorMap, setSubmitErrorMap] = useState<Record<string, string>>({});

  // Filter state for desktop overview
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Load pools
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    const fetchData = async () => {
      try {
        if (initialPublicId) {
          const res = await poolApi.getPoolByPublicId(initialPublicId);
          if (isMounted) {
            if (res.success && res.pool) {
              setDirectPool(res.pool);
              setPools([res.pool]);
            } else {
              setLoadError('Pool not found or has been closed.');
            }
          }
        } else {
          const res = await poolApi.getActivePools();
          if (isMounted) {
            if (res.success && res.pools) {
              setPools(res.pools);
            } else {
              setPools([]);
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setLoadError(err?.response?.data?.message || 'Failed to load talent pools. Please check your connection.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [initialPublicId]);

  // Handle Onboarding Completion
  const handleCompleteOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError('');

    if (onboardingStep === 1) {
      const emailNorm = tempEmail.trim().toLowerCase();
      if (!emailNorm || !emailNorm.includes('@')) {
        setOnboardingError('Please enter a valid email address.');
        return;
      }
      setOnboardingStep(2);
      return;
    }

    if (onboardingStep === 2) {
      if (!tempType) {
        setOnboardingError('Please select your participant category.');
        return;
      }
      setOnboardingStep(3);
      return;
    }

    if (onboardingStep === 3) {
      const nameClean = tempName.trim();
      if (!nameClean) {
        setOnboardingError('Please enter your full name.');
        return;
      }

      const newProfile: LocalPoolProfile = {
        email: tempEmail.trim().toLowerCase(),
        name: nameClean,
        participantType: tempType,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      } catch (_) {}

      setProfile(newProfile);
      setIsEditingProfile(false);
    }
  };

  // Toggle option selection
  const handleOptionToggle = (pool: PoolItem, optionId: string) => {
    const currentList = selectedOptionsMap[pool.id] || [];

    if (!pool.allow_multiple) {
      // Single choice
      setSelectedOptionsMap((prev) => ({
        ...prev,
        [pool.id]: [optionId],
      }));
    } else {
      // Multiple choice
      const exists = currentList.includes(optionId);
      const updated = exists ? currentList.filter((id) => id !== optionId) : [...currentList, optionId];
      setSelectedOptionsMap((prev) => ({
        ...prev,
        [pool.id]: updated,
      }));
    }

    // Clear previous submit errors for this pool
    if (submitErrorMap[pool.id]) {
      setSubmitErrorMap((prev) => {
        const copy = { ...prev };
        delete copy[pool.id];
        return copy;
      });
    }
  };

  // Submit response
  const handleSubmitPool = async (pool: PoolItem) => {
    if (!profile) {
      setIsEditingProfile(true);
      return;
    }

    const selectedIds = selectedOptionsMap[pool.id] || [];
    if (selectedIds.length === 0) {
      setSubmitErrorMap((prev) => ({
        ...prev,
        [pool.id]: 'Please select at least one option before submitting.',
      }));
      return;
    }

    setIsSubmitting(true);
    setSubmitErrorMap((prev) => {
      const copy = { ...prev };
      delete copy[pool.id];
      return copy;
    });

    try {
      const res = await poolApi.submitPublicResponse({
        publicId: pool.public_id,
        email: profile.email,
        name: profile.name,
        participantType: profile.participantType,
        selectedOptionIds: selectedIds,
        customText: customTextMap[pool.id] || '',
      });

      if (res.success) {
        setSubmitSuccessMap((prev) => ({
          ...prev,
          [pool.id]: {
            message: res.message || 'Interest submitted successfully!',
            updated: res.updated,
          },
        }));

        // Optimistically increment pool response count
        setPools((prevList) =>
          prevList.map((p) =>
            p.id === pool.id
              ? {
                  ...p,
                  total_responses_count: (p.total_responses_count || 0) + (res.updated ? 0 : 1),
                }
              : p
          )
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit your response. Please try again.';
      setSubmitErrorMap((prev) => ({
        ...prev,
        [pool.id]: msg,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate WhatsApp Share URL
  const getWhatsAppShareUrl = (pool: PoolItem) => {
    const poolUrl = `https://www.zenemoo.in/pool/${pool.public_id}`;
    const text =
      `*Zenemoo Talent Interest Poll*\n\n` +
      `"${pool.title}"\n\n` +
      `Let Zenemoo know what type of work or projects you are interested in:\n\n` +
      `👉 Take the 30-second poll here:\n${poolUrl}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const handleCopyPoolLink = (pool: PoolItem) => {
    const url = `https://www.zenemoo.in/pool/${pool.public_id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Filter pools for Desktop view
  const categories = ['All', ...Array.from(new Set(pools.map((p) => p.category || 'General')))];
  const filteredPools = pools.filter((p) => {
    if (selectedCategory !== 'All' && (p.category || 'General') !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeMobilePool = filteredPools[currentMobileIndex] || null;

  // Render Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06070e] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-purple-600/20 border border-cyan-500/30 flex items-center justify-center animate-pulse shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-7 h-7 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white tracking-wide">Loading Zenemoo Pools...</h3>
            <p className="text-xs text-slate-400 mt-1">Connecting to live talent interest queues</p>
          </div>
        </div>
      </div>
    );
  }

  // Render Error State
  if (loadError || pools.length === 0) {
    return (
      <div className="min-h-screen bg-[#06070e] text-slate-100 flex flex-col justify-between p-4 sm:p-8">
        <header className="flex items-center justify-between max-w-4xl mx-auto w-full pt-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateHome}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20">
              Z
            </div>
            <span className="font-bold text-lg tracking-wider text-white">ZENEMOO</span>
          </div>
          {onNavigateHistory && (
            <button
              onClick={onNavigateHistory}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-cyan-500/30 bg-white/5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>My History</span>
            </button>
          )}
        </header>

        <div className="max-w-md mx-auto w-full text-center py-16 px-6 rounded-2xl border border-white/10 bg-[#0d0f1d]/80 backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center mx-auto mb-5 text-slate-400">
            <HelpCircle className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{loadError ? 'Pool Notice' : 'No Active Pools Right Now'}</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            {loadError || 'Zenemoo does not have any open talent polls at this moment. New project polls are posted frequently.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-semibold text-xs hover:bg-cyan-400 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Pools</span>
            </button>
            {onNavigateTalentRegistration && (
              <button
                onClick={onNavigateTalentRegistration}
                className="px-5 py-2.5 rounded-xl border border-white/15 hover:border-cyan-500/40 text-slate-300 hover:text-white text-xs transition-all flex items-center justify-center gap-2 bg-white/5"
              >
                <span>Register Full Profile</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <footer className="text-center text-xs text-slate-600 pb-4">
          © {new Date().getFullYear()} Zenemoo Data Solutions. Fast talent & project matching.
        </footer>
      </div>
    );
  }

  // Render First-Time Onboarding Modal / Wizard
  const renderOnboardingModal = () => (
    <AnimatePresence>
      {(!profile || isEditingProfile) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-md bg-[#0d0f1f] border border-cyan-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 relative"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">Welcome to Zenemoo Pools</h3>
                <p className="text-xs text-slate-400">Quick 3-step profile to participate</p>
              </div>
            </div>

            {/* Step Progress Pill */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    onboardingStep >= step ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            <form onSubmit={handleCompleteOnboarding} className="space-y-5">
              {/* Step 1: Email */}
              {onboardingStep === 1 && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    Step 1 of 3: Your Email Address
                  </label>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Zenemoo will contact you at this email address if a paid project matching your selected interest becomes available.
                  </p>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="e.g. name@example.com"
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Participant Type */}
              {onboardingStep === 2 && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    Step 2 of 3: Participant Type
                  </label>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tell us in what capacity you plan to work or contribute:
                  </p>
                  <div className="space-y-2">
                    {PARTICIPANT_TYPES.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setTempType(t.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          tempType === t.id
                            ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                            : 'bg-slate-900/60 border-white/10 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                            tempType === t.id ? 'border-cyan-400 bg-cyan-400' : 'border-slate-500'
                          }`}
                        >
                          {tempType === t.id && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-100">{t.label}</p>
                          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{t.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Name */}
              {onboardingStep === 3 && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    Step 3 of 3: Your Full Name
                  </label>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    So our project managers can address you respectfully in matching opportunity communications.
                  </p>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Prem Kumar / Alpha Solutions"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>
                </div>
              )}

              {onboardingError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
                  {onboardingError}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                {onboardingStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setOnboardingStep((prev) => (prev - 1) as any)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Back
                  </button>
                ) : profile && isEditingProfile ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wide transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2"
                >
                  <span>{onboardingStep === 3 ? 'Continue to Pools' : 'Next Step'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render a Single Pool Card Item
  const renderPoolCard = (pool: PoolItem, isMobileCard: boolean = false) => {
    const selectedIds = selectedOptionsMap[pool.id] || [];
    const customText = customTextMap[pool.id] || '';
    const successState = submitSuccessMap[pool.id];
    const errorState = submitErrorMap[pool.id];
    const isOtherSelected = pool.options.some((o) => o.option_text.toLowerCase().includes('other') && selectedIds.includes(o.id));

    return (
      <motion.div
        key={pool.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
          successState
            ? 'bg-[#0a1820]/90 border-emerald-500/40 shadow-xl shadow-emerald-500/10'
            : 'bg-[#0d1022]/90 border-white/10 hover:border-cyan-500/30 shadow-xl shadow-black/40'
        } ${isMobileCard ? 'p-5 sm:p-6 w-full min-h-[460px]' : 'p-6'}`}
      >
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {pool.category || 'General'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">#{pool.public_id}</span>
            </div>

            {pool.total_responses_count > 0 && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" />
                <span>
                  {pool.total_responses_count >= 1000
                    ? `${(pool.total_responses_count / 1000).toFixed(1)}K`
                    : pool.total_responses_count}{' '}
                  interested
                </span>
              </span>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white leading-snug mb-2">{pool.title}</h3>
          {pool.description && (
            <p className="text-xs text-slate-400 leading-relaxed mb-4">{pool.description}</p>
          )}

          <div className="mb-2">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
              <Info className="w-3 h-3 text-cyan-400" />
              <span>{pool.allow_multiple ? 'Multiple selections allowed' : 'Single choice selection'}</span>
            </span>
          </div>

          {/* Options List */}
          {successState ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Interest Submitted!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Thank you, <span className="text-cyan-300 font-semibold">{profile?.name}</span>. Zenemoo may contact you via email if this work becomes active.
                </p>
              </div>

              {/* Share actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                <a
                  href={getWhatsAppShareUrl(pool)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#25D366] text-black font-bold text-xs hover:bg-[#20bd5a] transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopyPoolLink(pool)}
                  className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:border-cyan-500/30 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 mt-4">
              {pool.options.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleOptionToggle(pool, opt.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-white/10 text-slate-300 hover:border-white/25 hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-${pool.allow_multiple ? 'md' : 'full'} border flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-500 group-hover:border-slate-400'
                        }`}
                      >
                        {isSelected && (
                          pool.allow_multiple ? <Check className="w-3 h-3 text-black stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-black" />
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-medium tracking-wide">{opt.option_text}</span>
                    </div>

                    {opt.response_count !== undefined && opt.response_count > 0 && (
                      <span className="text-[10px] text-slate-500 font-mono ml-2">
                        {opt.response_count}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Other Custom Field */}
              {isOtherSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-2"
                >
                  <input
                    type="text"
                    placeholder="Specify other details (optional)..."
                    value={customText}
                    onChange={(e) =>
                      setCustomTextMap((prev) => ({
                        ...prev,
                        [pool.id]: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                  />
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Submission Action */}
        {!successState && (
          <div className="pt-5 mt-4 border-t border-white/10">
            {errorState && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg mb-3">
                {errorState}
              </p>
            )}

            <button
              type="button"
              disabled={isSubmitting || selectedIds.length === 0}
              onClick={() => handleSubmitPool(pool)}
              className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
                selectedIds.length > 0 && !isSubmitting
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/25 cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-800/80 text-slate-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Interest...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Interest</span>
                </>
              )}
            </button>

            <p className="text-[10px] text-slate-500 text-center mt-2 leading-tight">
              By submitting, you agree that Zenemoo may contact you regarding matching opportunities.
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#05060f] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Onboarding Dialog */}
      {renderOnboardingModal()}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#070814]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-xl shadow-black/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateHome}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20">
              Z
            </div>
            <div>
              <span className="font-bold text-base tracking-wider text-white">ZENEMOO</span>
              <span className="text-[10px] text-cyan-400 font-mono block -mt-1 tracking-widest uppercase">
                Talent Pools
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-medium">{profile.name}</span>
                <span className="text-slate-500 font-mono text-[11px]">({profile.email})</span>
                <button
                  onClick={() => {
                    setTempEmail(profile.email);
                    setTempType(profile.participantType);
                    setTempName(profile.name);
                    setOnboardingStep(1);
                    setIsEditingProfile(true);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 underline text-[11px] ml-1"
                >
                  Edit
                </button>
              </div>
            )}

            {onNavigateHistory && (
              <button
                onClick={onNavigateHistory}
                className="px-3 py-1.5 rounded-xl border border-white/10 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-white bg-white/5 transition-all flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">My History</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-10 flex-1">
        {/* Returning Profile Mobile Ribbon */}
        {profile && (
          <div className="sm:hidden mb-4 p-3 rounded-xl border border-white/10 bg-[#0d1024] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-200 font-medium truncate max-w-[190px]">
                {profile.name} • {profile.participantType}
              </span>
            </div>
            <button
              onClick={() => {
                setTempEmail(profile.email);
                setTempType(profile.participantType);
                setTempName(profile.name);
                setOnboardingStep(1);
                setIsEditingProfile(true);
              }}
              className="text-cyan-400 font-semibold"
            >
              Change
            </button>
          </div>
        )}

        {/* Hero Welcome Banner */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 text-cyan-300 mb-3 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Instant Talent Interest Matching</span>
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Tell Zenemoo What Work You Want
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed">
            Participate in quick 30-second polls so Zenemoo can instantly dispatch suitable projects and translation gigs directly to your inbox.
          </p>
        </div>

        {/* ── MOBILE VIEW: 1-Card-At-A-Time Horizontal Deck ── */}
        <div className="block lg:hidden">
          {activeMobilePool ? (
            <div className="space-y-4">
              {/* Progress Tracker */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Pool <strong className="text-white">{currentMobileIndex + 1}</strong> of {filteredPools.length}
                </span>
                <div className="flex items-center gap-1">
                  {filteredPools.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => setCurrentMobileIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        currentMobileIndex === idx ? 'w-6 bg-cyan-400' : 'w-2 bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Active Card */}
              {renderPoolCard(activeMobilePool, true)}

              {/* Mobile Prev / Next Controls */}
              {filteredPools.length > 1 && (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={currentMobileIndex === 0}
                    onClick={() => setCurrentMobileIndex((prev) => Math.max(0, prev - 1))}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      currentMobileIndex === 0
                        ? 'border-white/5 text-slate-600 bg-slate-900/30 cursor-not-allowed'
                        : 'border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 active:scale-[0.98]'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous Pool</span>
                  </button>

                  <button
                    type="button"
                    disabled={currentMobileIndex === filteredPools.length - 1}
                    onClick={() => setCurrentMobileIndex((prev) => Math.min(filteredPools.length - 1, prev + 1))}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      currentMobileIndex === filteredPools.length - 1
                        ? 'border-white/5 text-slate-600 bg-slate-900/30 cursor-not-allowed'
                        : 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-[0.98]'
                    }`}
                  >
                    <span>Next Pool</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* ── DESKTOP VIEW: Responsive Cards & Category Grid ── */}
        <div className="hidden lg:block space-y-6">
          {/* Filter Bar */}
          {pools.length > 1 && (
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                      selectedCategory === cat
                        ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search polls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-all"
                />
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPools.map((pool) => renderPoolCard(pool, false))}
          </div>
        </div>

        {/* Talent Registration Callout */}
        {onNavigateTalentRegistration && (
          <div className="mt-14 p-6 sm:p-8 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-[#0c1024]/80 to-blue-950/30 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 font-mono">
                Full Contributor Onboarding
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">Want to join verified paid AI projects?</h3>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Complete your full Talent Registration profile with language matrices, hardware specs, and sample recordings to get prioritized for enterprise data contracts.
              </p>
            </div>
            <button
              onClick={onNavigateTalentRegistration}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wide shrink-0 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
            >
              <span>Register Full Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4 sm:px-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Zenemoo Data Solutions. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
            <span>•</span>
            <span className="text-slate-600 font-mono">Bangalore, India</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
