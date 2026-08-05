import React, { useState, useEffect } from 'react';
import { Home, Briefcase, Sparkles, Phone, Globe, X, ExternalLink } from 'lucide-react';
import { ZENEMOO_SOCIAL_LINKS } from './SocialData';

interface MobileBottomNavProps {
  onOpenAiDrawer?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenAiDrawer }) => {
  const [isSocialSheetOpen, setIsSocialSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'ai' | 'contact' | 'social'>('home');

  // Listen to scroll / hash changes to highlight current tab
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (path.includes('zenemooai')) {
        setActiveTab('ai');
      } else if (hash === '#services') {
        setActiveTab('services');
      } else if (hash === '#contact') {
        setActiveTab('contact');
      } else if (!hash || hash === '#home') {
        setActiveTab('home');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleNavClick = (tab: 'home' | 'services' | 'ai' | 'contact' | 'social', action: () => void) => {
    setActiveTab(tab);
    action();
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar (≤768px Only) */}
      <nav
        aria-label="Mobile navigation"
        className="block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070b14]/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] rounded-t-3xl transition-all duration-300 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="h-16 px-3 flex items-center justify-around max-w-md mx-auto">
          {/* 1. Home */}
          <button
            onClick={() =>
              handleNavClick('home', () => {
                if (window.location.pathname !== '/') {
                  window.location.href = '/#home';
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  window.history.replaceState(null, '', '#home');
                }
              })
            }
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'text-cyan-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Home"
          >
            <Home className={`w-5 h-5 transition-transform ${activeTab === 'home' ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : ''}`} />
            <span className="text-[10px] font-mono tracking-tight">Home</span>
          </button>

          {/* 2. Services */}
          <button
            onClick={() =>
              handleNavClick('services', () => {
                if (window.location.pathname !== '/') {
                  window.location.href = '/#services';
                } else {
                  const el = document.getElementById('services');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else window.location.hash = '#services';
                }
              })
            }
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'text-cyan-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Services"
          >
            <Briefcase className={`w-5 h-5 transition-transform ${activeTab === 'services' ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : ''}`} />
            <span className="text-[10px] font-mono tracking-tight">Services</span>
          </button>

          {/* 3. AI Solutions */}
          <button
            onClick={() =>
              handleNavClick('ai', () => {
                if (onOpenAiDrawer) {
                  onOpenAiDrawer();
                } else {
                  window.location.href = '/zenemooai';
                }
              })
            }
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'text-cyan-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="AI Solutions"
          >
            <div className="relative">
              <Sparkles className={`w-5 h-5 transition-transform ${activeTab === 'ai' ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-purple-400'}`} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            </div>
            <span className="text-[10px] font-mono tracking-tight">AI Solutions</span>
          </button>

          {/* 4. Contact */}
          <button
            onClick={() =>
              handleNavClick('contact', () => {
                if (window.location.pathname !== '/') {
                  window.location.href = '/#contact';
                } else {
                  const el = document.getElementById('contact');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else window.location.hash = '#contact';
                }
              })
            }
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'contact'
                ? 'text-cyan-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Contact"
          >
            <Phone className={`w-5 h-5 transition-transform ${activeTab === 'contact' ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : ''}`} />
            <span className="text-[10px] font-mono tracking-tight">Contact</span>
          </button>

          {/* 5. Social */}
          <button
            onClick={() =>
              handleNavClick('social', () => {
                setIsSocialSheetOpen(true);
              })
            }
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              isSocialSheetOpen || activeTab === 'social'
                ? 'text-cyan-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Social Media Channels"
          >
            <Globe className={`w-5 h-5 transition-transform ${isSocialSheetOpen || activeTab === 'social' ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : ''}`} />
            <span className="text-[10px] font-mono tracking-tight">Social</span>
          </button>
        </div>
      </nav>

      {/* Social Media Bottom Sheet Modal (≤768px Only) */}
      {isSocialSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-fade-in md:hidden"
          onClick={() => setIsSocialSheetOpen(false)}
        >
          <div
            className="w-full bg-[#080d19] border-t border-cyan-500/30 rounded-t-3xl p-5 pb-8 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Pill Handle */}
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 mb-2"></div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  Connect with Zenemoo
                </h3>
                <p className="text-xs text-slate-400 font-mono">Official Social Media Channels</p>
              </div>
              <button
                onClick={() => setIsSocialSheetOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close social sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Social Channels List */}
            <div className="space-y-2.5 pt-1">
              {ZENEMOO_SOCIAL_LINKS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.ariaLabel}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/40 hover:bg-white/[0.07] transition-all cursor-pointer group shadow-sm active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-md"
                        style={{
                          backgroundColor: `${item.color}20`,
                          border: `1px solid ${item.color}40`,
                        }}
                      >
                        <IconComponent className="w-5 h-5" style={{ color: item.color }} />
                      </div>
                      {/* Label & Subtitle */}
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{item.handle}</div>
                      </div>
                    </div>

                    {/* External Link Arrow */}
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-cyan-300 group-hover:bg-cyan-500/20 transition-all">
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Dismiss Footer */}
            <button
              onClick={() => setIsSocialSheetOpen(false)}
              className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs font-bold transition-all cursor-pointer pt-3 mt-2 border border-white/10"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
