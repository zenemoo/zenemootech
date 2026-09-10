import React from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Briefcase,
  FileText,
  Lock,
  ShieldCheck,
  Zap,
  ArrowRight,
  ArrowUpRight,
  LogOut,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { useActiveLogo } from '../../lib/useActiveLogo';
import { SeoImage } from '../../seo/components/SeoImage';
import { NotificationCenter } from '../NotificationCenter';

interface TalentHubLoginPageProps {
  onNavigateRegister?: () => void;
  onNavigateHome?: () => void;
}

export const TalentHubLoginPage: React.FC<TalentHubLoginPageProps> = ({
  onNavigateRegister,
  onNavigateHome,
}) => {
  const {
    user,
    session,
    isRegistered,
    isLoading,
    isProfileLoading,
    authError,
    signInWithGoogle,
    signOut,
  } = useTalentHubAuth();

  const { logoUrl } = useActiveLogo();

  const handleRegisterClick = () => {
    if (onNavigateRegister) {
      onNavigateRegister();
    } else {
      window.history.pushState(null, '', '/talent-registration');
      window.location.hash = 'talent-registration';
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleBackHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.history.pushState(null, '', '/');
      window.location.hash = '';
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  React.useEffect(() => {
    document.title = 'Login Zenemoo — Talent Hub Contributor Portal';

    // JSON-LD Structured Data for Google Search "Login Zenemoo"
    const jsonLdScript = document.createElement('script');
    jsonLdScript.type = 'application/ld+json';
    jsonLdScript.id = 'zenemoo-talent-hub-login-schema';
    jsonLdScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': 'https://www.zenemoo.in/talent-hub#webpage',
          url: 'https://www.zenemoo.in/talent-hub',
          name: 'Login Zenemoo — Talent Hub Contributor Portal',
          description:
            'Login to Zenemoo Talent Hub. Access your verified contributor profile, AI speech datasets, transcription tasks, project applications, and earnings.',
          inLanguage: 'en',
          isPartOf: {
            '@type': 'WebSite',
            '@id': 'https://www.zenemoo.in/#website',
            name: 'Zenemoo',
            url: 'https://www.zenemoo.in',
          },
        },
        {
          '@type': 'BreadcrumbList',
          '@id': 'https://www.zenemoo.in/talent-hub#breadcrumb',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://www.zenemoo.in/',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Zenemoo Login',
              item: 'https://www.zenemoo.in/talent-hub',
            },
          ],
        },
      ],
    });
    document.head.appendChild(jsonLdScript);

    return () => {
      const existing = document.getElementById('zenemoo-talent-hub-login-schema');
      if (existing) existing.remove();
    };
  }, []);

  // ── State 1: Checking authentication or registration status ──
  if (isLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-[#050508] text-slate-100 flex flex-col items-center justify-center p-4 relative font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-xl shadow-cyan-500/30">
            <SeoImage
              src={logoUrl || '/assets/logo.png'}
              alt="Zenemoo Talent Hub"
              priority={true}
              width={56}
              height={56}
              className="w-full h-full object-contain rounded-full bg-white p-0.5"
              fallbackSrc="/assets/logo.png"
            />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <h3 className="text-sm font-semibold text-white">Verifying Contributor Account...</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">Checking your Zenemoo Talent Hub registration</p>
          </div>
        </div>
      </div>
    );
  }

  // ── State 2: Authenticated with Google, but NOT registered in talent database ──
  if (session && isRegistered === false) {
    return (
      <div className="min-h-screen bg-[#050508] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans relative">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Top bar */}
        <header className="max-w-7xl mx-auto w-full flex items-center justify-between z-10 pt-[var(--sat,0px)]">
          <button
            onClick={handleBackHome}
            className="text-xs font-mono text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 focus:outline-none cursor-pointer"
          >
            <span>&larr; Back to Main Website</span>
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </header>

        {/* Main Card: Registration Required */}
        <main className="max-w-md mx-auto w-full my-auto py-10 z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#080d19]/95 backdrop-blur-2xl border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-950/20 text-center relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center mb-4 text-amber-400 shadow-inner">
              <AlertCircle className="w-7 h-7" />
            </div>

            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Registration Required
            </span>

            <h2 className="text-xl sm:text-2xl font-bold text-white mt-4 tracking-tight font-display">
              No Talent Registration Found
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 mt-2.5 leading-relaxed">
              We couldn&apos;t find a verified talent registration record associated with this Google account. Please register with Zenemoo first to access the contributor hub.
            </p>

            {user?.email && (
              <div className="mt-4 py-2 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-400 inline-flex items-center gap-2 max-w-full truncate font-mono">
                <span className="text-slate-500">Account:</span>
                <span className="text-cyan-300 truncate">{user.email}</span>
              </div>
            )}

            <div className="mt-6 space-y-2.5">
              <button
                onClick={handleRegisterClick}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold shadow-lg shadow-cyan-500/25 transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                <span>Register as a Talent</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-mono font-medium border border-white/10 transition-colors cursor-pointer"
              >
                <span>Sign In with a Different Account</span>
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 text-left text-xs">
              <p className="text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-200">Already registered?</span> Please ensure you are logging in with the exact Google email address used during registration.
              </p>
              <p className="text-slate-500 mt-2 font-mono">
                Need assistance? Contact <a href="mailto:info@zenemoo.in" className="text-cyan-400 hover:underline">info@zenemoo.in</a>
              </p>
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 py-4 z-10 font-mono">
          Copyright &copy; 2026 Zenemoo &bull; All Rights Reserved.
        </footer>
      </div>
    );
  }

  // ── State 3: Public Talent Hub Login Screen ──
  return (
    <div className="min-h-screen bg-[#050508] text-slate-100 flex flex-col justify-between font-sans relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ── Atmospheric Radial Glows ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 -left-20 w-[550px] h-[550px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      {/* ── Sticky Top Header Navigation Bar ── */}
      <header className="sticky top-0 z-30 bg-[#050508]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 lg:px-8 pt-[calc(var(--sat,0px)+0.75rem)] pb-3 sm:pb-3.5 shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
          {/* Top-Left Official Zenemoo Brand */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleBackHome();
            }}
            className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none shrink-0"
            aria-label="Zenemoo Home"
          >
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-400/50 group-hover:scale-105 transition-all duration-300 shrink-0">
              <SeoImage
                src={logoUrl || '/assets/logo.png'}
                alt="Zenemoo Official Logo"
                priority={true}
                width={40}
                height={40}
                className="w-full h-full object-contain rounded-full bg-white p-0.5"
                fallbackSrc="/assets/logo.png"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-extrabold tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors leading-none">
                  Zenemoo
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10">
                  TALENT HUB
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 tracking-tight mt-0.5 hidden xs:inline-block">
                AI Contributor Portal
              </span>
            </div>
          </a>

          {/* Top-Right: Notification Center + Back to Main Website */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Reused Optimized Notification Center */}
            <NotificationCenter />

            {/* Back to Website Button */}
            <button
              onClick={handleBackHome}
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-xs font-mono font-medium text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <span className="hidden sm:inline">Back to Main Website</span>
              <span className="sm:hidden text-[11px]">Website</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Two-Column Hero + Login Section (Mobile: Login Card FIRST) ── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14 my-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-start lg:items-center">
          
          {/* ── LOGIN CARD (order-1 on mobile, order-2 on desktop lg+) ── */}
          <div className="lg:col-span-5 flex flex-col items-center order-1 lg:order-2 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full max-w-[440px] bg-[#080d19]/90 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl p-5 sm:p-7 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(6,182,212,0.15)] text-center relative overflow-hidden"
            >
              {/* Inner ambient corner glow */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Official Zenemoo Logo Header Icon */}
              <div className="relative mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 mb-4 sm:mb-5 flex items-center justify-center">
                <div className="w-full h-full bg-[#080d19] rounded-[14px] p-2 flex items-center justify-center">
                  <SeoImage
                    src={logoUrl || '/assets/logo.png'}
                    alt="Zenemoo Official Logo"
                    priority={true}
                    width={36}
                    height={36}
                    className="w-full h-full object-contain rounded-xl"
                    fallbackSrc="/assets/logo.png"
                  />
                </div>
              </div>

              {/* Welcome Heading */}
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-display">
                Welcome to Zenemoo <br />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Talent Hub
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 sm:mt-2 font-normal leading-relaxed">
                Sign in with your registered Google account to continue
              </p>

              {/* Auth Error Banner if present */}
              {authError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-snug">{authError}</span>
                </motion.div>
              )}

              {/* Large Full-Width White Google Login Button */}
              <div className="mt-5 sm:mt-6">
                <button
                  onClick={signInWithGoogle}
                  className="w-full group flex items-center justify-between py-3 sm:py-3.5 px-4 sm:px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-semibold shadow-xl shadow-white/10 hover:shadow-white/20 transition-all duration-200 active:scale-[0.98] focus:outline-none cursor-pointer"
                  aria-label="Continue with Google"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span className="font-sans font-semibold text-slate-900">Continue with Google</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-4 sm:my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest text-slate-500">
                  <span className="bg-[#080d19] px-2.5">OR</span>
                </div>
              </div>

              {/* Security / Access Reassurance Callout Box */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] border border-cyan-500/20 flex items-center gap-2.5 sm:gap-3 text-left">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 leading-snug">
                  Only registered Zenemoo talents can access the Talent Hub.
                </p>
              </div>

              {/* Registration CTA */}
              <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-white/10 text-center">
                <p className="text-xs text-slate-400">
                  New to Zenemoo?{' '}
                  <button
                    onClick={handleRegisterClick}
                    className="text-cyan-400 hover:text-cyan-300 font-mono font-bold hover:underline underline-offset-2 transition-colors cursor-pointer inline-flex items-center gap-1 ml-1"
                  >
                    <span>Apply as a Talent</span>
                    <ArrowRight className="w-3 h-3 shrink-0" />
                  </button>
                </p>
              </div>
            </motion.div>

            {/* ── 3 Trust Features Under the Card ── */}
            <div className="w-full max-w-[440px] grid grid-cols-3 gap-2 mt-4 sm:mt-5 text-left">
              {/* Trust 1 */}
              <div className="p-2 sm:p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-1">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <Lock className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white font-display leading-tight">Secure Access</p>
                  <p className="text-[9px] font-mono text-slate-400 leading-tight mt-0.5">Google Auth</p>
                </div>
              </div>

              {/* Trust 2 */}
              <div className="p-2 sm:p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-1">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white font-display leading-tight">Verified Talents</p>
                  <p className="text-[9px] font-mono text-slate-400 leading-tight mt-0.5">Contributor Net</p>
                </div>
              </div>

              {/* Trust 3 */}
              <div className="p-2 sm:p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-1">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Zap className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white font-display leading-tight">Real Projects</p>
                  <p className="text-[9px] font-mono text-slate-400 leading-tight mt-0.5">Real Impact</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── LEFT COLUMN: Brand Story & Value Proposition (order-2 on mobile, order-1 on desktop lg+) ── */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-7 text-left relative order-2 lg:order-1 pt-4 lg:pt-0">
            {/* Uppercase Eyebrow */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[11px] font-mono font-semibold tracking-[0.2em] text-slate-400 uppercase">
              <span>PEOPLE</span>
              <span className="text-cyan-500 font-bold">+</span>
              <span>LANGUAGE</span>
              <span className="text-blue-500 font-bold">+</span>
              <span>AI</span>
              <span className="text-purple-500 font-bold">+</span>
              <span>OPPORTUNITY</span>
            </div>

            {/* Main Punchy Headline */}
            <h1 className="text-2xl sm:text-4xl xl:text-5xl font-extrabold tracking-tight text-white font-display leading-[1.14]">
              Turn Your <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Skills into Impact
              </span>
            </h1>

            {/* Subtitle Description */}
            <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed max-w-xl font-normal">
              Join the Zenemoo Talent Hub and contribute to real-world AI projects. Your language, knowledge, and experience help build a more inclusive AI future.
            </p>

            {/* 3 Compact Benefit Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Benefit 1 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 transition-all duration-300 space-y-1.5 group">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white font-display">Build Your Profile</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Showcase your skills and experience
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-blue-500/30 transition-all duration-300 space-y-1.5 group">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white font-display">Discover Opportunities</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Find projects that match your expertise
                  </p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition-all duration-300 space-y-1.5 group">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white font-display">Track Your Progress</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Stay updated on your applications
                  </p>
                </div>
              </div>
            </div>

            {/* Left Bottom Quote */}
            <div className="pt-2 border-l-2 border-cyan-500/40 pl-3.5 space-y-0.5 max-w-md">
              <p className="text-xs sm:text-sm text-slate-300 italic font-serif leading-snug">
                &ldquo;Diverse people. Richer data. A brighter tomorrow.&rdquo;
              </p>
              <p className="text-[10px] sm:text-[11px] font-mono text-cyan-400 font-medium">
                &mdash; Zenemoo
              </p>
            </div>

            {/* Subtle Digital Wave / Network Visual SVG */}
            <div className="relative w-full h-14 sm:h-18 overflow-hidden opacity-30 pointer-events-none mt-1">
              <svg className="w-full h-full" viewBox="0 0 600 80" preserveAspectRatio="none" fill="none">
                <path
                  d="M0,40 C150,10 350,70 600,30 L600,80 L0,80 Z"
                  fill="url(#wave-gradient-1)"
                />
                <path
                  d="M0,50 C180,80 380,20 600,60"
                  stroke="url(#wave-line-gradient)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <path
                  d="M0,30 C200,10 400,60 600,20"
                  stroke="url(#wave-line-gradient)"
                  strokeWidth="1"
                />
                <defs>
                  <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="wave-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="talent-hub-footer w-full px-4 sm:px-6 lg:px-8 py-4 pb-20 md:pb-5 border-t border-white/10 text-center text-[11px] font-mono text-slate-500 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Copyright &copy; 2026 Zenemoo &bull; All Rights Reserved.</span>
          <span className="text-slate-400">&ldquo;A Bright Tomorrow, Together.&rdquo;</span>
        </div>
      </footer>
    </div>
  );
};
