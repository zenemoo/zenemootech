import React, { useState, useEffect } from 'react';
import { Sparkles, Mic, Tags, Languages, Cpu, Users, Handshake, Mail, Menu, X, Sun, Moon, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Services', href: '#services', icon: Mic },
    { name: 'Languages', href: '#languages', icon: Languages },
    { name: 'Studio', href: '#playground', icon: Sparkles },
    { name: 'Capacity', href: '#telemetry', icon: Cpu },
    { name: 'DesiCrew Partner', href: '#partner', icon: Handshake },
    { name: 'Team', href: '#team', icon: Users },
    { name: 'Contact', href: '#contact', icon: Mail },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#050505]/90 light:bg-white/90 backdrop-blur-xl border-b border-white/10 light:border-black/10 py-3 shadow-2xl shadow-cyan-950/30'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Company Name (ZENEMOO) */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-400/50 group-hover:scale-105 transition-all duration-300">
              <img
                src="/assets/logo.png"
                alt="ZENEMOO Logo"
                className="w-full h-full object-cover rounded-full bg-white p-0.5"
              />
            </div>
            <span className="text-2xl font-extrabold tracking-wider font-display text-white light:text-slate-900 group-hover:text-cyan-400 transition-colors">
              ZENEMOO
            </span>
          </a>

          {/* Nav Links */}
          <nav className="hidden xl:flex items-center gap-1 bg-white/[0.03] light:bg-black/[0.04] p-1.5 rounded-full border border-white/10 light:border-black/10 backdrop-blur-md">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.name}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-300 light:text-slate-700 hover:text-white light:hover:text-black hover:bg-white/10 light:hover:bg-black/10 transition-all duration-200"
                >
                  <Icon className="w-3.5 h-3.5 text-cyan-400" />
                  {link.name}
                </a>
              );
            })}
          </nav>

          {/* Theme Toggle Button (Dark / Light Mode) */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark/Light Mode"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] light:bg-slate-200/80 border border-white/10 light:border-slate-300/80 text-slate-300 light:text-slate-800 hover:bg-white/10 light:hover:bg-slate-300/80 transition-all duration-200 shadow-md"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                  <span className="text-xs font-mono font-semibold hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-mono font-semibold hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="xl:hidden p-2 rounded-xl bg-white/5 light:bg-black/5 border border-white/10 light:border-black/10 text-slate-300 light:text-slate-800 hover:text-white"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="xl:hidden mt-3 px-4 pt-2 pb-6 bg-[#090a0f]/95 light:bg-white/95 border-b border-white/10 light:border-black/10 backdrop-blur-2xl">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-200 light:text-slate-800 hover:bg-white/10 light:hover:bg-black/5"
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
