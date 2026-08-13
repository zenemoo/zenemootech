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
  ExternalLink,
  AlertCircle,
  FileCheck2,
  Clock,
  Globe,
  UserCheck,
  HelpCircle,
  MessageCircle,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OpportunityProgram, getPublicOpportunities, parseQuestionOptions } from '../lib/opportunityStore';
import { submitCandidateApplication, checkExistingApplication, CandidateApplication } from '../lib/opportunityApplicationStore';
import { formatApplicationAnswer } from '../lib/formatApplicationAnswer';
import { OpportunityStatusModal } from './OpportunityStatusModal';

interface OpportunitiesPageProps {
  onBack: () => void;
  onSelectProgram: (programId: string) => void;
}

export const OpportunitiesPage: React.FC<OpportunitiesPageProps> = ({ onBack, onSelectProgram }) => {
  const [opportunities, setOpportunities] = useState<OpportunityProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingOpportunity, setApplyingOpportunity] = useState<OpportunityProgram | null>(null);

  // Multi-Step Form Navigation State (1: Personal Info, 2: Questions, 3: Review & Terms)
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
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [existingApp, setExistingApp] = useState<CandidateApplication | null>(null);
  const [submissionError, setSubmissionError] = useState('');
  const [statusModalType, setStatusModalType] = useState<'closed' | 'coming_soon' | null>(null);

  useEffect(() => {
    getPublicOpportunities().then((data) => {
      setOpportunities(data);
      setLoading(false);
    });
  }, []);

  const handleCardClick = (op: OpportunityProgram) => {
    if (op.status === 'stopped') {
      setStatusModalType('closed');
      return;
    }
    if (op.status === 'coming_soon') {
      setStatusModalType('coming_soon');
      return;
    }
    onSelectProgram(op.id);
  };

  const handleOpenApplicationModal = async (op: OpportunityProgram, e: React.MouseEvent) => {
    e.stopPropagation();
    if (op.status === 'stopped') {
      setStatusModalType('closed');
      return;
    }
    if (op.status === 'coming_soon') {
      setStatusModalType('coming_soon');
      return;
    }

    setApplyingOpportunity(op);
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
    setSubmittedRef(null);
    setCopiedId(false);

    // Check if applicant previously submitted in this session
    const savedEmail = localStorage.getItem(`zenemoo_applicant_email_${op.id}`) || '';
    if (savedEmail) {
      setApplicantEmail(savedEmail);
      const existing = await checkExistingApplication(op.id, savedEmail);
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

    // Check persistent database for existing submission with this email
    if (applyingOpportunity) {
      const cleanEmail = applicantEmail.trim().toLowerCase();
      localStorage.setItem(`zenemoo_applicant_email_${applyingOpportunity.id}`, cleanEmail);
      const existing = await checkExistingApplication(applyingOpportunity.id, cleanEmail);
      if (existing) {
        setExistingApp(existing);
        return;
      }
    }

    const hasCustomQuestions = applyingOpportunity?.custom_questions && applyingOpportunity.custom_questions.length > 0;
    if (hasCustomQuestions) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  };

  const handleStep2Next = () => {
    if (applyingOpportunity?.custom_questions) {
      for (const q of applyingOpportunity.custom_questions) {
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

  const handleSubmitApplicationForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingOpportunity) return;

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
        opportunity_id: applyingOpportunity.id,
        opportunity_title: applyingOpportunity.title,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        answers: customAnswers,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
      });

      const generatedId = result.applicant_id || result.id;
      setSubmittedRef(generatedId);
      localStorage.setItem(`zenemoo_applicant_email_${applyingOpportunity.id}`, applicantEmail.trim().toLowerCase());
    } catch (err: any) {
      if (err?.code === 'DUPLICATE_APPLICATION' || err?.isDuplicate) {
        setIsDuplicate(true);
      } else {
        setSubmissionError(err.message || 'Error submitting application.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasQuestions = Boolean(applyingOpportunity?.custom_questions && applyingOpportunity.custom_questions.length > 0);

  return (
    <div className="min-h-screen bg-[#050505] light:bg-[#f8fafc] text-slate-100 light:text-slate-900 flex flex-col justify-between relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
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
            title="Return to Main Site"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Return to Main Site</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header section */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Enterprise Collaboration Network
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-white light:text-slate-900">
              Active Program Opportunities
            </h1>
            <p className="text-slate-400 light:text-slate-600 text-sm sm:text-base font-sans leading-relaxed">
              Explore official partner initiatives, language AI annotation campaigns, and enterprise project opportunities.
            </p>
          </div>

          {/* Opportunities Cards Grid */}
          {loading ? (
            <div className="py-20 text-center space-y-3 font-mono text-xs text-slate-400">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>Loading Program Opportunities...</div>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-12 text-center glass-panel rounded-3xl border border-white/10 max-w-md mx-auto space-y-4">
              <Briefcase className="w-12 h-12 text-slate-500 mx-auto" />
              <div className="font-display text-lg font-bold text-white">No Public Opportunities Listed</div>
              <p className="text-xs font-mono text-slate-400">Check back soon for new enterprise AI campaigns.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {opportunities.map((op) => {
                const isActive = op.status === 'active';
                const isStopped = op.status === 'stopped';

                return (
                  <motion.div
                    key={op.id}
                    whileHover={{ y: isStopped ? 0 : -4 }}
                    onClick={() => handleCardClick(op)}
                    className={`glass-panel rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between p-6 sm:p-7 relative group ${
                      isStopped
                        ? 'border-red-500/20 bg-slate-950/80 opacity-75 cursor-not-allowed'
                        : 'border-white/10 hover:border-cyan-500/40 cursor-pointer shadow-xl'
                    }`}
                  >
                    <div className="space-y-5">
                      {/* Logo & Status Badge Header */}
                      <div className="flex items-start justify-between gap-3">
                        {op.company_logo ? (
                          <img
                            src={op.company_logo}
                            alt={op.partner_name}
                            className="w-14 h-14 object-contain bg-white p-1 rounded-2xl border border-white/10 shrink-0 shadow-md"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                            <Briefcase className="w-7 h-7" />
                          </div>
                        )}

                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                              : isStopped
                              ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                              : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                          }`}
                        >
                          {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>}
                          {isActive ? op.badge || 'ACTIVE' : isStopped ? '🔴 CLOSED' : 'COMING SOON'}
                        </span>
                      </div>

                      {/* Opportunity Details */}
                      <div className="space-y-2">
                        <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                          {op.partner_name}
                        </div>
                        <h3 className="text-xl font-bold font-display text-white light:text-slate-900 group-hover:text-cyan-300 transition-colors line-clamp-2">
                          {op.title}
                        </h3>
                        <p className="text-xs text-slate-300 light:text-slate-600 font-sans leading-relaxed line-clamp-3">
                          {op.description}
                        </p>
                      </div>

                      {/* Work Mode & Compensation Stats */}
                      <div className="grid grid-cols-2 gap-2 pt-2 font-mono text-[11px]">
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                          <span className="text-slate-400 block text-[9px] uppercase">Work Mode</span>
                          <span className="text-cyan-300 font-bold uppercase">{op.work_mode || 'Remote WFH'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                          <span className="text-slate-400 block text-[9px] uppercase">Compensation</span>
                          <span className="text-emerald-300 font-bold truncate block">{op.payment_info || 'Competitive'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(op);
                        }}
                        className="text-xs font-mono font-bold text-slate-300 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        View Details <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleOpenApplicationModal(op, e)}
                        className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 text-black font-extrabold shadow-lg shadow-emerald-500/20'
                            : isStopped
                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {isActive ? (
                          <>
                            Apply Now <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        ) : isStopped ? (
                          <>
                            Applications Closed <Lock className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Opening Soon <Clock className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* SINGLE PRIMARY SCROLL APPLICATION WORKSPACE MODAL */}
      <AnimatePresence>
        {applyingOpportunity && (
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
                  {applyingOpportunity.company_logo ? (
                    <img
                      src={applyingOpportunity.company_logo}
                      alt={applyingOpportunity.partner_name}
                      className="w-11 h-11 object-contain bg-white p-1 rounded-xl border border-white/10 shrink-0 shadow-md"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                      {applyingOpportunity.partner_name}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold font-display text-white leading-snug line-clamp-1">
                      {applyingOpportunity.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setApplyingOpportunity(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 cursor-pointer shrink-0 border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* DYNAMIC REAL STEP PROGRESS INDICATOR */}
              {!submittedRef && !existingApp && !isDuplicate && (
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
                {/* EXISTING APPLICATION SUBMITTED DETECTED VIEW */}
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
                    {applyingOpportunity.whatsapp_group_url && applyingOpportunity.whatsapp_group_url.trim().length > 0 && (
                      <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-left space-y-3 shadow-xl">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider border-b border-emerald-500/20 pb-2">
                          <MessageCircle className="w-4 h-4 text-emerald-400" /> PROJECT UPDATES — Official WhatsApp Group
                        </div>
                        <p className="text-slate-200 text-xs font-sans leading-relaxed">
                          Join the official WhatsApp group for project updates, announcements, and instructions:
                        </p>
                        <a
                          href={applyingOpportunity.whatsapp_group_url.trim()}
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
                      onClick={() => setApplyingOpportunity(null)}
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
                        Thank you for your interest in <strong className="text-cyan-400">{applyingOpportunity.title}</strong>.
                      </p>
                      <p>
                        We found that an application has already been submitted using <strong className="text-white font-mono">{applicantEmail.trim().toLowerCase()}</strong> for this opportunity.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setApplyingOpportunity(null);
                        setIsDuplicate(false);
                      }}
                      className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20 font-extrabold text-xs font-mono cursor-pointer transition-all"
                    >
                      Close Window
                    </button>
                  </div>
                ) : submittedRef ? (
                  /* COMPACT FOCUSED SUCCESS SCREEN */
                  <div className="text-center py-4 px-2 space-y-5 font-mono text-xs">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-3xl font-bold shadow-xl shadow-emerald-500/10">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-2xl font-extrabold font-display text-white tracking-tight">Application Submitted Successfully!</h4>
                      <p className="text-slate-300 text-xs font-sans">
                        Thank you for applying to <span className="text-cyan-400 font-bold">{applyingOpportunity.title}</span>.
                      </p>
                    </div>

                    {/* Application ID Box with Copy Button */}
                    <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/30 text-cyan-300 text-center space-y-2 shadow-inner">
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Your Official Application ID</div>
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        <div className="text-2xl font-extrabold font-mono text-white tracking-widest">{submittedRef}</div>
                        <button
                          type="button"
                          onClick={() => handleCopyAppId(submittedRef)}
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
                    {applyingOpportunity.whatsapp_group_url && applyingOpportunity.whatsapp_group_url.trim().length > 0 && (
                      <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-left space-y-3 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider border-b border-emerald-500/20 pb-2">
                          <MessageCircle className="w-4 h-4 text-emerald-400" /> PROJECT UPDATES
                        </div>
                        <p className="text-slate-200 text-xs font-sans leading-relaxed">
                          Your application has been received successfully. Join the official WhatsApp group for <strong className="text-white">{applyingOpportunity.title}</strong> to receive project updates, announcements, and further instructions.
                        </p>
                        <div className="pt-2">
                          <a
                            href={applyingOpportunity.whatsapp_group_url.trim()}
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
                        setApplyingOpportunity(null);
                        setSubmittedRef(null);
                        setIsDuplicate(false);
                      }}
                      className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20 font-extrabold text-xs font-mono cursor-pointer transition-all"
                    >
                      Close Window
                    </button>
                  </div>
                ) : (
                  /* DYNAMIC STEP-BY-STEP APPLICATION FORM */
                  <form onSubmit={handleSubmitApplicationForm} className="space-y-6 font-mono text-xs">
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
                            <Sparkles className="w-4 h-4 text-cyan-400" /> 02. Project-Specific Questions ({applyingOpportunity.custom_questions!.length})
                          </div>

                          {applyingOpportunity.custom_questions!.map((q) => {
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
              {!submittedRef && !existingApp && !isDuplicate && (
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
                      onClick={() => setApplyingOpportunity(null)}
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
                      onClick={handleSubmitApplicationForm}
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

      {/* CUSTOM STATUS MODAL FOR CLOSED / UPCOMING OPPORTUNITIES */}
      <OpportunityStatusModal
        isOpen={statusModalType !== null}
        type={statusModalType}
        onClose={() => setStatusModalType(null)}
      />
    </div>
  );
};
