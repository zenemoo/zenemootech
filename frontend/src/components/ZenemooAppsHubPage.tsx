import React from 'react';
import {
  Smartphone,
  Apple,
  Users2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Download,
  Lock,
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { SeoImage } from '../seo/components/SeoImage';

export interface AppCatalogItem {
  id: string;
  title: string;
  subtitle: string;
  platform: string;
  iconType: 'android' | 'ios' | 'team_hr';
  status: 'available' | 'coming_soon';
  statusLabel: string;
  description: string;
  route: string | null;
  buttonLabel: string;
  badgeColor: string;
}

const APPS_CATALOG: AppCatalogItem[] = [
  {
    id: 'android',
    title: 'Zenemoo',
    subtitle: 'Android Application',
    platform: 'Android',
    iconType: 'android',
    status: 'available',
    statusLabel: 'Available',
    description: 'Download the official Zenemoo Android application for opportunities, AI services, multilingual tasks, and real-time notifications.',
    route: '/app/android',
    buttonLabel: 'Download for Android',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'team-hr',
    title: 'Zenemoo Team & HR',
    subtitle: 'Team and HR Application',
    platform: 'Team & HR',
    iconType: 'team_hr',
    status: 'available',
    statusLabel: 'Available',
    description: 'Internal tools, recruitment dashboards, opportunities, and operational services for Zenemoo team members and HR operations.',
    route: '/app/android/team',
    buttonLabel: 'Download Team & HR →',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  {
    id: 'ios',
    title: 'Zenemoo',
    subtitle: 'iOS Application',
    platform: 'iOS',
    iconType: 'ios',
    status: 'coming_soon',
    statusLabel: 'Coming Soon',
    description: 'The Zenemoo iOS application will be available here in the future with full support for iPhone and iPad devices.',
    route: null,
    buttonLabel: 'Coming Soon',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
];

interface ZenemooAppsHubPageProps {
  onBack?: () => void;
  onOpenAiDrawer?: () => void;
}

export const ZenemooAppsHubPage: React.FC<ZenemooAppsHubPageProps> = ({
  onBack,
  onOpenAiDrawer,
}) => {
  const renderAppIcon = (iconType: string) => {
    switch (iconType) {
      case 'android':
        return (
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/30 to-emerald-500/20 border border-cyan-400/40 flex items-center justify-center p-1 shadow-lg shadow-cyan-500/20">
            <SeoImage
              src="/assets/logo.png"
              alt="Zenemoo Android Application Logo"
              priority={true}
              width={40}
              height={40}
              className="w-10 h-10 object-contain rounded-xl bg-white p-0.5"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md">
              <Smartphone className="w-3 h-3" />
            </div>
          </div>
        );
      case 'ios':
        return (
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/10 border border-purple-500/30 flex items-center justify-center text-slate-300 shadow-inner">
            <Apple className="w-7 h-7 text-purple-300" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-500/40 text-white flex items-center justify-center border border-purple-400/30 text-[9px] font-bold">
              iOS
            </div>
          </div>
        );
      case 'team_hr':
        return (
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/30 to-purple-500/20 border border-cyan-400/40 flex items-center justify-center p-1 shadow-lg shadow-cyan-500/20">
            <SeoImage
              src="/assets/team-logo.png"
              alt="Zenemoo Team & HR Application Logo"
              priority={true}
              width={40}
              height={40}
              className="w-10 h-10 object-contain rounded-xl bg-white p-0.5"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-md">
              <Users2 className="w-3 h-3" />
            </div>
          </div>
        );
      default:
        return (
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <Smartphone className="w-7 h-7" />
          </div>
        );
    }
  };

  // Structured Data Schema for Zenemoo Apps Hub
  const appsSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': 'https://www.zenemoo.in/app#collection',
    'url': 'https://www.zenemoo.in/app',
    'name': 'Zenemoo Apps — Official Applications',
    'description': 'Explore official Zenemoo applications for Android and future platforms. Download trusted Zenemoo apps and stay connected with opportunities, AI services, and platform updates.',
    'isPartOf': {
      '@type': 'WebSite',
      '@id': 'https://www.zenemoo.in/#website',
      'name': 'Zenemoo',
      'url': 'https://www.zenemoo.in/',
    },
    'mainEntity': {
      '@type': 'ItemList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'item': {
            '@type': 'SoftwareApplication',
            'name': 'Zenemoo Android Application',
            'operatingSystem': 'Android 8.0 or later',
            'applicationCategory': 'BusinessApplication',
            'url': 'https://www.zenemoo.in/app/android',
            'downloadUrl': 'https://www.zenemoo.in/downloads/zenemoo-latest.apk',
            'fileFormat': 'application/vnd.android.package-archive',
            'author': {
              '@type': 'Organization',
              'name': 'Zenemoo',
              'url': 'https://www.zenemoo.in/',
            },
          },
        },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">
      {/* Structured Data Script Tag */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appsSchema) }}
      />

      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-cyan-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Navbar
        showBackButton={true}
        onBack={onBack || (() => (window.location.href = '/'))}
        onOpenAiDrawer={onOpenAiDrawer}
      />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12 sm:space-y-16">
        {/* ── HERO SECTION WITH H1 ── */}
        <section className="text-center space-y-4 pt-4 sm:pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>OFFICIAL APPLICATION CENTER</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-white">
            Zenemoo Apps
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans">
            Official Zenemoo applications and digital tools. Download trusted Zenemoo applications securely directly from Zenemoo.
          </p>
        </section>

        {/* ── 3 SCALABLE APP CARDS ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {APPS_CATALOG.map((app) => {
            const isAvailable = app.status === 'available';
            return (
              <div
                key={app.id}
                className={`rounded-3xl bg-[#080d19]/90 backdrop-blur-2xl border p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-all duration-300 relative group overflow-hidden ${
                  isAvailable
                    ? 'border-cyan-500/40 shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(6,182,212,0.15)] hover:border-cyan-400 hover:shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.25)] hover:-translate-y-1'
                    : 'border-white/10 opacity-80 hover:opacity-100 bg-white/[0.02]'
                }`}
              >
                {/* Glow Accent Header Line for available apps */}
                {isAvailable && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500" />
                )}

                <div className="space-y-4">
                  {/* Top Row: Icon & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    {renderAppIcon(app.iconType)}
                    <span
                      className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 ${app.badgeColor}`}
                    >
                      {isAvailable ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      <span>{app.statusLabel}</span>
                    </span>
                  </div>

                  {/* App Title & Subtitle */}
                  <div className="space-y-0.5">
                    <h3 className="font-display font-extrabold text-xl text-white group-hover:text-cyan-300 transition-colors">
                      {app.title}
                    </h3>
                    <p className="text-xs font-mono text-cyan-400 font-medium">
                      {app.subtitle}
                    </p>
                  </div>

                  {/* App Description */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                    {app.description}
                  </p>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-3 border-t border-white/10">
                  {isAvailable && app.route ? (
                    <a
                      href={app.route}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold font-mono text-xs sm:text-sm shadow-md shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>{app.buttonLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-slate-400 font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{app.buttonLabel}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* ── SECURITY TRUST BANNER ── */}
        <section className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-2 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Official Distribution</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            All Zenemoo application packages are digitally signed and distributed directly from verified HTTPS endpoints with strict security and privacy standards.
          </p>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
