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
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OpportunityProgram, getPublicOpportunities, parseQuestionOptions } from '../lib/opportunityStore';
import { submitCandidateApplication } from '../lib/opportunityApplicationStore';

interface OpportunitiesPageProps {
  onBack: () => void;
  onSelectProgram: (programId: string) => void;
}

export const OpportunitiesPage: React.FC<OpportunitiesPageProps> = ({ onBack, onSelectProgram }) => {
  const [opportunities, setOpportunities] = useState<OpportunityProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingOpportunity, setApplyingOpportunity] = useState<OpportunityProgram | null>(null);

  // Form State
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  useEffect(() => {
    getPublicOpportunities().then((data) => {
      setOpportunities(data);
      setLoading(false);
    });
  }, []);

  const handleCardClick = (op: OpportunityProgram) => {
    if (op.status === 'stopped') {
      alert('Applications for this opportunity are currently closed.');
      return;
    }
    if (op.status === 'coming_soon') {
      alert('Applications for this opportunity will open soon.');
      return;
    }
    onSelectProgram(op.id);
  };

  const handleOpenApplicationModal = (op: OpportunityProgram, e: React.MouseEvent) => {
    e.stopPropagation();
    if (op.status === 'stopped') {
      alert('Applications for this opportunity are currently closed.');
      return;
    }
    if (op.status === 'coming_soon') {
      alert('Applications for this opportunity will open soon.');
      return;
    }
    setApplyingOpportunity(op);
    setApplicantName('');
    setApplicantEmail('');
    setApplicantPhone('');
    setCustomAnswers({});
    setTermsAccepted(false);
    setTermsError('');
    setSubmissionError('');
    setIsDuplicate(false);
    setSubmittedRef(null);
  };

  const handleSubmitApplicationForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingOpportunity) return;

    // MANDATORY TERMS & CONDITIONS CHECK
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

      setSubmittedRef(result.applicant_id || result.id);
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
                const isComingSoon = op.status === 'coming_soon';

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
                        disabled={!isActive}
                        onClick={(e) => handleOpenApplicationModal(op, e)}
                        className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 text-black font-extrabold shadow-lg shadow-emerald-500/20 cursor-pointer'
                            : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
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

      {/* PREMIUM MULTI-STEP CANDIDATE APPLICATION MODAL */}
      <AnimatePresence>
        {applyingOpportunity && (
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
              {/* Premium Application Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  {applyingOpportunity.company_logo ? (
                    <img
                      src={applyingOpportunity.company_logo}
                      alt={applyingOpportunity.partner_name}
                      className="w-12 h-12 object-contain bg-white p-1 rounded-xl border border-white/10 shrink-0 shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <Briefcase className="w-6 h-6" />
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                      {applyingOpportunity.partner_name}
                    </div>
                    <h3 className="text-lg font-bold font-display text-white leading-snug">{applyingOpportunity.title}</h3>
                  </div>
                </div>

                <button
                  onClick={() => setApplyingOpportunity(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Indicator */}
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
                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold font-mono text-xs transition-all cursor-pointer"
                  >
                    Close Window
                  </button>
                </div>
              ) : submittedRef ? (
                <div className="text-center py-8 space-y-5 font-mono text-xs">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-3xl font-bold shadow-xl shadow-emerald-500/10">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-2xl font-bold font-display text-white">Application Submitted Successfully!</h4>
                    <p className="text-slate-300 text-xs font-sans">
                      Thank you for applying to <span className="text-cyan-400 font-bold">{applyingOpportunity.title}</span>.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/30 text-cyan-300 text-center space-y-1 shadow-inner">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Your Official Application ID</div>
                    <div className="text-2xl font-extrabold font-mono text-white tracking-widest">{submittedRef}</div>
                    <p className="text-[11px] text-slate-400 pt-1">Please retain this ID for your application records.</p>
                  </div>

                  <button
                    onClick={() => {
                      setApplyingOpportunity(null);
                      setSubmittedRef(null);
                      setIsDuplicate(false);
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-extrabold text-xs font-mono cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    Done / Return to Portal
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitApplicationForm} className="space-y-6 font-mono text-xs">
                  {/* Submission Error Banner */}
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

                  {/* SECTION 02: PROGRAM SPECIFIC QUESTIONS */}
                  {applyingOpportunity.custom_questions && applyingOpportunity.custom_questions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                      <div className="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-white/5">
                        <Sparkles className="w-4 h-4 text-cyan-400" /> 02. Project-Specific Questions ({applyingOpportunity.custom_questions.length})
                      </div>

                      {applyingOpportunity.custom_questions.map((q) => {
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
                      onClick={() => setApplyingOpportunity(null)}
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
