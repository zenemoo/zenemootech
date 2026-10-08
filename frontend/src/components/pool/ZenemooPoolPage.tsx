import React, { useState, useEffect, useMemo } from 'react';
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
  Menu,
  X,
  Vote,
  Edit3,
} from 'lucide-react';
import { poolApi, PoolItem, PoolOptionItem, PoolHistoryItem } from '../../services/poolApi';
import { SeoImage } from '../../seo/components/SeoImage';
import { supabase } from '../../lib/supabaseClient';
import { setAuthReturnDestination } from '../../lib/authReturnRouting';
import { useActiveLogo } from '../../lib/useActiveLogo';

interface LocalPoolProfile {
  email: string;
  name: string;
  participantType: string;
  authMethod: 'google' | 'manual';
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
  const { logoUrl, isLoading: isLogoLoading } = useActiveLogo();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Profile & Google Auth state
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userHistory, setUserHistory] = useState<PoolHistoryItem[]>([]);

  const [profile, setProfile] = useState<LocalPoolProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState<'choice' | 'manual' | 'google_type'>('choice');
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);
  const [tempEmail, setTempEmail] = useState(profile?.email || '');
  const [tempType, setTempType] = useState(profile?.participantType || 'Individual');
  const [tempName, setTempName] = useState(profile?.name || '');
  const [onboardingError, setOnboardingError] = useState('');

  // Pools state
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Interaction state
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string[]>>({});
  const [customTextMap, setCustomTextMap] = useState<Record<string, string>>({});
  const [editingPoolIds, setEditingPoolIds] = useState<Record<string, boolean>>({});
  const [submittingPoolId, setSubmittingPoolId] = useState<string | null>(null);
  const [submitFeedbackMap, setSubmitFeedbackMap] = useState<Record<string, { message: string; isError?: boolean }>>({});
  const [copiedLinkPoolId, setCopiedLinkPoolId] = useState<string | null>(null);

  // Filter state for overview
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Check Google Auth Session & load user history for cross-referencing
  const fetchUserHistory = async (token: string) => {
    try {
      const res = await poolApi.getAuthenticatedHistory(token);
      if (res.success && Array.isArray(res.history)) {
        setUserHistory(res.history);
      }
    } catch (_) {}
  };

  useEffect(() => {
    let isMounted = true;
    const checkGoogleUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user && isMounted) {
          const gUser = data.session.user;
          const token = data.session.access_token;
          setSessionUser(gUser);
          setAccessToken(token);

          const gEmail = gUser.email || '';
          const gName = gUser.user_metadata?.full_name || gUser.user_metadata?.name || gEmail.split('@')[0] || '';

          const googleProf: LocalPoolProfile = {
            email: gEmail,
            name: gName,
            participantType: profile?.participantType || 'Individual',
            authMethod: 'google',
          };
          setProfile(googleProf);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(googleProf));
          } catch (_) {}

          fetchUserHistory(token);
        }
      } catch (_) {}
    };

    checkGoogleUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const gUser = session.user;
        const token = session.access_token;
        setSessionUser(gUser);
        setAccessToken(token);

        const gEmail = gUser.email || '';
        const gName = gUser.user_metadata?.full_name || gUser.user_metadata?.name || gEmail.split('@')[0] || '';

        const googleProf: LocalPoolProfile = {
          email: gEmail,
          name: gName,
          participantType: profile?.participantType || 'Individual',
          authMethod: 'google',
        };
        setProfile(googleProf);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(googleProf));
        } catch (_) {}

        fetchUserHistory(token);
      } else {
        setSessionUser(null);
        setAccessToken(null);
        setUserHistory([]);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 2. Load Pools from Cloudflare D1
  const loadPoolsData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      if (initialPublicId) {
        const res = await poolApi.getPoolByPublicId(initialPublicId);
        if (res.success && res.pool) {
          setPools([res.pool]);
        } else {
          setLoadError('Talent pool not found or is no longer accepting responses.');
        }
      } else {
        const res = await poolApi.getActivePools();
        if (res.success && Array.isArray(res.pools)) {
          setPools(res.pools);
        } else {
          setPools([]);
        }
      }
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Unable to load talent pools. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPoolsData();
  }, [initialPublicId]);

  // 3. Cross-reference pools with user history to prefill answers
  const userHistoryMap = useMemo(() => {
    const map = new Map<string, PoolHistoryItem>();
    userHistory.forEach((h) => {
      if (h.pool_id) map.set(h.pool_id, h);
      if (h.public_id) map.set(h.public_id, h);
      if (h.pool_title) map.set(h.pool_title.trim().toLowerCase(), h);
    });
    return map;
  }, [userHistory]);

  useEffect(() => {
    if (pools.length === 0) return;

    setSelectedOptionsMap((prev) => {
      const updated = { ...prev };
      pools.forEach((p) => {
        const histEntry =
          userHistoryMap.get(p.id) ||
          userHistoryMap.get(p.public_id) ||
          userHistoryMap.get(p.title.trim().toLowerCase());

        if (histEntry && (histEntry.selected_options || histEntry.selectedOptions)) {
          const rawOpts = histEntry.selected_options || histEntry.selectedOptions || [];
          const optIds: string[] = [];
          rawOpts.forEach((so) => {
            if (so.option_id) {
              optIds.push(so.option_id);
            } else if (so.option_text) {
              const matched = p.options.find(
                (o) => o.option_text.trim().toLowerCase() === so.option_text.trim().toLowerCase()
              );
              if (matched) optIds.push(matched.id);
            }
          });
          if (optIds.length > 0 && !updated[p.id]) {
            updated[p.id] = optIds;
          }
        }
      });
      return updated;
    });
  }, [pools, userHistoryMap]);

  // 4. Initiate Google Sign-In with strict return routing
  const handleStartGoogleAuth = async () => {
    setIsGoogleAuthLoading(true);
    setOnboardingError('');
    try {
      const returnPath = initialPublicId ? `/pool/${encodeURIComponent(initialPublicId)}` : '/pool';
      setAuthReturnDestination(returnPath, 'pool');

      const redirectUrl = `${window.location.origin}${returnPath}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) {
        setOnboardingError(error.message || 'Google sign-in failed.');
        setIsGoogleAuthLoading(false);
      }
    } catch (err: any) {
      setOnboardingError(err?.message || 'Failed to initiate Google authentication.');
      setIsGoogleAuthLoading(false);
    }
  };

  // 5. Handle manual profile saving
  const handleSaveProfile = (authMethod: 'google' | 'manual') => {
    setOnboardingError('');
    const emailNorm = tempEmail.trim().toLowerCase();
    const nameClean = tempName.trim();

    if (!emailNorm || !emailNorm.includes('@')) {
      setOnboardingError('Please enter a valid email address.');
      return;
    }

    if (!nameClean) {
      setOnboardingError('Please enter your name.');
      return;
    }

    if (!tempType) {
      setOnboardingError('Please select a participant category.');
      return;
    }

    const newProfile: LocalPoolProfile = {
      email: emailNorm,
      name: nameClean,
      participantType: tempType,
      authMethod,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch (_) {}

    setProfile(newProfile);
    setIsEditingProfile(false);
  };

  // 6. Toggle option selection
  const handleOptionToggle = (pool: PoolItem, optionId: string) => {
    const currentList = selectedOptionsMap[pool.id] || [];

    if (!pool.allow_multiple) {
      setSelectedOptionsMap((prev) => ({
        ...prev,
        [pool.id]: [optionId],
      }));
    } else {
      const exists = currentList.includes(optionId);
      const updated = exists ? currentList.filter((id) => id !== optionId) : [...currentList, optionId];
      setSelectedOptionsMap((prev) => ({
        ...prev,
        [pool.id]: updated,
      }));
    }

    // Clear feedback
    if (submitFeedbackMap[pool.id]) {
      setSubmitFeedbackMap((prev) => {
        const copy = { ...prev };
        delete copy[pool.id];
        return copy;
      });
    }
  };

  const toggleEditing = (poolId: string) => {
    setEditingPoolIds((prev) => ({
      ...prev,
      [poolId]: !prev[poolId],
    }));
  };

  // 7. Submit Pool Response
  const handleSubmitPool = async (pool: PoolItem) => {
    if (!profile) {
      setIsEditingProfile(true);
      return;
    }

    const selectedIds = selectedOptionsMap[pool.id] || [];
    if (selectedIds.length === 0) {
      setSubmitFeedbackMap((prev) => ({
        ...prev,
        [pool.id]: { message: 'Please select an option before submitting.', isError: true },
      }));
      return;
    }

    setSubmittingPoolId(pool.id);
    setSubmitFeedbackMap((prev) => {
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
        setSubmitFeedbackMap((prev) => ({
          ...prev,
          [pool.id]: {
            message: res.message || 'Response submitted successfully!',
            isError: false,
          },
        }));

        setEditingPoolIds((prev) => ({ ...prev, [pool.id]: false }));

        // Optimistically increment pool count
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

        // Refresh user history if token is present
        if (accessToken) {
          fetchUserHistory(accessToken);
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit response. Please try again.';
      setSubmitFeedbackMap((prev) => ({
        ...prev,
        [pool.id]: { message: msg, isError: true },
      }));
    } finally {
      setSubmittingPoolId(null);
    }
  };

  // Share & Copy link
  const handleCopyPoolLink = (pool: PoolItem) => {
    const url = `https://www.zenemoo.in/pool/${pool.public_id}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkPoolId(pool.id);
    setTimeout(() => setCopiedLinkPoolId(null), 2500);
  };

  // Categories & Filtering
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(pools.map((p) => p.category || 'General')))];
  }, [pools]);

  const filteredPools = useMemo(() => {
    return pools.filter((p) => {
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
  }, [pools, selectedCategory, searchQuery]);

  const displayName =
    sessionUser?.user_metadata?.full_name ||
    sessionUser?.user_metadata?.name ||
    sessionUser?.email?.split('@')[0] ||
    profile?.name ||
    'Talent Contributor';

  return (
    <div className="min-h-screen bg-[#030409] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Atmospheric Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-cyan-600/10 via-blue-700/5 to-transparent blur-3xl opacity-60" />
      </div>

      {/* ── Premium Public Navbar ── */}
      <header className="sticky top-0 z-40 bg-[#060814]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-2xl shadow-black/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Lockup */}
          <a
            href="/"
            onClick={(e) => {
              if (onNavigateHome) {
                e.preventDefault();
                onNavigateHome();
              }
            }}
            className="flex items-center gap-3 group cursor-pointer"
            aria-label="Zenemoo Home"
          >
            {isLogoLoading ? (
              <div className="w-10 h-10 rounded-full bg-slate-900 animate-pulse border border-white/10 shrink-0" />
            ) : (
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-all shrink-0">
                <SeoImage
                  src={logoUrl || '/assets/logo.png'}
                  alt="Zenemoo Official Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain rounded-full bg-white p-0.5"
                  fallbackSrc="/assets/logo.png"
                />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors leading-none">
                ZENEMOO
              </span>
              <span className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase mt-0.5">
                Talent Interest Pools
              </span>
            </div>
          </a>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wide">
            <a
              href="/pool"
              onClick={(e) => {
                if (initialPublicId && onBack) {
                  e.preventDefault();
                  onBack();
                }
              }}
              className="text-cyan-400 font-bold transition-colors cursor-pointer"
            >
              Pools
            </a>
            <a href="/#opportunities" className="text-slate-300 hover:text-cyan-400 transition-colors">
              Opportunities
            </a>
            <a href="/#services" className="text-slate-300 hover:text-cyan-400 transition-colors">
              Services
            </a>
            <a href="/#contact" className="text-slate-300 hover:text-cyan-400 transition-colors">
              Contact
            </a>
          </nav>

          {/* Right Header User State */}
          <div className="hidden md:flex items-center gap-3">
            {sessionUser ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-slate-200">{displayName}</span>
                </div>
                {onNavigateHistory && (
                  <button
                    type="button"
                    onClick={onNavigateHistory}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>My History</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {onNavigateHistory && (
                  <button
                    type="button"
                    onClick={onNavigateHistory}
                    className="px-3.5 py-1.5 rounded-xl border border-white/10 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-white bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>My History</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStartGoogleAuth}
                  disabled={isGoogleAuthLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-black font-bold text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isGoogleAuthLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                {onNavigateTalentRegistration && (
                  <button
                    type="button"
                    onClick={onNavigateTalentRegistration}
                    className="px-3.5 py-1.5 rounded-xl border border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-500/10 text-cyan-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Register Profile</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden p-2 rounded-xl border border-white/10 text-slate-300 hover:text-white bg-white/5"
            aria-label="Toggle Menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10 mt-3 pt-4 pb-2 space-y-3"
            >
              <nav className="flex flex-col space-y-2 text-sm font-semibold">
                <a
                  href="/pool"
                  onClick={() => setMobileNavOpen(false)}
                  className="px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-300 font-bold"
                >
                  Pools
                </a>
                <a
                  href="/#opportunities"
                  onClick={() => setMobileNavOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-white/5 text-slate-200 hover:text-cyan-400"
                >
                  Opportunities
                </a>
                <a
                  href="/#services"
                  onClick={() => setMobileNavOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-white/5 text-slate-200 hover:text-cyan-400"
                >
                  Services
                </a>
                <a
                  href="/#contact"
                  onClick={() => setMobileNavOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-white/5 text-slate-200 hover:text-cyan-400"
                >
                  Contact
                </a>
                {onNavigateHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileNavOpen(false);
                      onNavigateHistory();
                    }}
                    className="px-3 py-2 text-left rounded-lg hover:bg-white/5 text-cyan-300 flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>My Pool History</span>
                  </button>
                )}
              </nav>

              <div className="pt-3 border-t border-white/10 space-y-2">
                {!sessionUser ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileNavOpen(false);
                        handleStartGoogleAuth();
                      }}
                      className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2"
                    >
                      <span>Continue with Google</span>
                    </button>
                    {onNavigateTalentRegistration && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileNavOpen(false);
                          onNavigateTalentRegistration();
                        }}
                        className="w-full py-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs font-semibold bg-cyan-500/10 flex items-center justify-center"
                      >
                        <span>Register Profile</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white/5 text-xs text-slate-300">
                    <p className="font-bold text-white">{displayName}</p>
                    <p className="text-[11px] text-cyan-300 font-mono">{sessionUser.email}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Main Content Area ── */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 relative z-10 space-y-8">
        {/* ── Public Hero Section ── */}
        {!initialPublicId && (
          <div className="text-center space-y-4 max-w-3xl mx-auto pt-2 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-bold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ZENEMOO POOLS</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-display tracking-tight leading-tight">
              Quick questions. <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Better opportunities.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-sans max-w-2xl mx-auto leading-relaxed">
              Tell us what you&apos;re interested in, what you&apos;re available for, and what capabilities you have. Your responses help Zenemoo match you with relevant projects faster.
            </p>
          </div>
        )}

        {/* ── Category & Search Filter Bar (for multi-pool view) ── */}
        {!initialPublicId && pools.length > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 rounded-2xl bg-[#080c1a]/80 border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        )}

        {/* ── Loading / Error / Empty States ── */}
        {isLoading ? (
          <div className="py-24 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <span className="font-mono">Loading Zenemoo Talent Pools...</span>
          </div>
        ) : loadError || filteredPools.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 px-6 rounded-3xl border border-white/10 bg-[#090d1c]/90 space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
              <HelpCircle className="w-7 h-7 text-cyan-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white font-display">
                {loadError ? 'Pool Unavailable' : 'No Pools Matching Criteria'}
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                {loadError || 'Zenemoo does not have active pools for this category right now. Check back soon for new project inquiries.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => loadPoolsData()}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              {initialPublicId && onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white text-xs inline-flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Browse All Pools</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── Render Pools Grid ── */
          <div
            className={`grid gap-6 ${
              filteredPools.length === 1
                ? 'max-w-xl mx-auto grid-cols-1'
                : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {filteredPools.map((pool) => {
              const histEntry =
                userHistoryMap.get(pool.id) ||
                userHistoryMap.get(pool.public_id) ||
                userHistoryMap.get(pool.title.trim().toLowerCase());

              const selectedIds = selectedOptionsMap[pool.id] || [];
              const hasResponded = Boolean(
                histEntry ||
                submitFeedbackMap[pool.id]?.isError === false
              );
              const isEditing = Boolean(editingPoolIds[pool.id]);
              const feedback = submitFeedbackMap[pool.id];
              const isSubmitting = submittingPoolId === pool.id;
              const isOtherSelected = (pool.options || []).some(
                (o) => o.option_text.toLowerCase().includes('other') && selectedIds.includes(o.id)
              );

              // Find answered option labels
              const answeredLabels: string[] = [];
              if (histEntry?.selected_options && histEntry.selected_options.length > 0) {
                histEntry.selected_options.forEach((so) => {
                  if (so.option_text) answeredLabels.push(so.option_text);
                });
              }
              if (answeredLabels.length === 0 && selectedIds.length > 0) {
                selectedIds.forEach((sid) => {
                  const match = (pool.options || []).find((o) => o.id === sid);
                  if (match) answeredLabels.push(match.option_text);
                });
              }

              const submissionDate = histEntry?.submitted_at || pool.updated_at || pool.created_at;

              return (
                <motion.div
                  key={pool.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-3xl border transition-all duration-300 p-6 sm:p-7 flex flex-col justify-between gap-6 relative overflow-hidden shadow-2xl ${
                    hasResponded && !isEditing
                      ? 'bg-gradient-to-b from-[#09151e]/95 via-[#060f15]/95 to-[#04080c]/95 border-emerald-500/35 shadow-emerald-950/20'
                      : 'bg-gradient-to-b from-[#0a0f26]/95 via-[#070b1c]/95 to-[#050714]/95 border-white/10 hover:border-cyan-500/40 shadow-black/50'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Card Header: Category & Response Count */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {pool.category || 'AI DATA SOLUTIONS'}
                      </span>

                      {hasResponded ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                          <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                          <span>Response Submitted</span>
                        </span>
                      ) : pool.total_responses_count > 0 ? (
                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Users className="w-3 h-3 text-cyan-400" />
                          <span>{pool.total_responses_count} interested</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Question Title & Description */}
                    <div className="space-y-2">
                      <h2 className="text-lg sm:text-xl font-bold text-white font-display leading-snug">
                        {pool.title}
                      </h2>
                      {pool.description && (
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                          {pool.description}
                        </p>
                      )}
                    </div>

                    {/* ── Case 1: Already Answered View Mode ── */}
                    {hasResponded && !isEditing ? (
                      <div className="space-y-3 pt-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider font-bold">
                          YOUR RESPONSE:
                        </span>

                        <div className="space-y-2">
                          {(pool.options || []).map((opt) => {
                            const isSelected =
                              selectedIds.includes(opt.id) ||
                              answeredLabels.includes(opt.option_text);

                            return (
                              <div
                                key={opt.id}
                                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-md'
                                    : 'bg-white/[0.02] border-white/5 text-slate-500 opacity-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-4 h-4 rounded-${
                                      pool.allow_multiple ? 'md' : 'full'
                                    } border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'border-emerald-400 bg-emerald-400'
                                        : 'border-slate-700'
                                    }`}
                                  >
                                    {isSelected && (
                                      <Check className="w-3 h-3 text-black stroke-[3]" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-xs sm:text-sm ${
                                      isSelected ? 'font-bold text-emerald-100' : 'font-medium text-slate-500'
                                    }`}
                                  >
                                    {opt.option_text}
                                  </span>
                                </div>
                                {isSelected && (
                                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                                    Your Choice
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {customTextMap[pool.id] && (
                          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-slate-300">
                            <span className="text-slate-500 font-mono block text-[10px] uppercase">Additional Note:</span>
                            {customTextMap[pool.id]}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* ── Case 2: Unanswered or Active Editing Mode ── */
                      <div className="space-y-2.5 pt-2">
                        <p className="text-[11px] font-mono text-slate-400 pb-0.5">
                          {pool.allow_multiple ? 'Select all that apply:' : 'Select one option:'}
                        </p>

                        {(pool.options || []).map((opt) => {
                          const isSelected = selectedIds.includes(opt.id);

                          return (
                            <div
                              key={opt.id}
                              onClick={() => handleOptionToggle(pool, opt.id)}
                              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/15 scale-[1.01]'
                                  : 'bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.04]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-4 h-4 rounded-${
                                    pool.allow_multiple ? 'md' : 'full'
                                  } border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'border-cyan-400 bg-cyan-400'
                                      : 'border-slate-500'
                                  }`}
                                >
                                  {isSelected && (
                                    pool.allow_multiple ? (
                                      <Check className="w-3 h-3 text-black stroke-[3]" />
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full bg-black" />
                                    )
                                  )}
                                </div>
                                <span className="text-xs sm:text-sm font-medium">{opt.option_text}</span>
                              </div>
                            </div>
                          );
                        })}

                        {isOtherSelected && (
                          <input
                            type="text"
                            placeholder="Please specify additional details..."
                            value={customTextMap[pool.id] || ''}
                            onChange={(e) =>
                              setCustomTextMap((prev) => ({
                                ...prev,
                                [pool.id]: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-cyan-400 mt-2 font-sans"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Card Footer Actions ── */}
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    {feedback && (
                      <p
                        className={`text-xs px-3.5 py-2 rounded-xl ${
                          feedback.isError
                            ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                            : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        }`}
                      >
                        {feedback.message}
                      </p>
                    )}

                    {hasResponded && !isEditing ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>Submitted</span>
                          {submissionDate && (
                            <span className="text-slate-500">
                              •{' '}
                              {new Date(submissionDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyPoolLink(pool)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer"
                            title="Share pool question"
                          >
                            {copiedLinkPoolId === pool.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleEditing(pool.id)}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Update Response</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          disabled={isSubmitting || selectedIds.length === 0}
                          onClick={() => handleSubmitPool(pool)}
                          className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
                            selectedIds.length > 0 && !isSubmitting
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 cursor-pointer active:scale-[0.99]'
                              : 'bg-slate-800/80 text-slate-500 border border-white/5 cursor-not-allowed'
                          }`}
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Submitting Response...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{hasResponded ? 'Save Updated Response' : 'Submit Response'}</span>
                            </>
                          )}
                        </button>

                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleEditing(pool.id)}
                            className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1"
                          >
                            Cancel Editing
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── First-Time User Profile / Authentication Modal ── */}
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
              className="w-full max-w-md bg-gradient-to-b from-[#0c1024] to-[#070a18] border border-cyan-500/30 rounded-3xl p-7 sm:p-8 shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Welcome to Zenemoo Pools</h3>
                  <p className="text-xs text-slate-400">
                    {onboardingMode === 'choice'
                      ? 'Submit quick answers to match with future projects'
                      : onboardingMode === 'google_type'
                      ? 'Complete your verified participant profile'
                      : 'Enter your basic details to participate'}
                  </p>
                </div>
              </div>

              {onboardingError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-xl mb-4">
                  {onboardingError}
                </p>
              )}

              {/* Mode 1: Choice Screen */}
              {onboardingMode === 'choice' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Answer quick questions from Zenemoo so we can understand your interests, availability, and capabilities.
                  </p>

                  <button
                    type="button"
                    onClick={handleStartGoogleAuth}
                    disabled={isGoogleAuthLoading}
                    className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                  >
                    {isGoogleAuthLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                        <span>Connecting to Google...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-400 text-center font-mono">
                    Secures your history across Zenemoo with verified identity.
                  </p>

                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px bg-white/10 flex-1" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 font-mono">OR</span>
                    <div className="h-px bg-white/10 flex-1" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setOnboardingMode('manual')}
                    className="w-full py-3 rounded-xl border border-white/15 hover:border-cyan-500/40 text-slate-300 hover:text-white bg-slate-900/60 font-semibold text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Enter Details Manually</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {profile && isEditingProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="w-full text-center text-xs text-slate-500 hover:text-slate-300 pt-1"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}

              {/* Mode 2: Google Authenticated User -> Select Participant Type */}
              {onboardingMode === 'google_type' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{tempName || 'Google Contributor'}</p>
                      <p className="text-[11px] text-cyan-300 font-mono truncate">{tempEmail}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300">
                      Select Your Participant Category *
                    </label>
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

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setOnboardingMode('choice')}
                      className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveProfile('google')}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
                    >
                      <span>Continue to Pools</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Mode 3: Manual Input */}
              {onboardingMode === 'manual' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveProfile('manual');
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. name@example.com"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-cyan-400 text-xs text-white placeholder-slate-500 outline-none font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Prem Kumar"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-cyan-400 text-xs text-white placeholder-slate-500 outline-none font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                      Participant Type *
                    </label>
                    <select
                      value={tempType}
                      onChange={(e) => setTempType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-cyan-400 text-xs text-white outline-none font-sans"
                    >
                      {PARTICIPANT_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setOnboardingMode('choice')}
                      className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
                    >
                      <span>Complete &amp; Continue</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Polished Zenemoo Public Footer ── */}
      <footer className="relative z-10 bg-[#020307] text-slate-400 border-t border-white/10 pt-12 pb-8 font-sans">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/10">
            {/* Logo & Platform Tagline */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/25 shrink-0">
                <SeoImage
                  src={logoUrl || '/assets/logo.png'}
                  alt="Zenemoo Official Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain rounded-full bg-white p-0.5"
                  fallbackSrc="/assets/logo.png"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-wider font-display text-white">
                  ZENEMOO
                </span>
                <span className="text-[10px] tracking-widest uppercase text-cyan-400 font-mono font-semibold">
                  AI Contributor Platform
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
              <a
                href="/pool"
                onClick={(e) => {
                  if (initialPublicId && onBack) {
                    e.preventDefault();
                    onBack();
                  }
                }}
                className="hover:text-cyan-400 transition-colors"
              >
                Pools
              </a>
              <a href="/#opportunities" className="hover:text-cyan-400 transition-colors">
                Opportunities
              </a>
              <a href="/#services" className="hover:text-cyan-400 transition-colors">
                Services
              </a>
              <a href="/#contact" className="hover:text-cyan-400 transition-colors">
                Contact
              </a>
              <a href="/#terms" className="hover:text-cyan-400 transition-colors">
                Terms &amp; Conditions
              </a>
              <a href="/#privacy" className="hover:text-cyan-400 transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
            <span>© {new Date().getFullYear()} Zenemoo Technologies. All rights reserved.</span>
            <a href="mailto:info@zenemoo.in" className="text-cyan-400 hover:underline">
              info@zenemoo.in
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
