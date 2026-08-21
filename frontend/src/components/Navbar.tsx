import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Mic,
  Languages,
  Users,
  Mail,
  Menu,
  X,
  ArrowLeft,
  Briefcase,
  Home,
  Star,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { SeoImage } from '../seo/components/SeoImage';
import { useActiveLogo } from '../lib/useActiveLogo';
import { NotificationCenter } from './NotificationCenter';

interface NavbarProps {
  onBack?: () => void;
  showBackButton?: boolean;
  backButtonLabel?: string;
  onOpenAiDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onBack, showBackButton, backButtonLabel, onOpenAiDrawer }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logoUrl, isLoading } = useActiveLogo();
  const [currentHash, setCurrentHash] = useState('');
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
      setCurrentHash(window.location.hash);

      const handleLocationChange = () => {
        setCurrentPath(window.location.pathname);
        setCurrentHash(window.location.hash);
      };
      window.addEventListener('hashchange', handleLocationChange);
      return () => window.removeEventListener('hashchange', handleLocationChange);
    }
  }, []);

  // Lock body scroll & listen for Escape key when mobile drawer is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };

    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen]);

  const navLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Services', href: '/#services', icon: Mic },
    { name: 'Languages', href: '/#languages', icon: Languages },
    { name: 'Team', href: '/#team', icon: Users },
    { name: 'Opportunities', href: '/opportunities', icon: Briefcase },
    { name: 'Reviews', href: '/review', icon: Star },
    { name: 'Contact', href: '/#contact', icon: Mail },
  ];

  const [activeSection, setActiveSection] = useState<string>('Home');

  // Intelligent Scroll-Aware Active Section Tracker using IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check dedicated page paths first
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (
      path === '/opportunities' ||
      path === '/projects' ||
      path === '/programs' ||
      hash === '#opportunities' ||
      hash === '#projects' ||
      hash === '#programs' ||
      hash === '#desicrew-contributors' ||
      hash === '#desicrew'
    ) {
      setActiveSection('Opportunities');
      return;
    }
    if (path === '/review' || path === '/reviews' || hash === '#review' || hash === '#reviews') {
      setActiveSection('Reviews');
      return;
    }

    const sections: { id: string; name: string }[] = [
      { id: 'home', name: 'Home' },
      { id: 'services', name: 'Services' },
      { id: 'languages', name: 'Languages' },
      { id: 'team', name: 'Team' },
      { id: 'opportunities', name: 'Opportunities' },
      { id: 'reviews', name: 'Reviews' },
      { id: 'contact', name: 'Contact' },
    ];

    // Initialize from URL Hash if present
    const cleanHash = hash.replace('#', '').toLowerCase();
    if (cleanHash) {
      const match = sections.find((s) => s.id === cleanHash || s.name.toLowerCase() === cleanHash);
      if (match) {
        setActiveSection(match.name);
      }
    }

    const sectionElements: { el: HTMLElement; name: string }[] = [];
    sections.forEach(({ id, name }) => {
      const el = document.getElementById(id);
      if (el) {
        sectionElements.push({ el, name });
      }
    });

    const handleTopScroll = () => {
      if (window.scrollY < 120 && (!window.location.pathname || window.location.pathname === '/')) {
        setActiveSection('Home');
      }
    };
    window.addEventListener('scroll', handleTopScroll, { passive: true });

    if (sectionElements.length === 0) return () => window.removeEventListener('scroll', handleTopScroll);

    const observerOptions = {
      root: null,
      rootMargin: '-80px 0px -40% 0px', // Accounts for fixed header height
      threshold: [0.1, 0.3, 0.5, 0.7],
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const match = sectionElements.find((s) => s.el === entry.target);
          if (match) {
            setActiveSection(match.name);
          }
        }
      });
    }, observerOptions);

    sectionElements.forEach(({ el }) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleTopScroll);
      sectionElements.forEach(({ el }) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);

  const isLinkActive = (name: string, href: string) => {
    if (activeSection) {
      return activeSection.toLowerCase() === name.toLowerCase();
    }
    if (href === '/') {
      return currentPath === '/' && (!currentHash || currentHash === '#');
    }
    if (href.startsWith('/#')) {
      const hash = href.replace('/', '');
      return (currentPath === '/' || currentPath === '') && currentHash === hash;
    }
    return currentPath === href;
  };

  return (
    <>
      <header
        aria-label="Main Navigation"
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-[#050505]/90 backdrop-blur-xl border-b border-white/10 py-3 shadow-2xl shadow-cyan-950/30'
            : 'bg-transparent py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            {/* Logo & Company Name (ZENEMOO) */}
            <a href="/" className="flex items-center gap-3 group shrink-0" aria-label="Zenemoo Home">
              {isLoading ? (
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-slate-900 animate-pulse border border-white/10 shrink-0" />
              ) : (
                <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-400/50 group-hover:scale-105 transition-all duration-300 shrink-0">
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
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-extrabold tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors leading-none">
                  ZENEMOO
                </span>
                <span className="text-[9px] font-mono text-cyan-400 tracking-tight hidden sm:block mt-0.5">
                  Enterprise AI Language &amp; Data Solutions
                </span>
              </div>
            </a>

            {/* Center Navigation OR Dedicated Page Back Button */}
            {showBackButton && onBack ? (
              <button
                onClick={onBack}
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-all cursor-pointer group shadow-lg shadow-cyan-500/10"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
                <span>{backButtonLabel || 'Return to Zenemoo Home'}</span>
              </button>
            ) : (
              <nav className="hidden xl:flex items-center gap-1 bg-white/[0.03] p-1.5 rounded-full border border-white/10 backdrop-blur-md">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isLinkActive(link.name, link.href);
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                        active
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm shadow-cyan-500/20'
                          : 'text-slate-300 hover:text-white hover:bg-white/10 font-medium'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-300' : 'text-cyan-400'}`} />
                      <span>{link.name}</span>
                    </a>
                  );
                })}
              </nav>
            )}

            {/* Right Action Bar: Zenemoo AI Button, Notification Center & Mobile Hamburger Toggle */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Desktop/Tablet Zenemoo AI Button (Hidden on Mobile < sm) */}
              <button
                onClick={onOpenAiDrawer}
                className="hidden sm:flex relative group items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-indigo-500/10 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all duration-300 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 cursor-pointer"
                title="Ask Zenemoo AI"
                aria-label="Ask Zenemoo AI"
              >
                <div className="relative w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-indigo-600 p-[1px] shadow-sm animate-pulse shrink-0">
                  <SeoImage
                    src="/assets/logo.png"
                    alt="Zenemoo AI Assistant Engine"
                    priority={true}
                    width={20}
                    height={20}
                    className="w-full h-full object-cover rounded-full bg-white p-0.2"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-black" />
                </div>
                <span className="text-xs font-mono font-bold tracking-tight">Zenemoo AI</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform shrink-0" />
              </button>

              {/* Centralized Notification Center Bell (Desktop & Mobile) */}
              <NotificationCenter />

              {/* Mobile / Tablet Drawer Toggle Button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="xl:hidden p-2 rounded-2xl bg-slate-900/90 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer"
                aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation-drawer"
              >
                {mobileOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5 text-cyan-400" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE & TABLET SLIDE-IN NAVIGATION DRAWER SYSTEM */}
      {mobileOpen && (
        <div className="xl:hidden fixed inset-0 z-50 overflow-hidden">
          {/* Dark Translucent Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 cursor-pointer animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Floating Glassmorphic Slide-in Drawer Card (1-View Fit - No Internal Scrollbar) */}
          <div
            id="mobile-navigation-drawer"
            className="absolute top-3 right-3 bottom-3 w-[calc(100%-24px)] max-w-sm sm:max-w-md h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] bg-[#080912]/95 border border-cyan-500/25 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between overflow-hidden z-50 text-slate-100"
          >
            {/* Top Container: Header + Return Button + Navigation Links */}
            <div className="flex-1 flex flex-col justify-between min-h-0">
              {/* Drawer Top Header: Logo, Title, Subtitle & Close Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 sm:pb-3 shrink-0">
                <a href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
                  <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 shrink-0">
                    <SeoImage
                      src={logoUrl || '/assets/logo.png'}
                      alt="Zenemoo Logo"
                      width={40}
                      height={40}
                      className="w-full h-full object-contain rounded-full bg-white p-0.5"
                      fallbackSrc="/assets/logo.png"
                    />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors leading-tight">
                      ZENEMOO
                    </h3>
                    <p className="text-[10px] font-mono text-cyan-400 tracking-tight">
                      Enterprise AI Language &amp; Data
                    </p>
                  </div>
                </a>

                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/40 transition-colors cursor-pointer shrink-0"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5 text-slate-300" />
                </button>
              </div>

              {/* Dedicated Page Return Button (if applicable) */}
              {showBackButton && onBack && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onBack();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 transition-all hover:bg-cyan-500/30 cursor-pointer shadow-lg shadow-cyan-500/10 shrink-0 my-1"
                >
                  <ArrowLeft className="w-4 h-4 text-cyan-400" />
                  <span>{backButtonLabel || 'Return to Zenemoo Home'}</span>
                </button>
              )}

              {/* Drawer Vertical Navigation Links (Fits inside available height) */}
              <nav className="flex-1 flex flex-col justify-evenly gap-1 sm:gap-1.5 py-2 min-h-0 overflow-hidden">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isLinkActive(link.name, link.href);

                  return (
                    <a
                      key={link.name}
                      href={showBackButton && onBack ? `/#team` : link.href}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => {
                        setMobileOpen(false);
                        if (showBackButton && onBack) {
                          onBack();
                        }
                      }}
                      className={`group flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer border ${
                        active
                          ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent border-cyan-500/40 text-white font-bold shadow-md shadow-cyan-500/10'
                          : 'bg-white/[0.02] hover:bg-white/[0.07] border-white/5 text-slate-300 hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                            active
                              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                              : 'bg-slate-900 border-white/10 text-cyan-400 group-hover:border-cyan-500/30'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold truncate">{link.name}</span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-all shrink-0 ${
                          active
                            ? 'text-cyan-400 translate-x-0.5'
                            : 'text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1'
                        }`}
                      />
                    </a>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom Section: Zenemoo AI Card & Official Copyright Footer */}
            <div className="pt-2.5 sm:pt-3 border-t border-white/10 space-y-2 shrink-0 mt-auto">
              {/* Zenemoo AI Launcher Button */}
              <button
                onClick={() => {
                  setMobileOpen(false);
                  if (onOpenAiDrawer) onOpenAiDrawer();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-indigo-500/15 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all shadow-lg shadow-cyan-500/10 cursor-pointer shrink-0"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-indigo-600 p-[1px] shadow-sm animate-pulse shrink-0">
                    <SeoImage
                      src="/assets/logo.png"
                      alt="Zenemoo AI Assistant"
                      width={24}
                      height={24}
                      className="w-full h-full object-cover rounded-full bg-white p-0.2"
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-mono font-bold text-white leading-tight">Zenemoo AI</div>
                    <div className="text-[9.5px] text-cyan-400/80 font-mono leading-none">Ask Multilingual AI Assistant</div>
                  </div>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              </button>

              {/* Official Copyright Footer (Replaced Tagline) */}
              <div className="pt-1 text-center shrink-0">
                <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 tracking-tight leading-tight">
                  Copyright &copy; 2026 Zenemoo. <span className="inline-block sm:inline">All Rights Reserved.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

