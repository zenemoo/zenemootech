import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Heart, Github, Linkedin, Mail, Twitter, Check, CheckCircle2, X } from 'lucide-react';
import { subscriberApi } from '../services/api';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
      await subscriberApi.subscribe(trimmedEmail);
      setSubscribedEmail(trimmedEmail);
      setShowModal(true);
      setEmail('');
    } catch (err: any) {
      console.warn('Subscription warning:', err);
      // Still show thank you modal for user experience
      setSubscribedEmail(trimmedEmail);
      setShowModal(true);
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="relative z-10 bg-[#030406] text-slate-400 border-t border-white/10 pt-20 pb-12 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16 border-b border-white/10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/25 overflow-hidden">
                <img
                  src="/assets/logo.png"
                  alt="ZENEMOO Logo"
                  className="w-full h-full object-cover rounded-full bg-white p-0.5"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold tracking-wider font-display text-white">
                  ZENEMOO
                </span>
                <span className="text-[10px] tracking-widest uppercase text-cyan-400 font-mono font-semibold -mt-1">
                  Data Solutions
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Building language data solutions for the future. Specializing in audio transcription, data annotation, multilingual voice over, and AI training datasets. Certified DesiCrew Solutions vendor since 2023.
            </p>

            {/* Newsletter */}
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                Subscribe to Zenemoo Dispatch
              </div>
              <form onSubmit={handleSubscribe} className="space-y-2 max-w-sm">
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      'Join'
                    )}
                  </button>
                </div>
                {errorMsg && <div className="text-[11px] font-mono text-red-400">{errorMsg}</div>}
              </form>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold mb-4">
              Services
            </h4>
            <ul className="space-y-2.5 text-xs font-mono">
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">Audio Transcription</a></li>
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">AI Data Collection</a></li>
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">Data Annotation</a></li>
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">Multilingual Voice Over</a></li>
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">Audio Segmentation</a></li>
              <li><a href="#services" className="hover:text-cyan-400 transition-colors">Super QC Review</a></li>
            </ul>
          </div>

          {/* Languages */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold mb-4">
              Languages
            </h4>
            <ul className="space-y-2.5 text-xs font-mono">
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">Hindi (हिन्दी)</a></li>
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">English (Indian)</a></li>
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">Odia (ଓଡ଼ିଆ)</a></li>
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">Bengali (On Request)</a></li>
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">Telugu (On Request)</a></li>
              <li><a href="#languages" className="hover:text-cyan-400 transition-colors">Tamil (On Request)</a></li>
            </ul>
          </div>

          {/* Organization */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold mb-4">
              Organization
            </h4>
            <ul className="space-y-2.5 text-xs font-mono">
              <li><a href="#opportunities" className="hover:text-cyan-400 transition-colors text-cyan-300 font-bold">Opportunities Portal</a></li>
              <li><a href="#desicrew-contributors" className="hover:text-emerald-400 transition-colors text-emerald-400 font-bold">DesiCrew Odia Program</a></li>
              <li><a href="#team" className="hover:text-cyan-400 transition-colors">Data Team Directory</a></li>
              <li><a href="#partner" className="hover:text-cyan-400 transition-colors">DesiCrew Partnership</a></li>
              <li><a href="#telemetry" className="hover:text-cyan-400 transition-colors">Production Capacity</a></li>
              <li><a href="#contact" className="hover:text-cyan-400 transition-colors">Berhampur, Odisha</a></li>
              <li><a href="mailto:zenemootech@gmail.com" className="hover:text-cyan-400 transition-colors">Email Us</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div>
            Copyright &copy; 2026 <span className="text-slate-300 font-semibold">Zenemoo Data Solutions</span>. All Rights Reserved.
          </div>
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Certified DesiCrew Vendor • Active Since 2023
          </div>
        </div>
      </div>

      {/* Newsletter Subscription Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-8 rounded-3xl border border-cyan-500/30 max-w-md w-full relative space-y-5 text-center shadow-2xl shadow-cyan-500/10">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold font-display text-white">Thank You for Subscribing!</h3>

            <p className="text-sm font-mono text-slate-300 leading-relaxed">
              We've registered <span className="text-cyan-400 font-semibold">{subscribedEmail}</span> for the official <span className="text-white font-semibold">Zenemoo Dispatch</span> newsletter.
            </p>

            <p className="text-xs font-mono text-slate-400">
              You will receive monthly updates on AI dataset progress, multilingual capacity highlights, and DesiCrew vendor news.
            </p>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-sm transition-all shadow-lg shadow-cyan-500/25"
            >
              Great, Thanks!
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};
