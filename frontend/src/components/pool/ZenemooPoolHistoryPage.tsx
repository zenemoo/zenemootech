import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Mail,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { poolApi, PoolHistoryItem } from '../../services/poolApi';

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
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify' | 'results'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<PoolHistoryItem[]>([]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await poolApi.requestHistoryOtp(cleanEmail);
      if (res.success) {
        setStep('verify');
      } else {
        setErrorMsg(res.message || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!otp.trim()) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await poolApi.verifyHistoryOtp(cleanEmail, otp.trim());
      if (res.success) {
        if (res.token) {
          const histRes = await poolApi.getPublicHistory(res.token, cleanEmail);
          setHistory(histRes.history || []);
        } else {
          setHistory(res.history || []);
        }
        setStep('results');
      } else {
        setErrorMsg('Invalid verification code.');
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

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

          {onNavigatePools && (
            <button
              onClick={onNavigatePools}
              className="px-3.5 py-1.5 rounded-xl border border-white/10 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-white bg-white/5 transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Pools</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-1">
        {step === 'request' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0d1022]/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 shadow-lg shadow-cyan-500/10">
              <Clock className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Look Up Your Pool Submissions</h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              To protect your privacy, enter the email address you used when answering Zenemoo talent interest pools. We will send a single-use verification code to authenticate your request.
            </p>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-white/15 focus:border-cyan-400 text-sm text-white placeholder-slate-500 transition-all outline-none"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-lg">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0d1022]/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 shadow-lg shadow-cyan-500/10">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Enter Verification Code</h2>
            <p className="text-xs text-slate-400 mb-6">
              We sent a 6-digit code to <strong className="text-cyan-300">{email}</strong>.
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-2">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[8px] font-mono text-xl py-3 rounded-xl bg-slate-900/90 border border-white/15 focus:border-cyan-400 text-white placeholder-slate-600 transition-all outline-none"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-lg">
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Change Email
                </button>

                <button
                  type="submit"
                  disabled={isLoading || otp.length < 6}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>View History</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 'results' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">Your Participation History</h2>
                <p className="text-xs text-slate-400">
                  Showing submissions for <span className="text-cyan-300 font-mono">{email}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setStep('request');
                  setOtp('');
                }}
                className="text-xs text-cyan-400 hover:underline"
              >
                Log Out
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-12 px-6 rounded-2xl border border-white/10 bg-[#0d1022] space-y-3">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No Responses Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  We did not find any pool interest responses submitted with this email address.
                </p>
                {onNavigatePools && (
                  <button
                    onClick={onNavigatePools}
                    className="mt-3 px-4 py-2 rounded-xl bg-cyan-500 text-black font-semibold text-xs inline-flex items-center gap-1.5"
                  >
                    <span>Browse Open Pools</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-white/10 bg-[#0d1022] space-y-3 shadow-lg"
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
        © {new Date().getFullYear()} Zenemoo Data Solutions.
      </footer>
    </div>
  );
};
