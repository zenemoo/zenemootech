import React, { useState } from 'react';
import { ArrowLeft, Mail, ArrowRight, RefreshCw, Key } from 'lucide-react';
import { authApi } from '../services/api';

interface ForgotPasswordPageProps {
  onNavigateVerify: (email: string) => void;
  onReturnLogin: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateVerify,
  onReturnLogin,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid administrator email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await authApi.forgotPassword(cleanEmail);
      onNavigateVerify(cleanEmail);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to dispatch Telegram OTP. Please retry.';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-slate-200 flex items-center justify-center p-4 relative z-50 font-sans">
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-cyan-500/30 max-w-md w-full space-y-6 text-center shadow-2xl relative">
        {/* Header Logo */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] mx-auto shadow-lg shadow-cyan-500/25">
          <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold font-display text-white tracking-tight flex items-center justify-center gap-2">
            <Key className="w-6 h-6 text-cyan-400" /> Forgot Password
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1.5 leading-relaxed">
            Enter your registered administrator email address to receive a Telegram verification code.
          </p>
        </div>

        <form onSubmit={handleContinue} className="space-y-4 text-left font-mono">
          <div>
            <label className="block text-xs text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" /> Email Address
              </span>
            </label>
            <input
              type="email"
              required
              autoFocus
              placeholder="e.g. mr.prem2006@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors text-xs disabled:opacity-50"
            />

            {errorMsg && (
              <div className="text-xs p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 mt-2 font-mono">
                {errorMsg}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!email.trim() || isSubmitting}
            className={`w-full py-3.5 rounded-xl font-bold font-display text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
              email.trim() && !isSubmitting
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black shadow-cyan-500/25 cursor-pointer opacity-100'
                : 'bg-white/10 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" /> Dispatching Telegram OTP...
              </>
            ) : (
              <>
                Continue <ArrowRight className="w-4 h-4 text-black" />
              </>
            )}
          </button>
        </form>

        <button
          onClick={onReturnLogin}
          type="button"
          disabled={isSubmitting}
          className="text-xs font-mono text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </button>
      </div>
    </div>
  );
};

