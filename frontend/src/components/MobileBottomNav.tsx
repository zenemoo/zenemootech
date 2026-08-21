import React, { useState, useEffect } from 'react';
import { 
  Home, 
  UserPlus, 
  Sparkles, 
  Phone, 
  Globe, 
  X, 
  ExternalLink, 
  MapPin, 
  Mail, 
  Headphones, 
  Info, 
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { ZENEMOO_SOCIAL_LINKS } from './SocialData';

interface MobileBottomNavProps {
  onOpenAiDrawer?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenAiDrawer }) => {
  const [isSocialSheetOpen, setIsSocialSheetOpen] = useState(false);
  const [isContactSheetOpen, setIsContactSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'talent' | 'ai' | 'contact' | 'social'>('home');

  // Prevent background scrolling when either sheet is open
  useEffect(() => {
    if (isSocialSheetOpen || isContactSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSocialSheetOpen, isContactSheetOpen]);

  // Listen to scroll / hash changes to highlight current tab
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (path.includes('zenemooai')) {
        setActiveTab('ai');
      } else if (path.includes('talent-registration')) {
        setActiveTab('talent');
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

  const handleNavClick = (tab: 'home' | 'talent' | 'ai' | 'contact' | 'social', action: () => void) => {
    setActiveTab(tab);
    action();
  };

  if (typeof window !== 'undefined' && window.location.pathname.includes('zenemooai')) {
    return null;
  }

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
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer group active:scale-95 ${
              activeTab === 'home'
                ? 'text-cyan-400 font-bold scale-105'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
            aria-label="Home"
          >
            <Home className={`w-5 h-5 transition-all group-hover:scale-110 ${activeTab === 'home' ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'group-hover:drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]'}`} />
            <span className="text-[10px] font-mono tracking-tight">Home</span>
          </button>

          {/* 2. Talent Registration */}
          <button
            onClick={() =>
              handleNavClick('talent', () => {
                window.location.href = '/talent-registration';
              })
            }
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer group active:scale-95 ${
              activeTab === 'talent'
                ? 'text-cyan-400 font-bold scale-105'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
            aria-label="Talent Registration"
          >
            <UserPlus className={`w-5 h-5 transition-all group-hover:scale-110 ${activeTab === 'talent' ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'group-hover:drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]'}`} />
            <span className="text-[10px] font-mono tracking-tight">Talent</span>
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
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer group active:scale-95 ${
              activeTab === 'ai'
                ? 'text-cyan-400 font-bold scale-105'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
            aria-label="AI Solutions"
          >
            <div className="relative">
              <Sparkles className={`w-5 h-5 transition-all group-hover:scale-110 ${activeTab === 'ai' ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-purple-400 group-hover:drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]'}`} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            </div>
            <span className="text-[10px] font-mono tracking-tight">AI Solutions</span>
          </button>

          {/* 4. Contact */}
          <button
            onClick={() =>
              handleNavClick('contact', () => {
                setIsContactSheetOpen(true);
              })
            }
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer group active:scale-95 ${
              isContactSheetOpen || activeTab === 'contact'
                ? 'text-cyan-400 font-bold scale-105'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
            aria-label="Contact"
          >
            <Phone className={`w-5 h-5 transition-all group-hover:scale-110 ${isContactSheetOpen || activeTab === 'contact' ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'group-hover:drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]'}`} />
            <span className="text-[10px] font-mono tracking-tight">Contact</span>
          </button>

          {/* 5. Social */}
          <button
            onClick={() =>
              handleNavClick('social', () => {
                setIsSocialSheetOpen(true);
              })
            }
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-2xl transition-all cursor-pointer group active:scale-95 ${
              isSocialSheetOpen || activeTab === 'social'
                ? 'text-cyan-400 font-bold scale-105'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
            aria-label="Social Media Channels"
          >
            <Globe className={`w-5 h-5 transition-all group-hover:scale-110 ${isSocialSheetOpen || activeTab === 'social' ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'group-hover:drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]'}`} />
            <span className="text-[10px] font-mono tracking-tight">Social</span>
          </button>
        </div>
      </nav>

      {/* Contact Bottom Sheet Modal (≤768px Only) */}
      {isContactSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-fade-in md:hidden"
          onClick={() => setIsContactSheetOpen(false)}
        >
          <div
            className="w-full bg-[#080d19] border-t border-cyan-500/30 rounded-t-[28px] p-4 sm:p-5 pb-6 space-y-2.5 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Pill Handle */}
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 mb-2"></div>

            {/* Header */}
            <div className="flex items-start justify-between pb-1">
              <div>
                <h3 className="text-[17px] font-bold font-display text-white flex items-center gap-2">
                  <Phone className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span>Contact Zenemoo</span>
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5 leading-tight">
                  We're here to help and answer any questions you have
                </p>
              </div>
              <button
                onClick={() => setIsContactSheetOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Close contact modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Headquarters Card */}
            <a
              href="https://www.google.com/maps/search/?api=1&query=K.+Barida,+Main+Road,+Odisha+761031"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Zenemoo Headquarters in Google Maps"
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/40 hover:bg-white/[0.06] transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-500/10 border border-red-500/30 text-red-400 transition-transform group-hover:scale-105">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Headquarters
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate">
                    K. Barida, Main Road, Odisha, India — PIN 761031
                  </div>
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-cyan-300 group-hover:bg-cyan-500/20 transition-all shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>

            {/* 2. Phone / WhatsApp Card */}
            <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/40 hover:bg-white/[0.06] transition-all group shadow-sm">
              <a
                href="tel:+919827775230"
                className="flex items-center gap-3 min-w-0 pr-2 flex-1 cursor-pointer"
                aria-label="Call Zenemoo at +91 9827775230"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 transition-transform group-hover:scale-105">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Phone / WhatsApp
                  </div>
                  <div className="text-[11px] font-mono font-bold text-emerald-400 truncate">
                    +91 9827775230
                  </div>
                </div>
              </a>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href="https://wa.me/919827775230"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  aria-label="Chat with Zenemoo on WhatsApp"
                >
                  WhatsApp
                </a>
                <a
                  href="tel:+919827775230"
                  className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-emerald-300 group-hover:bg-emerald-500/20 transition-all cursor-pointer"
                  aria-label="Call +91 9827775230"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* 3. Email Us Section Card (Grouped Directory) */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              {/* Email Us Header */}
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white">Email Us</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      Sales, Support &amp; General Inquiries
                    </div>
                  </div>
                </div>
                <div className="text-slate-500 pr-1">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>

              {/* Sub-item: Sales & Inquiries */}
              <a
                href="mailto:contact@zenemoo.in"
                aria-label="Email Sales & Inquiries at contact@zenemoo.in"
                className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-purple-500/15 border border-purple-500/30 text-purple-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs text-slate-200 group-hover:text-white font-medium truncate">
                    Sales &amp; Inquiries
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-purple-400 group-hover:text-purple-300">
                    contact@zenemoo.in
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-300" />
                </div>
              </a>

              {/* Sub-item: Technical Support */}
              <a
                href="mailto:support@zenemoo.in"
                aria-label="Email Technical Support at support@zenemoo.in"
                className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-sky-500/15 border border-sky-500/30 text-sky-400">
                    <Headphones className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs text-slate-200 group-hover:text-white font-medium truncate">
                    Technical Support
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-sky-400 group-hover:text-sky-300">
                    support@zenemoo.in
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-300" />
                </div>
              </a>

              {/* Sub-item: General Information */}
              <a
                href="mailto:info@zenemoo.in"
                aria-label="Email General Information at info@zenemoo.in"
                className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-teal-500/15 border border-teal-500/30 text-teal-400">
                    <Info className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs text-slate-200 group-hover:text-white font-medium truncate">
                    General Information
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-teal-400 group-hover:text-teal-300">
                    info@zenemoo.in
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-300" />
                </div>
              </a>
            </div>

            {/* 4. Online Contact Form (Highlighted Cyan Border Card) */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-cyan-500/15 border border-cyan-400/40 text-cyan-300">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white">
                    Online Contact Form
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-sans text-slate-400 truncate">
                    Visit our website's Contact Us section
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsContactSheetOpen(false);
                  if (window.location.pathname !== '/') {
                    window.location.href = '/#contact';
                  } else {
                    const el = document.getElementById('contact');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else window.location.hash = '#contact';
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-bold font-sans text-xs flex items-center gap-1 shadow-md shadow-cyan-500/25 transition-all shrink-0 cursor-pointer"
                aria-label="Visit Website Contact Section"
              >
                <span>Visit Website</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 5. Enterprise Quote Card */}
            <a
              href="mailto:contact@zenemoo.in?subject=Enterprise%20Quote%20Request"
              aria-label="Request custom enterprise quote"
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-purple-950/20 border border-purple-500/30 hover:border-purple-400/50 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-purple-500/15 border border-purple-400/40 text-purple-300 transition-transform group-hover:scale-105">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    Need a custom enterprise quote?
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-sans text-slate-400 truncate">
                    Email <span className="text-purple-400">contact@zenemoo.in</span> with your project details
                  </div>
                </div>
              </div>
              <div className="text-purple-400 group-hover:translate-x-0.5 transition-transform pr-1 shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </a>

            {/* Dismiss Footer Button */}
            <button
              onClick={() => setIsContactSheetOpen(false)}
              className="w-full py-2.5 sm:py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-sans text-xs font-semibold transition-all cursor-pointer mt-1 border border-white/10"
            >
              Close
            </button>
          </div>
        </div>
      )}

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

