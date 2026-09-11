import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  User,
  Users,
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
  ChevronUp,
  ArrowUp,
  RefreshCw,
  CheckCircle2,
  Heart,
  Globe,
  Receipt,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { NotificationCenter } from '../NotificationCenter';
import { ZenemooAiDrawer } from '../ZenemooAiDrawer';
import { SeoImage } from '../../seo/components/SeoImage';
import { ZENEMOO_SOCIAL_LINKS } from '../SocialData';

export type TalentHubTab = 'dashboard' | 'profile' | 'opportunities' | 'applications' | 'referrals' | 'team' | 'support-zenemooindia' | 'support-history';

interface TalentHubLayoutProps {
  currentTab: TalentHubTab;
  onNavigate: (tab: TalentHubTab) => void;
  onNavigateHome?: () => void;
  children: React.ReactNode;
}

export const TalentHubLayout: React.FC<TalentHubLayoutProps> = ({
  currentTab,
  onNavigate,
  onNavigateHome,
  children,
}) => {
  const {
    user,
    talentProfile,
    applications,
    totalApplications,
    opportunities,
    activeOpportunitiesCount,
    signOut,
    refreshTalentHubData,
    isRefreshing,
  } = useTalentHubAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isSocialSheetOpen, setIsSocialSheetOpen] = useState(false);
  const [showRefreshFeedback, setShowRefreshFeedback] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Monitor window scroll for Back-to-Top button visibility & progress calculation
  useEffect(() => {
    const handleScroll = () => {
      const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      if (scrollTotal > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (currentScroll / scrollTotal) * 100)));
      } else {
        setScrollProgress(0);
      }
      setShowBackToTop(currentScroll > 120);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Close mobile drawer and social sheet on Escape key
  useEffect(() => {
    if (!mobileMenuOpen && !isSocialSheetOpen && !userMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setIsSocialSheetOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, isSocialSheetOpen, userMenuOpen]);

  // Auto-close user profile dropdown when page scrolling occurs outside
  useEffect(() => {
    if (!userMenuOpen) return;

    const handleScroll = () => {
      setUserMenuOpen(false);
    };

    const handleWheel = (e: WheelEvent) => {
      const el = document.getElementById('talent-hub-user-menu');
      if (el && el.contains(e.target as Node)) return;
      setUserMenuOpen(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const el = document.getElementById('talent-hub-user-menu');
      if (el && el.contains(e.target as Node)) return;
      setUserMenuOpen(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [userMenuOpen]);

  // Lock body scrolling when social sheet is open
  useEffect(() => {
    if (isSocialSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSocialSheetOpen]);

  const handleCopyText = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const displayName =
    talentProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Zenemoo Contributor';
  const displayEmail = user?.email || talentProfile?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const isIndividualParticipant = talentProfile?.primary_role === 'Individual Participant';
  const hasTeamAccess = !isIndividualParticipant;

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile' as const, label: 'My Profile', icon: User },
    { id: 'opportunities' as const, label: 'Opportunities', icon: Briefcase },
    { id: 'applications' as const, label: 'My Applications', icon: FileCheck },
    { id: 'referrals' as const, label: 'Referrals', icon: Share2 },
    ...(hasTeamAccess ? [{ id: 'team' as const, label: 'My Team', icon: Users }] : []),
  ];

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    await refreshTalentHubData(true);
    setShowRefreshFeedback(true);
    setTimeout(() => setShowRefreshFeedback(false), 2000);
  };

  const handleNavClick = (tab: TalentHubTab) => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    onNavigate(tab);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 font-sans relative w-full max-w-full min-w-0 overflow-x-hidden pt-14 sm:pt-16">
      {/* ── Fixed Top Navigation Header (Dynamic & Responsive from 320px to 4K) ── */}
      <header className="fixed top-0 left-0 right-0 z-40 h-14 sm:h-16 bg-[#080912]/95 backdrop-blur-xl border-b border-white/10 px-3 sm:px-5 lg:px-8 shadow-xl shadow-black/40 w-full shrink-0">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto h-full flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          {/* Brand Logo & Portal Title (Mobile shows only logo, Desktop/Laptop shows full brand) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
            <a
              href="/talent-hub/dashboard"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('dashboard');
              }}
              className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none shrink-0"
            >
              <div className="relative h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-400/50 group-hover:scale-105 transition-all duration-300 shrink-0">
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
              {/* Full Brand Text: Hidden on mobile phones (<640px) to prevent navbar squeeze, fully visible on tablets and laptops */}
              <div className="hidden sm:flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm sm:text-base lg:text-lg font-extrabold tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors leading-none truncate">
                    ZENEMOO
                  </span>
                  <span className="text-[8.5px] sm:text-[9.5px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 shrink-0">
                    Talent Hub
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 hidden xl:inline-block mt-0.5 tracking-tight truncate">
                  AI Contributor Portal
                </span>
              </div>
            </a>
          </div>

          {/* Desktop & Laptop Nav Items (lg+) */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] p-1 rounded-full border border-white/10 backdrop-blur-md shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                currentTab === 'support-zenemooindia'
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold shadow-[0_0_12px_rgba(244,114,182,0.25)]'
                  : 'text-pink-300 hover:text-white hover:bg-pink-500/15 font-medium border border-pink-500/20 hover:border-pink-500/40'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span>Support</span>
            </button>
          </nav>

          {/* Right Action Bar (Sleek, Uncrowded on All Breakpoints) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* 🔄 Refresh Button */}
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
                  <span className="hidden xl:inline text-[11px] text-emerald-300">Updated</span>
                </>
              ) : (
                <>
                  <RefreshCw className={`w-4 h-4 text-cyan-400 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden xl:inline text-[11px]">Refresh</span>
                </>
              )}
            </button>

            {/* Centralized Notification Center (Always Visible) */}
            <NotificationCenter />

            {/* User Profile Avatar Pill & Rich Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="group relative flex items-center gap-1.5 p-1 sm:p-1.5 rounded-full bg-white/[0.04] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/40 transition-all duration-200 focus:outline-none cursor-pointer active:scale-95 shadow-sm"
                aria-label="User Account Menu"
                title={`Signed in as ${displayName}`}
              >
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-cyan-500/30 group-hover:ring-cyan-400/80 transition-all shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-cyan-500/30 group-hover:ring-cyan-400/80 transition-all">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Subtle Online Status Dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080912] shadow-sm" />
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300 transition-transform duration-200 hidden sm:block ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Rich User Profile Dropdown Card (100% Solid Dark, Non-Transparent, High Contrast) */}
              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    {/* Dimming Backdrop to prevent text bleed from background page */}
                    <div
                      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      id="talent-hub-user-menu"
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute right-0 mt-2 w-72 sm:w-80 rounded-3xl bg-[#080d1a] border border-cyan-500/40 shadow-[0_25px_70px_rgba(0,0,0,0.99),0_0_30px_rgba(6,182,212,0.2)] p-3.5 z-50 divide-y divide-white/10 text-xs"
                    >
                      {/* Top Profile Card Header */}
                      <div className="pb-3.5 space-y-2.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-11 h-11 rounded-full object-cover ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/20"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg ring-2 ring-cyan-400/50">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#080d1a]" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate leading-snug">{displayName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-xs text-cyan-300 font-mono truncate">{displayEmail}</p>
                              {displayEmail && (
                                <button
                                  onClick={() => handleCopyText(displayEmail, 'email')}
                                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                                  title="Copy email address"
                                  aria-label="Copy email address"
                                >
                                  {copiedField === 'email' ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status & Registration Code Badge */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Verified Talent</span>
                          </div>

                          {talentProfile?.registration_code && (
                            <button
                              onClick={() => handleCopyText(talentProfile.registration_code, 'reg_code')}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-[10px] font-mono text-slate-300 transition-all cursor-pointer group"
                              title="Click to copy registration code"
                            >
                              <span className="text-slate-400">ID:</span>
                              <span className="font-bold text-cyan-300 group-hover:text-cyan-200">
                                {talentProfile.registration_code}
                              </span>
                              {copiedField === 'reg_code' ? (
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 group-hover:text-cyan-400 shrink-0" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Quick Summary Chips */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="p-2.5 rounded-xl bg-[#0c1222] border border-white/10 text-center shadow-inner">
                            <p className="text-[10px] text-slate-400 uppercase font-mono">My Applications</p>
                            <p className="text-sm font-bold text-white mt-0.5">{totalApplications ?? applications?.length ?? 0}</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#0c1222] border border-white/10 text-center shadow-inner">
                            <p className="text-[10px] text-slate-400 uppercase font-mono">Open Projects</p>
                            <p className="text-sm font-bold text-cyan-400 mt-0.5">{activeOpportunitiesCount || opportunities?.length || 0}</p>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Links */}
                      <div className="py-2 space-y-0.5">
                        <button
                          onClick={() => handleNavClick('profile')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 text-cyan-400" />
                          <span>View My Profile</span>
                        </button>
                        <button
                          onClick={() => handleNavClick('applications')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>My Applications</span>
                        </button>
                        <button
                          onClick={() => handleNavClick('opportunities')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                          <span>Browse Opportunities</span>
                        </button>
                        <button
                          onClick={() => handleNavClick('referrals')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Refer & Earn</span>
                        </button>
                        {hasTeamAccess && (
                          <button
                            onClick={() => handleNavClick('team')}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-sky-300 hover:text-white hover:bg-sky-500/10 transition-colors cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-sky-400" />
                            <span>My Team</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleNavClick('support-zenemooindia')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-pink-300 hover:text-white hover:bg-pink-500/10 transition-colors cursor-pointer"
                        >
                          <Heart className="w-3.5 h-3.5 text-pink-400" />
                          <span>Support Zenemoo</span>
                        </button>
                        <button
                          onClick={() => handleNavClick('support-history')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-cyan-300 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                          <span>My Support Payments</span>
                        </button>
                        <a
                          href="/"
                          onClick={(e) => {
                            if (onNavigateHome) {
                              e.preventDefault();
                              setUserMenuOpen(false);
                              onNavigateHome();
                            }
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <span>Back to Website</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </a>
                      </div>

                      {/* Sign Out Action */}
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            signOut();
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border border-rose-500/20 transition-all cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Hamburger Drawer Trigger (lg:hidden) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-2xl bg-slate-900/90 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40 focus:outline-none cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 text-cyan-400" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Fixed Header Spacer (Removed duplicate spacer to prevent 150px+ mobile gap) ── */}

      {/* ── MOBILE GLASS OVERLAY DRAWER (Sliding Overlay with Safe Area Inset) ── */}
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

            {/* Sliding Glass Drawer Panel with Android Status Bar Safe Area */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#080d19]/98 backdrop-blur-2xl border-l border-cyan-500/30 shadow-2xl px-4 sm:px-5 pt-[calc(var(--sat,env(safe-area-inset-top,0px))+1.25rem)] pb-[calc(var(--sab,env(safe-area-inset-bottom,0px))+1.5rem)] flex flex-col z-50 overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
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
                  className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
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
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium border transition-colors cursor-pointer ${
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

                {/* Support Zenemoo Route */}
                <button
                  onClick={() => handleNavClick('support-zenemooindia')}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    currentTab === 'support-zenemooindia'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold'
                      : 'bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 border border-pink-500/30'
                  }`}
                >
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span>Support Zenemoo</span>
                </button>

                {/* My Support Payments Route */}
                <button
                  onClick={() => handleNavClick('support-history')}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    currentTab === 'support-history'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30'
                  }`}
                >
                  <Receipt className="w-4 h-4 text-cyan-400" />
                  <span>My Support Payments</span>
                </button>

                {/* Back to Main Website */}
                <a
                  href="/"
                  onClick={(e) => {
                    if (onNavigateHome) {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      onNavigateHome();
                    }
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 border border-transparent transition-colors cursor-pointer"
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
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover border border-white/20"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080d19]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{displayName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[10px] text-cyan-300 font-mono truncate">{displayEmail}</p>
                        {displayEmail && (
                          <button
                            onClick={() => handleCopyText(displayEmail, 'drawer_email')}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                            title="Copy email"
                          >
                            {copiedField === 'drawer_email' ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {talentProfile?.registration_code && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-300">
                      <span className="text-slate-400">Reg. Code:</span>
                      <button
                        onClick={() => handleCopyText(talentProfile.registration_code, 'drawer_reg_code')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-cyan-300 cursor-pointer"
                      >
                        <span className="font-bold">{talentProfile.registration_code}</span>
                        {copiedField === 'drawer_reg_code' ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-slate-400" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-medium hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Main Content Area (Compact, Snug, Perfectly Proportioned Spacing) ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 pb-24 sm:pt-4 sm:pb-8 min-w-0 overflow-hidden">
        {children}
      </main>

      {/* ── Dedicated Mobile Bottom Navigation Bar (6 Items) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[#070b14]/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_25px_rgba(0,0,0,0.8)]">
        <div className="grid grid-cols-6 h-16 items-center px-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center justify-center h-full py-1 transition-all cursor-pointer ${
                  isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400 scale-105' : 'text-slate-400'}`} />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  )}
                </div>
                <span className={`text-[9px] mt-1 font-medium truncate max-w-[54px] ${isActive ? 'font-bold text-white' : 'text-slate-400'}`}>
                  {item.label === 'My Applications' ? 'Applications' : item.label === 'My Profile' ? 'Profile' : item.label}
                </span>
              </button>
            );
          })}

          {/* 6th Item: Social */}
          <button
            onClick={() => setIsSocialSheetOpen(true)}
            className="flex flex-col items-center justify-center h-full py-1 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer"
            aria-label="Zenemoo Social Media Channels"
          >
            <Globe className="w-5 h-5 text-slate-400 hover:scale-105 transition-transform" />
            <span className="text-[9px] mt-1 font-medium text-slate-400">Social</span>
          </button>
        </div>
      </div>

      {/* ── Social Media Bottom Sheet Modal (≤768px Only) ── */}
      <AnimatePresence>
        {isSocialSheetOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end md:hidden"
            onClick={() => setIsSocialSheetOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full bg-[#080d19] border-t border-cyan-500/30 rounded-t-3xl p-5 pb-8 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Drag Pill Handle */}
              <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 mb-2" />

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
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-md"
                          style={{
                            backgroundColor: `${item.color}20`,
                            border: `1px solid ${item.color}40`,
                          }}
                        >
                          <IconComponent className="w-5 h-5" style={{ color: item.color }} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {item.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">{item.handle}</div>
                        </div>
                      </div>

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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Fixed Floating Controls Stack (Progress Ring Back to Top ABOVE, AI Contributor Assistant BELOW) ── */}
      <div className="fixed bottom-20 md:bottom-16 lg:bottom-16 right-4 sm:right-6 z-30 flex flex-col items-end gap-3 pointer-events-none print:hidden">
        {/* 1. Scroll Progress Ring Back to Top Button (Positioned strictly ABOVE AI Assistant) */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto"
            >
              <button
                onClick={scrollToTop}
                aria-label={`Scroll back to top (${Math.round(scrollProgress)}% read)`}
                title={`Back to top (${Math.round(scrollProgress)}%)`}
                className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#080912]/95 border border-white/15 backdrop-blur-xl shadow-xl shadow-cyan-950/60 text-cyan-400 hover:text-white transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {/* SVG Circular Progress Ring */}
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-0.5"
                  viewBox="0 0 48 48"
                >
                  <defs>
                    <linearGradient id="talent-cyan-indigo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                    <filter id="talent-cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#06b6d4" floodOpacity="0.8" />
                    </filter>
                  </defs>

                  {/* Background Track Circle */}
                  <circle
                    cx="24"
                    cy="24"
                    r={18}
                    className="stroke-white/10"
                    strokeWidth="2.5"
                    fill="transparent"
                  />

                  {/* Progress Indicator Circle */}
                  <circle
                    cx="24"
                    cy="24"
                    r={18}
                    stroke="url(#talent-cyan-indigo-gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={113.1}
                    strokeDashoffset={113.1 - (scrollProgress / 100) * 113.1}
                    filter="url(#talent-cyan-glow)"
                    className="transition-[stroke-dashoffset] duration-150 ease-out"
                  />
                </svg>

                {/* Center Upward Arrow Icon */}
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 group-hover:text-cyan-200 group-hover:-translate-y-0.5 transition-all duration-300 z-10 shrink-0" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Zenemoo AI Contributor Assistant (Positioned strictly BELOW Back to Top & Safe Above Footer) */}
        <button
          onClick={() => setIsAiDrawerOpen(true)}
          className="pointer-events-auto group relative flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-[#080d19]/95 hover:bg-[#0c1324] border border-cyan-500/40 hover:border-cyan-300 shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_8px_35px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.5)] backdrop-blur-md transition-all duration-300 cursor-pointer active:scale-95"
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

      {/* ── Compact Professional Talent Hub Footer ── */}
      <footer className="w-full border-t border-cyan-500/20 bg-[#060810]/95 backdrop-blur-md text-slate-400 text-xs mt-auto py-3.5 px-4 sm:px-6 lg:px-8 shadow-[0_-4px_20px_rgba(0,0,0,0.6)] z-20 pb-20 md:pb-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 min-w-0">
          {/* Horizontal Items List: Brand + Tagline + Legal/Contact Links */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2.5 sm:gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-slate-400 min-w-0 text-center md:text-left">
            {/* Logo + Zenemoo */}
            <div className="flex items-center gap-1.5 font-bold text-white tracking-wide shrink-0">
              <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1px] shrink-0">
                <SeoImage
                  src="/assets/logo.png"
                  alt="Zenemoo"
                  width={18}
                  height={18}
                  className="w-full h-full object-contain rounded-full bg-white p-0.5"
                />
              </div>
              <span className="font-display text-white">Zenemoo</span>
            </div>

            <span className="text-cyan-500/30 select-none hidden sm:inline">|</span>
            <span className="text-slate-300 font-medium whitespace-nowrap">A Bright Tomorrow, Together.</span>

            <span className="text-cyan-500/30 select-none">|</span>
            <a href="/terms" className="hover:text-cyan-300 transition-colors whitespace-nowrap">
              Terms &amp; Conditions
            </a>

            <span className="text-cyan-500/30 select-none">|</span>
            <a href="/privacy" className="hover:text-cyan-300 transition-colors whitespace-nowrap">
              Privacy Policy
            </a>

            <span className="text-cyan-500/30 select-none">|</span>
            <a href="/#contact" className="hover:text-cyan-300 transition-colors whitespace-nowrap">
              Contact
            </a>

            <span className="text-cyan-500/30 select-none">|</span>
            <a
              href="mailto:info@zenemoo.in"
              className="hover:text-cyan-300 transition-colors whitespace-nowrap text-cyan-400/90 font-mono inline-flex items-center gap-1"
            >
              <Mail className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>info@zenemoo.in</span>
            </a>
          </div>

          {/* Logout Pill Button at the Far Right */}
          <div className="shrink-0 flex items-center">
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 shadow-sm transition-all text-xs font-medium cursor-pointer active:scale-95"
              title="Sign out of Talent Hub"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
