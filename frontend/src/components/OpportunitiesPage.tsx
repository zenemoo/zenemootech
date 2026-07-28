import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, CheckCircle2, Calendar, Lock, Unlock, ArrowRight, ShieldAlert, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { OpportunityProgram, getStoredOpportunities } from '../lib/opportunityStore';

interface OpportunitiesPageProps {
  onBack: () => void;
  onSelectProgram: (programId: string) => void;
}

export const OpportunitiesPage: React.FC<OpportunitiesPageProps> = ({ onBack, onSelectProgram }) => {
  const [opportunities, setOpportunities] = useState<OpportunityProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredOpportunities().then((data) => {
      setOpportunities(data);
      setLoading(false);
    });
  }, []);

  const handleCardClick = (op: OpportunityProgram) => {
    if (op.status === 'stopped') return;
    if (op.action_url && op.action_url.startsWith('#')) {
      window.location.hash = op.action_url.replace('#', '');
    } else if (op.action_url && op.action_url.startsWith('http')) {
      window.open(op.action_url, '_blank', 'noopener,noreferrer');
    } else {
      onSelectProgram('desicrew');
    }
  };

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
          <button onClick={onBack} className="flex items-center gap-3 group cursor-pointer">
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
          {loading ? (
            <div className="text-center py-12 font-mono text-xs text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>Loading Live Opportunities...</div>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3 max-w-xl mx-auto">
              <Briefcase className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-base font-bold text-white">No Program Opportunities Available Right Now</h4>
              <p className="text-xs font-mono text-slate-400">
                Please check back soon! Opportunities created from the Admin Dashboard will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {opportunities.map((op) => {
                const isActive = op.status === 'active';
                const isStopped = op.status === 'stopped';

                return (
                  <motion.div
                    key={op.id}
                    whileHover={{ y: -6 }}
                    className={`glass-panel p-8 rounded-3xl border flex flex-col justify-between relative overflow-hidden group shadow-2xl ${
                      isStopped ? 'border-red-500/30 opacity-80' : 'border-emerald-500/30'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>
                    )}

                    <div className="space-y-6">
                      {/* Badge Group */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                              : isStopped
                              ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                              : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                          }`}
                        >
                          {op.badge || op.status}
                        </span>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {isActive ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Program Title & Poster Thumbnail */}
                      <div className="flex items-start gap-4">
                        {op.poster_url && (
                          <img
                            src={op.poster_url}
                            alt={op.title}
                            className="w-14 h-16 object-cover rounded-xl border border-white/10 shrink-0"
                          />
                        )}
                        <div>
                          <h3 className="font-display font-extrabold text-2xl tracking-tight text-white light:text-slate-900">
                            {op.title}
                          </h3>
                          <div className="text-xs font-mono text-cyan-400 mt-0.5">{op.partner_name}</div>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-300 light:text-slate-600 font-sans leading-relaxed">
                        {op.description}
                      </p>

                      {/* Features List */}
                      {op.features && op.features.length > 0 && (
                        <div className="space-y-2.5 pt-2 border-t border-white/10 font-mono text-xs text-slate-300 light:text-slate-700">
                          {op.features.map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-2.5">
                              {isActive ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                              )}
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      disabled={isStopped}
                      onClick={() => handleCardClick(op)}
                      className={`mt-8 w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm font-mono flex items-center justify-center gap-2 transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:opacity-95 text-black shadow-lg shadow-emerald-500/20 cursor-pointer'
                          : 'bg-white/[0.04] border border-white/10 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isActive ? (
                        <>
                          Explore &amp; Apply Now <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Onboarding Stopped <Lock className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
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
