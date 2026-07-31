import React, { useState } from 'react';
import { ArrowLeft, Lock, Mail, ShieldCheck, Eye, EyeOff, KeyRound, Sparkles, UserCheck } from 'lucide-react';
import { portalApi } from '../services/api';
import { CursorSpotlight } from './CursorSpotlight';
import { ThreeNeuralBackground } from './ThreeNeuralBackground';

interface HRLoginPageProps {
  onBackToHome: () => void;
  onLoginSuccess: (token: string, user: any) => void;
}

export const HRLoginPage: React.FC<HRLoginPageProps> = ({ onBackToHome, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please provide both your HR email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await portalApi.login({
        email: email.trim(),
        password,
        targetPortal: 'hr',
      });

      if (res.data && res.data.success) {
        localStorage.setItem('zenemoo_jwt_token', res.data.token);
        localStorage.setItem('zenemoo_user_role', res.data.user?.role || 'hr');
        localStorage.setItem('zenemoo_user_profile', JSON.stringify(res.data.user));
        onLoginSuccess(res.data.token, res.data.user);
      } else {
        setErrorMsg(res.data?.message || 'HR login failed. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Access Denied: User does not have HR Portal access.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200">
      <CursorSpotlight />
      <ThreeNeuralBackground />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button onClick={onBackToHome} className="flex items-center gap-3 group cursor-pointer">
            <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md" />
            <span className="font-display font-extrabold text-base sm:text-lg text-white tracking-wider">ZENEMOO</span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
              HR Operations Portal
            </span>
          </button>

          <button
            onClick={onBackToHome}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono font-bold text-slate-300 flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-purple-400" />
            <span>Return to Site</span>
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 py-12 relative z-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
              <UserCheck className="w-4 h-4 text-purple-400" /> AUTHORIZED HR ACCESS ONLY
            </div>
            <h1 className="text-3xl font-extrabold font-display text-white tracking-tight">
              HR Portal Sign In
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Sign in with your HR personnel credentials to access candidate communications, company email operations, and notifications.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-purple-500/30 shadow-2xl space-y-6">
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono space-y-1">
                <div className="font-bold flex items-center gap-2">⚠️ Authentication Error</div>
                <div>{errorMsg}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 font-bold mb-1.5">
                  HR Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. sangita@zenemoo.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-purple-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 font-bold mb-1.5">
                  HR Portal Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your HR portal password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-purple-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-mono flex items-start gap-2">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
                <div>
                  <span className="font-bold">Initial Default Password:</span> <code className="px-1.5 py-0.5 rounded bg-purple-950 font-bold">Team@123</code> (Assigned by Admin).
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono font-bold text-xs tracking-wider uppercase transition-all shadow-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying HR Credentials...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    <span>Sign In to HR Portal</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-white/10 text-center text-xs font-mono text-slate-500 relative z-10">
        &copy; 2026 Zenemoo Enterprise AI Language &amp; Data Solutions. HR Operations Access Controlled.
      </footer>
    </div>
  );
};
