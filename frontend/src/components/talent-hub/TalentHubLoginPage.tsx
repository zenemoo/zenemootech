import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ShieldCheck,
  Briefcase,
  FileCheck,
  UserCheck,
  ArrowRight,
  LogOut,
  AlertCircle,
  Loader2,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';

interface TalentHubLoginPageProps {
  onNavigateRegister?: () => void;
  onNavigateHome?: () => void;
}

export const TalentHubLoginPage: React.FC<TalentHubLoginPageProps> = ({
  onNavigateRegister,
  onNavigateHome,
}) => {
  const {
    user,
    session,
    isRegistered,
    isLoading,
    isProfileLoading,
    authError,
    signInWithGoogle,
    signOut,
  } = useTalentHubAuth();

  const handleRegisterClick = () => {
    if (onNavigateRegister) {
      onNavigateRegister();
    } else {
      window.history.pushState(null, '', '/talent-registration');
      window.location.hash = 'talent-registration';
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleBackHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.history.pushState(null, '', '/');
      window.location.hash = '';
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // ── State 1: Checking authentication or registration status ──
  if (isLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-cyan-950/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px] shadow-xl shadow-cyan-500/20">
            <div className="w-full h-full bg-[#0a0a0c] rounded-[15px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Checking your Zenemoo registration...</h3>
            <p className="text-xs text-slate-400 mt-1">Verifying your authorized talent credentials</p>
          </div>
        </div>
      </div>
    );
  }

  // ── State 2: Authenticated with Google, but NOT registered in talent database ──
  if (session && isRegistered === false) {
    return (
      <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans relative">
        <div className="absolute inset-0 bg-radial-gradient from-cyan-950/20 via-transparent to-transparent pointer-events-none" />

        {/* Top bar */}
        <header className="max-w-6xl mx-auto w-full flex items-center justify-between z-10">
          <button
            onClick={handleBackHome}
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 focus:outline-none"
          >
            &larr; Back to Zenemoo
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </header>

        {/* Main Card: Registration Required */}
        <main className="max-w-md mx-auto w-full my-auto py-12 z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b0b0e] border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-amber-950/20 text-center relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center mb-5 text-amber-400 shadow-inner">
              <AlertCircle className="w-7 h-7" />
            </div>

            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Registration Required
            </span>

            <h2 className="text-xl sm:text-2xl font-bold text-white mt-4 tracking-tight">
              No Zenemoo talent registration was found for this Google account.
            </h2>

            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              Please register with Zenemoo first to access the Talent Hub.
            </p>

            {user?.email && (
              <div className="mt-4 py-2 px-3 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-slate-400 inline-flex items-center gap-2 max-w-full truncate">
                <span className="text-slate-500">Account:</span>
                <span className="text-slate-200 font-mono truncate">{user.email}</span>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={handleRegisterClick}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all duration-200"
              >
                <span>Register with Zenemoo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
              >
                <span>Sign In with a Different Account</span>
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 text-left">
              <p className="text-xs text-slate-400 leading-normal">
                <span className="font-semibold text-slate-300">Already registered?</span> Make sure you&apos;re signing in with the same Google account used during registration.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Need assistance? Contact <a href="mailto:info@zenemoo.in" className="text-cyan-400 hover:underline">info@zenemoo.in</a>.
              </p>
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 py-4 z-10">
          Zenemoo Talent Hub &bull; A Bright Tomorrow, Together.
        </footer>
      </div>
    );
  }

  // ── State 3: Public Talent Hub Login Screen ──
  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px]">
            <div className="w-full h-full bg-[#0a0a0c] rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <span className="text-sm font-bold tracking-tight text-white">Zenemoo</span>
        </div>

        <button
          onClick={handleBackHome}
          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1 focus:outline-none"
        >
          <span>Main Website</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md mx-auto w-full my-auto py-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#0a0a0d]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/20 text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-5">
            <Sparkles className="w-3 h-3" />
            Zenemoo Talent Hub
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome to Zenemoo Talent Hub
          </h1>

          <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">
            Access your registered profile, discover opportunities, and track your applications.
          </p>

          {/* Auth Error Banner if any */}
          {authError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-left flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </motion.div>
          )}

          {/* Google OAuth Login Button */}
          <div className="mt-8 space-y-4">
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold shadow-xl shadow-white/10 hover:shadow-white/20 transition-all duration-200 active:scale-[0.98] focus:outline-none"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            </button>

            <p className="text-[11px] text-slate-400">
              Only registered Zenemoo talents can access the Talent Hub.
            </p>
          </div>

          {/* Quick Features List */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <UserCheck className="w-4 h-4 text-cyan-400 mx-auto mb-1.5" />
              <p className="text-[10px] font-medium text-slate-300">My Profile</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Verified Data</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <Briefcase className="w-4 h-4 text-blue-400 mx-auto mb-1.5" />
              <p className="text-[10px] font-medium text-slate-300">Opportunities</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Active Projects</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <FileCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-[10px] font-medium text-slate-300">Applications</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Live Tracking</p>
            </div>
          </div>

          {/* Talent Registration Link for New Users */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">
              New to Zenemoo?{' '}
              <button
                onClick={handleRegisterClick}
                className="text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-2 transition-colors"
              >
                Apply as a Talent
              </button>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-4 z-10">
        Zenemoo &bull; &ldquo;A Bright Tomorrow, Together.&rdquo;
      </footer>
    </div>
  );
};
