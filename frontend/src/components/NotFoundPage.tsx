import React, { useState } from 'react';
import { ArrowLeft, Search, Home, Briefcase, FileText, Mail, Sparkles, Shield } from 'lucide-react';
import { CursorSpotlight } from './CursorSpotlight';
import { ThreeNeuralBackground } from './ThreeNeuralBackground';

interface NotFoundPageProps {
  onReturnHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onReturnHome }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      window.location.hash = 'opportunities';
      onReturnHome();
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] light:bg-[#f8fafc] text-slate-100 light:text-slate-900 flex flex-col justify-between relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Interactive Mouse Spotlight */}
      <CursorSpotlight />

      {/* 3D WebGL Neural Background Canvas */}
      <ThreeNeuralBackground />

      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 light:bg-white/80 backdrop-blur-xl border-b border-white/10 light:border-slate-200 py-4 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button onClick={onReturnHome} className="flex items-center gap-3 group cursor-pointer">
            <img src="/assets/logo.png" alt="ZENEMOO Logo" className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md" />
            <span className="font-display font-extrabold text-base sm:text-lg text-white light:text-slate-900 tracking-wider">ZENEMOO</span>
          </button>

          <button
            onClick={onReturnHome}
            className="px-3 sm:px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] light:bg-slate-100 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-xs font-mono font-bold text-slate-300 light:text-slate-700 flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Return to Homepage</span>
          </button>
        </div>
      </header>

      {/* Main 404 Hero Container */}
      <main className="flex-1 py-16 sm:py-24 relative z-10 flex items-center justify-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Big 404 Glowing Badge */}
          <div className="relative inline-block">
            <div className="text-8xl sm:text-9xl font-extrabold font-display tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 animate-pulse">
              404
            </div>
            <div className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold -mt-2">
              Page Not Found &bull; Error 404
            </div>
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
              The Page You Are Looking For Does Not Exist
            </h1>
            <p className="text-sm font-sans text-slate-400 leading-relaxed">
              The requested URL may have moved, been renamed, or is temporarily unavailable. Use the search bar below or explore our recommended site sections.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search services, opportunities, or team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-5 py-3.5 pr-12 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 shadow-xl"
              />
              <button
                type="submit"
                className="absolute right-2 p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black cursor-pointer transition-colors"
                title="Search Zenemoo"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Suggested Pages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4 font-mono text-xs">
            <a
              href="#opportunities"
              onClick={onReturnHome}
              className="p-4 rounded-2xl glass-panel border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all space-y-1.5 text-left group"
            >
              <Briefcase className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-white">Opportunities</div>
              <div className="text-[11px] text-slate-500">View live program listings</div>
            </a>

            <a
              href="#services"
              onClick={onReturnHome}
              className="p-4 rounded-2xl glass-panel border border-white/10 hover:border-purple-500/40 text-slate-300 hover:text-white transition-all space-y-1.5 text-left group"
            >
              <Sparkles className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-white">AI Data Services</div>
              <div className="text-[11px] text-slate-500">Audio, Annotation &amp; Voice</div>
            </a>

            <a
              href="#contact"
              onClick={onReturnHome}
              className="p-4 rounded-2xl glass-panel border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all space-y-1.5 text-left group"
            >
              <Mail className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-white">Contact Us</div>
              <div className="text-[11px] text-slate-500">Get in touch with our team</div>
            </a>
          </div>

          {/* Return Home Button */}
          <div className="pt-4">
            <button
              onClick={onReturnHome}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:opacity-95 text-black font-bold font-mono text-xs shadow-xl shadow-cyan-500/20 inline-flex items-center gap-2 cursor-pointer transition-all"
            >
              <Home className="w-4 h-4" /> Return to Zenemoo Homepage
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 light:border-slate-200 bg-[#050505]/60 light:bg-white/60 backdrop-blur-md text-center text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          Copyright &copy; 2026 <span className="text-slate-200 font-semibold">Zenemoo</span>. All Rights Reserved. (Formerly known as QuantumCoders Data Solution)
        </div>
      </footer>
    </div>
  );
};
