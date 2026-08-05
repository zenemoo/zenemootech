import React, { useState, useEffect } from 'react';
import { ImageWithSkeleton } from './ImageWithSkeleton';
import { ArrowLeft, Sparkles, CheckCircle2, Lock, Unlock, ArrowRight, ShieldAlert, Briefcase, Linkedin, FileText, Mail, Phone, X, Send, Globe, Check, Award, Clock, Download, Maximize2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OpportunityProgram, getStoredOpportunities } from '../lib/opportunityStore';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

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

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opportunity) return;
    setIsSubmitting(true);

    try {
      const result = await submitCandidateApplication({
        opportunity_id: opportunity.id,
        opportunity_title: opportunity.title,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        answers: customAnswers,
      });

      setSubmittedAppId(result.applicant_id || result.id);
    } catch (err: any) {
      alert('Application submission failed: ' + (err.message || 'Error'));
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
            <ImageWithSkeleton
              src="/assets/logo.png"
              alt="ZENEMOO Logo"
              className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md"
              fallbackType="logo"
              isAvatar
            />
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
                <Globe className="w-3 h-3 text-cyan-400" /> Remote WFH Opportunity
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                  isActive
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-red-500/20 border border-red-500/40 text-red-300'
                }`}
              >
                {opportunity.badge || opportunity.status}
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
                    <ImageWithSkeleton
                      src={opportunity.company_logo}
                      alt={opportunity.partner_name}
                      className="w-16 h-16 object-contain bg-white p-1.5 rounded-2xl border border-white/10 shrink-0 shadow-lg"
                      fallbackType="logo"
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
                  <p className="text-sm sm:text-base text-slate-300 light:text-slate-600 font-sans leading-relaxed">
                    {opportunity.description}
                  </p>
                </div>
              </div>

              {/* Language & Skills Requirements */}
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

              {/* Eligibility Checklist */}
              {opportunity.eligibility_criteria && opportunity.eligibility_criteria.length > 0 && (
                <div className="glass-panel p-8 rounded-3xl border border-emerald-500/30 space-y-4">
                  <h3 className="text-sm font-mono uppercase font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Eligibility &amp; Hardware Checklist
                  </h3>
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
                </div>
              )}

              {/* Program Highlights */}
              {opportunity.features && opportunity.features.length > 0 && (
                <div className="glass-panel p-8 rounded-3xl border border-purple-500/30 space-y-4">
                  <h3 className="text-sm font-mono uppercase font-bold text-purple-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" /> Key Deliverables &amp; Highlights
                  </h3>
                  <div className="space-y-2.5 font-mono text-xs text-slate-300">
                    {opportunity.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
                        <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Links & Guidelines */}
              <div className="flex flex-wrap items-center gap-4">
                {opportunity.linkedin_post_url && (
                  <a
                    href={opportunity.linkedin_post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
                  >
                    <Linkedin className="w-4 h-4 text-blue-400" /> Official LinkedIn Announcement
                  </a>
                )}

                {opportunity.pdf_link && (
                  <a
                    href={opportunity.pdf_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
                  >
                    <FileText className="w-4 h-4 text-emerald-400" /> Download PDF Guidelines
                  </a>
                )}
              </div>

              {/* Direct Opportunity Contact Info */}
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
                      <ImageWithSkeleton
                        src={opportunity.poster_url}
                        alt={opportunity.title}
                        className="w-full h-auto max-h-[580px] object-contain rounded-2xl group-hover:scale-[1.01] transition-all duration-300 mx-auto"
                        fallbackType="default"
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
                      isActive ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {opportunity.badge || opportunity.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-slate-400">Work Mode:</span>
                  <span className="text-cyan-300 font-bold">Flexible Remote WFH</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-slate-400">Quality Standard:</span>
                  <span className="text-purple-300 font-bold">99%+ Accuracy SLA</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Questions Required:</span>
                  <span className="text-white font-bold">
                    {opportunity.custom_questions?.length || 0} Questions
                  </span>
                </div>
              </div>

              {/* Sticky Apply Button */}
              <button
                disabled={!isActive}
                onClick={() => setIsApplyModalOpen(true)}
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
                ) : (
                  <>
                    Onboarding Stopped <Lock className="w-4 h-4" />
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
              <ImageWithSkeleton
                src={opportunity.poster_url}
                alt={opportunity.title}
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
                onClick={(e) => e.stopPropagation()}
                fallbackType="default"
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
              className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-xl w-full my-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Candidate Application</div>
                  <h3 className="text-xl font-bold font-display text-white">{opportunity.title}</h3>
                </div>
                <button
                  onClick={() => setIsApplyModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submittedAppId ? (
                <div className="text-center py-8 space-y-4 font-mono text-xs">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl font-bold">
                    ✓
                  </div>
                  <h4 className="text-xl font-bold text-white">Application Submitted Successfully!</h4>
                  <p className="text-slate-300 leading-relaxed">
                    Your candidate application for <span className="text-cyan-400 font-bold">{opportunity.title}</span> has been logged into our system.
                  </p>
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-cyan-500/30 text-cyan-300 text-base font-bold font-mono">
                    Applicant ID: <span className="text-white font-extrabold">{submittedAppId}</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Our operations team will review your application and contact you directly via email or phone.
                  </p>
                  <button
                    onClick={() => {
                      setIsApplyModalOpen(false);
                      setSubmittedAppId(null);
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold cursor-pointer"
                  >
                    Done / Close Application Window
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitForm} className="space-y-4 font-mono text-xs">
                  {/* Basic Candidate Contact Fields */}
                  <div>
                    <label className="block text-slate-300 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">WhatsApp / Phone Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 9827775230"
                        value={applicantPhone}
                        onChange={(e) => setApplicantPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* DYNAMIC CUSTOM QUESTIONS SET BY ADMIN */}
                  {opportunity.custom_questions && opportunity.custom_questions.length > 0 && (
                    <div className="pt-3 border-t border-white/10 space-y-4">
                      <div className="text-cyan-400 font-bold text-xs uppercase tracking-wider">
                        Program Specific Questions (Required by Admin):
                      </div>

                      {opportunity.custom_questions.map((q) => (
                        <div key={q.id} className="space-y-1">
                          <label className="block text-slate-300 mb-1 font-bold">
                            {q.label} {q.required && <span className="text-red-400">*</span>}
                          </label>

                          {q.type === 'textarea' ? (
                            <textarea
                              required={q.required}
                              rows={3}
                              placeholder="Enter your detailed answer..."
                              value={customAnswers[q.label] || ''}
                              onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                            />
                          ) : q.type === 'select' ? (
                            <select
                              required={q.required}
                              value={customAnswers[q.label] || ''}
                              onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                            >
                              <option value="">-- Select Option --</option>
                              {q.options?.map((opt, optIdx) => (
                                <option key={optIdx} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              required={q.required}
                              placeholder="Your answer..."
                              value={customAnswers[q.label] || ''}
                              onChange={(e) => setCustomAnswers({ ...customAnswers, [q.label]: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
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
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:opacity-95 text-black font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> {isSubmitting ? 'Submitting...' : 'Submit Application'}
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
