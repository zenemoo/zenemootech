import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  User,
  Briefcase,
  FileCheck,
  LogOut,
  Menu,
  X,
  Sparkles,
  ExternalLink,
  Mail,
  ShieldCheck,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  Heart,
  Globe,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { NotificationCenter } from '../NotificationCenter';
import { ZenemooAiDrawer } from '../ZenemooAiDrawer';
import { SeoImage } from '../../seo/components/SeoImage';

export type TalentHubTab = 'dashboard' | 'profile' | 'opportunities' | 'applications' | 'support-zenemooindia';

interface TalentHubLayoutProps {
  currentTab: TalentHubTab;
  onNavigate: (tab: TalentHubTab) => void;
  children: React.ReactNode;
}

export const TalentHubLayout: React.FC<TalentHubLayoutProps> = ({
  currentTab,
  onNavigate,
  children,
}) => {
  const { user, talentProfile, signOut, refreshTalentHubData, isRefreshing } = useTalentHubAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [showRefreshFeedback, setShowRefreshFeedback] = useState(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const displayName =
    talentProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Zenemoo Contributor';
  const displayEmail = user?.email || talentProfile?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile' as const, label: 'My Profile', icon: User },
    { id: 'opportunities' as const, label: 'Opportunities', icon: Briefcase },
    { id: 'applications' as const, label: 'My Applications', icon: FileCheck },
  ];

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    await refreshTalentHubData(true);
    setShowRefreshFeedback(true);
    setTimeout(() => setShowRefreshFeedback(false), 2000);
  };

  const handleNavClick = (tab: TalentHubTab) => {
    setMobileMenuOpen(false);
    onNavigate(tab);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 font-sans relative w-full max-w-full min-w-0 overflow-x-hidden">
      {/* ── Top Navigation Header ── */}
      <header className="sticky top-0 z-40 bg-[#080912]/95 backdrop-blur-xl border-b border-white/10 px-3.5 sm:px-6 lg:px-8 shadow-xl shadow-black/40 w-full">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-3 min-w-0">
          {/* Brand Logo & Portal Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
            <a
              href="/talent-hub/dashboard"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('dashboard');
              }}
              className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none shrink-0"
            >
              <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-400/50 group-hover:scale-105 transition-all duration-300 shrink-0">
                <SeoImage
                  src="/assets/logo.png"
                  alt="Zenemoo Talent Hub"
                  priority={true}
                  width={40}
                  height={40}
                  className="w-full h-full object-contain rounded-full bg-white p-0.5"
                  fallbackSrc="/assets/logo.png"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm sm:text-lg font-extrabold tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors leading-none truncate">
                    ZENEMOO
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 shrink-0">
                    Talent Hub
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 hidden sm:inline-block mt-0.5 tracking-tight truncate">
                  AI Contributor Portal
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Nav Items (xl+) */}
          <nav className="hidden xl:flex items-center gap-1 bg-white/[0.03] p-1.5 rounded-full border border-white/10 backdrop-blur-md">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm shadow-cyan-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-white/10 font-medium border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => handleNavClick('support-zenemooindia')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                currentTab === 'support-zenemooindia'
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold shadow-sm shadow-pink-500/20'
                  : 'text-pink-300 hover:text-white hover:bg-pink-500/15 font-medium border border-pink-500/20 hover:border-pink-500/40'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span>Support</span>
            </button>
          </nav>

          {/* Tablet Nav Items (md to xl) */}
          <nav className="hidden md:flex xl:hidden items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => handleNavClick('support-zenemooindia')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                currentTab === 'support-zenemooindia'
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold'
                  : 'text-pink-300 hover:text-white hover:bg-pink-500/15 border border-pink-500/20'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span>Support</span>
            </button>
          </nav>

          {/* Desktop & Tablet Action Bar (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* 🔄 Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`relative p-2 sm:px-3 sm:py-2 rounded-2xl border transition-all duration-200 flex items-center gap-1.5 text-xs font-mono font-medium cursor-pointer ${
                isRefreshing
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : showRefreshFeedback
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-900/90 border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white active:scale-95'
              }`}
              title="Refresh Talent Hub Data"
              aria-label="Refresh Talent Hub Data"
            >
              {showRefreshFeedback ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="hidden lg:inline text-[11px] text-emerald-300">Updated</span>
                </>
              ) : (
                <>
                  <RefreshCw className={`w-4 h-4 text-cyan-400 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden lg:inline text-[11px]">Refresh</span>
                </>
              )}
            </button>

            {/* Centralized Notification Center */}
            <NotificationCenter />

            {/* User Profile Pill & Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 py-1.5 px-2 sm:px-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-200 focus:outline-none cursor-pointer"
                aria-label="User Account Menu"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-7 h-7 rounded-full object-cover border border-white/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left hidden md:block max-w-[120px] truncate">
                  <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{displayEmail}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#080d19]/98 backdrop-blur-2xl border border-cyan-500/30 shadow-2xl p-2 z-50 divide-y divide-white/10 text-xs"
                    >
                      <div className="px-3 py-2.5">
                        <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Signed in as</p>
                        <p className="text-sm font-bold text-white truncate mt-0.5">{displayName}</p>
                        <p className="text-xs text-cyan-400 truncate mt-0.5 font-mono">{displayEmail}</p>
                        {talentProfile?.registration_code && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{talentProfile.registration_code}</span>
                          </div>
                        )}
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleNavClick('profile');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 text-cyan-400" />
                          View My Profile
                        </button>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleNavClick('applications');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          My Applications
                        </button>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleNavClick('opportunities');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                          Browse Opportunities
                        </button>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleNavClick('support-zenemooindia');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-pink-300 hover:text-white hover:bg-pink-500/10 transition-colors cursor-pointer"
                        >
                          <Heart className="w-3.5 h-3.5 text-pink-400" />
                          Support Zenemoo
                        </button>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Right: Hamburger Button ONLY (Compact, Clean) */}
          <div className="flex md:hidden items-center shrink-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-2xl bg-slate-900/90 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40 focus:outline-none cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 text-cyan-400" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE GLASS OVERLAY DRAWER (Sliding Overlay, Zero Page Push) ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Sliding Glass Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#080d19]/98 backdrop-blur-2xl border-l border-cyan-500/30 shadow-2xl p-5 flex flex-col z-50 overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px]">
                    <SeoImage
                      src="/assets/logo.png"
                      alt="Zenemoo"
                      width={28}
                      height={28}
                      className="w-full h-full object-contain rounded-full bg-white p-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white font-display">Talent Hub Menu</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white border border-white/10"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Primary Navigation Destinations */}
              <div className="py-4 space-y-1.5">
                <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider px-2 pb-1">
                  Navigation
                </p>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm shadow-cyan-500/20'
                          : 'text-slate-300 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Actions & Utilities Section */}
              <div className="py-3 border-t border-white/10 space-y-2">
                <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider px-2 pb-1">
                  Quick Actions
                </p>

                {/* Manual Refresh in Drawer */}
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium border transition-colors ${
                    showRefreshFeedback
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className={`w-4 h-4 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{showRefreshFeedback ? 'Data Updated!' : 'Refresh Hub Data'}</span>
                  </div>
                  {showRefreshFeedback && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </button>

                {/* Centralized Notifications in Drawer */}
                <div className="px-1 py-1">
                  <NotificationCenter />
                </div>

                {/* Support Zenemoo Route */}
                <button
                  onClick={() => handleNavClick('support-zenemooindia')}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    currentTab === 'support-zenemooindia'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold'
                      : 'bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 border border-pink-500/30'
                  }`}
                >
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span>Support Zenemoo</span>
                </button>

                {/* Back to Main Website */}
                <a
                  href="/"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 border border-transparent transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span>Back to Main Website</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Account / User Details Card at bottom */}
              <div className="mt-auto pt-4 border-t border-white/10 space-y-3">
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                  <div className="flex items-center gap-2.5">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{displayName}</p>
                      <p className="text-[10px] text-cyan-400 font-mono truncate">{displayEmail}</p>
                    </div>
                  </div>
                  {talentProfile?.registration_code && (
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-300">
                      <span className="text-slate-400">Reg. Code:</span>
                      <span className="font-bold text-emerald-300">{talentProfile.registration_code}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-medium hover:bg-rose-500/20 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8 min-w-0 overflow-hidden">
        {children}
      </main>

      {/* ── Dedicated Mobile Bottom Navigation Bar (Fixed, 4 items only) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[#070b14]/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_25px_rgba(0,0,0,0.8)]">
        <div className="grid grid-cols-4 h-16 items-center px-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center justify-center h-full py-1 transition-all ${
                  isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400 scale-105' : 'text-slate-400'}`} />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  )}
                </div>
                <span className={`text-[10px] mt-1 font-medium truncate max-w-[70px] ${isActive ? 'font-bold text-white' : 'text-slate-400'}`}>
                  {item.label === 'My Applications' ? 'Applications' : item.label === 'My Profile' ? 'Profile' : item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Fixed Floating AI Assistant Button (Bottom Right, Safe on Mobile) ── */}
      <div className="fixed bottom-20 md:bottom-5 right-4 sm:right-6 z-30 print:hidden">
        <button
          onClick={() => setIsAiDrawerOpen(true)}
          className="group relative flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-[#080d19]/95 hover:bg-[#0c1324] border border-cyan-500/40 hover:border-cyan-300 shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_8px_35px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 cursor-pointer active:scale-95"
          aria-label="Ask Zenemoo AI Assistant"
          title="Ask Zenemoo AI Assistant"
        >
          <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-indigo-600 p-[1.5px] shadow-sm shrink-0">
            <SeoImage
              src="/assets/logo.png"
              alt="Zenemoo AI Assistant"
              width={28}
              height={28}
              className="w-full h-full object-cover rounded-full bg-white p-0.5"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-400 border border-black animate-pulse" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-mono font-bold text-white leading-tight flex items-center gap-1">
              Zenemoo AI
              <Sparkles className="w-3 h-3 text-cyan-400 group-hover:rotate-12 transition-transform shrink-0" />
            </p>
            <p className="text-[9px] font-mono text-cyan-400/80 leading-none">Contributor Assistant</p>
          </div>
        </button>
      </div>

      {/* ── Centralized Zenemoo AI Drawer ── */}
      <ZenemooAiDrawer isOpen={isAiDrawerOpen} onClose={() => setIsAiDrawerOpen(false)} />

      {/* ── Standard Zenemoo Talent Hub Footer ── */}
      <footer className="talent-hub-footer border-t border-white/10 bg-[#080808]/90 py-8 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 text-slate-400 text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="font-semibold text-slate-200">Zenemoo</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>&ldquo;A Bright Tomorrow, Together.&rdquo;</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="text-slate-400">Technology should create opportunities for everyone.</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="mailto:info@zenemoo.in"
              className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-400 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>info@zenemoo.in</span>
            </a>
            <a
              href="/"
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <span>Main Website</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
