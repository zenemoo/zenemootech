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
  UserCheck,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OpportunityProgram, getStoredOpportunities, parseQuestionOptions } from '../lib/opportunityStore';
import { submitCandidateApplication, checkExistingApplication, CandidateApplication } from '../lib/opportunityApplicationStore';
import { formatApplicationAnswer } from '../lib/formatApplicationAnswer';

interface OpportunityDetailPageProps {
  opportunityId: string;
  onBack: () => void;
}

export const OpportunityDetailPage: React.FC<OpportunityDetailPageProps> = ({ opportunityId, onBack }) => {
  const [opportunity, setOpportunity] = useState<OpportunityProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Multi-Step Navigation State (1: Personal Info, 2: Questions, 3: Review & Terms)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [step1Error, setStep1Error] = useState('');

  // Form State
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [existingApp, setExistingApp] = useState<CandidateApplication | null>(null);
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

  const handleOpenApplyModal = async () => {
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
    setCurrentStep(1);
    setStep1Error('');
    setApplicantName('');
    setApplicantEmail('');
    setApplicantPhone('');
    setCustomAnswers({});
    setTermsAccepted(false);
    setTermsError('');
    setSubmissionError('');
    setIsDuplicate(false);
    setExistingApp(null);
    setSubmittedAppId(null);
    setCopiedId(false);

    // Check if applicant previously saved email or submitted in this session
    const savedEmail = localStorage.getItem(`zenemoo_applicant_email_${opportunity.id}`) || '';
    if (savedEmail) {
      setApplicantEmail(savedEmail);
      const existing = await checkExistingApplication(opportunity.id, savedEmail);
      if (existing) {
        setExistingApp(existing);
      }
    }
  };

  const handleStep1Next = async () => {
    if (!applicantName.trim()) {
      setStep1Error('Please enter your full legal name.');
      return;
    }
    if (!applicantEmail.trim() || !applicantEmail.includes('@')) {
      setStep1Error('Please enter a valid email address.');
      return;
    }
    if (!applicantPhone.trim()) {
      setStep1Error('Please enter your phone / WhatsApp number.');
      return;
    }
    setStep1Error('');

    if (opportunity) {
      const cleanEmail = applicantEmail.trim().toLowerCase();
      localStorage.setItem(`zenemoo_applicant_email_${opportunity.id}`, cleanEmail);
      const existing = await checkExistingApplication(opportunity.id, cleanEmail);
      if (existing) {
        setExistingApp(existing);
        return;
      }
    }

    const hasCustomQuestions = opportunity?.custom_questions && opportunity.custom_questions.length > 0;
    if (hasCustomQuestions) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  };

  const handleStep2Next = () => {
    if (opportunity?.custom_questions) {
      for (const q of opportunity.custom_questions) {
        if (q.required && (!customAnswers[q.label] || (Array.isArray(customAnswers[q.label]) && customAnswers[q.label].length === 0))) {
          alert(`Please answer the required question: "${q.label}"`);
          return;
        }
      }
    }
    setCurrentStep(3);
  };

  const handleCopyAppId = (idString: string) => {
    if (!idString) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(idString);
      } else {
        const el = document.createElement('textarea');
        el.value = idString;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opportunity) return;

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

      const generatedId = result.applicant_id || result.id;
      setSubmittedAppId(generatedId);
      localStorage.setItem(`zenemoo_applicant_email_${opportunity.id}`, applicantEmail.trim().toLowerCase());
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
  const hasQuestions = Boolean(opportunity.custom_questions && opportunity.custom_questions.length > 0);

  const hasPublicCommLinks = Boolean(
    opportunity.pdf_link?.trim() ||
    opportunity.whatsapp_channel_url?.trim() ||
    opportunity.telegram_url?.trim() ||
    opportunity.linkedin_post_url?.trim() ||
    opportunity.facebook_post_url?.trim() ||
    opportunity.instagram_url?.trim() ||
    opportunity.youtube_url?.trim() ||
    opportunity.other_social_url?.trim() ||
    opportunity.application_post_url?.trim() ||
    opportunity.contact_support_url?.trim()
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
            {/* LEFT COLUMN: 8 COLS */}
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

              {/* Responsibilities & Daily Tasks */}
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

              {/* Language & Technical Skills */}
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

              {/* Eligibility & Hardware Checklist */}
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

              {/* Project Highlights & Benefits */}
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
            </div>

            {/* RIGHT COLUMN: 4 COLS */}
            <div className="lg:col-span-4 space-y-6 sticky top-24">
              {/* Poster Graphic */}
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
                  <p className="text-xs font-mono text-slate-400">Enterprise AI Partner</p>
                </div>
              )}

              {/* RIGHT-SIDE PROJECT DETAILS CARD */}
              <div className="glass-panel p-6 rounded-3xl border border-white/15 space-y-4 font-mono text-xs shadow-2xl bg-[#090d16]/90">
                <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider pb-2 border-b border-white/10 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" /> Project Specifications
                </div>

                {/* Status */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-slate-400 font-bold">Status</span>
                  <span
                    className={`font-extrabold uppercase px-3 py-1 rounded-full text-[10px] tracking-wider ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : isStopped
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {isActive ? opportunity.badge || 'ACTIVE' : isStopped ? '🔴 CLOSED' : 'COMING SOON'}
                  </span>
                </div>

                {/* Work Mode */}
                {opportunity.work_mode && (
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-slate-400 font-bold">Work Mode</span>
                    <span className="text-cyan-300 font-extrabold uppercase">{opportunity.work_mode}</span>
                  </div>
                )}

                {/* Working Hours / Daily Commitment */}
                {(opportunity.working_hours || opportunity.availability_requirement) && (
                  <div className="space-y-1 pb-3 border-b border-white/10">
                    <span className="text-slate-400 font-bold block">Working Hours / Commitment</span>
                    <span className="text-white font-sans font-medium text-xs block leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                      {opportunity.working_hours || opportunity.availability_requirement}
                    </span>
                  </div>
                )}

                {/* Compensation / Payment Information */}
                {opportunity.payment_info && (
                  <div className="space-y-1 pb-3 border-b border-white/10">
                    <span className="text-slate-400 font-bold block">Compensation</span>
                    <span className="text-emerald-300 font-sans font-bold text-xs block leading-relaxed bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                      {opportunity.payment_info}
                    </span>
                  </div>
                )}

                {/* Payment Frequency */}
                {opportunity.payment_frequency && (
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-slate-400 font-bold">Payment Frequency</span>
                    <span className="text-purple-300 font-extrabold uppercase">{opportunity.payment_frequency}</span>
                  </div>
                )}

                {/* Project Duration */}
                {opportunity.project_duration && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold">Project Duration</span>
                    <span className="text-amber-300 font-extrabold">{opportunity.project_duration}</span>
                  </div>
                )}
              </div>

              {/* Sticky Apply Button */}
              <button
                disabled={!isActive}
                onClick={handleOpenApplyModal}
                className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm font-mono shadow-2xl flex items-center justify-center gap-2 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400 hover:opacity-95 text-slate-950 cursor-pointer shadow-emerald-500/20 hover:scale-[1.01]'
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

              {/* COMMUNICATION & OFFICIAL LINKS ON RIGHT COLUMN */}
              {hasPublicCommLinks && (
                <div className="glass-panel p-6 rounded-3xl border border-cyan-500/30 space-y-4 shadow-2xl bg-[#090d16]/90">
                  <h3 className="text-xs font-mono uppercase font-bold text-cyan-300 flex items-center gap-2 pb-2 border-b border-white/10">
                    <Share2 className="w-4 h-4 text-cyan-400" /> Communication &amp; Official Links
                  </h3>

                  <div className="flex flex-col gap-2.5 pt-1">
                    {/* 1ST PRIORITY: DOWNLOAD PDF GUIDELINES */}
                    {opportunity.pdf_link && opportunity.pdf_link.trim().length > 0 && (
                      <a
                        href={opportunity.pdf_link.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-mono text-xs font-bold flex items-center justify-between transition-all shadow-md group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400" /> Download PDF Guidelines
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}

                    {/* WHATSAPP CHANNEL */}
                    {opportunity.whatsapp_channel_url && opportunity.whatsapp_channel_url.trim().length > 0 && (
                      <a
                        href={opportunity.whatsapp_channel_url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-mono text-xs font-bold flex items-center justify-between transition-all shadow-md group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-teal-400" /> WhatsApp Channel
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-teal-400 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}

                    {/* LINKEDIN ANNOUNCEMENT */}
                    {opportunity.linkedin_post_url && opportunity.linkedin_post_url.trim().length > 0 && (
                      <a
                        href={opportunity.linkedin_post_url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-mono text-xs font-bold flex items-center justify-between transition-all shadow-md group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Linkedin className="w-4 h-4 text-blue-400" /> LinkedIn Announcement
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}

                    {/* FACEBOOK POST */}
                    {opportunity.facebook_post_url && opportunity.facebook_post_url.trim().length > 0 && (
                      <a
                        href={opportunity.facebook_post_url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-mono text-xs font-bold flex items-center justify-between transition-all shadow-md group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-400" /> Facebook Post
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}

                    {/* INSTAGRAM ANNOUNCEMENT */}
                    {opportunity.instagram_url && opportunity.instagram_url.trim().length > 0 && (
                      <a
                        href={opportunity.instagram_url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-mono text-xs font-bold flex items-center justify-between transition-all shadow-md group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-rose-400" /> Instagram Announcement
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}

                    {/* TELEGRAM CHANNEL */}
                    {opportunity.telegram_url && opportunity.telegram_url.trim().length > 0 && (
                      <a
                        href={opportunity.telegram_url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-mono text-xs font-bold flex items-center justify-between transition-all shadow-md group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-sky-400" /> Telegram Channel
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}

                    {/* YOUTUBE VIDEO */}
                    {opportunity.youtube_url && opportunity.youtube_url.trim().length > 0 && (
                      <a
                        href={opportunity.youtube_url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 font-mono text-xs font-bold flex items-center justify-between transition-all shadow-md group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-red-400" /> YouTube Video
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}

                    {/* OFFICIAL PARTNER LINK */}
                    {opportunity.other_social_url && opportunity.other_social_url.trim().length > 0 && (
                      <a
                        href={opportunity.other_social_url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold flex items-center justify-between transition-all shadow-md group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-cyan-400" /> Official Partner Link
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}

                    {/* CONTACT SUPPORT */}
                    {opportunity.contact_support_url && opportunity.contact_support_url.trim().length > 0 && (
                      <a
                        href={opportunity.contact_support_url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold flex items-center justify-between transition-all shadow-md group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-emerald-400" /> Contact Support
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}

                    {/* APPLICATION DETAILS POST */}
                    {opportunity.application_post_url && opportunity.application_post_url.trim().length > 0 && (
                      <a
                        href={opportunity.application_post_url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-mono text-xs font-bold flex items-center justify-between transition-all shadow-md group cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-400" /> Application Details Post
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* FULLSCREEN POSTER LIGHTBOX */}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SINGLE PRIMARY SCROLL APPLICATION WORKSPACE MODAL */}
      <AnimatePresence>
        {isApplyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="glass-panel rounded-3xl border border-white/15 w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[#090d16] shadow-2xl overflow-hidden"
            >
              {/* STICKY HEADER */}
              <div className="p-5 sm:p-6 border-b border-white/10 shrink-0 flex items-center justify-between gap-4 bg-[#090d16]">
                <div className="flex items-center gap-3">
                  {opportunity.company_logo ? (
                    <img
                      src={opportunity.company_logo}
                      alt={opportunity.partner_name}
                      className="w-11 h-11 object-contain bg-white p-1 rounded-xl border border-white/10 shrink-0 shadow-md"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                      {opportunity.partner_name}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold font-display text-white leading-snug line-clamp-1">
                      {opportunity.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setIsApplyModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 cursor-pointer shrink-0 border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* DYNAMIC REAL STEP PROGRESS INDICATOR */}
              {!submittedAppId && !existingApp && !isDuplicate && (
                <div className="px-5 sm:px-6 py-3 bg-slate-950/80 border-b border-white/10 shrink-0 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-300 font-bold">
                    <span className="text-cyan-400 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      {currentStep === 1 ? 'Step 1 of 3: Personal Details' : currentStep === 2 ? 'Step 2 of 3: Application Questions' : 'Step 3 of 3: Review & Terms'}
                    </span>
                    <span className="text-slate-400 text-[11px]">Step {currentStep} of 3</span>
                  </div>

                  {/* Step Pills */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className={`py-1 px-2 rounded-lg text-center font-bold border transition-all ${currentStep === 1 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : currentStep > 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                      ① Personal Info {currentStep > 1 && '✓'}
                    </div>
                    <div className={`py-1 px-2 rounded-lg text-center font-bold border transition-all ${currentStep === 2 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : currentStep > 2 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                      ② Questions {currentStep > 2 && '✓'}
                    </div>
                    <div className={`py-1 px-2 rounded-lg text-center font-bold border transition-all ${currentStep === 3 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                      ③ Review &amp; Terms
                    </div>
                  </div>
                </div>
              )}

              {/* SINGLE PRIMARY SCROLL CONTAINER */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
                {/* EXISTING APPLICATION SUBMITTED VIEW */}
                {existingApp ? (
                  <div className="py-4 space-y-6 font-mono text-xs text-center">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/10">
                      <CheckCircle2 className="w-10 h-10 text-cyan-400" />
                    </div>

                    <div className="space-y-2">
                      <div className="px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold uppercase text-[10px] tracking-widest inline-block">
                        Application Already Submitted
                      </div>
                      <h4 className="text-2xl font-extrabold font-display text-white tracking-tight">
                        We Have Received Your Application
                      </h4>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/30 text-cyan-300 text-center space-y-2 shadow-inner">
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Your Application ID</div>
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        <div className="text-2xl font-extrabold font-mono text-white tracking-widest">
                          {existingApp.applicant_id || `APP-2026-${existingApp.id.substring(0, 4)}`}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAppId(existingApp.applicant_id || existingApp.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                        >
                          {copiedId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy ID
                            </>
                          )}
                        </button>
                      </div>
                      <div className="text-xs text-emerald-400 font-bold uppercase pt-1">
                        Status: {existingApp.status.toUpperCase()}
                      </div>
                    </div>

                    {/* Clean Formatted Submitted Answers (Read-Only) */}
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 text-left space-y-3">
                      <div className="text-cyan-400 font-bold text-xs uppercase tracking-wider pb-2 border-b border-white/10">
                        Submitted Application Summary:
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-slate-400">Applicant:</span>
                          <span className="text-white font-bold">{existingApp.applicant_name}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-slate-400">Email:</span>
                          <span className="text-cyan-300 font-bold">{existingApp.applicant_email}</span>
                        </div>
                        {Object.entries(existingApp.answers || {}).map(([qKey, qVal]) => (
                          <div key={qKey} className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-400">{qKey}:</span>
                            <span className="text-emerald-300 font-bold">{formatApplicationAnswer(qVal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* WhatsApp Project Updates Section */}
                    {opportunity.whatsapp_group_url && opportunity.whatsapp_group_url.trim().length > 0 && (
                      <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-left space-y-3 shadow-xl">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider border-b border-emerald-500/20 pb-2">
                          <MessageCircle className="w-4 h-4 text-emerald-400" /> PROJECT UPDATES — Official WhatsApp Group
                        </div>
                        <p className="text-slate-200 text-xs font-sans leading-relaxed">
                          Join the official WhatsApp group for project updates, announcements, and instructions:
                        </p>
                        <a
                          href={opportunity.whatsapp_group_url.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" /> Join WhatsApp Group →
                        </a>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsApplyModalOpen(false)}
                      className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20 font-extrabold text-xs font-mono cursor-pointer transition-all"
                    >
                      Close Window
                    </button>
                  </div>
                ) : isDuplicate ? (
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
                      className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20 font-extrabold text-xs font-mono cursor-pointer transition-all"
                    >
                      Close Window
                    </button>
                  </div>
                ) : submittedAppId ? (
                  /* COMPACT FOCUSED SUCCESS SCREEN */
                  <div className="text-center py-4 px-2 space-y-5 font-mono text-xs">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-3xl font-bold shadow-xl shadow-emerald-500/10">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-2xl font-extrabold font-display text-white tracking-tight">Application Submitted Successfully!</h4>
                      <p className="text-slate-300 text-xs font-sans">
                        Thank you for applying to <span className="text-cyan-400 font-bold">{opportunity.title}</span>.
                      </p>
                    </div>

                    {/* Application ID Box with Copy Button */}
                    <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/30 text-cyan-300 text-center space-y-2 shadow-inner">
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Your Official Application ID</div>
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        <div className="text-2xl font-extrabold font-mono text-white tracking-widest">{submittedAppId}</div>
                        <button
                          type="button"
                          onClick={() => handleCopyAppId(submittedAppId)}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                        >
                          {copiedId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy ID
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 pt-1">Please keep your Application ID for future reference.</p>
                    </div>

                    {/* CONDITIONAL WHATSAPP GROUP LINK SECTION */}
                    {opportunity.whatsapp_group_url && opportunity.whatsapp_group_url.trim().length > 0 && (
                      <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-left space-y-3 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider border-b border-emerald-500/20 pb-2">
                          <MessageCircle className="w-4 h-4 text-emerald-400" /> PROJECT UPDATES
                        </div>
                        <p className="text-slate-200 text-xs font-sans leading-relaxed">
                          Your application has been received successfully. Join the official WhatsApp group for <strong className="text-white">{opportunity.title}</strong> to receive project updates, announcements, and further instructions.
                        </p>
                        <div className="pt-2">
                          <a
                            href={opportunity.whatsapp_group_url.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" /> Join WhatsApp Group →
                          </a>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setIsApplyModalOpen(false);
                        setSubmittedAppId(null);
                        setIsDuplicate(false);
                      }}
                      className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20 font-extrabold text-xs font-mono cursor-pointer transition-all"
                    >
                      Close Window
                    </button>
                  </div>
                ) : (
                  /* DYNAMIC STEP-BY-STEP APPLICATION FORM */
                  <form onSubmit={handleSubmitForm} className="space-y-6 font-mono text-xs">
                    {/* Error Banner */}
                    {submissionError && (
                      <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 flex items-start gap-2.5 shadow-md">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">Submission Error:</div>
                          <div>{submissionError}</div>
                        </div>
                      </div>
                    )}

                    {/* STEP 1: APPLICANT PERSONAL INFORMATION */}
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/15 space-y-4 shadow-md">
                          <div className="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-white/10">
                            <UserCheck className="w-4 h-4 text-cyan-400" /> 01. Personal Information
                          </div>

                          {step1Error && (
                            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 font-bold text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                              <span>{step1Error}</span>
                            </div>
                          )}

                          <div>
                            <label className="block text-slate-200 mb-1 font-bold">Full Legal Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Rahul Sharma"
                              value={applicantName}
                              onChange={(e) => setApplicantName(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans text-sm shadow-inner"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-slate-200 mb-1 font-bold">Email Address *</label>
                              <input
                                type="email"
                                required
                                placeholder="you@domain.com"
                                value={applicantEmail}
                                onChange={(e) => setApplicantEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans text-sm shadow-inner"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-200 mb-1 font-bold">WhatsApp / Phone *</label>
                              <input
                                type="tel"
                                required
                                placeholder="+91 9827775230"
                                value={applicantPhone}
                                onChange={(e) => setApplicantPhone(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans text-sm shadow-inner"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: PROJECT SPECIFIC QUESTIONS */}
                    {currentStep === 2 && hasQuestions && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/15 space-y-4 shadow-md">
                          <div className="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-white/10">
                            <Sparkles className="w-4 h-4 text-cyan-400" /> 02. Project-Specific Questions ({opportunity.custom_questions!.length})
                          </div>

                          {opportunity.custom_questions!.map((q) => {
                            const parsedOptions = parseQuestionOptions(q.options);

                            return (
                              <div key={q.id} className="space-y-1.5 p-4 rounded-xl bg-slate-950/90 border border-white/15 shadow-inner">
                                <label className="block text-slate-200 mb-1 font-bold leading-snug">
                                  {q.label} {q.required && <span className="text-red-400">*</span>}
                                </label>

                                {q.type === 'textarea' ? (
                                  <textarea
                                    required={q.required}
                                    rows={3}
                                    placeholder="Enter your detailed answer..."
                                    value={customAnswers[q.label] || ''}
                                    onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans text-sm"
                                  />
                                ) : q.type === 'select' ? (
                                  <select
                                    required={q.required}
                                    value={customAnswers[q.label] || ''}
                                    onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                                    className="w-full px-3 py-3 rounded-xl bg-[#0d1220] border border-white/20 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-400 cursor-pointer"
                                  >
                                    <option value="" className="bg-[#0d1220] text-slate-300">-- Select Option --</option>
                                    {parsedOptions.map((opt, optIdx) => (
                                      <option key={optIdx} value={opt} className="bg-[#0d1220] text-white">
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : q.type === 'multiselect' ? (
                                  <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-white/20">
                                    {parsedOptions.map((opt, optIdx) => {
                                      const selectedArr: string[] = customAnswers[q.label] || [];
                                      const isChecked = selectedArr.includes(opt);
                                      return (
                                        <label key={optIdx} className="flex items-center gap-2.5 text-slate-200 cursor-pointer text-xs font-mono">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              const newArr = e.target.checked
                                                ? [...selectedArr, opt]
                                                : selectedArr.filter((i) => i !== opt);
                                              setCustomAnswers({ ...customAnswers, [q.label]: newArr });
                                            }}
                                            className="w-4 h-4 rounded border-white/30 bg-slate-950 text-cyan-400 focus:ring-0 cursor-pointer"
                                          />
                                          <span>{opt}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                ) : q.type === 'yesno' ? (
                                  <div className="flex items-center gap-6 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-mono text-xs">
                                      <input
                                        type="radio"
                                        name={q.id}
                                        value="Yes"
                                        checked={customAnswers[q.label] === 'Yes'}
                                        onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                                        className="w-4 h-4 text-cyan-400 bg-slate-950 border-white/30 focus:ring-0 cursor-pointer"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-mono text-xs">
                                      <input
                                        type="radio"
                                        name={q.id}
                                        value="No"
                                        checked={customAnswers[q.label] === 'No'}
                                        onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                                        className="w-4 h-4 text-cyan-400 bg-slate-950 border-white/30 focus:ring-0 cursor-pointer"
                                      />
                                      <span>No</span>
                                    </label>
                                  </div>
                                ) : q.type === 'checkbox' ? (
                                  <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer font-mono text-xs pt-1">
                                    <input
                                      type="checkbox"
                                      checked={!!customAnswers[q.label]}
                                      onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.checked })}
                                      className="w-4 h-4 rounded border-white/30 bg-slate-950 text-cyan-400 focus:ring-0 cursor-pointer"
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
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-sans text-sm"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* STEP 3: REVIEW SUMMARY & MANDATORY TERMS AGREEMENT */}
                    {currentStep === 3 && (
                      <div className="space-y-4">
                        {/* Summary Box */}
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/15 space-y-3 shadow-md">
                          <div className="text-cyan-400 font-bold text-xs uppercase tracking-wider pb-2 border-b border-white/10">
                            Summary of Entered Details:
                          </div>
                          <div className="space-y-2 text-xs font-mono">
                            <div className="flex justify-between border-b border-white/5 pb-1">
                              <span className="text-slate-400">Full Name:</span>
                              <span className="text-white font-bold">{applicantName}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1">
                              <span className="text-slate-400">Email Address:</span>
                              <span className="text-cyan-300 font-bold">{applicantEmail}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1">
                              <span className="text-slate-400">Phone / WhatsApp:</span>
                              <span className="text-emerald-300 font-bold">{applicantPhone}</span>
                            </div>
                            {Object.entries(customAnswers).map(([k, v]) => (
                              <div key={k} className="flex justify-between border-b border-white/5 pb-1">
                                <span className="text-slate-400">{k}:</span>
                                <span className="text-emerald-300 font-bold">{formatApplicationAnswer(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Mandatory Terms Box */}
                        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 space-y-3 shadow-md">
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
                              className="w-4 h-4 rounded border-white/30 bg-slate-950 text-cyan-400 focus:ring-0 mt-0.5 shrink-0 cursor-pointer"
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
                              className="text-cyan-300 hover:text-cyan-200 underline font-bold transition-all flex items-center gap-1"
                            >
                              [ Read Terms &amp; Conditions ] <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className="text-slate-400 text-[10px]">Version 1.0</span>
                          </div>

                          {termsError && (
                            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 font-bold text-xs flex items-center gap-2 animate-shake shadow-md">
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                              <span>{termsError}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* STICKY FOOTER ACTIONS */}
              {!submittedAppId && !existingApp && !isDuplicate && (
                <div className="p-4 sm:p-5 border-t border-white/10 bg-[#090d16] shrink-0 flex items-center justify-between gap-3">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((s) => (s - 1) as 1 | 2 | 3)}
                      className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20 text-xs sm:text-sm font-mono font-bold cursor-pointer transition-all"
                    >
                      ← Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsApplyModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs sm:text-sm font-mono font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}

                  {currentStep === 1 ? (
                    <button
                      type="button"
                      onClick={handleStep1Next}
                      className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm font-mono flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
                    >
                      {hasQuestions ? 'Continue to Questions →' : 'Continue to Review →'}
                    </button>
                  ) : currentStep === 2 ? (
                    <button
                      type="button"
                      onClick={handleStep2Next}
                      className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm font-mono flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
                    >
                      Continue to Terms →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      onClick={handleSubmitForm}
                      className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400 hover:opacity-95 text-slate-950 font-extrabold text-xs sm:text-sm font-mono shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    >
                      <Send className="w-4 h-4" /> {isSubmitting ? 'Submitting Application...' : 'Submit Application →'}
                    </button>
                  )}
                </div>
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
