import React, { useState, useEffect } from 'react';
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
  Lock,
  RefreshCw,
  ExternalLink,
  Users2,
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

const DEFAULT_TEAM_MANIFEST: ReleaseManifest = {
  platform: 'android',
  appName: 'Zenemoo Team & HR',
  packageName: 'in.zenemoo.team',
  version: '1.0.0',
  versionCode: 1,
  apkUrl: 'https://www.zenemoo.in/downloads/zenemoo-team-latest.apk',
  apkFileName: 'zenemoo-team-v1.0.0.apk',
  apkSize: '8.5 MB',
  releaseDate: '2026-08-23',
  minimumAndroid: 'Android 8.0 (API 26) or later',
  targetAndroid: 'Android 14 / 15 (API 34/35)',
  architecture: 'Universal (ARM64, ARMv7, x86_64)',
  sha256: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
  releaseType: 'stable',
  isOfficial: true,
  releaseNotes: [
    '👥 Unified Team Access Portal supporting Core & Leadership Team and Team Members.',
    '🔐 Secure User ID + Password authentication with native Android biometric unlock.',
    '💼 Opportunity Center integration for active program listings and candidate evaluation.',
    '🔔 Native Android 13+ POST_NOTIFICATIONS runtime permission prompt and FCM push dispatch.',
    '🛡️ Hardened enterprise security, isolated package ID in.zenemoo.team, and zero cross-app conflicts.',
  ],
};

interface ZenemooTeamAndroidAppPageProps {
  onBack?: () => void;
  onOpenAiDrawer?: () => void;
}

export const ZenemooTeamAndroidAppPage: React.FC<ZenemooTeamAndroidAppPageProps> = ({
  onBack,
  onOpenAiDrawer,
}) => {
  const [manifest, setManifest] = useState<ReleaseManifest>(DEFAULT_TEAM_MANIFEST);
  const [copiedSha, setCopiedSha] = useState<boolean>(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchManifest = async () => {
      try {
        const response = await fetch('/app/android/team-release.json', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data && data.version) {
            setManifest({ ...DEFAULT_TEAM_MANIFEST, ...data });
          }
        }
      } catch (err) {
        // Fallback to DEFAULT_TEAM_MANIFEST
      }
    };
    fetchManifest();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopySha = () => {
    if (navigator.clipboard && manifest.sha256) {
      navigator.clipboard.writeText(manifest.sha256);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 3000);
    }
  };

  const handleDownload = () => {
    setIsDownloading(true);
    const downloadUrl = manifest.apkUrl || '/downloads/zenemoo-team-latest.apk';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = manifest.apkFileName || 'zenemoo-team-latest.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsDownloading(false), 2500);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'Who can use the Zenemoo Team & HR App?',
      a: 'The app is designed for internal Zenemoo team members, HR operations staff, team managers, and leadership. It supports both Core & Leadership Team and Team Member access levels.',
    },
    {
      q: 'How do I log in to the Team App?',
      a: 'Select your account role ("Core & Leadership Team" or "Team Member"), enter your Zenemoo User ID and Password. Fingerprint or Face Unlock can be enabled after your first login.',
    },
    {
      q: 'Does the Team App require special permissions?',
      a: 'The app will prompt for native Android POST_NOTIFICATIONS permission for real-time task alerts and speech recognition microphone permissions for voice notes.',
    },
    {
      q: 'Is the Team App separate from the main Zenemoo User App?',
      a: 'Yes. The Team & HR App is an isolated Android application (package: in.zenemoo.team) with dedicated update channels and security scopes.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">
      <Navbar
        showBackButton={true}
        onBack={onBack || (() => (window.location.href = '/app'))}
        onOpenAiDrawer={onOpenAiDrawer}
      />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12 sm:space-y-16">
        {/* HERO SECTION */}
        <section className="text-center space-y-5 pt-4 sm:pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Users2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>OFFICIAL TEAM &amp; HR APPLICATION TARGET</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-white">
              Zenemoo Team &amp; HR App
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans">
              Unified internal mobile application for Zenemoo HR management, team member workflows, Opportunity Center, and secure operational tools.
            </p>
          </div>
        </section>

        {/* PRIMARY DOWNLOAD CARD */}
        <section className="rounded-3xl bg-[#080d19]/95 backdrop-blur-2xl border border-cyan-500/40 p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.2)] relative overflow-hidden space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex items-center gap-4 text-left">
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/30 to-purple-500/20 border border-cyan-400/40 flex items-center justify-center p-1 shadow-lg shadow-cyan-500/20 shrink-0">
                <SeoImage
                  src="/assets/team-logo.png"
                  alt="Zenemoo Team & HR Application Logo"
                  priority={true}
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain rounded-xl bg-white p-0.5"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-extrabold text-2xl text-white">Zenemoo Team &amp; HR</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                    Official Release v{manifest.version}
                  </span>
                </div>
                <p className="text-xs font-mono text-cyan-400">{manifest.packageName}</p>
              </div>
            </div>

            {/* DOWNLOAD BUTTON */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold font-mono text-sm sm:text-base shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer min-h-[54px]"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Preparing Download...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download Team &amp; HR APK ({manifest.apkSize})</span>
                </>
              )}
            </button>
          </div>

          {/* RELEASE METADATA GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px]">VERSION</span>
              <span className="text-white font-bold block">{manifest.version} (Build {manifest.versionCode})</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px]">FILE SIZE</span>
              <span className="text-cyan-300 font-bold block">{manifest.apkSize}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px]">MINIMUM OS</span>
              <span className="text-white font-bold block">{manifest.minimumAndroid}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px]">RELEASE DATE</span>
              <span className="text-emerald-300 font-bold block">{manifest.releaseDate}</span>
            </div>
          </div>

          {/* SHA-256 CHECKSUM */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">SHA-256 Package Verification Hash:</span>
              <button
                type="button"
                onClick={handleCopySha}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedSha ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSha ? 'Copied Hash' : 'Copy SHA-256'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-300 break-all select-all">
              {manifest.sha256}
            </div>
          </div>

          {/* RELEASE NOTES */}
          <div className="space-y-3 text-left">
            <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Release Notes &amp; What's New:
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
              {manifest.releaseNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h3 className="font-display font-bold text-xl sm:text-2xl text-white">Frequently Asked Questions</h3>
            <p className="text-xs text-slate-400">Everything you need to know about the Zenemoo Team &amp; HR App.</p>
          </div>

          <div className="space-y-3 max-w-3xl mx-auto">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-2xl bg-[#080d19] border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-semibold text-xs sm:text-sm text-white">{faq.q}</span>
                  {activeFaq === idx ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {activeFaq === idx && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ZenemooTeamAndroidAppPage;
