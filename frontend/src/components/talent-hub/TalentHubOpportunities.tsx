import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe2,
  HelpCircle,
  Layers,
  Loader2,
  Lock,
  Search,
  Send,
  Sparkles,
  User,
  X,
  AlertCircle,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { talentHubApi } from '../../services/talentHubApi';

export const TalentHubOpportunities: React.FC = () => {
  const { talentProfile, token } = useTalentHubAuth();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected opportunity for details view or apply form
  const [selectedOppForDetail, setSelectedOppForDetail] = useState<any | null>(null);
  const [selectedOppForApply, setSelectedOppForApply] = useState<any | null>(null);

  // Form state
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [applicantPhone, setApplicantPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadOpportunitiesAndApps = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const [oppRes, appRes] = await Promise.all([
          talentHubApi.getOpportunities(token),
          talentHubApi.getApplications(token),
        ]);

        if (isMounted) {
          if (oppRes?.success) setOpportunities(oppRes.data || []);
          if (appRes?.success) setApplications(appRes.data || []);
        }
      } catch (err: any) {
        console.error('[TalentHub Opportunities Fetch Error]:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOpportunitiesAndApps();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Check if talent already applied to a given opportunity
  const isAlreadyApplied = (opportunityId: string) => {
    return applications.some((app) => app.opportunity_id === opportunityId);
  };

  // Filter opportunities by search query
  const filteredOpportunities = opportunities.filter((opp) => {
    const q = searchQuery.toLowerCase();
    return (
      (opp.title || '').toLowerCase().includes(q) ||
      (opp.partner_name || '').toLowerCase().includes(q) ||
      (opp.description || '').toLowerCase().includes(q) ||
      (Array.isArray(opp.language_skills) && opp.language_skills.some((l: string) => l.toLowerCase().includes(q)))
    );
  });

  const handleOpenApply = (opp: any) => {
    setSelectedOppForDetail(null);
    setSelectedOppForApply(opp);
    setAnswers({});
    setApplicantPhone(talentProfile?.phone || '');
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleFieldChange = (key: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForApply || !token) return;

    // Front-side duplicate prevention check
    if (isAlreadyApplied(selectedOppForApply.id)) {
      setSubmitError('You have already applied for this opportunity.');
      return;
    }

    // Validate required questions
    const customQuestions = Array.isArray(selectedOppForApply.custom_questions)
      ? selectedOppForApply.custom_questions
      : [];
    for (const q of customQuestions) {
      if (q.required) {
        const val = answers[q.id || q.label];
        if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
          setSubmitError(`Please provide an answer for required field: "${q.label || q.id}"`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await talentHubApi.submitApplication(
        selectedOppForApply.id,
        {
          answers,
          applicant_phone: applicantPhone || talentProfile?.phone || '',
        },
        token
      );

      if (res && res.success) {
        setSubmitSuccess(res.data);
        // Refresh application state
        const appRes = await talentHubApi.getApplications(token);
        if (appRes?.success) setApplications(appRes.data || []);

        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch (_) {}
      } else {
        setSubmitError(res?.message || 'Failed to submit application. Please try again.');
      }
    } catch (err: any) {
      console.error('[Application Submission Error]:', err?.response?.data || err.message);
      const errMsg =
        err?.response?.data?.message ||
        (err?.response?.data?.code === 'DUPLICATE_APPLICATION'
          ? 'You have already applied for this opportunity.'
          : 'We couldn’t submit your application. Please try again.');
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Briefcase className="w-3.5 h-3.5" />
            Active Contributor Programs
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Available Opportunities
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Explore verified AI data collection, annotation, speech, and multilingual tasks.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search programs, languages..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* ── Opportunities Grid ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
          <p className="text-sm">Loading opportunities...</p>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="py-16 text-center bg-[#0c0c10] border border-white/10 rounded-2xl p-8">
          <Briefcase className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No opportunities found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No matching opportunities found for your search term.'
              : 'There are currently no active opportunity programs open for applications. Please check back soon.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.map((opp) => {
            const alreadyApplied = isAlreadyApplied(opp.id);
            const features = Array.isArray(opp.features) ? opp.features : [];
            const languageSkills = Array.isArray(opp.language_skills) ? opp.language_skills : [];

            return (
              <motion.div
                key={opp.id}
                whileHover={{ y: -3 }}
                className="rounded-2xl bg-[#0c0c10] border border-white/10 hover:border-cyan-500/40 shadow-xl overflow-hidden flex flex-col justify-between transition-all duration-300"
              >
                {/* Poster / Logo Header */}
                <div className="relative h-40 bg-gradient-to-tr from-slate-900 via-[#101015] to-[#15151e] overflow-hidden">
                  {opp.poster_url ? (
                    <img
                      src={opp.poster_url}
                      alt={opp.title}
                      className="w-full h-full object-cover opacity-80"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Briefcase className="w-12 h-12 stroke-[1.2]" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c10] via-transparent to-transparent" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 backdrop-blur-md border border-cyan-500/30 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                      {opp.badge || 'ACTIVE'}
                    </span>
                  </div>

                  {/* Applied pill */}
                  {alreadyApplied && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Applied
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-medium text-slate-300 truncate">{opp.partner_name || 'Zenemoo AI'}</span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight line-clamp-2">
                      {opp.title}
                    </h3>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {opp.description || 'Contribute to cutting-edge AI dataset initiatives.'}
                    </p>

                    {/* Features / Language Tags */}
                    {languageSkills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {languageSkills.slice(0, 3).map((lang: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] font-medium text-slate-300"
                          >
                            {lang}
                          </span>
                        ))}
                        {languageSkills.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-500">
                            +{languageSkills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-white/5 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOppForDetail(opp)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-colors text-center"
                    >
                      View Details
                    </button>

                    {alreadyApplied ? (
                      <button
                        disabled
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold cursor-default text-center flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Applied
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenApply(opp)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition-all text-center"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Modal 1: Opportunity Details Drawer / Modal ── */}
      <AnimatePresence>
        {selectedOppForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedOppForDetail(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-[#0c0c10] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 my-8 max-h-[90vh] flex flex-col"
            >
              {/* Header with Close */}
              <div className="sticky top-0 bg-[#0c0c10]/95 backdrop-blur-md px-6 py-4 border-b border-white/10 flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase border border-cyan-500/20">
                    {selectedOppForDetail.badge || 'ACTIVE'}
                  </span>
                  <span className="text-xs text-slate-400 truncate max-w-xs">{selectedOppForDetail.partner_name}</span>
                </div>
                <button
                  onClick={() => setSelectedOppForDetail(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
                {selectedOppForDetail.poster_url && (
                  <div className="rounded-2xl overflow-hidden max-h-56 w-full border border-white/10">
                    <img
                      src={selectedOppForDetail.poster_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {selectedOppForDetail.title}
                  </h2>
                  <p className="text-slate-300 mt-2 leading-relaxed text-sm">
                    {selectedOppForDetail.description}
                  </p>
                </div>

                {/* Features */}
                {Array.isArray(selectedOppForDetail.features) && selectedOppForDetail.features.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Key Highlights</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedOppForDetail.features.map((feat: string, idx: number) => (
                        <li key={idx} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2 text-slate-300">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Requirements */}
                {Array.isArray(selectedOppForDetail.requirements) && selectedOppForDetail.requirements.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Program Requirements</h4>
                    <ul className="space-y-1.5">
                      {selectedOppForDetail.requirements.map((req: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Language Skills */}
                {Array.isArray(selectedOppForDetail.language_skills) && selectedOppForDetail.language_skills.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Languages Supported</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedOppForDetail.language_skills.map((lang: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-medium">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* External links if available */}
                <div className="pt-4 border-t border-white/10 flex flex-wrap gap-3">
                  {selectedOppForDetail.pdf_link && (
                    <a
                      href={selectedOppForDetail.pdf_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Program Document (PDF)</span>
                    </a>
                  )}
                  {selectedOppForDetail.linkedin_post_url && (
                    <a
                      href={selectedOppForDetail.linkedin_post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      <span>LinkedIn Post</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Footer CTA */}
              <div className="sticky bottom-0 bg-[#0c0c10]/95 backdrop-blur-md p-5 border-t border-white/10 flex items-center justify-between gap-4">
                <button
                  onClick={() => setSelectedOppForDetail(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300"
                >
                  Close
                </button>

                {isAlreadyApplied(selectedOppForDetail.id) ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    Already Applied
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenApply(selectedOppForDetail)}
                    className="flex-1 max-w-xs py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all text-center"
                  >
                    Apply for this Opportunity
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal 2: Application Submission Form ── */}
      <AnimatePresence>
        {selectedOppForApply && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !isSubmitting && setSelectedOppForApply(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-[#0c0c10] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 my-8 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#0c0c10]/95 backdrop-blur-md px-6 py-4 border-b border-white/10 flex items-center justify-between z-20">
                <div>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Opportunity Application</span>
                  <h3 className="text-base font-bold text-white truncate max-w-sm">{selectedOppForApply.title}</h3>
                </div>
                {!isSubmitting && !submitSuccess && (
                  <button
                    onClick={() => setSelectedOppForApply(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Form or Success State */}
              {submitSuccess ? (
                <div className="p-8 text-center space-y-4 my-auto">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-400 shadow-xl">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-tight">Application Submitted Successfully!</h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    Your application has been received and is now under review. You can track its live status in the <strong>My Applications</strong> tab.
                  </p>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 inline-block font-mono">
                    Applicant ID: <span className="text-cyan-300 font-bold">{submitSuccess.applicant_id}</span>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => setSelectedOppForApply(null)}
                      className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-white shadow-lg"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitApplication} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
                  {/* Error Notification */}
                  {submitError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Section 1: Locked Identity Fields */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Applicant Profile Credentials
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                        <Lock className="w-3 h-3" /> Locked from Registration
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 block">Full Name</label>
                        <input
                          type="text"
                          disabled
                          value={talentProfile?.full_name || ''}
                          className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-300 cursor-not-allowed font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">Email Address</label>
                        <input
                          type="email"
                          disabled
                          value={talentProfile?.email || ''}
                          className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-white/10 text-xs text-cyan-400 cursor-not-allowed font-medium"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 block">Contact Phone Number</label>
                        <input
                          type="text"
                          value={applicantPhone}
                          onChange={(e) => setApplicantPhone(e.target.value)}
                          placeholder="Phone / WhatsApp"
                          className="w-full mt-1 p-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Dynamically Rendered Custom Questions */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Opportunity Specific Questions
                    </h4>

                    {Array.isArray(selectedOppForApply.custom_questions) &&
                    selectedOppForApply.custom_questions.length > 0 ? (
                      selectedOppForApply.custom_questions.map((q: any, idx: number) => {
                        const qId = q.id || q.label || `q_${idx}`;
                        const isRequired = !!q.required;

                        if (q.type === 'textarea') {
                          return (
                            <div key={qId} className="space-y-1">
                              <label className="text-xs font-medium text-slate-300 block">
                                {q.label} {isRequired && <span className="text-rose-400">*</span>}
                              </label>
                              <textarea
                                rows={3}
                                required={isRequired}
                                value={answers[qId] || ''}
                                onChange={(e) => handleFieldChange(qId, e.target.value)}
                                placeholder="Your answer..."
                                className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                              />
                            </div>
                          );
                        }

                        if (q.type === 'select' && Array.isArray(q.options)) {
                          return (
                            <div key={qId} className="space-y-1">
                              <label className="text-xs font-medium text-slate-300 block">
                                {q.label} {isRequired && <span className="text-rose-400">*</span>}
                              </label>
                              <select
                                required={isRequired}
                                value={answers[qId] || ''}
                                onChange={(e) => handleFieldChange(qId, e.target.value)}
                                className="w-full p-2.5 rounded-xl bg-[#09090b] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                              >
                                <option value="">Select an option...</option>
                                {q.options.map((opt: string, i: number) => (
                                  <option key={i} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        return (
                          <div key={qId} className="space-y-1">
                            <label className="text-xs font-medium text-slate-300 block">
                              {q.label} {isRequired && <span className="text-rose-400">*</span>}
                            </label>
                            <input
                              type={q.type || 'text'}
                              required={isRequired}
                              value={answers[qId] || ''}
                              onChange={(e) => handleFieldChange(qId, e.target.value)}
                              placeholder="Your answer..."
                              className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 py-2">
                        No additional questions required for this application. You may proceed to submit.
                      </p>
                    )}
                  </div>

                  {/* Submit CTA Footer */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOppForApply(null)}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 max-w-xs py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Application</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
