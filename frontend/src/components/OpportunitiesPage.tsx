import React from 'react';
import { ArrowLeft, Sparkles, CheckCircle2, Calendar, Lock, Unlock, ArrowRight, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface OpportunitiesPageProps {
  onBack: () => void;
  onSelectProgram: (programId: string) => void;
}

export const OpportunitiesPage: React.FC<OpportunitiesPageProps> = ({ onBack, onSelectProgram }) => {
  return (
    <div className="min-h-screen bg-[#050505] light:bg-[#f8fafc] text-slate-100 light:text-slate-900 flex flex-col justify-between relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 light:bg-white/80 backdrop-blur-xl border-b border-white/10 light:border-slate-200 py-4 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <img src="/assets/logo.png" alt="ZENEMOO Logo" className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md" />
            <div className="flex flex-col text-left">
              <span className="font-display font-extrabold text-base text-white light:text-slate-900 tracking-wider">ZENEMOO</span>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest -mt-0.5">Data Solutions</span>
            </div>
          </button>

          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] light:bg-slate-100 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-xs font-mono font-bold text-slate-300 light:text-slate-700 flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" /> Return to Main Site
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-20 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header section */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> PROGRAM OPPORTUNITIES PORTAL
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white light:text-slate-900 tracking-tight">
              Choose Your Program
            </h1>
            <div className="w-16 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500 rounded-full mx-auto"></div>
            <p className="text-slate-400 light:text-slate-600 text-sm sm:text-base leading-relaxed font-sans">
              Select a program below to explore and join our community-driven annotation and language collection collaborations.
            </p>
          </div>

          {/* Opportunities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Card 1: Zenemoo x DesiCrew (Active) */}
            <motion.div
              whileHover={{ y: -6 }}
              className="glass-panel p-8 rounded-3xl border border-emerald-500/30 flex flex-col justify-between relative overflow-hidden group shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>

              <div className="space-y-6">
                {/* Badge Group */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                    ACTIVE
                  </span>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                    <Unlock className="w-4 h-4" />
                  </div>
                </div>

                {/* Partner Logo Symbol */}
                <div className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight flex items-center gap-2">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">ZENEMOO</span>
                  <span className="text-purple-400 text-xl font-sans">×</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">DesiCrew</span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 light:text-slate-600 font-sans leading-relaxed">
                  Professional enterprise transcription, annotation, and translation services. Direct integration with verified corporate BPO deliverables.
                </p>

                {/* Features List */}
                <div className="space-y-3 pt-2 border-t border-white/10 font-mono text-xs text-slate-300 light:text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1.5+ Years Verified Collaboration</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Advanced Audio Transcription Tasks</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Enterprise SLA Requirements</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-cyan-300 font-bold">
                    <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Registration Open: Onboarding Active</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectProgram('desicrew')}
                className="mt-8 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:opacity-95 text-black font-bold text-xs sm:text-sm font-mono shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Explore &amp; Apply Now <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Card 2: Zenemoo x Karya (Stopped) */}
            <motion.div
              whileHover={{ y: -6 }}
              className="glass-panel p-8 rounded-3xl border border-red-500/30 flex flex-col justify-between relative overflow-hidden group opacity-85"
            >
              <div className="space-y-6">
                {/* Badge Group */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                    STOPPED
                  </span>
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>

                {/* Partner Logo Symbol */}
                <div className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight flex items-center gap-2">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">ZENEMOO</span>
                  <span className="text-purple-400 text-xl font-sans">×</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-400">Karya</span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 light:text-slate-600 font-sans leading-relaxed">
                  Regional AI training speech collection, transcription, and validation tasks designed directly for Indian regional languages and accents.
                </p>

                {/* Features List */}
                <div className="space-y-3 pt-2 border-t border-white/10 font-mono text-xs text-slate-300 light:text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Priority: Odia &amp; Regional Accents</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>₹5 per Minute of Validated Speech</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Flexible Work From Home</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-red-400 font-bold">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Onboarding Temporarily Stopped</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled
                className="mt-8 w-full py-3.5 px-6 rounded-xl bg-white/[0.04] border border-white/10 text-slate-500 font-bold text-xs sm:text-sm font-mono flex items-center justify-center gap-2 cursor-not-allowed"
              >
                Onboarding Stopped <Lock className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 light:border-slate-200 bg-[#050505]/60 light:bg-white/60 backdrop-blur-md text-center text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          &copy; 2026 ZENEMOO Data Solutions. All Rights Reserved. Vendor Partner with DesiCrew Solutions.
        </div>
      </footer>
    </div>
  );
};
