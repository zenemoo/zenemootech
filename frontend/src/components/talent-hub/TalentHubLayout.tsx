import React, { useState } from 'react';
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
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';

interface TalentHubLayoutProps {
  currentTab: 'dashboard' | 'profile' | 'opportunities' | 'applications';
  onNavigate: (tab: 'dashboard' | 'profile' | 'opportunities' | 'applications') => void;
  children: React.ReactNode;
}

export const TalentHubLayout: React.FC<TalentHubLayoutProps> = ({
  currentTab,
  onNavigate,
  children,
}) => {
  const { user, talentProfile, signOut } = useTalentHubAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = talentProfile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Zenemoo Talent';
  const displayEmail = user?.email || talentProfile?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/talent-hub/dashboard' },
    { id: 'profile', label: 'My Profile', icon: User, path: '/talent-hub/profile' },
    { id: 'opportunities', label: 'Opportunities', icon: Briefcase, path: '/talent-hub/opportunities' },
    { id: 'applications', label: 'My Applications', icon: FileCheck, path: '/talent-hub/applications' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 font-sans">
      {/* ── Top Navigation Header ── */}
      <header className="sticky top-0 z-50 bg-[#080808]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          {/* Brand Logo & System Title */}
          <div className="flex items-center gap-3">
            <a
              href="/talent-hub/dashboard"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('dashboard');
              }}
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-blue-600 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
                <div className="w-full h-full bg-[#09090b] rounded-[11px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  Zenemoo
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Talent Hub
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline-block">AI Contributor Portal</span>
              </div>
            </a>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all duration-200 focus:outline-none"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-7 h-7 rounded-full object-cover border border-white/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-xs font-semibold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left hidden lg:block max-w-[130px] truncate">
                  <p className="text-xs font-medium text-white truncate">{displayName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{displayEmail}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
                      className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0e0e10] border border-white/10 shadow-2xl p-2 z-50 divide-y divide-white/10"
                    >
                      <div className="px-3 py-2.5">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                        <p className="text-xs text-cyan-400 truncate mt-0.5">{displayEmail}</p>
                        {talentProfile?.registration_code && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            {talentProfile.registration_code}
                          </div>
                        )}
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('profile');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          View My Profile
                        </button>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('applications');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                          My Applications
                        </button>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
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

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-white/10 py-3 space-y-1"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}

              <div className="pt-3 mt-3 border-t border-white/10 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full border border-white/20" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-semibold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-medium text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{displayEmail}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-medium hover:bg-rose-500/20"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* ── Standard Zenemoo Talent Hub Footer ── */}
      <footer className="border-t border-white/10 bg-[#080808]/80 py-8 px-4 sm:px-6 lg:px-8 text-slate-400 text-xs mt-auto">
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
