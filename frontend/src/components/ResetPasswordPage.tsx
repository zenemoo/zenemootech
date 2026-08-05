import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, X, RefreshCw, ShieldCheck, ArrowRight } from 'lucide-react';
import { authApi } from '../services/api';

interface ResetPasswordPageProps {
  email: string;
  otp: string;
  onSuccessRedirectLogin: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  email,
  otp,
  onSuccessRedirectLogin,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Password Strength Requirement Checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const validCount = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const isPasswordValid = validCount === 5 && isMatch;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await authApi.resetPassword(email, otp, newPassword);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccessRedirectLogin();
      }, 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update admin password. Please try again.';
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
          <h2 className="text-2xl font-extrabold font-display text-white tracking-tight">
            Create New Password
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1.5 leading-relaxed">
            Set a strong security password for <span className="text-cyan-300 font-bold">{email}</span>
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2 text-center animate-fade-in">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold font-display text-white">Password Updated Successfully!</h3>
              <p className="text-[11px] text-slate-300">
                Your new password has been encrypted with bcrypt and saved in Supabase. Redirecting to Login...
              </p>
            </div>
            <button
              onClick={onSuccessRedirectLogin}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-display text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Log In Now <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4 text-left font-mono">
            {/* New Password Input */}
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" /> New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  placeholder="Enter new strong password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" /> Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Strength Requirements List */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-[11px]">
              <div className="font-bold text-slate-300 mb-1">Password Requirements:</div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} 8+ Characters
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasUpper ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} Uppercase
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasLower ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} Lowercase
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} Number
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasSpecial ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} Special Character
                </div>
                <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} Passwords Match
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="text-xs p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={!isPasswordValid || isSubmitting}
              className={`w-full py-3.5 rounded-xl font-bold font-display text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                isPasswordValid && !isSubmitting
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black shadow-cyan-500/25 opacity-100'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" /> Updating Password...
                </>
              ) : (
                'Update Password & Logout Sessions'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
