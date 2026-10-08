import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
  LogOut,
  User,
  Menu,
  X,
  Vote,
  HelpCircle,
  Check,
} from 'lucide-react';
import { poolApi, PoolHistoryItem } from '../../services/poolApi';
import { supabase } from '../../lib/supabaseClient';
import { setAuthReturnDestination } from '../../lib/authReturnRouting';
import { SeoImage } from '../../seo/components/SeoImage';
import { useActiveLogo } from '../../lib/useActiveLogo';

interface ZenemooPoolHistoryPageProps {
  onNavigatePools?: () => void;
  onNavigateHome?: () => void;
  onBack?: () => void;
  onNavigateTalentRegistration?: () => void;
}

export const ZenemooPoolHistoryPage: React.FC<ZenemooPoolHistoryPageProps> = ({
  onNavigatePools,
  onNavigateHome,
  onBack,
  onNavigateTalentRegistration,
}) => {
  const { logoUrl, isLoading: isLogoLoading } = useActiveLogo();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [sessionUser, setSessionUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<PoolHistoryItem[]>([]);

  // 1. Check existing Google / Supabase session on mount
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (data?.session?.user) {
          setSessionUser(data.session.user);
          setAccessToken(data.session.access_token);
          loadUserHistory(data.session.access_token);
        }
      } catch (err: any) {
        console.warn('[Pool History Auth Check]:', err.message);
      } finally {
        if (isMounted) setIsAuthChecking(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setSessionUser(session.user);
        setAccessToken(session.access_token);
        loadUserHistory(session.access_token);
      } else {
        setSessionUser(null);
        setAccessToken(null);
        setHistory([]);
      }
      setIsAuthChecking(false);
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 2. Load History using verified Google JWT token
  const loadUserHistory = async (token: string) => {
    setIsHistoryLoading(true);
    setErrorMsg('');
    try {
      const res = await poolApi.getAuthenticatedHistory(token);
      if (res.success) {
        setHistory(res.history || []);
      } else {
        setErrorMsg('Failed to load submission history.');
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load your pool responses. Please try again.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // 3. Initiate Google OAuth Login with return destination
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      const returnPath = '/pool/history';
      setAuthReturnDestination(returnPath, 'pool-history');

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
        setErrorMsg(error.message || 'Google sign in failed. Please try again.');
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to connect to Google authentication.');
      setIsGoogleLoading(false);
    }
  };

  // 4. Handle Sign Out
  const handleSignOut = async () => {
    await supabase.auth.signOut().catch(() => {});
    setSessionUser(null);
    setAccessToken(null);
    setHistory([]);
  };

  const displayName =
    sessionUser?.user_metadata?.full_name ||
    sessionUser?.user_metadata?.name ||
    sessionUser?.email?.split('@')[0] ||
    'Talent Contributor';

  const userEmail = sessionUser?.email || '';

  return (
    <div className="min-h-screen bg-[#05060b] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200 font-sans">
      {/* ── Premium Public Navbar ── */}
      <header className="sticky top-0 z-40 bg-[#070913]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-xl shadow-black/50">
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
            className="flex items-center gap-3 group cursor-pointer shrink-0"
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
              <span className="text-lg sm:text-xl font-black tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors leading-none">
                ZENEMOO
              </span>
              <span className="text-[9px] font-mono text-cyan-400 tracking-wider uppercase mt-0.5">
                TALENT INTEREST POOLS
              </span>
            </div>
          </a>

          {/* Desktop Public Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold tracking-wide">
            <a
              href="/pool"
              onClick={(e) => {
                if (onNavigatePools) {
                  e.preventDefault();
                  onNavigatePools();
                }
              }}
              className="text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
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

          {/* Right Header Controls */}
          <div className="hidden md:flex items-center gap-3">
            {sessionUser ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="uppercase tracking-wider">{displayName}</span>
                </div>
                {onNavigatePools && (
                  <button
                    type="button"
                    onClick={onNavigatePools}
                    className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95"
                  >
                    <Vote className="w-3.5 h-3.5" />
                    <span>Browse Pools</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-xl border border-white/10 hover:border-rose-500/40 text-xs text-slate-400 hover:text-rose-300 bg-white/[0.02] hover:bg-rose-500/10 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isGoogleLoading ? (
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
                  <span>Sign In</span>
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

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-white/10 text-slate-300 hover:text-white bg-white/5 cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10 mt-3 pt-4 pb-2 space-y-3"
            >
              <nav className="flex flex-col space-y-2 text-sm font-semibold">
                <a
                  href="/pool"
                  onClick={(e) => {
                    if (onNavigatePools) {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      onNavigatePools();
                    }
                  }}
                  className="px-3 py-2 rounded-lg hover:bg-white/5 text-slate-200 hover:text-cyan-400"
                >
                  Pools
                </a>
                <a
                  href="/#opportunities"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-white/5 text-slate-200 hover:text-cyan-400"
                >
                  Opportunities
                </a>
                <a
                  href="/#services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-white/5 text-slate-200 hover:text-cyan-400"
                >
                  Services
                </a>
                <a
                  href="/#contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-white/5 text-slate-200 hover:text-cyan-400"
                >
                  Contact
                </a>
              </nav>

              <div className="pt-3 border-t border-white/10 space-y-2">
                {sessionUser ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 rounded-xl bg-white/5 text-xs text-slate-300">
                      <p className="font-bold text-white">{displayName}</p>
                      <p className="text-[11px] text-cyan-300 font-mono">{userEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full py-2.5 rounded-xl border border-rose-500/20 text-rose-300 text-xs font-semibold bg-rose-500/10 flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleGoogleSignIn();
                      }}
                      className="w-full py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
                    >
                      <span>Continue with Google</span>
                    </button>
                    {onNavigateTalentRegistration && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onNavigateTalentRegistration();
                        }}
                        className="w-full py-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs font-semibold bg-cyan-500/10 flex items-center justify-center"
                      >
                        <span>Register Profile</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-1 relative z-10 space-y-8">
        {isAuthChecking ? (
          <div className="py-24 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <span className="font-mono">Verifying Google identity &amp; responses...</span>
          </div>
        ) : !sessionUser ? (
          /* ── Unauthenticated State: Sign In Prompt ── */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto bg-gradient-to-b from-[#0c1024]/90 to-[#070a18]/90 border border-cyan-500/30 rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto shadow-xl shadow-cyan-500/15">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white font-display tracking-tight">My Pool History</h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed font-sans">
                Sign in with your verified Google account to review your submitted Pool responses, track answered questions, and check updated matching preferences.
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl text-left">
                {errorMsg}
              </p>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {isGoogleLoading ? (
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
          </motion.div>
        ) : (
          /* ── Authenticated State: Verified Google History Cards ── */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Header & User Profile Info */}
            <div className="p-6 rounded-3xl border border-cyan-500/25 bg-gradient-to-r from-cyan-950/30 via-[#0a0f26]/90 to-blue-950/30 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-cyan-500/20">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white font-display leading-none">
                      {displayName}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Verified Google Identity</span>
                    </span>
                  </div>
                  <p className="text-xs text-cyan-300 font-mono mt-1">{userEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => accessToken && loadUserHistory(accessToken)}
                  disabled={isHistoryLoading}
                  className="px-3.5 py-2 rounded-xl border border-white/10 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-white bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="px-3.5 py-2 rounded-xl border border-rose-500/20 hover:border-rose-500/40 text-xs text-rose-300 hover:bg-rose-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white font-display tracking-tight flex items-center gap-2">
                <Vote className="w-5 h-5 text-cyan-400" />
                <span>My Pool History</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-sans">
                Your responses to Zenemoo Talent Pools.
              </p>
            </div>

            {/* History Card List */}
            {isHistoryLoading ? (
              <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <span className="font-mono">Loading your submissions...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-16 px-6 rounded-3xl border border-white/10 bg-[#080b18]/90 space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                  <Clock className="w-7 h-7 text-cyan-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white font-display">No Pool Responses Found</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    You haven&apos;t submitted any responses yet under <strong className="text-cyan-300">{userEmail}</strong>.
                  </p>
                </div>
                {onNavigatePools && (
                  <button
                    onClick={onNavigatePools}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                  >
                    <Vote className="w-4 h-4" />
                    <span>Browse Open Talent Pools</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    className="max-w-xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-b from-[#090f24]/95 via-[#070b1a]/95 to-[#050814]/95 p-6 sm:p-7 space-y-4 shadow-2xl shadow-black/50 hover:border-cyan-500/30 transition-all"
                  >
                    {/* Category badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {item.category || 'AI DATA SOLUTIONS'}
                      </span>
                    </div>

                    {/* Question Title & Description */}
                    <div className="space-y-1.5">
                      <h3 className="text-base sm:text-lg font-bold text-white font-display leading-snug">
                        {item.pool_title || item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Your Response Section */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider font-bold">
                        YOUR RESPONSE
                      </span>
                      <div className="space-y-2">
                        {(item.selected_options || item.selectedOptions || []).map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 flex items-center justify-between text-xs sm:text-sm font-semibold"
                          >
                            <div className="flex items-center gap-2.5">
                              <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                              <span>{opt.option_text || (opt as any).text}</span>
                            </div>
                            {opt.custom_text && (
                              <span className="text-slate-300 text-xs font-normal">
                                ({opt.custom_text})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>
                        Submitted · {new Date(item.submitted_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* ── Polished Zenemoo Public Footer ── */}
      <footer className="relative z-10 bg-[#020307] text-slate-400 border-t border-white/10 pt-10 pb-8 font-sans">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
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
                <span className="text-lg font-extrabold tracking-wider font-display text-white">
                  ZENEMOO
                </span>
                <span className="text-[9px] tracking-widest uppercase text-cyan-400 font-mono font-semibold">
                  AI CONTRIBUTOR PLATFORM
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
              <a
                href="/pool"
                onClick={(e) => {
                  if (onNavigatePools) {
                    e.preventDefault();
                    onNavigatePools();
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
