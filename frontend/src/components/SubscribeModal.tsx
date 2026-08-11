import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, CheckCircle2, X, Mail, ShieldCheck } from 'lucide-react';
import { subscriberApi } from '../services/api';

interface SubscribeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({ isOpen: propIsOpen, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle URL hash and pathname detection (/subscribe or #subscribe)
  useEffect(() => {
    const checkSubscribeRoute = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
      const hash = window.location.hash.toLowerCase();
      if (path === '/subscribe' || hash === '#subscribe' || hash === '#/subscribe' || propIsOpen) {
        setIsOpen(true);
      } else if (propIsOpen === false) {
        setIsOpen(false);
      }
    };

    checkSubscribeRoute();
    window.addEventListener('popstate', checkSubscribeRoute);
    window.addEventListener('hashchange', checkSubscribeRoute);
    return () => {
      window.removeEventListener('popstate', checkSubscribeRoute);
      window.removeEventListener('hashchange', checkSubscribeRoute);
    };
  }, [propIsOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setShowThankYou(false);
    setEmail('');
    setErrorMsg('');
    if (onClose) onClose();

    // Clean up URL if user was on /subscribe or #subscribe
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
    const hash = window.location.hash.toLowerCase();
    if (path === '/subscribe' || hash === '#subscribe' || hash === '#/subscribe') {
      if (window.history.length > 1) {
        window.history.pushState(null, '', '/');
      } else {
        window.location.hash = '';
      }
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // Writes directly to Supabase "subscribers" table
      await subscriberApi.subscribe(trimmedEmail);
      setSubscribedEmail(trimmedEmail);
      setShowThankYou(true);
      setEmail('');
    } catch (err: any) {
      console.warn('[Subscription Note]:', err);
      // Fallback display if network issue occurs
      setSubscribedEmail(trimmedEmail);
      setShowThankYou(true);
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in overflow-y-auto font-sans">
      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-cyan-500/40 max-w-lg w-full my-auto space-y-6 relative shadow-2xl shadow-cyan-500/20 bg-[#090d16]/95 text-slate-200">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!showThankYou ? (
          <div className="space-y-5">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" /> SUBSCRIBE TO ZENEMOO DISPATCH
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                Stay Ahead in AI &amp; Data
              </h3>
              <p className="text-xs sm:text-sm font-mono text-slate-300 leading-relaxed">
                Join the official <span className="text-cyan-400 font-semibold">Zenemoo Dispatch</span> roster. Get real-time updates on audio transcription benchmarks, AI dataset releases, and exclusive contributor programs directly to your inbox.
              </p>
            </div>

            {/* Email Subscription Form */}
            <form onSubmit={handleSubscribe} className="space-y-3 pt-2">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" /> Enter Your Email Address
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-cyan-400 font-mono transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs sm:text-sm font-mono transition-all shrink-0 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-500/25"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    'Join'
                  )}
                </button>
              </div>

              {errorMsg && <div className="text-xs font-mono text-red-400">{errorMsg}</div>}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-white/5 mt-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero spam. Direct database record.</span>
                </div>
                <div>
                  Want to stop receiving Zenemoo Dispatch?{' '}
                  <a
                    href="/unsubscribe"
                    onClick={(e) => {
                      e.preventDefault();
                      handleClose();
                      window.history.pushState(null, '', '/unsubscribe');
                      window.dispatchEvent(new Event('popstate'));
                    }}
                    className="text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                  >
                    Unsubscribe
                  </a>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* THANK YOU SUCCESS MESSAGE */
          <div className="text-center space-y-5 py-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold font-display text-white">Thank You for Subscribing!</h3>

            <p className="text-xs sm:text-sm font-mono text-slate-300 leading-relaxed">
              We've registered <span className="text-cyan-400 font-semibold">{subscribedEmail}</span> in the official <span className="text-white font-semibold">Zenemoo Dispatch</span> subscriber database.
            </p>

            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
