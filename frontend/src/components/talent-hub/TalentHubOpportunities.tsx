import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Search,
  Send,
  Sparkles,
  X,
  AlertCircle,
  Download,
  Users,
  Clock,
  Ban,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTalentHubAuth, OpportunityItem } from './TalentHubAuthContext';
import { talentHubApi } from '../../services/talentHubApi';

export const TalentHubOpportunities: React.FC = () => {
  const { talentProfile, token, opportunities, applications, isDataLoading, mutateApplications } = useTalentHubAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'coming_soon' | 'closed'>('all');

  // Selected opportunity for details view or apply form
  const [selectedOppForDetail, setSelectedOppForDetail] = useState<OpportunityItem | null>(null);
  const [selectedOppForApply, setSelectedOppForApply] = useState<OpportunityItem | null>(null);

  // Form state
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [applicantPhone, setApplicantPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);

  // Check if talent already applied to a given opportunity
  const isAlreadyApplied = (opportunityId: string) => {
    return applications.some((app) => app.opportunity_id === opportunityId);
  };

  // Classify opportunity status
  const getOpportunityStatus = (opp: OpportunityItem): 'open' | 'coming_soon' | 'closed' => {
    const s = (opp.status || 'active').toLowerCase();
    if (s === 'closed' || s === 'completed' || s === 'archived' || s === 'stopped') return 'closed';
    if (s === 'coming_soon' || s === 'upcoming' || s === 'pending' || s === 'draft') return 'coming_soon';
    return 'open';
  };

  // Filter opportunities by search query and status filter
  const filteredOpportunities = opportunities.filter((opp) => {
    const statusCategory = getOpportunityStatus(opp);
    if (statusFilter !== 'all' && statusCategory !== statusFilter) return false;

    const q = searchQuery.toLowerCase();
    if (!q) return true;

    return (
      (opp.title || '').toLowerCase().includes(q) ||
      (opp.partner_name || '').toLowerCase().includes(q) ||
      (opp.description || '').toLowerCase().includes(q) ||
      (Array.isArray(opp.language_skills) && opp.language_skills.some((l: string) => l.toLowerCase().includes(q)))
    );
  });

  const handleOpenApply = (opp: OpportunityItem) => {
    // Strictly prevent opening the apply modal if not open or already applied
    if (getOpportunityStatus(opp) !== 'open' || isAlreadyApplied(opp.id)) {
      return;
    }
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

    if (getOpportunityStatus(selectedOppForApply) !== 'open') {
      setSubmitError('This opportunity is not currently accepting applications.');
      return;
    }

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
          setSubmitError(`Please provide an answer for required question: "${q.label || q.id}"`);
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
        // Immediately mutate cached applications state
        if (res.data) {
          mutateApplications(res.data);
        }

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
          : 'We could not submit your application. Please try again.');
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-300 w-full max-w-full min-w-0 overflow-hidden">
      {/* ── Page Header & Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-white/10 pb-4 sm:pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            <span>Contributor Opportunities</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
            Available Programs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Explore verified AI data collection, speech synthesis, and annotation tasks.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, languages..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
          />
        </div>
      </div>

      {/* ── Status Category Filter Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {(
          [
            { id: 'all', label: 'All Opportunities' },
            { id: 'open', label: 'Open for Applications' },
            { id: 'coming_soon', label: 'Coming Soon' },
            { id: 'closed', label: 'Past / Closed' },
          ] as const
        ).map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm shadow-cyan-500/20'
                  : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/5 font-medium'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Opportunities Grid ── */}
      {isDataLoading && opportunities.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
          <p className="text-sm font-mono">Loading opportunities...</p>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="py-16 text-center bg-[#080d19]/90 border border-white/10 rounded-3xl p-8 max-w-xl mx-auto shadow-xl">
          <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white font-display">No opportunities found</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {searchQuery
              ? 'No opportunities match your search query.'
              : statusFilter === 'open'
              ? 'There are currently no open opportunities accepting new applications. Please check our "Coming Soon" programs.'
              : 'There are currently no opportunity listings in this category.'}
          </p>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold hover:bg-cyan-500/20 cursor-pointer"
            >
              View All Opportunities
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.map((opp) => {
            const alreadyApplied = isAlreadyApplied(opp.id);
            const statusCat = getOpportunityStatus(opp);
            const languageSkills = Array.isArray(opp.language_skills) ? opp.language_skills : [];
            const applicantCount = opp.applicant_count || 0;

            const isClosed = statusCat === 'closed';
            const isComingSoon = statusCat === 'coming_soon';
            const isOpen = statusCat === 'open';

            return (
              <motion.div
                key={opp.id}
                whileHover={{ y: -3 }}
                className="rounded-3xl bg-[#080d19]/90 border border-white/10 hover:border-cyan-500/40 shadow-xl overflow-hidden flex flex-col justify-between transition-all duration-300 relative"
              >
                {/* Poster / Header */}
                <div className="relative h-48 bg-gradient-to-tr from-slate-950 via-[#0a0f1d] to-[#121b33] overflow-hidden">
                  {opp.poster_url ? (
                    <img
                      src={opp.poster_url}
                      alt={opp.title}
                      className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <Briefcase className="w-14 h-14 stroke-[1.2]" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#080d19] via-[#080d19]/40 to-transparent" />

                  {/* Status Badge (Top-Left) */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md text-[10px] font-mono font-bold uppercase tracking-wider border shadow-md ${
                        isClosed
                          ? 'bg-slate-900/90 text-slate-300 border-slate-700'
                          : isComingSoon
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {isOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {isComingSoon && <Clock className="w-3 h-3 text-amber-400" />}
                      {isClosed && <Ban className="w-3 h-3 text-slate-400" />}
                      <span>{isClosed ? 'CLOSED' : isComingSoon ? 'COMING SOON' : opp.badge || 'OPEN'}</span>
                    </span>
                  </div>

                  {/* Applicant Count Pill (Top-Right) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-slate-200 text-[10px] font-mono font-semibold shadow-sm">
                    <Users className="w-3 h-3 text-cyan-400" />
                    <span>{applicantCount} Applicants</span>
                  </div>

                  {/* Already Applied Pill (Bottom-Right) */}
                  {alreadyApplied && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold shadow-md">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Applied</span>
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

                    <h3 className="text-base font-bold text-white tracking-tight font-display line-clamp-2">
                      {opp.title}
                    </h3>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {opp.description || 'Contribute to cutting-edge AI dataset and multilingual initiatives.'}
                    </p>

                    {/* Language Skills Tags */}
                    {languageSkills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {languageSkills.slice(0, 3).map((lang: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-[10px] font-mono font-medium text-slate-300"
                          >
                            {lang}
                          </span>
                        ))}
                        {languageSkills.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono text-slate-500">
                            +{languageSkills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons with Strict Status Enforcement */}
                  <div className="pt-4 border-t border-white/5 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOppForDetail(opp)}
                      className="flex-1 py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-mono font-semibold text-slate-200 hover:text-white transition-colors text-center cursor-pointer"
                    >
                      View Details
                    </button>

                    {alreadyApplied ? (
                      <button
                        disabled
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold cursor-default text-center flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Applied</span>
                      </button>
                    ) : isOpen ? (
                      <button
                        onClick={() => handleOpenApply(opp)}
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-mono font-bold text-white shadow-md shadow-cyan-500/20 transition-all text-center cursor-pointer active:scale-95"
                      >
                        Apply Now
                      </button>
                    ) : isComingSoon ? (
                      <button
                        disabled
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300/90 text-xs font-mono font-semibold cursor-not-allowed text-center flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Coming Soon</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-slate-400 text-xs font-mono font-semibold cursor-not-allowed text-center flex items-center justify-center gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Applications Closed</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Modal 1: Opportunity Detail View Modal ── */}
      <AnimatePresence>
        {selectedOppForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedOppForDetail(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-[#080d19]/98 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden z-10 my-6 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#080d19]/95 backdrop-blur-md px-6 py-4 border-b border-white/10 flex items-center justify-between z-20">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-mono font-bold uppercase border border-cyan-500/30">
                    {selectedOppForDetail.badge || selectedOppForDetail.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                  <span className="text-xs font-mono text-slate-400 truncate max-w-xs">{selectedOppForDetail.partner_name}</span>
                </div>
                <button
                  onClick={() => setSelectedOppForDetail(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
                {selectedOppForDetail.poster_url && (
                  <div className="rounded-2xl overflow-hidden max-h-60 w-full border border-white/10 shadow-lg">
                    <img
                      src={selectedOppForDetail.poster_url}
                      alt={selectedOppForDetail.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] mb-1">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedOppForDetail.applicant_count || 0} Contributor Applications</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-display">
                    {selectedOppForDetail.title}
                  </h2>
                  <p className="text-slate-300 mt-2.5 leading-relaxed text-sm">
                    {selectedOppForDetail.description}
                  </p>
                </div>

                {/* Features / Highlights */}
                {Array.isArray(selectedOppForDetail.features) && selectedOppForDetail.features.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Key Highlights</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedOppForDetail.features.map((feat: string, idx: number) => (
                        <li key={idx} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-slate-300">
                          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Requirements */}
                {Array.isArray(selectedOppForDetail.requirements) && selectedOppForDetail.requirements.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Program Requirements</h4>
                    <ul className="space-y-2">
                      {selectedOppForDetail.requirements.map((req: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Language Skills */}
                {Array.isArray(selectedOppForDetail.language_skills) && selectedOppForDetail.language_skills.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Languages Supported</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedOppForDetail.language_skills.map((lang: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono font-medium">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* External links */}
                <div className="pt-4 border-t border-white/10 flex flex-wrap gap-3">
                  {selectedOppForDetail.pdf_link && (
                    <a
                      href={selectedOppForDetail.pdf_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-mono"
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-mono"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      <span>LinkedIn Post</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Modal Footer CTA */}
              <div className="sticky bottom-0 bg-[#080d19]/95 backdrop-blur-md p-5 border-t border-white/10 flex items-center justify-between gap-4">
                <button
                  onClick={() => setSelectedOppForDetail(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono font-medium text-slate-300 cursor-pointer"
                >
                  Close
                </button>

                {isAlreadyApplied(selectedOppForDetail.id) ? (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-300 font-bold px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Already Applied</span>
                  </div>
                ) : getOpportunityStatus(selectedOppForDetail) === 'open' ? (
                  <button
                    onClick={() => handleOpenApply(selectedOppForDetail)}
                    className="flex-1 max-w-xs py-2.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-mono font-bold text-white shadow-lg shadow-cyan-500/20 transition-all text-center cursor-pointer"
                  >
                    Apply for this Opportunity
                  </button>
                ) : getOpportunityStatus(selectedOppForDetail) === 'coming_soon' ? (
                  <button
                    disabled
                    className="flex-1 max-w-xs py-2.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 max-w-xs py-2.5 px-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-slate-400 text-xs font-mono font-bold cursor-not-allowed"
                  >
                    Applications Closed
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal 2: Application Submission Form Modal ── */}
      <AnimatePresence>
        {selectedOppForApply && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !isSubmitting && setSelectedOppForApply(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-[#080d19]/98 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden z-10 my-6 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#080d19]/95 backdrop-blur-md px-6 py-4 border-b border-white/10 flex items-center justify-between z-20">
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">Opportunity Application</span>
                  <h3 className="text-base font-bold text-white truncate max-w-sm font-display">{selectedOppForApply.title}</h3>
                </div>
                {!isSubmitting && !submitSuccess && (
                  <button
                    onClick={() => setSelectedOppForApply(null)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Form or Success State */}
              {submitSuccess ? (
                <div className="p-8 text-center space-y-4 my-auto">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 shadow-xl">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-tight font-display">Application Submitted Successfully!</h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    Your application has been received and is now under review. You can track its live status in the <strong>My Applications</strong> tab.
                  </p>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 inline-block font-mono">
                    Applicant ID: <span className="text-cyan-300 font-bold">{submitSuccess.applicant_id}</span>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => setSelectedOppForApply(null)}
                      className="py-2.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-mono font-bold text-white shadow-lg cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitApplication} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
                  {/* Error Notification */}
                  {submitError && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Section 1: Locked Identity Fields */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Applicant Credentials
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                        <Lock className="w-3 h-3 text-cyan-400" /> Verified Profile
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block">Full Name</label>
                        <input
                          type="text"
                          disabled
                          value={talentProfile?.full_name || ''}
                          className="w-full mt-1 p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 cursor-not-allowed font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block">Email Address</label>
                        <input
                          type="email"
                          disabled
                          value={talentProfile?.email || ''}
                          className="w-full mt-1 p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-cyan-400 cursor-not-allowed font-medium"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-mono text-slate-400 block">Contact Phone Number</label>
                        <input
                          type="text"
                          value={applicantPhone}
                          onChange={(e) => setApplicantPhone(e.target.value)}
                          placeholder="Phone / WhatsApp"
                          className="w-full mt-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Dynamically Rendered Custom Questions */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
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
                                className="w-full p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
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
                                className="w-full p-2.5 rounded-2xl bg-[#080d19] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
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
                              className="w-full p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 py-2">
                        No additional questions required for this opportunity. You may proceed to submit.
                      </p>
                    )}
                  </div>

                  {/* Submit CTA Footer */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOppForApply(null)}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono font-medium text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 max-w-xs py-2.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-mono font-bold text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
