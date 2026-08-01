import React, { useState } from 'react';
import { Lock, IdCard, ArrowLeft, RefreshCw, Eye, EyeOff, Briefcase } from 'lucide-react';
import { CursorSpotlight } from './CursorSpotlight';
import { ThreeNeuralBackground } from './ThreeNeuralBackground';
import { portalAuthApi } from '../services/api';

interface HRLoginPageProps {
  onSuccessLogin: (userData: any, token: string) => void;
  onBackToHome: () => void;
}

export const HRLoginPage: React.FC<HRLoginPageProps> = ({ onSuccessLogin, onBackToHome }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const cleanId = employeeId.trim();
      const cleanPass = password.trim();

      const res = await portalAuthApi.portalLogin(cleanId, cleanPass, 'hr');
      if (res.data && res.data.success && res.data.token) {
        localStorage.setItem('zenemoo_jwt_token', res.data.token);
        const expiry = Date.now() + 30 * 60 * 1000;
        localStorage.setItem('zenemoo_jwt_expiry', expiry.toString());
        onSuccessLogin(res.data.user, res.data.token);
      } else {
        setErrorMsg(res.data?.message || 'HR login failed. Please check your Employee ID and password.');
      }
    } catch (err: any) {
      console.error('HR login error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Invalid Employee ID or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200">
      <CursorSpotlight />
      <ThreeNeuralBackground />

      {/* Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-4 sm:px-8 max-w-7xl mx-auto w-full flex items-center justify-between">
        <button onClick={onBackToHome} className="flex items-center gap-3 cursor-pointer group">
          <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-10 h-10 rounded-full bg-white p-0.5 shadow-md" />
          <span className="font-display font-extrabold text-lg text-white tracking-wider">ZENEMOO</span>
        </button>

        <button
          onClick={onBackToHome}
          className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono font-bold text-slate-300 flex items-center gap-2 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-purple-400" /> Return to Website
        </button>
      </header>

      {/* Main Login Form Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-3xl border border-purple-500/30 space-y-6 shadow-2xl relative">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto shadow-inner">
              <Briefcase className="w-7 h-7 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold font-display text-white tracking-tight">
              HR Operations Portal
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Sign in to access company communications &amp; HR self-service
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-purple-400" /> HR Employee ID
              </label>
              <input
                type="text"
                required
                placeholder="Enter your Employee ID (e.g. ZNM-E861A)"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" /> HR Account Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-600 hover:from-purple-400 hover:to-cyan-500 text-black font-bold font-display text-sm transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" /> Authenticating...
                </>
              ) : (
                <>Sign In to HR Portal</>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <span className="text-[11px] font-mono text-slate-500">
              Zenemoo Enterprise Language &amp; AI Data Solutions
            </span>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-4 text-center text-xs font-mono text-slate-500">
        &copy; {new Date().getFullYear()} Zenemoo Tech. All rights reserved.
      </footer>
    </div>
  );
};
