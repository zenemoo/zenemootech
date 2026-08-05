import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, ShieldAlert, CheckCircle, ArrowRight, RefreshCw, Key } from 'lucide-react';
import { authApi } from '../services/api';
import { ImageWithSkeleton } from './ImageWithSkeleton';

interface ForgotPasswordPageProps {
  onNavigateVerify: (email: string) => void;
  onReturnLogin: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateVerify,
  onReturnLogin,
}) => {
  const [email, setEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Live Email Validation as User Types
  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setIsAuthorized(null);
      setValidationMessage('');
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      setErrorMsg('');
      try {
        const res = await authApi.checkEmail(trimmed);
        if (res.data && res.data.exists) {
          setIsAuthorized(true);
          setValidationMessage('✅ Administrator account found.');
        } else {
          setIsAuthorized(false);
          setValidationMessage('❌ You are not an authorized administrator.');
        }
      } catch (err: any) {
        // Fallback authorization check
        const allowed = [
          'prem@zenemoo.in',
          'contact@zenemoo.in',
          'support@zenemoo.in',
          'info@zenemoo.in',
          'noreply@zenemoo.in',
          'zenemootech@gmail.com',
          'mr.prem2006@gmail.com',
        ];
        if (allowed.includes(trimmed) || trimmed.endsWith('@zenemoo.in')) {
          setIsAuthorized(true);
          setValidationMessage('✅ Administrator account found.');
        } else {
          setIsAuthorized(false);
          setValidationMessage('❌ You are not an authorized administrator.');
        }
      } finally {
        setIsValidating(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [email]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !email.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await authApi.forgotPassword(email.trim());
      onNavigateVerify(email.trim());
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to dispatch Telegram OTP. Please retry.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-slate-200 flex items-center justify-center p-4 relative z-50 font-sans">
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-cyan-500/30 max-w-md w-full space-y-6 text-center shadow-2xl relative">
        {/* Header Logo */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] mx-auto shadow-lg shadow-cyan-500/25">
          <ImageWithSkeleton src="/assets/logo.png" alt="Zenemoo Logo" className="w-full h-full object-cover rounded-full bg-white p-0.5" fallbackType="logo" isAvatar />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold font-display text-white tracking-tight">
            Forgot Password
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1.5 leading-relaxed">
            Enter your registered administrator email address.
          </p>
        </div>

        <form onSubmit={handleContinue} className="space-y-4 text-left font-mono">
          <div>
            <label className="block text-xs text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" /> Email Address
              </span>
              {isValidating && (
                <span className="text-[10px] text-cyan-400 flex items-center gap-1 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Validating...
                </span>
              )}
            </label>
            <input
              type="email"
              required
              placeholder="e.g. admin@zenemoo.in or gmail..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl bg-white/[0.04] border text-white placeholder-slate-500 focus:outline-none transition-colors text-xs ${
                isAuthorized === true
                  ? 'border-emerald-500/60 focus:border-emerald-400'
                  : isAuthorized === false
                  ? 'border-red-500/60 focus:border-red-400'
                  : 'border-white/10 focus:border-cyan-400'
              }`}
            />

            {/* Validation Message Display */}
            {validationMessage && (
              <div
                className={`text-xs p-3 rounded-xl border mt-2 font-bold ${
                  isAuthorized
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {validationMessage}
              </div>
            )}

            {errorMsg && (
              <div className="text-xs p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 mt-2">
                {errorMsg}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!isAuthorized || isSubmitting || isValidating}
            className={`w-full py-3.5 rounded-xl font-bold font-display text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              isAuthorized && !isSubmitting && !isValidating
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black shadow-cyan-500/25 opacity-100'
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
          className="text-xs font-mono text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </button>
      </div>
    </div>
  );
};
