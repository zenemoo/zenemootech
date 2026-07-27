import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Heart, Github, Linkedin, Mail, Twitter, Check } from 'lucide-react';

export const Footer: React.FC = () => {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setTimeout(() => {
      setSubscribed(false);
      setEmail('');
    }, 3000);
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
              {subscribed ? (
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Check className="w-4 h-4" /> Subscribed to Zenemoo Updates!
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm">
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors shrink-0"
                  >
                    Join
                  </button>
                </form>
              )}
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
              <li><a href="#team" className="hover:text-cyan-400 transition-colors">Data Team Directory</a></li>
              <li><a href="#partner" className="hover:text-cyan-400 transition-colors">DesiCrew Partnership</a></li>
              <li><a href="#telemetry" className="hover:text-cyan-400 transition-colors">Production Capacity</a></li>
              <li><a href="#contact" className="hover:text-cyan-400 transition-colors">Berhampur, Odisha</a></li>
              <li><a href="mailto:quantumcoderstechlab@gmail.com" className="hover:text-cyan-400 transition-colors">Email Us</a></li>
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
    </footer>
  );
};
