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
  KeyRound,
  Fingerprint,
  Layers,
  ArrowRight,
  ShieldAlert,
  FileCheck2,
  Server,
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
  version: '2.0.6',
  versionCode: 8,
  apkUrl: 'https://www.zenemoo.in/downloads/zenemoo-team-latest.apk',
  apkFileName: 'zenemoo-team-v2.0.6.apk',
  apkSize: '16.7 MB',
  releaseDate: '2026-08-23',
  minimumAndroid: 'Android 8.0 (API 26) or later',
  targetAndroid: 'Android 14 / 15 (API 34/35)',
  architecture: 'Universal (ARM64, ARMv7, x86_64)',
  sha256: 'a5f2a9ca9bf66a32090e7684467543981aafb1c3cc8367198880a5cd8ebe4393',
  releaseType: 'stable',
  isOfficial: true,
  releaseNotes: [
    '🔐 Valid production release APK signed with official v1/v2 signing scheme.',
    '👥 Unified Team Access Portal supporting Core & Leadership Team and Team Members.',
    '🔑 Secure User ID + Password authentication with native Android biometric unlock.',
    '💼 Opportunity Center integration for active program listings and candidate evaluation.',
    '🔔 Native Android 13+ POST_NOTIFICATIONS runtime permission prompt and FCM push dispatch.',
    '🛡️ Isolated package ID in.zenemoo.team with robust package installer compatibility.',
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

  const scrollToSection = (id: string) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'What is Zenemoo Team & HR?',
      a: 'Zenemoo Team & HR is a standalone native Android application (package ID: in.zenemoo.team) built specifically for internal Zenemoo staff, HR teams, project leads, and team members to manage operations and access tools securely.',
    },
    {
      q: 'Who can use the application?',
      a: 'The application supports two primary internal user tiers: 1) Core & Leadership Team (HR, Managers, Leads, Authorized internal staff) and 2) Team Members (Regular employees & contributor members).',
    },
    {
      q: 'Do I need an email address to log in?',
      a: 'No. Team & HR authentication uses your authorized Zenemoo User ID and Password. Email login is not used.',
    },
    {
      q: 'Can I enable Biometric Login (Fingerprint / Face Unlock)?',
      a: 'Yes. After your first successful login using User ID and Password, the app will prompt to enable Biometric authentication. Future launches can be unlocked instantly via Fingerprint or Face ID.',
    },
    {
      q: 'How do I receive important notifications?',
      a: 'Upon launching the app, Android 13+ will prompt for native POST_NOTIFICATIONS permission. Once granted, real-time push alerts dispatch directly to your device via FCM.',
    },
    {
      q: 'How do I update the application when a new release comes out?',
      a: 'The Team & HR app automatically checks for updates via /app/android/team-release.json. If a new version exists, an update prompt will appear inside the app allowing one-click download of zenemoo-team-latest.apk.',
    },
    {
      q: 'Where do I download the official APK?',
      a: 'Directly from this official Zenemoo page (https://www.zenemoo.in/app/android/team). The APK is digitally signed and verified with v1/v2 signature schemes.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">
      <Navbar
        showBackButton={true}
        onBack={onBack || (() => (window.location.href = '/app'))}
        onOpenAiDrawer={onOpenAiDrawer}
      />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-16">
        {/* ── 1. HERO SECTION ── */}
        <section className="text-center space-y-6 pt-4 sm:pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Users2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>OFFICIAL ZENEMOO TEAM &amp; HR APPLICATION</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-white">
              Zenemoo Team &amp; HR
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans">
              One workspace for Zenemoo&apos;s internal team, leadership, and HR operations.
            </p>
          </div>

          {/* PRIMARY & SECONDARY CTA BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold font-mono text-sm sm:text-base shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer min-h-[54px]"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Preparing Download...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download Zenemoo Team &amp; HR ({manifest.apkSize})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('release-notes')}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono font-bold text-xs sm:text-sm transition-colors cursor-pointer min-h-[54px] flex items-center justify-center gap-2"
            >
              <span>View Release Notes</span>
              <ChevronDown className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </section>

        {/* ── 2. PRIMARY RELEASE CARD ── */}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-extrabold text-2xl text-white">Zenemoo Team &amp; HR</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                    Official Release v{manifest.version}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                    Signed Production Package
                  </span>
                </div>
                <p className="text-xs font-mono text-cyan-400">{manifest.packageName}</p>
              </div>
            </div>
          </div>

          {/* METADATA GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px]">VERSION</span>
              <span className="text-white font-bold block">v{manifest.version} (Build {manifest.versionCode})</span>
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

          {/* SHA-256 VERIFICATION HASH */}
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
          <div id="release-notes" className="space-y-3 text-left pt-2">
            <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Release Notes &amp; Highlights:
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

        {/* ── 3. WHAT THE TEAM APP IS FOR ── */}
        <section className="space-y-6 text-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>BUILT FOR THE ZENEMOO TEAM</span>
            </div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
              Integrated Operational Workspace
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
              The Zenemoo Team &amp; HR application provides an isolated, secure mobile portal for internal operational tasks, recruitment management, contributor workflows, and team communication.
            </p>
          </div>
        </section>

        {/* ── 4. CHOOSE YOUR WORKSPACE (ROLE SELECTION) ── */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white">
              Choose Your Workspace
            </h3>
            <p className="text-xs text-slate-400">
              Users select their designated access type when launching the application.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD 1: CORE & LEADERSHIP */}
            <div className="rounded-3xl bg-[#080d19]/90 border border-cyan-500/30 p-6 sm:p-8 space-y-5 shadow-xl hover:border-cyan-400 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-display font-bold text-lg text-white group-hover:text-cyan-300 transition-colors">
                  Core &amp; Leadership Team
                </h4>
                <p className="text-xs font-mono text-cyan-400">HR • Managers • Leads • Internal Team</p>
                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  Access recruitment candidate submissions, review profile updates, manage team directory records, dispatch notifications, and oversee operational workflows.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-400 pt-2 border-t border-white/10">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>HR Candidate Submissions &amp; Approvals</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Team Directory &amp; RBAC Control</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Notification Dispatch &amp; Opportunity Management</span>
                </li>
              </ul>
            </div>

            {/* CARD 2: TEAM MEMBER */}
            <div className="rounded-3xl bg-[#080d19]/90 border border-purple-500/30 p-6 sm:p-8 space-y-5 shadow-xl hover:border-purple-400 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-display font-bold text-lg text-white group-hover:text-purple-300 transition-colors">
                  Team Member
                </h4>
                <p className="text-xs font-mono text-purple-400">Regular Team Access • Operational Workflows</p>
                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  Access your profile editor, browse active Opportunity Center projects, manage account security, receive FCM notifications, and access allowed tools.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-400 pt-2 border-t border-white/10">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Self Profile Editor &amp; Security Settings</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Opportunity Center Exploration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Biometric Unlock &amp; Push Notifications</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── 5. KEY FEATURES GRID ── */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white">
              Application Features
            </h3>
            <p className="text-xs text-slate-400">
              Core capabilities built directly into the Zenemoo Team &amp; HR Android application.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="rounded-2xl bg-[#080d19] border border-white/10 p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Secure Team Login</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                User ID + Password authentication tailored for authorized Zenemoo team users without email overhead.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080d19] border border-white/10 p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Fingerprint className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Biometric Access</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Native Fingerprint and Face Unlock support after initial password sign-in for effortless access.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080d19] border border-white/10 p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Push Notifications</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Native Android 13+ POST_NOTIFICATIONS integration for real-time task alerts and system dispatches.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080d19] border border-white/10 p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Opportunity Center</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browse current opportunities, partner programs, requirements, and candidate links directly inside the app.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080d19] border border-white/10 p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Role-Based Access</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict backend enforcement ensuring HR/Admin tools remain secured from non-core members.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080d19] border border-white/10 p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Internal Workspace</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clean, mobile-first design safe for small phones and tablets with safe-area padding.
              </p>
            </div>
          </div>
        </section>

        {/* ── 6. OPPORTUNITY CENTER SECTION ── */}
        <section className="rounded-3xl bg-gradient-to-r from-cyan-950/40 via-[#080d19] to-purple-950/40 border border-cyan-500/30 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
                <Briefcase className="w-4 h-4" />
                <span>INTEGRATED OPPORTUNITY CENTER</span>
              </div>
              <h3 className="font-display font-extrabold text-xl text-white">
                Explore Zenemoo Opportunities Inside the App
              </h3>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                The Team &amp; HR application synchronizes live with Zenemoo&apos;s opportunity repository, allowing team members to review active projects and candidate details directly.
              </p>
            </div>

            <a
              href="/opportunities"
              className="px-5 py-3 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <span>Explore Opportunities</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* ── 7. SECURITY & ACCESS SECTION ── */}
        <section className="rounded-3xl bg-[#080d19] border border-white/10 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Security &amp; Access Controls</h3>
              <p className="text-xs text-slate-400">Enterprise security standards applied to the Team App.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-slate-300">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-cyan-400 font-bold block">✓ Authenticated Session Storage</span>
              <p className="text-[11px] text-slate-400">JWT tokens and user sessions stored securely; passwords are never retained locally.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-emerald-400 font-bold block">✓ Android Keystore Biometrics</span>
              <p className="text-[11px] text-slate-400">Biometric templates stay protected within Android OS hardware security modules.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-purple-400 font-bold block">✓ Server-Side Authorization</span>
              <p className="text-[11px] text-slate-400">All administrative operations require valid JWT verification with RBAC rules.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-amber-400 font-bold block">✓ Isolated Package Scope</span>
              <p className="text-[11px] text-slate-400">Standalone package ID in.zenemoo.team prevents conflict with public user applications.</p>
            </div>
          </div>
        </section>

        {/* ── 8. TRUST VERIFICATION SECTION ── */}
        <section className="p-6 rounded-3xl bg-black/50 border border-emerald-500/30 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-display font-bold text-base text-white">Official Zenemoo Direct Release</h4>
              <p className="text-xs text-slate-300">
                This APK is compiled directly from official Zenemoo source code and signed with valid production signing schemes.
              </p>
            </div>
          </div>
        </section>

        {/* ── 9. FREQUENTLY ASKED QUESTIONS ── */}
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
