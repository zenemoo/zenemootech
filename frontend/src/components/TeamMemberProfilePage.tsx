import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Star,
  Mail,
  Linkedin,
  Github,
  Globe,
  Share2,
  Copy,
  Check,
  Calendar,
  MapPin,
  Clock,
  Briefcase,
  CheckCircle2,
  Award,
  Layers,
  ArrowLeft,
  UserCheck,
  TrendingUp,
  Cpu,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { TeamMember, getStoredTeamMembers, getSlugFromName } from '../lib/teamStore';
import { teamApi } from '../services/api';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CursorSpotlight } from './CursorSpotlight';
import { ThreeNeuralBackground } from './ThreeNeuralBackground';
import { ImageWithSkeleton } from './ImageWithSkeleton';
import { ProfilePageSkeleton } from './SkeletonComponents';

interface TeamMemberProfilePageProps {
  slug: string;
  onBack: () => void;
  onOpenAiDrawer?: () => void;
}

export const TeamMemberProfilePage: React.FC<TeamMemberProfilePageProps> = ({
  slug,
  onBack,
  onOpenAiDrawer,
}) => {
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const fetchMember = async () => {
      setLoading(true);
      try {
        const members = await getStoredTeamMembers();
        const found = members.find((m) => {
          const mSlug = m.slug || getSlugFromName(m.name);
          return mSlug.toLowerCase() === slug.toLowerCase();
        });
        setMember(found || null);
      } catch (err) {
        console.error('Failed to load team member profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [slug]);

  // Inject dynamic SEO & OpenGraph tags into document head
  useEffect(() => {
    if (!member) return;

    const pageTitle = `${member.name} | ${member.designation || 'Data & AI Specialist'} | Zenemoo`;
    const pageDescription = member.bio || `${member.name} is a key team member at Zenemoo AI Data Solutions.`;
    const profileUrl = `https://www.zenemoo.in/team/${member.slug || getSlugFromName(member.name)}`;
    const imageUrl = member.image_url || 'https://www.zenemoo.in/assets/logo.png';

    document.title = pageTitle;

    const setMeta = (nameAttr: string, attrVal: string, content: string) => {
      let element = document.querySelector(`meta[${nameAttr}="${attrVal}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMeta('name', 'description', pageDescription);
    setMeta('property', 'og:title', pageTitle);
    setMeta('property', 'og:description', pageDescription);
    setMeta('property', 'og:url', profileUrl);
    setMeta('property', 'og:image', imageUrl);
    setMeta('property', 'og:type', 'profile');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', pageDescription);
    setMeta('name', 'twitter:image', imageUrl);

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', profileUrl);

    // Structured JSON-LD Person Schema
    const jsonLdData = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: member.name,
      jobTitle: member.designation || member.role,
      worksFor: {
        '@type': 'Organization',
        name: 'Zenemoo Data Solutions',
        url: 'https://www.zenemoo.in',
      },
      image: imageUrl,
      url: profileUrl,
      description: pageDescription,
      sameAs: [member.linkedin, member.github, member.twitter, member.portfolio].filter(Boolean),
    };

    let scriptTag = document.getElementById('team-person-jsonld');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'team-person-jsonld';
      scriptTag.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(jsonLdData);

    return () => {
      // Revert title when unmounting
      document.title = 'Zenemoo — Multilingual AI Data & Speech Solutions';
    };
  }, [member]);

  const handleCopyLink = () => {
    const profileUrl = window.location.href;
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleShare = async () => {
    const profileUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${member?.name} — Zenemoo AI Profile`,
          text: `Check out ${member?.name}'s official staff profile at Zenemoo AI Data Solutions!`,
          url: profileUrl,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleRegenerateSummary = async () => {
    if (!member) return;
    setGeneratingSummary(true);
    try {
      const res = await teamApi.generateSummary(member.id);
      if (res.data && res.data.ai_summary) {
        setMember((prev) => (prev ? { ...prev, ai_summary: res.data.ai_summary } : null));
      }
    } catch (err) {
      console.error('Failed to regenerate summary:', err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-slate-100 relative overflow-x-hidden font-sans">
        <Navbar showBackButton={true} onBack={onBack} onOpenAiDrawer={onOpenAiDrawer} />
        <main className="relative z-10 pt-36 pb-24 max-w-5xl mx-auto px-4 text-center">
          <div className="glass-panel p-16 rounded-3xl border border-white/10 space-y-6">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="text-cyan-400 font-mono text-sm tracking-wider uppercase">
              Loading Digital Staff Profile...
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Beautiful Futuristic 404 Screen if slug is invalid
  if (!member) {
    return (
      <div className="min-h-screen bg-[#050505] text-slate-100 relative overflow-x-hidden font-sans">
        <CursorSpotlight />
        <ThreeNeuralBackground />
        <Navbar showBackButton={true} onBack={onBack} onOpenAiDrawer={onOpenAiDrawer} />
        <main className="relative z-10 pt-36 pb-24 max-w-3xl mx-auto px-4 text-center space-y-8">
          <div className="glass-panel p-12 sm:p-16 rounded-3xl border border-white/10 space-y-6 shadow-2xl bg-black/60 backdrop-blur-2xl">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-pulse"></div>
              <UserCheck className="w-24 h-24 text-slate-500 relative z-10 mx-auto" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
              404 — PROFILE NOT FOUND
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white">
              Team Member Profile Not Found
            </h1>

            <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
              The requested team member slug <code className="text-cyan-300 bg-white/5 px-2 py-0.5 rounded font-mono">/team/{slug}</code> does not exist in the official Zenemoo directory or has been updated.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => {
                  window.history.pushState(null, '', '/team-directory');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold font-mono text-xs tracking-wider transition-all shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                View Full Team Directory
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Derive display values
  const profileSlug = member.slug || getSlugFromName(member.name);
  const employeeId = member.employee_id || `ZNM-${(member.id || '202401').substring(0, 5).toUpperCase()}`;
  const joiningDate = member.joining_date || '2023';
  const experience = member.experience || '3+ Years';
  const location = member.location || 'Odisha, India';
  const availability = member.availability || 'Available for Enterprise AI Projects';
  const languagesList = member.languages && member.languages.length > 0 ? member.languages : ['English', 'Odia', 'Hindi'];
  const profileQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://www.zenemoo.in/team/${profileSlug}`)}&color=38bdf8&bgcolor=090b12`;

  // Filter available statistics cards
  const statsList = [
    { label: 'Projects Completed', value: member.projects_completed, icon: Briefcase, color: 'text-cyan-400' },
    { label: 'Accuracy Standard', value: member.accuracy, icon: ShieldCheck, color: 'text-emerald-400' },
    { label: 'Datasets Processed', value: member.datasets_processed, icon: Layers, color: 'text-purple-400' },
    { label: 'Quality Score', value: member.quality_score, icon: Star, color: 'text-amber-400' },
    { label: 'Hours Processed', value: member.hours_worked, icon: Clock, color: 'text-blue-400' },
    { label: 'Completion Rate', value: member.completion_rate, icon: TrendingUp, color: 'text-indigo-400' },
  ].filter((s) => s.value !== undefined && s.value !== null && String(s.value).trim() !== '');

  return (
    <div className="min-h-screen bg-[#050505] light:bg-[#f8fafc] text-slate-100 light:text-slate-900 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-300 font-sans">
      {/* Interactive Spotlight & WebGL Neural Canvas Background */}
      <CursorSpotlight />
      <ThreeNeuralBackground />

      {/* Top Navbar */}
      <Navbar showBackButton={true} onBack={onBack} onOpenAiDrawer={onOpenAiDrawer} />

      <main className="relative z-10 pt-32 pb-24">
        {/* Background Ambient Glow Header */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-cyan-500/10 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Breadcrumb Navigation & Top Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <button
              onClick={() => {
                window.history.pushState(null, '', '/team-directory');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Team Directory</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-all text-xs font-mono flex items-center gap-2 cursor-pointer shadow-md"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={handleShare}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold font-mono text-xs hover:bg-cyan-400 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Profile</span>
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* DIGITAL COMPANY ID CARD HERO CONTAINER                       */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/10 relative overflow-hidden bg-gradient-to-br from-[#090b12]/90 via-[#0d111d]/90 to-[#05070d]/90 backdrop-blur-2xl shadow-2xl space-y-8">
            {/* Top ID Card Banner & Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-widest">
                  ZENEMOO DIGITAL STAFF IDENTITY
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  ID: <span className="text-cyan-300 font-bold">{employeeId}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {member.status === 'active' ? 'ACTIVE STAFF' : 'ALUMNI'}
                </span>
              </div>
            </div>

            {/* Main ID Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Left Column: Photo & QR Code */}
              <div className="md:col-span-4 flex flex-col items-center space-y-6">
                {/* Avatar Photo Card */}
                <div className="relative w-full max-w-xs aspect-[4/5] rounded-2xl overflow-hidden border-2 border-cyan-500/30 p-1 bg-gradient-to-b from-cyan-500/20 via-purple-500/20 to-transparent shadow-2xl group">
                  <ImageWithSkeleton
                    src={member.image_url || member.image || member.fallback || '/assets/executive.png'}
                    fallbackSrc={member.fallback || '/assets/executive.png'}
                    fallbackType="avatar"
                    alt={member.name}
                    className="w-full h-full object-cover object-top rounded-xl group-hover:scale-105 transition-transform duration-500"
                    containerClassName="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                  {/* Star Badge Overlay */}
                  <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-cyan-500/40 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-lg">
                    {member.badge === 'Founder' ? (
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    {member.badge || 'Verified Specialist'}
                  </span>
                </div>

                {/* Micro QR Code Box */}
                <div className="w-full max-w-xs glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-4 bg-white/[0.02]">
                  <ImageWithSkeleton
                    src={profileQrUrl}
                    alt="QR Code"
                    className="w-16 h-16 rounded-lg border border-cyan-500/30 bg-black p-1 shrink-0"
                    fallbackType="default"
                  />
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-cyan-300 font-bold flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      VERIFIED PROFILE QR
                    </div>
                    <p className="text-slate-400 text-[10px] leading-tight">
                      Scan with any smartphone camera to open or verify this public profile.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Member Details */}
              <div className="md:col-span-8 space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-purple-400 mb-1 font-semibold">
                    <span>{member.department || member.category || 'Data Solutions Division'}</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-bold">{member.designation || member.role}</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
                    {member.name}
                    <span title="Verified Zenemoo Staff Member">
                      <ShieldCheck className="w-7 h-7 text-cyan-400 shrink-0" />
                    </span>
                  </h1>
                </div>

                {/* Short Bio */}
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-sans font-light">
                  {member.bio}
                </p>

                {/* Metadata Grid (Location, Experience, Joining, Availability) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
                  <div className="glass-panel p-3 rounded-xl border border-white/5 space-y-1">
                    <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" /> Location
                    </div>
                    <div className="text-white font-bold text-xs truncate">{location}</div>
                  </div>

                  <div className="glass-panel p-3 rounded-xl border border-white/5 space-y-1">
                    <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-purple-400" /> Experience
                    </div>
                    <div className="text-white font-bold text-xs truncate">{experience}</div>
                  </div>

                  <div className="glass-panel p-3 rounded-xl border border-white/5 space-y-1">
                    <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" /> Joined
                    </div>
                    <div className="text-white font-bold text-xs truncate">{joiningDate}</div>
                  </div>

                  <div className="glass-panel p-3 rounded-xl border border-white/5 space-y-1">
                    <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" /> Availability
                    </div>
                    <div className="text-emerald-400 font-bold text-[11px] truncate">{availability}</div>
                  </div>
                </div>

                {/* Languages Supported */}
                {languagesList.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      SPECIALIZED LANGUAGES:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {languagesList.map((lang, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-semibold"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links Bar */}
                <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-all text-xs font-mono flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4 text-cyan-400" />
                      <span>{member.email}</span>
                    </a>
                  )}

                  {member.linkedin && (
                    <a
                      href={member.linkedin.startsWith('http') ? member.linkedin : `https://${member.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 border border-white/10 transition-all"
                      title="LinkedIn Profile"
                    >
                      <Linkedin className="w-4 h-4 text-blue-400" />
                    </a>
                  )}

                  {member.github && (
                    <a
                      href={member.github.startsWith('http') ? member.github : `https://${member.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-purple-600/20 text-slate-300 hover:text-purple-400 border border-white/10 transition-all"
                      title="GitHub Profile"
                    >
                      <Github className="w-4 h-4 text-purple-400" />
                    </a>
                  )}

                  {member.portfolio && (
                    <a
                      href={member.portfolio.startsWith('http') ? member.portfolio : `https://${member.portfolio}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-400 border border-white/10 transition-all"
                      title="Personal Portfolio"
                    >
                      <Globe className="w-4 h-4 text-emerald-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STATISTICS CARDS (Only show available database values)     */}
          {/* ─────────────────────────────────────────────────────────── */}
          {statsList.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Performance Metrics &amp; Achievements
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {statsList.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={i}
                      className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-cyan-500/40 transition-colors bg-white/[0.02]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-4 h-4 ${stat.color}`} />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      </div>
                      <div className="text-2xl font-extrabold font-mono text-white mb-0.5">{stat.value}</div>
                      <div className="text-[10px] font-mono text-slate-400">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* SKILLS CHIPS                                               */}
          {/* ─────────────────────────────────────────────────────────── */}
          {member.skills && member.skills.length > 0 && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4 bg-black/40">
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                Technical Competencies &amp; Expertise
              </h2>

              <div className="flex flex-wrap gap-2.5">
                {member.skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-xs font-mono text-slate-200 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* GROQ AI GENERATED EXECUTIVE SUMMARY                         */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 relative overflow-hidden bg-gradient-to-r from-cyan-950/20 via-purple-950/20 to-black space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                GROQ AI EXECUTIVE SUMMARY
              </div>

              <button
                onClick={handleRegenerateSummary}
                disabled={generatingSummary}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-white/10 transition-all text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Regenerate Executive Summary with Groq Llama 3.3"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generatingSummary ? 'animate-spin text-cyan-400' : ''}`} />
                <span>{generatingSummary ? 'Generating...' : 'Regenerate Summary'}</span>
              </button>
            </div>

            <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-sans italic border-l-2 border-cyan-400 pl-4 py-1">
              "{member.ai_summary || `${member.name} is an experienced ${member.designation} at Zenemoo specializing in multilingual AI data precision, quality assurance, and workflow execution.`}"
            </p>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* ABOUT & LONG BIO (If available)                             */}
          {/* ─────────────────────────────────────────────────────────── */}
          {member.long_bio && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4 bg-black/40">
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                About {member.name}
              </h2>
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line font-sans">
                {member.long_bio}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TIMELINE (If available)                                    */}
          {/* ─────────────────────────────────────────────────────────── */}
          {member.timeline && member.timeline.length > 0 && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 bg-black/40">
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Career Journey &amp; Milestones
              </h2>

              <div className="relative border-l-2 border-cyan-500/30 ml-4 space-y-8 pl-6">
                {member.timeline.map((item, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 border-4 border-black group-hover:scale-125 transition-transform" />
                    <div className="text-xs font-mono text-cyan-400 font-bold">{item.year || item.date || 'Milestone'}</div>
                    <h3 className="text-base font-bold text-white mt-0.5">{item.title}</h3>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* ACHIEVEMENTS & AWARDS (If available)                        */}
          {/* ─────────────────────────────────────────────────────────── */}
          {member.achievements && member.achievements.length > 0 && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4 bg-black/40">
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Awards &amp; Certifications
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {member.achievements.map((item, idx) => {
                  const title = typeof item === 'string' ? item : item.title;
                  const desc = typeof item === 'string' ? '' : item.description;
                  return (
                    <div key={idx} className="glass-panel p-4 rounded-2xl border border-white/5 flex items-start gap-3 bg-white/[0.02]">
                      <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-white">{title}</div>
                        {desc && <div className="text-[11px] text-slate-400 mt-0.5 font-sans">{desc}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mega Footer */}
      <Footer />
    </div>
  );
};

export default TeamMemberProfilePage;
