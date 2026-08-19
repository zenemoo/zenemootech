import React, { useState, useEffect } from 'react';
import { Sparkles, Mic, Languages, Cpu, Users, Handshake, Mail, Menu, X, ArrowLeft, Briefcase, Home, Star, Database } from 'lucide-react';
import { SeoImage } from '../seo/components/SeoImage';
import { useActiveLogo } from '../lib/useActiveLogo';

interface NavbarProps {
  onBack?: () => void;
  showBackButton?: boolean;
  onOpenAiDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onBack, showBackButton, onOpenAiDrawer }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logoUrl, isLoading } = useActiveLogo();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'AI Data Portfolio', href: '/ai-data', icon: Database },
    { name: 'Services', href: '/#services', icon: Mic },
    { name: 'Languages', href: '/#languages', icon: Languages },
    { name: 'Opportunities', href: '/opportunities', icon: Briefcase },
    { name: 'Reviews', href: '/review', icon: Star },
    { name: 'Team', href: '/team-directory', icon: Users },
    { name: 'Contact', href: '/#contact', icon: Mail },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#050505]/90 backdrop-blur-xl border-b border-white/10 py-3 shadow-2xl shadow-cyan-950/30'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Company Name (ZENEMOO) */}
          <a href="/" className="flex items-center gap-3 group shrink-0">
            {isLoading ? (
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-slate-900 animate-pulse border border-white/10 shrink-0" />
            ) : (
              <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-400/50 group-hover:scale-105 transition-all duration-300">
                <SeoImage
                  src={logoUrl || '/assets/logo.png'}
                  alt="Zenemoo Official Logo — Enterprise AI Language & Data Solutions"
                  priority={true}
                  width={44}
                  height={44}
                  className="w-full h-full object-contain rounded-full bg-white p-0.5"
                  fallbackSrc="/assets/logo.png"
                />
              </div>
            )}
            <span className="text-xl sm:text-2xl font-extrabold tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors">
              ZENEMOO
            </span>
          </a>

          {/* Center Navigation OR Dedicated Page Back Button */}
          {showBackButton && onBack ? (
            <button
              onClick={onBack}
              className="hidden md:inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-all cursor-pointer group shadow-lg shadow-cyan-500/10"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
              <span>Return to Zenemoo Home</span>
            </button>
          ) : (
            <nav className="hidden xl:flex items-center gap-1 bg-white/[0.03] p-1.5 rounded-full border border-white/10 backdrop-blur-md">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    {link.name}
                  </a>
                );
              })}
            </nav>
          )}

          {/* AI Data Portfolio Header Button & Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/ai-data"
              className="relative group flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-indigo-500/10 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all duration-300 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 cursor-pointer"
              title="Explore AI Data Portfolio"
              aria-label="Explore AI Data Portfolio"
            >
              <Database className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-mono font-bold tracking-tight hidden sm:inline">AI Data Portfolio</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
            </a>

            {/* Mobile Drawer Hamburger Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="xl:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="xl:hidden mt-3 px-4 pt-2 pb-6 bg-[#090a0f]/95 border-b border-white/10 backdrop-blur-2xl shadow-2xl rounded-b-2xl">
          <div className="flex flex-col gap-2">
            {/* Top Back Button inside Drawer if on dedicated page */}
            {showBackButton && onBack && (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onBack();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 mb-1 transition-all hover:bg-cyan-500/30"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400" />
                Return to Zenemoo Home
              </button>
            )}

            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.name}
                  href={showBackButton && onBack ? `/#team` : link.href}
                  onClick={() => {
                    setMobileOpen(false);
                    if (showBackButton && onBack) {
                      onBack();
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/10 transition-all"
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  {link.name}
                </a>
              );
            })}
          </div>
        </div>
      )}

    </header>
  );
};

