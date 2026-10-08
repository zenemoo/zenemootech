import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  LogOut,
  User,
} from 'lucide-react';
import { poolApi, PoolHistoryItem } from '../../services/poolApi';
import { supabase } from '../../lib/supabaseClient';
import { setAuthReturnDestination } from '../../lib/authReturnRouting';

interface ZenemooPoolHistoryPageProps {
  onNavigatePools?: () => void;
  onNavigateHome?: () => void;
  onBack?: () => void;
}

export const ZenemooPoolHistoryPage: React.FC<ZenemooPoolHistoryPageProps> = ({
  onNavigatePools,
  onNavigateHome,
  onBack,
}) => {
  const handleBack = onBack || onNavigatePools || onNavigateHome;
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

    // Listen for auth state changes (e.g. after OAuth redirect)
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

  // 2. Load History using verified Google JWT
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
      setErrorMsg(err?.response?.data?.message || 'Failed to load pool submissions. Please try again.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // 3. Initiate Google OAuth Login
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
    <div className="min-h-screen bg-[#05060f] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <header className="bg-[#070814]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-xl shadow-black/40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateHome}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20">
              Z
            </div>
            <div>
              <span className="font-bold text-base tracking-wider text-white">ZENEMOO</span>
              <span className="text-[10px] text-cyan-400 font-mono block -mt-1 tracking-widest uppercase">
                Pool History
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigatePools && (
              <button
                onClick={onNavigatePools}
                className="px-3.5 py-1.5 rounded-xl border border-white/10 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-white bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Pools</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-1">
        {isAuthChecking ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Verifying identity...</span>
          </div>
        ) : !sessionUser ? (
          /* Unauthenticated State — Google Sign In Prompt */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0d1022]/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-5"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/10">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">My Pool History</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Sign in with Google to securely view your submitted Pool history, track answered questions, and check updated preferences.
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-xl text-left">
                {errorMsg}
              </p>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs tracking-wider uppercase transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
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
          /* Authenticated State — Live User History */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Identity Profile Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/15 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{displayName}</h3>
                  <p className="text-xs text-cyan-300 font-mono">{userEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => accessToken && loadUserHistory(accessToken)}
                  disabled={isHistoryLoading}
                  className="px-3 py-1.5 rounded-xl border border-white/10 hover:border-cyan-500/30 text-xs text-slate-300 hover:text-white bg-white/5 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/20 hover:border-rose-500/40 text-xs text-rose-300 hover:bg-rose-500/10 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-xl">
                {errorMsg}
              </p>
            )}

            {isHistoryLoading ? (
              <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Loading your submissions...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 px-6 rounded-2xl border border-white/10 bg-[#0d1022] space-y-3">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No Pool Responses Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  We did not find any talent interest pool responses submitted under <strong className="text-cyan-300">{userEmail}</strong>.
                </p>
                {onNavigatePools && (
                  <button
                    onClick={onNavigatePools}
                    className="mt-3 px-4 py-2 rounded-xl bg-cyan-500 text-black font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Browse Open Pools</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    Your Submissions ({history.length})
                  </h3>
                </div>

                {history.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-white/10 bg-[#0d1022] space-y-3 shadow-lg hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        {item.category || 'General'}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.submitted_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{item.pool_title}</h3>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Your Selected Preferences:
                      </span>
                      {item.selected_options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{opt.option_text}</span>
                          {opt.custom_text && (
                            <span className="text-slate-400 text-[11px] italic">({opt.custom_text})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Zenemoo Data Solutions. Fast talent & project matching.
      </footer>
    </div>
  );
};
