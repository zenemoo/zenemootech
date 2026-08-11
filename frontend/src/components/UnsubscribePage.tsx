import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { subscriberApi } from '../services/api';

export const UnsubscribePage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [unsubscribedEmail, setUnsubscribedEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    document.title = 'Unsubscribe from Zenemoo Dispatch | Zenemoo';
    window.scrollTo(0, 0);

    // Pre-fill email if passed in query param (e.g. /unsubscribe?email=user@example.com)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const prefillEmail = urlParams.get('email');
      if (prefillEmail) {
        setEmail(prefillEmail.trim().toLowerCase());
      }
    } catch (_) {}
  }, []);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await subscriberApi.unsubscribe(cleanEmail);
      const data = res.data;

      if (data.code === 'ALREADY_UNSUBSCRIBED') {
        setInfoMsg(data.message || 'This email is already unsubscribed from Zenemoo Dispatch.');
      } else {
        setUnsubscribedEmail(cleanEmail);
        setIsSuccess(true);
      }
    } catch (err: any) {
      const resData = err.response?.data;
      if (resData?.code === 'NOT_SUBSCRIBED' || err.response?.status === 404) {
        setErrorMsg("You're not subscribed to Zenemoo Dispatch.");
      } else if (resData?.code === 'INVALID_EMAIL' || err.response?.status === 400) {
        setErrorMsg(resData?.message || 'Please enter a valid email address.');
      } else {
        setErrorMsg(resData?.message || "We couldn't process your request right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation Header */}
      <div className="w-full max-w-lg mb-6 flex items-center justify-between z-10">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigateHome();
          }}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Zenemoo
        </a>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-400 text-xs font-mono">
            Z
          </div>
          <span className="font-bold font-display tracking-tight text-sm text-white">Zenemoo</span>
        </div>
      </div>

      {/* Main Glass Panel Card */}
      <div className="w-full max-w-lg glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative z-10 shadow-2xl space-y-6">
        {isSuccess ? (
          /* SUCCESS STATE */
          <div className="text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold font-display text-white tracking-tight">
                Successfully Unsubscribed
              </h1>
              <p className="text-sm font-mono text-slate-300">
                <span className="text-cyan-300 font-bold">{unsubscribedEmail}</span> has been removed from the Zenemoo Dispatch mailing list.
              </p>
              <p className="text-xs font-mono text-slate-400 pt-1">
                You will no longer receive newsletter emails from us. If this was a mistake, you can re-subscribe anytime on our homepage.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={navigateHome}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-display text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Zenemoo
              </button>
            </div>
          </div>
        ) : (
          /* FORM STATE */
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono mb-1">
                <ShieldAlert className="w-3.5 h-3.5" /> ZENEMOO DISPATCH PREFERENCES
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                Unsubscribe from Zenemoo Dispatch
              </h1>
              <p className="text-xs sm:text-sm font-mono text-slate-400">
                Enter your email address below to unsubscribe from Zenemoo Dispatch.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{infoMsg}</span>
              </div>
            )}

            <form onSubmit={handleUnsubscribe} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg('');
                      if (infoMsg) setInfoMsg('');
                    }}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold font-display text-sm transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Unsubscribing...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    Unsubscribe
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  navigateHome();
                }}
                className="hover:text-cyan-300 underline"
              >
                Cancel &amp; Return to Zenemoo
              </a>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Zero-Spam Guarantee
              </span>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-8 text-center text-xs font-mono text-slate-400 z-10">
        &copy; {new Date().getFullYear()} Zenemoo Tech. All rights reserved.
      </footer>
    </div>
  );
};
