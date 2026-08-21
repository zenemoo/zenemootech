import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Smartphone,
  Bell,
  Sparkles,
  Briefcase,
  Users,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Mail,
  MessageCircle,
  Lock,
  Globe,
  Radio,
  FileCheck2,
  RefreshCw,
  Sliders,
  CheckSquare,
  ShieldAlert,
  Mic,
  Wifi,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { SeoImage } from '../seo/components/SeoImage';

interface ReleaseManifest {
  platform: string;
  appName: string;
  packageName: string;
  version: string;
  versionCode: number;
  apkUrl: string;
  apkFileName: string;
  apkSize: string;
  apkSizeBytes?: number;
  releaseDate: string;
  minimumAndroid: string;
  targetAndroid?: string;
  architecture: string;
  sha256: string;
  releaseType: string;
  isOfficial: boolean;
  forceUpdate?: boolean;
  releaseNotes: string[];
}

// Single Current Release Default Fallback
const DEFAULT_MANIFEST: ReleaseManifest = {
  platform: 'android',
  appName: 'Zenemoo',
  packageName: 'in.zenemoo.app',
  version: '2.0.5',
  versionCode: 5,
  apkUrl: 'https://www.zenemoo.in/downloads/zenemoo-latest.apk',
  apkFileName: 'zenemoo-v2.0.5.apk',
  apkSize: '8.3 MB',
  releaseDate: '2026-08-22',
  minimumAndroid: 'Android 8.0 (API 26) or later',
  targetAndroid: 'Android 14 / 15 (API 34/35)',
  architecture: 'Universal (ARM64, ARMv7, x86_64)',
  sha256: '8f2b5c8d30002040042468e35cb8df63280261756b0c43e5c86024e32a4be303',
  releaseType: 'stable',
  isOfficial: true,
  releaseNotes: [
    '🔔 Official Android runtime POST_NOTIFICATIONS permission prompt flow.',
    '🎙️ On-demand microphone permission verification with seamless speech recognition.',
    '⚡ Enhanced R8/ProGuard byte-code optimization producing compact 8.3 MB APK footprint.',
    '📱 Improved mobile layout clearance and smooth scroll interactions.',
    '🛡️ Hardened security standards, updated telemetry safeguards, and high-DPI graphics.',
  ],
};

interface ZenemooAndroidAppPageProps {
  onBack?: () => void;
  onOpenAiDrawer?: () => void;
}

export const ZenemooAndroidAppPage: React.FC<ZenemooAndroidAppPageProps> = ({
  onBack,
  onOpenAiDrawer,
}) => {
  const [manifest, setManifest] = useState<ReleaseManifest>(DEFAULT_MANIFEST);
  const [copiedSha, setCopiedSha] = useState<boolean>(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string>('');

  // Fetch dynamic release manifest on mount
  useEffect(() => {
    let isMounted = true;
    const loadManifest = async () => {
      try {
        const res = await fetch('/app/android-release.json?t=' + Date.now());
        if (res.ok) {
          const data: ReleaseManifest = await res.json();
          if (isMounted && data && data.version) {
            setManifest(data);
          }
        }
      } catch (err) {
        console.warn('[Release Manifest Fetch Warn]: Using cached defaults:', err);
      }
    };

    loadManifest();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopySha = () => {
    if (navigator.clipboard && manifest.sha256) {
      navigator.clipboard.writeText(manifest.sha256);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2500);
    }
  };

  const handleDownload = () => {
    try {
      setIsDownloading(true);
      setDownloadError('');

      const rawUrl = manifest.apkUrl || '/downloads/zenemoo-latest.apk';
      const fullUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? rawUrl
        : `https://www.zenemoo.in${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

      // In Capacitor native Android environment, open via native system browser / Download Manager
      if (Capacitor.isNativePlatform()) {
        window.open(fullUrl, '_system');
      } else {
        // In standard desktop / mobile browsers, trigger direct download anchor with fallback
        const link = document.createElement('a');
        link.href = fullUrl;
        link.download = manifest.apkFileName || `zenemoo-v${manifest.version}.apk`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => {
        setIsDownloading(false);
      }, 2500);
    } catch (err: any) {
      console.error('[Download Error]:', err);
      setIsDownloading(false);
      setDownloadError('Unable to start the download. Please try again.');
    }
  };

  const faqs = [
    {
      q: 'Is this the official Zenemoo Android APK?',
      a: 'Yes. This is the authentic Zenemoo Android application built directly from the official Zenemoo engineering repository. You can verify the file authenticity by checking the SHA-256 checksum published on this page.',
    },
    {
      q: 'Why does Android sometimes show a warning when installing the APK?',
      a: 'Android displays a standard "Install unknown apps" or security warning whenever you install an application directly from a website instead of Google Play. This is a built-in security check. As long as you download directly from https://www.zenemoo.in/app/android, the APK is clean, official, and safe to install.',
    },
    {
      q: 'How do I enable notifications?',
      a: 'When you open Zenemoo for the first time, tap "Allow" when the notification permission prompt appears. If you missed it, go to Phone Settings → Apps → Zenemoo → Notifications → toggle "Allow notifications" to ON.',
    },
    {
      q: 'How do Zenemoo notifications work?',
      a: 'Zenemoo utilizes an official enterprise push notification engine to deliver announcements, project releases, and task alerts directly to your device. Tapping a notification opens the relevant project or opportunity page automatically.',
    },
    {
      q: 'How do I update Zenemoo?',
      a: 'When an update is released, the Zenemoo app can display an in-app update notice. You can also visit this page at any time to download the latest official APK. Installing the new APK updates your app smoothly while preserving your settings.',
    },
    {
      q: 'What Android versions are supported?',
      a: 'Zenemoo supports Android 8.0 (Oreo / API level 26) and all newer versions, including Android 13, 14, and 15.',
    },
    {
      q: 'Where can I verify the APK?',
      a: 'You can verify the SHA-256 checksum of your downloaded APK against the official hash provided in the "Security & Authenticity" card on this page using any standard file verification utility.',
    },
    {
      q: 'What should I do if the APK does not install?',
      a: 'Ensure you have at least 30 MB of free storage space and Android 8.0+. Also verify that "Allow from this source" is enabled for your web browser in Android Settings → Apps → Special app access → Install unknown apps.',
    },
    {
      q: 'How can I contact Zenemoo support?',
      a: 'You can reach out to our team anytime via email at support@zenemoo.in or via our WhatsApp support helpline at +91 9827775230.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-cyan-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Navbar
        showBackButton={true}
        onBack={onBack || (() => (window.location.href = '/'))}
        onOpenAiDrawer={onOpenAiDrawer}
      />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12 sm:space-y-16">
        {/* ── 1. TOP APP INFORMATION & HERO ── */}
        <section className="text-center space-y-5 pt-2 sm:pt-4">
          {/* Centered App Logo Badge */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-400 via-teal-400 to-indigo-600 p-[2px] shadow-[0_0_35px_rgba(6,182,212,0.35)] animate-pulse">
              <div className="w-full h-full rounded-[22px] bg-black/80 flex items-center justify-center p-2">
                <SeoImage
                  src="/assets/logo.png"
                  alt="Zenemoo Android Application Logo"
                  priority={true}
                  width={60}
                  height={60}
                  className="w-full h-full object-contain rounded-2xl bg-white p-1"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg border-2 border-black">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white">
                Zenemoo
              </h1>
              <p className="text-xs sm:text-sm font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Official Android Application
              </p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-sans">
            Access opportunities, AI services, multilingual tasks, and real-time push notifications directly on your Android device.
          </p>

          {/* Primary Hero Download Button */}
          <div className="pt-2 max-w-md mx-auto space-y-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold font-mono text-base sm:text-lg shadow-[0_12px_35px_rgba(6,182,212,0.35)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-5 h-5 animate-bounce" />
              <span>{isDownloading ? 'Starting Download...' : `Download Zenemoo v${manifest.version}`}</span>
            </button>

            {downloadError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{downloadError}</span>
              </div>
            )}

            <p className="text-center text-[11px] font-mono text-slate-400">
              Official APK • {manifest.apkSize} • Direct HTTPS Download
            </p>
          </div>
        </section>

        {/* ── 2. CURRENT RELEASE DETAILS CARD ── */}
        <section className="relative">
          <div className="rounded-3xl bg-[#080d19]/90 backdrop-blur-2xl border border-cyan-500/30 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400" />

            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                    Latest Stable Release
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-mono font-extrabold text-cyan-300">
                      v{manifest.version}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Official Release
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-400 block">Package Identifier</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {manifest.packageName}
                  </span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-400 block">Release Type</span>
                  <span className="text-sm font-mono font-extrabold text-emerald-300 capitalize">
                    {manifest.releaseType || 'Stable'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-400 block">APK File Size</span>
                  <span className="text-sm font-mono font-extrabold text-white">
                    {manifest.apkSize}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-400 block">Architecture</span>
                  <span className="text-xs font-mono font-bold text-slate-300 truncate block">
                    {manifest.architecture}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-400 block">Min. Android</span>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {manifest.minimumAndroid}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                <span>Release Date: <strong className="text-slate-200">{manifest.releaseDate}</strong></span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Signed APK
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. WHAT IS ZENEMOO? ── */}
        <section className="p-6 sm:p-7 rounded-3xl bg-[#090e1a]/80 border border-cyan-500/20 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white">
              What is Zenemoo?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            Zenemoo is an AI-powered language and data services platform providing multilingual data solutions, AI services, opportunities, and digital tools through web and mobile applications.
          </p>
        </section>

        {/* ── 4. WHAT YOU CAN DO WITH ZENEMOO (6 COMPACT CARDS) ── */}
        <section className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
              What You Can Do with Zenemoo
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Key capabilities available inside the mobile application.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Briefcase className="w-4 h-4 shrink-0" />
                <h3 className="text-white font-display">Explore Opportunities</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Discover current Zenemoo opportunities, projects, and participation programs.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center justify-between gap-2 text-purple-400 font-bold text-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
                  <h3 className="text-white font-display">AI &amp; Data Services</h3>
                </div>
                <a
                  href="/zenemooai"
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors shrink-0 font-bold"
                >
                  Explore Zenemoo AI →
                </a>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Access AI data workflows, speech transcription, multilingual dataset tools, and interactive AI assistance.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Radio className="w-4 h-4 shrink-0" />
                <h3 className="text-white font-display">Project Updates</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Receive important announcements, project updates, and platform notifications.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                <Bell className="w-4 h-4 shrink-0" />
                <h3 className="text-white font-display">Push Notifications</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Get real-time alerts for new opportunities and important Zenemoo updates.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Users className="w-4 h-4 shrink-0" />
                <h3 className="text-white font-display">Talent & Data Projects</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Access relevant language, transcription, annotation, and AI-data opportunities.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <Smartphone className="w-4 h-4 shrink-0" />
                <h3 className="text-white font-display">Mobile Experience</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Use Zenemoo conveniently from your Android device.
              </p>
            </div>
          </div>
        </section>

        {/* ── 5. KEY APP FEATURES ── */}
        <section className="p-6 sm:p-7 rounded-3xl bg-[#090e1a]/90 border border-white/10 space-y-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white">
              Key App Features
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Real-time push notifications</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Opportunity updates</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">AI-powered services</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Multilingual support</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Secure account access</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Mobile-optimized experience</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Fast navigation</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">Regular application updates</span>
            </div>
          </div>
        </section>

        {/* ── 6. WHAT'S NEW TIMELINE CARD ── */}
        <section className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-cyan-950/30 to-purple-950/20 border border-cyan-500/25 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>What's New in v{manifest.version}</span>
            </h2>
            <span className="text-xs font-mono text-cyan-300">
              Released {manifest.releaseDate}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {manifest.releaseNotes.map((note, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed"
              >
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. STAY UPDATED WITH ZENEMOO (NOTIFICATION SYSTEM) ── */}
        <section className="p-6 sm:p-7 rounded-3xl bg-[#090e1a]/90 border border-cyan-500/25 space-y-4">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white">
              Stay Updated with Zenemoo
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            With Zenemoo notifications enabled, you can receive real-time updates directly on your device:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
              <span>New opportunity announcements</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
              <span>Project updates</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
              <span>Important platform announcements</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
              <span>Service updates</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
              <span>Application updates</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
              <span>Important account-related notifications</span>
            </div>
          </div>

          <p className="text-[11px] font-mono text-slate-400 border-t border-white/5 pt-3">
            Notifications are delivered through the official Zenemoo notification system.
          </p>
        </section>

        {/* ── 8. APP PERMISSIONS ── */}
        <section className="p-6 sm:p-7 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white">
              App Permissions
            </h2>
          </div>

          <p className="text-xs text-slate-400 font-sans">
            Zenemoo may request permissions required for specific features:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Bell className="w-4 h-4" />
                <span>Notifications (POST_NOTIFICATIONS)</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Used to send opportunity alerts and important platform updates.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Wifi className="w-4 h-4" />
                <span>Internet Access (INTERNET / NETWORK_STATE)</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Required to securely connect to Zenemoo services and sync data.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Mic className="w-4 h-4" />
                <span>Microphone & Camera (Optional)</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Optional permission used for speech audio recording samples and talent registration verification.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <FileCheck2 className="w-4 h-4" />
                <span>Media Storage (Optional)</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Optional permission used when uploading candidate resumes or audio samples.
              </p>
            </div>
          </div>
        </section>

        {/* ── 9. SECURITY & AUTHENTICITY ── */}
        <section className="p-6 sm:p-7 rounded-3xl bg-[#090e1a]/95 border border-emerald-500/30 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white">
              Security & Authenticity
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            This is the official Zenemoo Android application distributed through the Zenemoo website. Only download from the official link: <strong className="text-cyan-300">https://www.zenemoo.in/app/android</strong>.
          </p>

          <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
            <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-2">
              <span className="text-slate-400">Package: <strong className="text-white">{manifest.packageName}</strong></span>
              <span className="text-slate-400">Release: <strong className="text-cyan-300">v{manifest.version}</strong></span>
            </div>

            <div className="space-y-1 pt-1 border-t border-white/5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-cyan-400" />
                  <span>SHA-256 Checksum:</span>
                </span>
                <button
                  onClick={handleCopySha}
                  className="px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 transition-colors flex items-center gap-1 font-bold cursor-pointer text-[10px]"
                  title="Copy Checksum"
                >
                  {copiedSha ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSha ? 'Copied SHA-256' : 'Copy SHA-256'}</span>
                </button>
              </div>
              <p className="font-mono text-[10px] sm:text-xs text-slate-400 break-all leading-tight">
                {manifest.sha256}
              </p>
            </div>
          </div>
        </section>

        {/* ── 10. HOW TO INSTALL (COMPACT 6-STEP GUIDE) ── */}
        <section className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
              How to Install
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Before installing: Make sure the APK was downloaded from the official Zenemoo website.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Step 1</span>
              <h4 className="font-bold text-xs text-white">Download APK</h4>
              <p className="text-[11px] text-slate-300 leading-snug">Download the official file above.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Step 2</span>
              <h4 className="font-bold text-xs text-white">Open File</h4>
              <p className="text-[11px] text-slate-300 leading-snug">Tap the downloaded notification or file.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Step 3</span>
              <h4 className="font-bold text-xs text-white">Allow Source</h4>
              <p className="text-[11px] text-slate-300 leading-snug">Toggle "Allow from this source" if requested.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Step 4</span>
              <h4 className="font-bold text-xs text-white">Tap Install</h4>
              <p className="text-[11px] text-slate-300 leading-snug">Confirm package installation.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
              <span className="text-[10px] font-mono font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Step 5</span>
              <h4 className="font-bold text-xs text-white">Open Zenemoo</h4>
              <p className="text-[11px] text-slate-300 leading-snug">Launch the installed application.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-1">
              <span className="text-[10px] font-mono font-extrabold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded">Step 6</span>
              <h4 className="font-bold text-xs text-white">Allow Notifications</h4>
              <p className="text-[11px] text-slate-300 leading-snug">Enable notifications when prompted.</p>
            </div>
          </div>
        </section>

        {/* ── 11. HOW ZENEMOO APP UPDATES WORK ── */}
        <section className="p-6 sm:p-7 rounded-3xl bg-[#090e1a]/90 border border-white/10 space-y-4">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white">
              How Zenemoo App Updates Work
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="font-mono text-cyan-400 font-bold block text-[10px]">1. Release</span>
              <p className="text-slate-300 text-[11px] leading-snug">Zenemoo publishes a new official APK.</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="font-mono text-cyan-400 font-bold block text-[10px]">2. Metadata Sync</span>
              <p className="text-slate-300 text-[11px] leading-snug">Latest version information updates on this page.</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="font-mono text-cyan-400 font-bold block text-[10px]">3. Version Check</span>
              <p className="text-slate-300 text-[11px] leading-snug">The Zenemoo app checks for available updates.</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="font-mono text-cyan-400 font-bold block text-[10px]">4. Update Prompt</span>
              <p className="text-slate-300 text-[11px] leading-snug">If an update exists, the app shows an update prompt.</p>
            </div>

            <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-1">
              <span className="font-mono text-cyan-300 font-bold block text-[10px]">5. Download</span>
              <p className="text-slate-300 text-[11px] leading-snug">Users download and install the latest APK.</p>
            </div>
          </div>

          <p className="text-[11px] font-mono text-slate-400 border-t border-white/5 pt-3">
            Note: The app notifies you when an update is available; APK installation is confirmed by the user.
          </p>
        </section>

        {/* ── 12. AFTER INSTALLING ZENEMOO ── */}
        <section className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-cyan-950/20 to-teal-950/20 border border-cyan-500/20 space-y-3.5">
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white">
              After Installing Zenemoo
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-2 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Sign in or continue with the available account flow</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-2 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Allow notifications if you want real-time updates</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-2 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Explore available opportunities</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-2 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Check Notification Center for recent announcements</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-2 text-slate-200 sm:col-span-2 lg:col-span-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Keep the app updated when a new release becomes available</span>
            </div>
          </div>
        </section>

        {/* ── 13. FREQUENTLY ASKED QUESTIONS (EXPANDED 9-ITEM ACCORDION) ── */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white text-center flex items-center justify-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <span>Frequently Asked Questions</span>
          </h2>

          <div className="space-y-2.5 max-w-3xl mx-auto">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-cyan-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-2.5 font-sans">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 14. NEED HELP & SUPPORT ── */}
        <section className="p-6 sm:p-7 rounded-3xl bg-[#090e1a]/90 border border-white/10 text-center space-y-4">
          <div className="space-y-1">
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white">
              Need Help?
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Our contributor support team is ready to assist you with installation or application queries.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:support@zenemoo.in"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center gap-2 transition-colors"
            >
              <Mail className="w-4 h-4 text-cyan-400" />
              <span>Email: support@zenemoo.in</span>
            </a>

            <a
              href="https://wa.me/919827775230?text=Hi%20Zenemoo%20Team%2C%20I%20need%20assistance%20with%20the%20Android%20app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp: +91 9827775230</span>
            </a>
          </div>

          <div className="pt-3 border-t border-white/5 text-xs font-mono text-slate-400">
            <span>Looking for other platforms? Explore other Zenemoo applications on </span>
            <a href="/app" className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2">
              Zenemoo Apps
            </a>.
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
