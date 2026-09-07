import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Sparkles,
  Share2,
  Copy,
  Check,
  ArrowLeft,
  ShieldCheck,
  Globe2,
  Users,
  Cpu,
  Layers,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Building2,
  HelpCircle,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { SeoImage } from '../../seo/components/SeoImage';

interface TalentHubSupportProps {
  onNavigateBack: () => void;
}

export const TalentHubSupport: React.FC<TalentHubSupportProps> = ({ onNavigateBack }) => {
  const { user, talentProfile } = useTalentHubAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Extract contributor personalized name
  const fullName =
    talentProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Contributor';

  const firstName = fullName.trim().split(' ')[0] || 'Contributor';

  const handleCopyLink = () => {
    const url = 'https://www.zenemoo.in';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Zenemoo — AI Data & Contributor Opportunities',
      text: 'Discover Zenemoo: Empowering human talent in multilingual AI data, speech collection, annotation, and inclusive technology.',
      url: 'https://www.zenemoo.in',
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShareFeedback('Shared successfully!');
        setTimeout(() => setShareFeedback(null), 3000);
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 w-full max-w-full min-w-0 overflow-hidden">
      {/* ── 1. Top Header & Personalized Greeting ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1020] via-[#080d19] to-[#05070e] border border-cyan-500/20 p-6 sm:p-8 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-mono font-bold uppercase tracking-wider shadow-sm">
              <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/30" />
              <span>ZENEMOO COMMUNITY SUPPORT</span>
            </div>

            {talentProfile?.registration_code && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Contributor: {talentProfile.registration_code}</span>
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            Hi, {firstName} 👋
          </h1>

          <p className="text-sm sm:text-base text-slate-200 font-normal leading-relaxed max-w-3xl">
            <span className="font-semibold text-white">Thank you for being part of Zenemoo.</span> You are already an essential part of the community helping us build better AI through language, data, domain knowledge, and real-world human contribution.
          </p>
        </div>
      </div>

      {/* ── 2. Hero Mission Message Card ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Our Shared Mission</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
          &ldquo;You&rsquo;re already helping build a brighter tomorrow.&rdquo;
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
          Zenemoo is dedicated to creating accessible, technology-driven opportunities for contributors across diverse languages and domains, while delivering enterprise-grade human intelligence for:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
          {[
            { label: 'Multilingual Data', icon: Globe2 },
            { label: 'Speech & Voice', icon: Users },
            { label: 'Indic Languages', icon: MessageSquare },
            { label: 'AI Annotation', icon: Layers },
            { label: 'Model Evaluation', icon: Cpu },
            { label: 'Enterprise AI', icon: Building2 },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center gap-1.5"
              >
                <Icon className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-mono text-slate-200 font-medium">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Why Your Support Matters & What It Helps Build ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Why Support Matters */}
        <div className="p-6 sm:p-7 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-pink-400 font-mono text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>Platform Sustenance</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white font-display">
              Why does Zenemoo need community support?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Zenemoo invests continuously in developing, maintaining, and scaling the technology, contributor platform, infrastructure, communication tools, and operational systems required to create and manage opportunities.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Voluntary community support helps fuel our ongoing mission to keep opportunities open, inclusive, and growing for contributors worldwide.
            </p>
          </div>
        </div>

        {/* What Your Support Helps Us Build */}
        <div className="p-6 sm:p-7 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Impact of Your Support</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white font-display">
            What your support empowers:
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-300 font-sans pt-1">
            {[
              'Improve the Talent Hub portal & contributor workflow tools',
              'Build robust evaluation, testing, and submission systems',
              'Reach and onboard contributors across more tier-2/tier-3 regions',
              'Support underrepresented and regional Indic languages',
              'Expand project infrastructure to handle larger enterprise pipelines',
              'Maintain inclusive, high-quality, and transparent contributor programs',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  ✓
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── 4. Personal Appreciation Card ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-cyan-950/30 via-[#080d19] to-purple-950/30 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
            <Heart className="w-3 h-3 text-cyan-400 fill-cyan-400/20" />
            <span>Personal Appreciation</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white font-display">
            Your contribution matters.
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            Whether you contribute your time, language expertise, domain knowledge, thoughtful feedback, or voluntary support, you are part of this transformative journey.
          </p>
          <p className="text-xs sm:text-sm font-semibold text-cyan-200 font-display pt-1">
            &ldquo;Thank you for believing that technology can create opportunities for more people.&rdquo;
          </p>
        </div>
      </div>

      {/* ── 5. Approved Zenemoo Poster Display ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
              Zenemoo Vision &amp; Story
            </span>
            <h3 className="text-lg font-bold text-white font-display">A Bright Tomorrow, Together.</h3>
          </div>
        </div>

        <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/50">
          <img
            src="/assets/founder-story-poster.png"
            alt="Prem Prasad Pradhan, Founder & COO of Zenemoo — A Bright Tomorrow, Together"
            className="w-full h-auto max-h-[500px] object-contain mx-auto transition-transform duration-500 hover:scale-[1.01]"
          />
        </div>
      </div>

      {/* ── 6. Voluntary Financial Support Section (Payment Flow Ready) ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#080d19]/95 border border-pink-500/30 shadow-2xl space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-mono font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
            <span>Support Zenemoo Growth</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white font-display">
            Want to support Zenemoo?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Your voluntary contribution directly helps us maintain the infrastructure, develop contributor tools, and expand regional opportunities.
          </p>
        </div>

        {/* Payment Integration Prepared Box */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-white">Direct Voluntary Support</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Every contribution is completely voluntary and deeply appreciated.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Online payment integration active soon</span>
            </div>
          </div>

          <p className="text-[11px] font-mono text-slate-500 pt-1 border-t border-white/5">
            Support payments via UPI, Cards, and Net Banking will be enabled directly in this section.
          </p>
        </div>
      </div>

      {/* ── 7. Non-Financial Support: Share Zenemoo & Tell a Friend ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#080d19]/90 border border-white/10 shadow-xl space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider">
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Community Advocacy</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white font-display">
            Can&rsquo;t support financially? You can still help immensely.
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Financial support is not the only way to help Zenemoo grow. You can make an immediate impact simply by introducing Zenemoo to your friends, colleagues, students, and language communities.
          </p>
        </div>

        {/* Who Should Know About Zenemoo */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
          <p className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Know someone who is:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs text-slate-300">
            {[
              'Interested in AI & data annotation projects',
              'A language expert or native speaker',
              'Interested in speech collection tasks',
              'Looking for flexible contributor work',
              'Working in translation or linguistic evaluation',
              'A business seeking human data expertise',
            ].map((desc, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="text-[11px]">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Share Action Card */}
        <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-sm font-bold text-white font-display">
              &ldquo;One share can introduce Zenemoo to someone who needs it.&rdquo;
            </p>
            <p className="text-xs font-mono text-cyan-300">https://www.zenemoo.in</p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleShare}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{shareFeedback || 'Share Zenemoo'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer active:scale-95 ${
                copiedLink
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 8. Community Motto & Return to Talent Hub ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#080d19] via-[#0d152a] to-[#080d19] border border-white/10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="space-y-1">
          <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
            Zenemoo Community
          </p>
          <p className="text-base sm:text-lg font-bold text-white font-display">
            People + Language + AI = Possibility
          </p>
        </div>

        <button
          onClick={onNavigateBack}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-mono font-semibold transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Back to Talent Hub</span>
        </button>
      </div>
    </div>
  );
};
