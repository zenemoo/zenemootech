import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, CheckCircle2, Lock, Unlock, ArrowRight, ShieldAlert, Briefcase, Linkedin, FileText, Mail, Phone, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OpportunityProgram, getStoredOpportunities } from '../lib/opportunityStore';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    getStoredOpportunities().then((data) => {
      setOpportunities(data);
      setLoading(false);
    });
  }, []);

  const handleCardClick = (op: OpportunityProgram) => {
    if (op.status === 'stopped') return;
    onSelectProgram(op.id);
  };

  const handleOpenApplicationModal = (op: OpportunityProgram) => {
    if (op.status === 'stopped') return;
    setApplyingOpportunity(op);
    setApplicantName('');
    setApplicantEmail('');
    setApplicantPhone('');
    setCustomAnswers({});
    setSubmittedRef(null);
  };

  const handleSubmitApplicationForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingOpportunity) return;
    setIsSubmitting(true);

    try {
      const result = await submitCandidateApplication({
        opportunity_id: applyingOpportunity.id,
        opportunity_title: applyingOpportunity.title,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        answers: customAnswers,
      });

      setSubmittedRef(result.id);
    } catch (err: any) {
      alert('Application submission failed: ' + (err.message || 'Error'));
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
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> PROGRAM OPPORTUNITIES PORTAL
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white light:text-slate-900 tracking-tight">
              Choose Your Program
            </h1>
            <div className="w-16 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500 rounded-full mx-auto"></div>
            <p className="text-slate-400 light:text-slate-600 text-sm sm:text-base leading-relaxed font-sans">
              Explore and apply to our verified enterprise data annotation, transcription, and language dataset collection programs.
            </p>
          </div>

          {/* Opportunities Grid */}
          {loading ? (
            <div className="text-center py-12 font-mono text-xs text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>Loading Live Opportunities...</div>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3 max-w-xl mx-auto">
              <Briefcase className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-base font-bold text-white">No Program Opportunities Available Right Now</h4>
              <p className="text-xs font-mono text-slate-400">
                Please check back soon! Opportunities created from the Admin Dashboard will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {opportunities.map((op) => {
                const isActive = op.status === 'active';
                const isStopped = op.status === 'stopped';

                return (
                  <motion.div
                    key={op.id}
                    whileHover={{ y: -6 }}
                    className={`glass-panel p-8 rounded-3xl border flex flex-col justify-between relative overflow-hidden group shadow-2xl ${
                      isStopped ? 'border-red-500/30 opacity-80' : 'border-emerald-500/30'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>
                    )}

                    <div className="space-y-6">
                      {/* Badge & Unlock Icon Header */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                              : isStopped
                              ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                              : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                          }`}
                        >
                          {op.badge || op.status}
                        </span>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {isActive ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Header with Company Logo & Poster Banner */}
                      <div className="flex items-start gap-4">
                        {op.company_logo ? (
                          <img
                            src={op.company_logo}
                            alt={op.partner_name}
                            className="w-14 h-14 object-contain bg-white p-1 rounded-2xl border border-white/10 shrink-0 shadow-md"
                          />
                        ) : op.poster_url ? (
                          <img
                            src={op.poster_url}
                            alt={op.title}
                            className="w-14 h-16 object-cover rounded-xl border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                            <Briefcase className="w-6 h-6" />
                          </div>
                        )}

                        <div>
                          <h3 className="font-display font-extrabold text-2xl tracking-tight text-white light:text-slate-900">
                            {op.title}
                          </h3>
                          <div className="text-xs font-mono text-cyan-400 mt-0.5">{op.partner_name}</div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-slate-300 light:text-slate-600 font-sans leading-relaxed">
                        {op.description}
                      </p>

                      {/* Language & Skills Badges */}
                      {op.language_skills && op.language_skills.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-mono uppercase text-cyan-300 tracking-wider">
                            Language &amp; Skills Required:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {op.language_skills.map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Eligibility Criteria Checklist */}
                      {op.eligibility_criteria && op.eligibility_criteria.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-white/10 font-mono text-xs text-slate-300 light:text-slate-700">
                          <div className="text-[10px] uppercase text-emerald-400 font-bold tracking-wider">
                            Eligibility Checklist:
                          </div>
                          {op.eligibility_criteria.map((elig, eIdx) => (
                            <div key={eIdx} className="flex items-center gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{elig}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* External LinkedIn & PDF Links */}
                      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10 font-mono text-xs">
                        {op.linkedin_post_url && (
                          <a
                            href={op.linkedin_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 flex items-center gap-1.5 font-bold transition-all"
                          >
                            <Linkedin className="w-3.5 h-3.5 text-blue-400" /> LinkedIn Announcement
                          </a>
                        )}

                        {op.pdf_link && (
                          <a
                            href={op.pdf_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 font-bold transition-all"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" /> Program PDF Guidelines
                          </a>
                        )}
                      </div>

                      {/* Direct Contact Person Details */}
                      {op.contact_details && (op.contact_details.email || op.contact_details.phone) && (
                        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-mono space-y-1">
                          <div className="text-slate-400 text-[10px] uppercase">Direct Opportunity Contact:</div>
                          {op.contact_details.contact_person && (
                            <div className="font-bold text-white">{op.contact_details.contact_person}</div>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-slate-300 text-[11px]">
                            {op.contact_details.email && (
                              <div className="flex items-center gap-1 text-cyan-300">
                                <Mail className="w-3 h-3 text-cyan-400" /> {op.contact_details.email}
                              </div>
                            )}
                            {op.contact_details.phone && (
                              <div className="flex items-center gap-1 text-emerald-300">
                                <Phone className="w-3 h-3 text-emerald-400" /> {op.contact_details.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      disabled={isStopped}
                      onClick={() => handleCardClick(op)}
                      className={`mt-8 w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm font-mono flex items-center justify-center gap-2 transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:opacity-95 text-black shadow-lg shadow-emerald-500/20 cursor-pointer'
                          : 'bg-white/[0.04] border border-white/10 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isActive ? (
                        <>
                          View Full Details &amp; Apply <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Onboarding Stopped <Lock className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* DYNAMIC CANDIDATE APPLICATION MODAL */}
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
              className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-xl w-full my-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Candidate Application</div>
                  <h3 className="text-xl font-bold font-display text-white">{applyingOpportunity.title}</h3>
                </div>
                <button
                  onClick={() => setApplyingOpportunity(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submittedRef ? (
                <div className="text-center py-8 space-y-4 font-mono text-xs">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <h4 className="text-lg font-bold text-white">Application Submitted Successfully!</h4>
                  <p className="text-slate-300 leading-relaxed">
                    Thank you for applying to <span className="text-cyan-400 font-bold">{applyingOpportunity.title}</span>. Your application reference code is:
                  </p>
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-cyan-500/30 text-cyan-300 text-sm font-bold font-mono">
                    {submittedRef}
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Our operations team will review your responses and reach out via email or phone regarding onboarding steps.
                  </p>
                  <button
                    onClick={() => setApplyingOpportunity(null)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold cursor-pointer"
                  >
                    Done / Close Application Window
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitApplicationForm} className="space-y-4 font-mono text-xs">
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
                        placeholder="+91 98765 43210"
                        value={applicantPhone}
                        onChange={(e) => setApplicantPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* DYNAMIC CUSTOM QUESTIONS SET BY ADMIN */}
                  {applyingOpportunity.custom_questions && applyingOpportunity.custom_questions.length > 0 && (
                    <div className="pt-3 border-t border-white/10 space-y-4">
                      <div className="text-cyan-400 font-bold text-xs uppercase tracking-wider">
                        Program Specific Questions (Required by Admin):
                      </div>

                      {applyingOpportunity.custom_questions.map((q) => (
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
                      onClick={() => setApplyingOpportunity(null)}
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
