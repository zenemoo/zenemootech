import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldAlert,
  Briefcase,
  Linkedin,
  FileText,
  Mail,
  Phone,
  X,
  Send,
  Globe,
  Check,
  Award,
  Clock,
  Download,
  Maximize2,
  MessageCircle,
  Share2,
  DollarSign,
  Zap,
  Layers,
  HelpCircle,
  Cpu,
  Wifi,
  FileCheck2,
  ExternalLink,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OpportunityProgram, getStoredOpportunities, parseQuestionOptions } from '../lib/opportunityStore';
import { submitCandidateApplication } from '../lib/opportunityApplicationStore';

interface OpportunityDetailPageProps {
  opportunityId: string;
  onBack: () => void;
}

export const OpportunityDetailPage: React.FC<OpportunityDetailPageProps> = ({ opportunityId, onBack }) => {
  const [opportunity, setOpportunity] = useState<OpportunityProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Form State
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  useEffect(() => {
    getStoredOpportunities().then((list) => {
      const found = list.find((item) => item.id === opportunityId || item.id === `op_${opportunityId}`);
      if (found) {
        setOpportunity(found);
      } else if (list.length > 0) {
        setOpportunity(list[0]);
      }
      setLoading(false);
    });
  }, [opportunityId]);

  const handleDownloadBanner = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const cleanName = (title || 'program_opportunity').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      link.download = `ZENEMOO_${cleanName}_Banner.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.target = '_blank';
      link.download = `ZENEMOO_Program_Banner.png`;
      link.click();
    }
  };

  const handleOpenApplyModal = () => {
    if (!opportunity) return;
    if (opportunity.status === 'stopped') {
      alert('Applications for this opportunity are currently closed.');
      return;
    }
    if (opportunity.status === 'coming_soon') {
      alert('Applications for this opportunity will open soon.');
      return;
    }
    setIsApplyModalOpen(true);
    setTermsAccepted(false);
    setTermsError('');
    setSubmissionError('');
    setIsDuplicate(false);
    setSubmittedAppId(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opportunity) return;

    // MANDATORY TERMS ACCEPTANCE CHECK
    if (!termsAccepted) {
      setTermsError('Please accept the Terms & Conditions before submitting your application.');
      return;
    }
    setTermsError('');
    setSubmissionError('');
    setIsSubmitting(true);
    setIsDuplicate(false);

    try {
      const result = await submitCandidateApplication({
        opportunity_id: opportunity.id,
        opportunity_title: opportunity.title,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        answers: customAnswers,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
      });

      setSubmittedAppId(result.applicant_id || result.id);
    } catch (err: any) {
      if (err?.code === 'DUPLICATE_APPLICATION' || err?.isDuplicate) {
        setIsDuplicate(true);
      } else {
        setSubmissionError(err.message || 'Error processing application.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-mono text-xs">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>Loading Program Details...</div>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 space-y-4">
        <Briefcase className="w-12 h-12 text-slate-500" />
        <h2 className="text-xl font-bold font-display">Opportunity Program Not Found</h2>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold"
        >
          Return to Portal
        </button>
      </div>
    );
  }

  const isActive = opportunity.status === 'active';
  const isStopped = opportunity.status === 'stopped';
  const isComingSoon = opportunity.status === 'coming_soon';

  const hasSocialOrCommLinks = Boolean(
    opportunity.whatsapp_group_url ||
    opportunity.whatsapp_channel_url ||
    opportunity.telegram_url ||
    opportunity.linkedin_post_url ||
    opportunity.facebook_post_url ||
    opportunity.instagram_url ||
    opportunity.youtube_url ||
    opportunity.other_social_url ||
    opportunity.application_post_url ||
    opportunity.pdf_link
  );

  return (
    <div className="min-h-screen bg-[#050505] light:bg-[#f8fafc] text-slate-100 light:text-slate-900 flex flex-col justify-between relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 light:bg-white/80 backdrop-blur-xl border-b border-white/10 light:border-slate-200 py-4 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-3 group cursor-pointer">
            <img src="/assets/logo.png" alt="ZENEMOO Logo" className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md" />
            <span className="font-display font-extrabold text-base sm:text-lg text-white light:text-slate-900 tracking-wider">ZENEMOO</span>
          </button>

          <button
            onClick={onBack}
            className="px-3 sm:px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] light:bg-slate-100 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-xs font-mono font-bold text-slate-300 light:text-slate-700 flex items-center gap-2 transition-all cursor-pointer"
            title="Back to Opportunities Portal"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Back to Opportunities Portal</span>
          </button>
        </div>
      </header>

      {/* Main Split Screen Container */}
      <main className="flex-1 py-12 sm:py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Breadcrumb & Status */}
          <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <button onClick={onBack} className="hover:text-cyan-400 transition-all cursor-pointer">Portal</button>
              <span>/</span>
              <span className="text-white font-bold">{opportunity.partner_name}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-cyan-400" /> {opportunity.work_mode ? opportunity.work_mode.toUpperCase() : 'REMOTE WFH'}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                  isActive
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : isStopped
                    ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                    : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                }`}
              >
                {isActive ? opportunity.badge || 'ACTIVE' : isStopped ? '🔴 APPLICATIONS CLOSED' : 'COMING SOON'}
              </span>
            </div>
          </div>

          {/* SPLIT LAYOUT: Left (Details) & Right (Poster Graphic & Apply Sticky Card) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: 8 COLS (Comprehensive Information) */}
            <div className="lg:col-span-8 space-y-8">
              {/* Program Header */}
              <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
                <div className="flex items-start gap-4">
                  {opportunity.company_logo ? (
                    <img
                      src={opportunity.company_logo}
                      alt={opportunity.partner_name}
                      className="w-16 h-16 object-contain bg-white p-1.5 rounded-2xl border border-white/10 shrink-0 shadow-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <Briefcase className="w-8 h-8" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                      Partner: {opportunity.partner_name}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white light:text-slate-900 tracking-tight">
                      {opportunity.title}
                    </h1>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-transparent"></div>

                {/* Scope & Overview */}
                <div className="space-y-3">
                  <h3 className="text-sm font-mono uppercase font-bold text-cyan-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" /> Program Scope &amp; Executive Overview
                  </h3>
                  <p className="text-sm sm:text-base text-slate-300 light:text-slate-600 font-sans leading-relaxed whitespace-pre-wrap">
                    {opportunity.description}
                  </p>
                </div>
              </div>

              {/* Responsibilities & Tasks (ONLY RENDER IF Non-Empty) */}
              {opportunity.what_you_will_do && opportunity.what_you_will_do.length > 0 && (
                <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-4">
                  <h3 className="text-sm font-mono uppercase font-bold text-cyan-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" /> Responsibilities &amp; Daily Tasks
                  </h3>
                  <div className="space-y-2.5 font-sans text-sm text-slate-300">
                    {opportunity.what_you_will_do.map((task, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-2"></div>
                        <span className="leading-relaxed">{task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Language & Skills Requirements (ONLY RENDER IF Non-Empty) */}
              {opportunity.language_skills && opportunity.language_skills.length > 0 && (
                <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-4">
                  <h3 className="text-sm font-mono uppercase font-bold text-cyan-300 flex items-center gap-2">
                    <Award className="w-4 h-4 text-cyan-400" /> Language &amp; Technical Skills Required
                  </h3>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {opportunity.language_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold hover:bg-cyan-500/20 transition-all"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Eligibility, Hardware & Equipment Checklist (ONLY RENDER IF Non-Empty) */}
              {Boolean(opportunity.equipment_requirements || opportunity.internet_requirements || (opportunity.eligibility_criteria && opportunity.eligibility_criteria.length > 0)) && (
                <div className="glass-panel p-8 rounded-3xl border border-emerald-500/30 space-y-4">
                  <h3 className="text-sm font-mono uppercase font-bold text-emerald-400 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" /> Eligibility, Hardware &amp; Equipment Checklist
                  </h3>

                  {opportunity.equipment_requirements && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs space-y-1">
                      <div className="font-bold uppercase text-[10px] text-emerald-400 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5" /> Required Hardware / Devices:
                      </div>
                      <div className="whitespace-pre-wrap font-sans text-slate-200 text-sm leading-relaxed">{opportunity.equipment_requirements}</div>
                    </div>
                  )}

                  {opportunity.internet_requirements && (
                    <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs space-y-1">
                      <div className="font-bold uppercase text-[10px] text-cyan-400 flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5" /> Internet &amp; Connectivity:
                      </div>
                      <div className="font-sans text-slate-200 text-sm leading-relaxed">{opportunity.internet_requirements}</div>
                    </div>
                  )}

                  {opportunity.eligibility_criteria && opportunity.eligibility_criteria.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 font-mono text-xs text-slate-200">
                      {opportunity.eligibility_criteria.map((elig, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                          <span>{elig}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Project Highlights & Benefits (ONLY RENDER IF Non-Empty) */}
              {((opportunity.project_highlights && opportunity.project_highlights.length > 0) || (opportunity.benefits && opportunity.benefits.length > 0)) && (
                <div className="glass-panel p-8 rounded-3xl border border-purple-500/30 space-y-6">
                  {opportunity.project_highlights && opportunity.project_highlights.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-mono uppercase font-bold text-purple-300 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-400" /> Project Highlights
                      </h3>
                      <div className="space-y-2 font-mono text-xs text-slate-300">
                        {opportunity.project_highlights.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
                            <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></div>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {opportunity.benefits && opportunity.benefits.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <h3 className="text-sm font-mono uppercase font-bold text-emerald-400 flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-400" /> Candidate Benefits
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs text-slate-200">
                        {opportunity.benefits.map((ben, idx) => (
                          <div key={idx} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{ben}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Communication & Social Links Section (ONLY RENDER IF Non-Empty) */}
              {hasSocialOrCommLinks && (
                <div className="glass-panel p-8 rounded-3xl border border-cyan-500/30 space-y-4">
                  <h3 className="text-sm font-mono uppercase font-bold text-cyan-300 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-400" /> Communication &amp; Official Project Links
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {opportunity.whatsapp_group_url && (
                      <a
                        href={opportunity.whatsapp_group_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" /> Join WhatsApp Group
                      </a>
                    )}

                    {opportunity.whatsapp_channel_url && (
                      <a
                        href={opportunity.whatsapp_channel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" /> WhatsApp Channel
                      </a>
                    )}

                    {opportunity.linkedin_post_url && (
                      <a
                        href={opportunity.linkedin_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
                      >
                        <Linkedin className="w-4 h-4 text-blue-400" /> LinkedIn Announcement
                      </a>
                    )}

                    {opportunity.pdf_link && (
                      <a
                        href={opportunity.pdf_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
                      >
                        <FileText className="w-4 h-4 text-purple-400" /> Download PDF Guidelines
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Direct Opportunity Contact Info (ONLY RENDER IF Non-Empty) */}
              {opportunity.contact_details && (opportunity.contact_details.email || opportunity.contact_details.phone) && (
                <div className="glass-panel p-6 rounded-3xl border border-white/10 font-mono text-xs space-y-3">
                  <div className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Direct Program Coordinator Contact:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {opportunity.contact_details.contact_person && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-slate-400 text-[10px] uppercase">Contact Person</div>
                        <div className="font-bold text-white mt-0.5">{opportunity.contact_details.contact_person}</div>
                      </div>
                    )}
                    {opportunity.contact_details.email && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-slate-400 text-[10px] uppercase">Email Inquiry</div>
                        <div className="font-bold text-cyan-300 mt-0.5">{opportunity.contact_details.email}</div>
                      </div>
                    )}
                    {opportunity.contact_details.phone && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-slate-400 text-[10px] uppercase">WhatsApp / Phone</div>
                        <div className="font-bold text-emerald-300 mt-0.5">{opportunity.contact_details.phone}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: 4 COLS (Poster Banner Graphic Card & Sticky Apply Button) */}
            <div className="lg:col-span-4 space-y-6 sticky top-24">
              {/* Poster Graphic Card (Dynamic A4 Height & Lightbox Zoom) */}
              {opportunity.poster_url ? (
                <div className="space-y-3">
                  <div className="glass-panel p-2.5 rounded-3xl border border-white/10 overflow-hidden group shadow-2xl relative bg-black/40">
                    <div className="relative overflow-hidden rounded-2xl cursor-pointer" onClick={() => setIsPreviewOpen(true)}>
                      <img
                        src={opportunity.poster_url}
                        alt={opportunity.title}
                        className="w-full h-auto max-h-[580px] object-contain rounded-2xl group-hover:scale-[1.01] transition-all duration-300 mx-auto"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-mono font-bold backdrop-blur-[2px]">
                        <Maximize2 className="w-4 h-4 text-cyan-400" /> Click to Expand Poster
                      </div>
                    </div>
                  </div>

                  {/* Download Banner Button */}
                  <button
                    type="button"
                    onClick={() => handleDownloadBanner(opportunity.poster_url!, opportunity.title)}
                    className="w-full py-3 px-4 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-500/10"
                  >
                    <Download className="w-4 h-4 text-purple-400" /> Download Banner Poster (HD)
                  </button>
                </div>
              ) : (
                <div className="glass-panel p-8 rounded-3xl border border-white/10 text-center space-y-4 shadow-2xl">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 p-0.5 mx-auto">
                    <div className="w-full h-full bg-[#0d0e15] rounded-full flex items-center justify-center text-cyan-300 font-extrabold text-xl font-display">
                      Z
                    </div>
                  </div>
                  <h3 className="font-display font-extrabold text-xl text-white">{opportunity.partner_name}</h3>
                  <p className="text-xs font-mono text-slate-400">Enterprise AI Language &amp; Annotation Partner</p>
                </div>
              )}

              {/* Program Summary Stats Card */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-slate-400">Status:</span>
                  <span
                    className={`font-bold uppercase ${
                      isActive ? 'text-emerald-400' : isStopped ? 'text-red-400' : 'text-amber-400'
                    }`}
                  >
                    {isActive ? opportunity.badge || 'ACTIVE' : isStopped ? '🔴 APPLICATIONS CLOSED' : 'COMING SOON'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-slate-400">Work Mode:</span>
                  <span className="text-cyan-300 font-bold uppercase">{opportunity.work_mode || 'Remote WFH'}</span>
                </div>

                {opportunity.payment_info && (
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-slate-400">Compensation:</span>
                    <span className="text-emerald-300 font-bold">{opportunity.payment_info}</span>
                  </div>
                )}

                {opportunity.working_hours && (
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-slate-400">Working Hours:</span>
                    <span className="text-purple-300 font-bold">{opportunity.working_hours}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Questions Required:</span>
                  <span className="text-white font-bold">
                    {opportunity.custom_questions?.length || 0} Custom Questions
                  </span>
                </div>
              </div>

              {/* Sticky Apply Button */}
              <button
                disabled={!isActive}
                onClick={handleOpenApplyModal}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-sm font-mono shadow-2xl flex items-center justify-center gap-2 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:opacity-95 text-black cursor-pointer shadow-emerald-500/20 hover:scale-[1.02]'
                    : 'bg-white/[0.04] border border-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isActive ? (
                  <>
                    Apply Now &amp; Open Application <ArrowRight className="w-4 h-4" />
                  </>
                ) : isStopped ? (
                  <>
                    Applications Closed <Lock className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Applications Open Soon <Clock className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FULLSCREEN POSTER BANNER LIGHTBOX PREVIEW */}
      <AnimatePresence>
        {isPreviewOpen && opportunity?.poster_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4"
            onClick={() => setIsPreviewOpen(false)}
          >
            <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center space-y-4">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={opportunity.poster_url}
                alt={opportunity.title}
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadBanner(opportunity.poster_url!, opportunity.title);
                }}
                className="px-6 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-xl cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download Official Poster Image (HD)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DYNAMIC CANDIDATE APPLICATION MODAL */}
      <AnimatePresence>
        {isApplyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-xl w-full my-8 space-y-6 max-h-[90vh] overflow-y-auto bg-[#090d16]"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  {opportunity.company_logo ? (
                    <img
                      src={opportunity.company_logo}
                      alt={opportunity.partner_name}
                      className="w-12 h-12 object-contain bg-white p-1 rounded-xl border border-white/10 shrink-0 shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <Briefcase className="w-6 h-6" />
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                      {opportunity.partner_name}
                    </div>
                    <h3 className="text-lg font-bold font-display text-white leading-snug">{opportunity.title}</h3>
                  </div>
                </div>

                <button
                  onClick={() => setIsApplyModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step Progress Bar */}
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-cyan-300 font-bold">Candidate Application Form</span>
                  <span>Mandatory Step 3 of 3</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 w-full rounded-full transition-all duration-300"></div>
                </div>
              </div>

              {isDuplicate ? (
                <div className="text-center py-6 px-2 space-y-6 font-mono text-xs">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                    <ShieldAlert className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold uppercase text-[10px] tracking-widest inline-block">
                      Application Record Found
                    </div>
                    <h4 className="text-2xl font-extrabold font-display text-white tracking-tight">
                      Application Already Received
                    </h4>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-300 space-y-3 font-sans text-sm text-left leading-relaxed shadow-inner">
                    <p>
                      Thank you for your interest in <strong className="text-cyan-400">{opportunity.title}</strong>.
                    </p>
                    <p>
                      We found that an application has already been submitted using <strong className="text-white font-mono">{applicantEmail.trim().toLowerCase()}</strong> for this opportunity.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsApplyModalOpen(false);
                      setIsDuplicate(false);
                    }}
                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold font-mono text-xs transition-all cursor-pointer"
                  >
                    Close Window
                  </button>
                </div>
              ) : submittedAppId ? (
                <div className="text-center py-8 space-y-5 font-mono text-xs">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-3xl font-bold shadow-xl shadow-emerald-500/10">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-2xl font-bold font-display text-white">Application Submitted Successfully!</h4>
                    <p className="text-slate-300 text-xs font-sans">
                      Thank you for applying to <span className="text-cyan-400 font-bold">{opportunity.title}</span>.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/30 text-cyan-300 text-center space-y-1 shadow-inner">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Your Official Application ID</div>
                    <div className="text-2xl font-extrabold font-mono text-white tracking-widest">{submittedAppId}</div>
                    <p className="text-[11px] text-slate-400 pt-1">Please retain this ID for your application records.</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsApplyModalOpen(false);
                      setSubmittedAppId(null);
                      setIsDuplicate(false);
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-xs font-mono cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    Done / Return to Opportunity Page
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitForm} className="space-y-6 font-mono text-xs">
                  {/* Error Banner */}
                  {submissionError && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Submission Error:</div>
                        <div>{submissionError}</div>
                      </div>
                    </div>
                  )}

                  {/* SECTION 01: APPLICANT INFORMATION */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <div className="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-white/5">
                      <UserCheck className="w-4 h-4 text-cyan-400" /> 01. Applicant Information
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-bold">Full Legal Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-cyan-400 font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-bold">Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="you@domain.com"
                          value={applicantEmail}
                          onChange={(e) => setApplicantEmail(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-bold">WhatsApp / Phone *</label>
                        <input
                          type="tel"
                          required
                          placeholder="+91 9827775230"
                          value={applicantPhone}
                          onChange={(e) => setApplicantPhone(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 02: DYNAMIC CUSTOM QUESTIONS */}
                  {opportunity.custom_questions && opportunity.custom_questions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                      <div className="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-white/5">
                        <Sparkles className="w-4 h-4 text-cyan-400" /> 02. Project-Specific Questions ({opportunity.custom_questions.length})
                      </div>

                      {opportunity.custom_questions.map((q) => {
                        const parsedOptions = parseQuestionOptions(q.options);

                        return (
                          <div key={q.id} className="space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
                            <label className="block text-slate-200 mb-1 font-bold">
                              {q.label} {q.required && <span className="text-red-400">*</span>}
                            </label>

                            {q.type === 'textarea' ? (
                              <textarea
                                required={q.required}
                                rows={3}
                                placeholder="Enter your detailed answer..."
                                value={customAnswers[q.label] || ''}
                                onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-cyan-400 font-sans"
                              />
                            ) : q.type === 'select' ? (
                              <select
                                required={q.required}
                                value={customAnswers[q.label] || ''}
                                onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-cyan-400 font-bold cursor-pointer"
                              >
                                <option value="">-- Select Option --</option>
                                {parsedOptions.map((opt, optIdx) => (
                                  <option key={optIdx} value={opt} className="bg-slate-900 text-white">
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : q.type === 'multiselect' ? (
                              <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-white/15">
                                {parsedOptions.map((opt, optIdx) => {
                                  const selectedArr: string[] = customAnswers[q.label] || [];
                                  const isChecked = selectedArr.includes(opt);
                                  return (
                                    <label key={optIdx} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const newArr = e.target.checked
                                            ? [...selectedArr, opt]
                                            : selectedArr.filter((i) => i !== opt);
                                          setCustomAnswers({ ...customAnswers, [q.label]: newArr });
                                        }}
                                        className="rounded border-white/20 bg-slate-900 text-cyan-500"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : q.type === 'yesno' ? (
                              <div className="flex items-center gap-4 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-mono text-xs">
                                  <input
                                    type="radio"
                                    name={q.id}
                                    value="Yes"
                                    checked={customAnswers[q.label] === 'Yes'}
                                    onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                                    className="text-cyan-500"
                                  />
                                  <span>Yes</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-mono text-xs">
                                  <input
                                    type="radio"
                                    name={q.id}
                                    value="No"
                                    checked={customAnswers[q.label] === 'No'}
                                    onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                                    className="text-cyan-500"
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            ) : q.type === 'checkbox' ? (
                              <label className="flex items-center gap-2 text-slate-300 cursor-pointer font-mono text-xs pt-1">
                                <input
                                  type="checkbox"
                                  checked={!!customAnswers[q.label]}
                                  onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.checked })}
                                  className="rounded border-white/20 text-cyan-500"
                                />
                                <span>I agree / confirm</span>
                              </label>
                            ) : (
                              <input
                                type={
                                  q.type === 'number'
                                    ? 'number'
                                    : q.type === 'email'
                                    ? 'email'
                                    : q.type === 'phone'
                                    ? 'tel'
                                    : q.type === 'date'
                                    ? 'date'
                                    : 'text'
                                }
                                required={q.required}
                                placeholder="Your answer..."
                                value={customAnswers[q.label] || ''}
                                onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-cyan-400 font-sans"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SECTION 03: MANDATORY TERMS & CONDITIONS AGREEMENT */}
                  <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-3">
                    <div className="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-cyan-500/20">
                      <FileCheck2 className="w-4 h-4 text-cyan-400" /> 03. Mandatory Terms &amp; Conditions Agreement
                    </div>

                    <label className="flex items-start gap-3 text-slate-200 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => {
                          setTermsAccepted(e.target.checked);
                          if (e.target.checked) setTermsError('');
                        }}
                        className="rounded border-white/20 bg-slate-950 text-cyan-500 focus:ring-0 mt-0.5 w-4 h-4 shrink-0"
                      />
                      <span className="text-xs font-mono leading-relaxed">
                        I have read and agree to the <strong className="text-cyan-300">Terms &amp; Conditions</strong> and confirm that all submitted details are accurate.
                      </span>
                    </label>

                    <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 font-bold"
                      >
                        [ Read Terms &amp; Conditions ] <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-slate-400 text-[10px]">Version 1.0</span>
                    </div>

                    {/* Inline Validation Error State */}
                    {termsError && (
                      <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-xs flex items-center gap-2 animate-shake">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{termsError}</span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button & Actions */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsApplyModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:opacity-95 text-black font-extrabold shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" /> {isSubmitting ? 'Submitting Application...' : 'Submit Application →'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 light:border-slate-200 bg-[#050505]/60 light:bg-white/60 backdrop-blur-md text-center text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          Copyright &copy; 2026 <span className="text-slate-200 font-semibold">Zenemoo</span>. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};
