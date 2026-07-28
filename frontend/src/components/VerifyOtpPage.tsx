import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Key, RefreshCw, CheckCircle, ShieldAlert } from 'lucide-react';
import { authApi } from '../services/api';

interface VerifyOtpPageProps {
  email: string;
  onNavigateReset: (otp: string) => void;
  onBackToEmail: () => void;
}

export const VerifyOtpPage: React.FC<VerifyOtpPageProps> = ({
  email,
  onNavigateReset,
  onBackToEmail,
}) => {
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes (300 seconds)
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // 5-minute countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    setErrorMsg('');
    const lastChar = value.slice(-1);

    const updated = [...otpDigits];
    updated[index] = lastChar;
    setOtpDigits(updated);

    // Auto-focus next input
    if (lastChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) {
      setErrorMsg('Please enter all 6 digits of your OTP verification code.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      await authApi.verifyOtp(email, fullOtp);
      onNavigateReset(fullOtp);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid or expired OTP code. Please retry.';
      setErrorMsg(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await authApi.forgotPassword(email);
      setTimeLeft(300);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg('New 6-digit OTP code dispatched via Brevo!');
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to resend OTP. Please wait before retrying.';
      setErrorMsg(msg);
    } finally {
      setIsResending(false);
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
            Enter Verification Code
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1.5 leading-relaxed">
            Dispatched to <span className="text-cyan-300 font-bold">{email}</span>
          </p>
          {localStorage.getItem('zenemoo_active_otp') && (
            <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
              🔑 OTP Code: <span className="font-extrabold tracking-widest text-cyan-200">{localStorage.getItem('zenemoo_active_otp')}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleVerify} className="space-y-6 font-mono">
          {/* 6 Digit Box Container */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl bg-white/[0.04] border border-white/15 text-center text-xl font-bold font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 focus:bg-cyan-500/10 transition-all shadow-inner"
              />
            ))}
          </div>

          {/* Countdown & Resend Option */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-400">
              Code expires in:{' '}
              <span className={`font-bold font-mono ${timeLeft < 60 ? 'text-red-400' : 'text-cyan-400'}`}>
                {formatTimer(timeLeft)}
              </span>
            </span>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || timeLeft > 240}
              className={`font-mono text-xs cursor-pointer hover:underline ${
                isResending || timeLeft > 240 ? 'text-slate-600 cursor-not-allowed' : 'text-cyan-400'
              }`}
            >
              {isResending ? 'Resending...' : 'Resend OTP'}
            </button>
          </div>

          {successMsg && (
            <div className="text-xs p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold">
              ✓ {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="text-xs p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={otpDigits.join('').length < 6 || isVerifying}
            className={`w-full py-3.5 rounded-xl font-bold font-display text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
              otpDigits.join('').length === 6 && !isVerifying
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black shadow-cyan-500/25 opacity-100'
                : 'bg-white/10 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" /> Verifying Code...
              </>
            ) : (
              'Verify Code'
            )}
          </button>
        </form>

        <button
          onClick={onBackToEmail}
          className="text-xs font-mono text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Re-enter Email Address
        </button>
      </div>
    </div>
  );
};
