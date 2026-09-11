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
  Globe,
  MessageCircle,
  FileText,
  Share2,
  Layers,
  Award,
  Cpu,
  Wifi,
  Zap,
  Check,
  Maximize2,
  ShieldCheck,
  FileDown,
  DollarSign,
  Phone,
  Linkedin,
  Copy,
} from 'lucide-react';
import { FaXTwitter, FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa6';
import confetti from 'canvas-confetti';
import { useTalentHubAuth, OpportunityItem, ApplicationItem } from './TalentHubAuthContext';
import { talentHubApi } from '../../services/talentHubApi';
import { downloadApplicationPdf } from '../../services/applicationPdfService';

export const TalentHubOpportunities: React.FC = () => {
  const { talentProfile, token, opportunities, applications, isDataLoading, mutateApplications } = useTalentHubAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'coming_soon' | 'closed'>('all');

  // Selected opportunity for details view or apply form or referral modal
  const [selectedOppForDetail, setSelectedOppForDetail] = useState<OpportunityItem | null>(null);
  const [selectedOppForApply, setSelectedOppForApply] = useState<OpportunityItem | null>(null);
  const [selectedOppForReferral, setSelectedOppForReferral] = useState<OpportunityItem | null>(null);
  const [copiedRefLink, setCopiedRefLink] = useState(false);

  // Form state
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [applicantPhone, setApplicantPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // Check if talent already applied to a given opportunity
  const isAlreadyApplied = (opportunityId: string) => {
    return applications.some((app) => app.opportunity_id === opportunityId);
  };

  const getExistingApplicationForOpp = (opportunityId: string): ApplicationItem | undefined => {
    return applications.find((app) => app.opportunity_id === opportunityId);
  };

  const handleDownloadAppPdf = async (opp: OpportunityItem) => {
    const existingApp = getExistingApplicationForOpp(opp.id);
    if (!existingApp) return;

    setDownloadingPdfId(opp.id);
    try {
      await downloadApplicationPdf({
        applicant_id: existingApp.applicant_id,
        applicant_name: existingApp.applicant_name,
        applicant_email: existingApp.applicant_email,
        applicant_phone: existingApp.applicant_phone || talentProfile?.phone || '',
        opportunity_title: existingApp.opportunity_title || opp.title,
        partner_name: opp.partner_name,
        status: existingApp.status || 'pending',
        created_at: existingApp.created_at,
        work_mode: opp.work_mode,
        payment_info: opp.payment_info,
        working_hours: opp.working_hours,
        answers: existingApp.answers,
        custom_questions: opp.custom_questions,
        terms_accepted: true,
      });
    } catch (err) {
      console.error('[PDF Download Error]:', err);
    } finally {
      setDownloadingPdfId(null);
    }
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

    // Validate required questions and format answers payload with clean question text labels
    const customQuestions = Array.isArray(selectedOppForApply.custom_questions)
      ? selectedOppForApply.custom_questions
      : [];
    const formattedAnswers: Record<string, any> = {};

    for (let idx = 0; idx < customQuestions.length; idx++) {
      const q = customQuestions[idx];
      const qLabel = (q.label && q.label.trim()) || q.id || `Question ${idx + 1}`;
      const val =
        answers[qLabel] !== undefined
          ? answers[qLabel]
          : q.id && answers[q.id] !== undefined
          ? answers[q.id]
          : answers[`q_${idx}`];

      if (q.required) {
        if (val === undefined || val === null || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
          setSubmitError(`Please provide an answer for required question: "${q.label || q.id}"`);
          return;
        }
      }

      if (val !== undefined && val !== null && val !== '') {
        formattedAnswers[qLabel] = val;
      }
    }

    // Preserve any custom keys not defined as standard question IDs
    Object.entries(answers).forEach(([k, v]) => {
      const isRawId = customQuestions.some((q: any) => q.id === k);
      if (!isRawId && formattedAnswers[k] === undefined && v !== undefined && v !== null && v !== '') {
        formattedAnswers[k] = v;
      }
    });

    setIsSubmitting(true);
    setSubmitError(null);

    // Read active referral code from storage if user arrived through a referral link
    let activeRefCode = '';
    try {
      activeRefCode = sessionStorage.getItem('zenemoo_active_ref') || localStorage.getItem('zenemoo_active_ref') || '';
      activeRefCode = activeRefCode.trim().toUpperCase();
    } catch (_) {}

    try {
      const res = await talentHubApi.submitApplication(
        selectedOppForApply.id,
        {
          answers: formattedAnswers,
          applicant_phone: applicantPhone || talentProfile?.phone || '',
          referral_code: activeRefCode || undefined,
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

                  {/* Action Buttons with Strict Status Enforcement & Referral Share */}
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedOppForDetail(opp)}
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-mono font-semibold text-slate-200 hover:text-white transition-colors text-center cursor-pointer"
                      >
                        View Details
                      </button>

                      <button
                        onClick={() => setSelectedOppForReferral(opp)}
                        className="py-2.5 px-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Refer a Friend to this opportunity"
                      >
                        <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden sm:inline">Refer</span>
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
                          <span>Closed</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Modal 1: Opportunity Detail View Modal (Full Specifications, Partner Logo, Links & Unlocked WhatsApp) ── */}
      <AnimatePresence>
        {selectedOppForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setSelectedOppForDetail(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-[#080d19]/98 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden z-10 my-4 max-h-[92vh] flex flex-col font-sans"
            >
              {/* Modal Sticky Header */}
              <div className="sticky top-0 bg-[#080d19]/95 backdrop-blur-md px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between z-20">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedOppForDetail.company_logo ? (
                    <img
                      src={selectedOppForDetail.company_logo}
                      alt={selectedOppForDetail.partner_name || 'Partner'}
                      className="w-9 h-9 object-contain bg-white/10 p-1 rounded-xl border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-cyan-400 truncate">
                        {selectedOppForDetail.partner_name || 'Zenemoo AI Partner'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-mono font-bold uppercase border border-cyan-500/30">
                        {selectedOppForDetail.badge || selectedOppForDetail.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                      {selectedOppForDetail.work_mode && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 text-[10px] font-mono uppercase border border-white/10">
                          {selectedOppForDetail.work_mode.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOppForDetail(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer shrink-0 transition-colors"
                  title="Close details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 text-xs text-slate-200">
                {/* Poster Graphic Banner (if provided) */}
                {selectedOppForDetail.poster_url && (
                  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-black/40 max-h-72 w-full flex items-center justify-center relative group">
                    <img
                      src={selectedOppForDetail.poster_url}
                      alt={selectedOppForDetail.title}
                      className="w-full h-auto max-h-72 object-contain"
                    />
                  </div>
                )}

                {/* Hero Header */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedOppForDetail.applicant_count || 0} Total Applications Submitted</span>
                    {isAlreadyApplied(selectedOppForDetail.id) && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> You Have Applied
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-display">
                    {selectedOppForDetail.title}
                  </h2>
                  <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                    {selectedOppForDetail.description || selectedOppForDetail.about_project}
                  </p>
                </div>

                {/* Core Specifications 3-Column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] uppercase font-bold">
                      <DollarSign className="w-3.5 h-3.5" /> Compensation / Pay
                    </div>
                    <div className="text-emerald-300 font-bold text-sm">
                      {selectedOppForDetail.payment_info || 'Project Milestone Rates'}
                    </div>
                    {selectedOppForDetail.payment_frequency && (
                      <div className="text-slate-400 text-[10px] font-mono">
                        Frequency: {selectedOppForDetail.payment_frequency}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] uppercase font-bold">
                      <Clock className="w-3.5 h-3.5" /> Working Hours
                    </div>
                    <div className="text-white font-bold text-sm">
                      {selectedOppForDetail.working_hours || selectedOppForDetail.availability_requirement || 'Flexible Schedule'}
                    </div>
                    <div className="text-slate-400 text-[10px] font-mono">
                      Work Mode: {selectedOppForDetail.work_mode ? selectedOppForDetail.work_mode.toUpperCase() : 'REMOTE'}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] uppercase font-bold">
                      <Globe className="w-3.5 h-3.5" /> Duration &amp; Scope
                    </div>
                    <div className="text-amber-300 font-bold text-sm">
                      {selectedOppForDetail.project_duration || 'Ongoing Program'}
                    </div>
                    <div className="text-slate-400 text-[10px] font-mono">
                      Partner: {selectedOppForDetail.partner_name || 'Zenemoo'}
                    </div>
                  </div>
                </div>

                {/* Unlocked WhatsApp Group for Applied Candidates */}
                {isAlreadyApplied(selectedOppForDetail.id) ? (
                  selectedOppForDetail.whatsapp_group_url ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border border-emerald-500/40 space-y-2 shadow-lg shadow-emerald-500/5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <MessageCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Contributor Community Access Unlocked
                            </span>
                            <h4 className="text-sm font-bold text-white font-sans">Official Contributor WhatsApp Group</h4>
                          </div>
                        </div>

                        <a
                          href={selectedOppForDetail.whatsapp_group_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-transform active:scale-95 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Join WhatsApp Group</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ) : null
                ) : (
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3 text-slate-400">
                    <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-[11px] font-mono">
                      Exclusive Contributor WhatsApp Group will be unlocked after submitting your application.
                    </span>
                  </div>
                )}

                {/* Responsibilities & Daily Tasks */}
                {Array.isArray(selectedOppForDetail.what_you_will_do) && selectedOppForDetail.what_you_will_do.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" /> Responsibilities &amp; Daily Tasks
                    </h4>
                    <div className="space-y-2">
                      {selectedOppForDetail.what_you_will_do.map((task: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                          <span className="leading-relaxed text-slate-300">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Highlights & Features */}
                {((Array.isArray(selectedOppForDetail.features) && selectedOppForDetail.features.length > 0) ||
                  (Array.isArray(selectedOppForDetail.project_highlights) && selectedOppForDetail.project_highlights.length > 0)) && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-400" /> Key Highlights &amp; Features
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(selectedOppForDetail.features || selectedOppForDetail.project_highlights || []).map((feat: string, idx: number) => (
                        <div key={idx} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-slate-300">
                          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eligibility & Hardware Checklist */}
                {(selectedOppForDetail.equipment_requirements ||
                  selectedOppForDetail.internet_requirements ||
                  selectedOppForDetail.experience_requirements ||
                  (Array.isArray(selectedOppForDetail.requirements) && selectedOppForDetail.requirements.length > 0) ||
                  (Array.isArray(selectedOppForDetail.eligibility_criteria) && selectedOppForDetail.eligibility_criteria.length > 0)) && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-emerald-400" /> Eligibility &amp; Hardware Checklist
                    </h4>

                    {selectedOppForDetail.equipment_requirements && (
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-xs space-y-1">
                        <span className="font-bold text-[10px] uppercase block text-emerald-400">Required Hardware / Equipment:</span>
                        <p className="font-sans text-slate-200">{selectedOppForDetail.equipment_requirements}</p>
                      </div>
                    )}

                    {selectedOppForDetail.internet_requirements && (
                      <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-xs space-y-1">
                        <span className="font-bold text-[10px] uppercase block text-cyan-400">Internet &amp; Connectivity:</span>
                        <p className="font-sans text-slate-200">{selectedOppForDetail.internet_requirements}</p>
                      </div>
                    )}

                    {((Array.isArray(selectedOppForDetail.requirements) && selectedOppForDetail.requirements.length > 0) ||
                      (Array.isArray(selectedOppForDetail.eligibility_criteria) && selectedOppForDetail.eligibility_criteria.length > 0)) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(selectedOppForDetail.requirements || selectedOppForDetail.eligibility_criteria || []).map((req: string, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{req}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Languages Supported */}
                {Array.isArray(selectedOppForDetail.language_skills) && selectedOppForDetail.language_skills.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-mono font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" /> Languages Supported
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedOppForDetail.language_skills.map((lang: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono font-medium text-xs">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Candidate Benefits & Notes */}
                {((Array.isArray(selectedOppForDetail.benefits) && selectedOppForDetail.benefits.length > 0) ||
                  selectedOppForDetail.why_join ||
                  selectedOppForDetail.important_notes) && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" /> Benefits &amp; Important Notes
                    </h4>
                    {Array.isArray(selectedOppForDetail.benefits) && selectedOppForDetail.benefits.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedOppForDetail.benefits.map((ben: string, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2 text-slate-300">
                            <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{ben}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedOppForDetail.important_notes && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[11px] leading-relaxed">
                        <span className="font-bold block">Important Note:</span>
                        {selectedOppForDetail.important_notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Official Public Links & Channels */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-400" /> Program Documentation &amp; Channels
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {selectedOppForDetail.pdf_link && (
                      <a
                        href={selectedOppForDetail.pdf_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-xs font-bold transition-all"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-400" />
                        <span>Download PDF Guidelines</span>
                        <ExternalLink className="w-3 h-3 text-purple-400" />
                      </a>
                    )}
                    {selectedOppForDetail.whatsapp_channel_url && (
                      <a
                        href={selectedOppForDetail.whatsapp_channel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono text-xs font-bold transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-teal-400" />
                        <span>WhatsApp Channel</span>
                        <ExternalLink className="w-3 h-3 text-teal-400" />
                      </a>
                    )}
                    {selectedOppForDetail.telegram_url && (
                      <a
                        href={selectedOppForDetail.telegram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono text-xs font-bold transition-all"
                      >
                        <Send className="w-3.5 h-3.5 text-sky-400" />
                        <span>Telegram Community</span>
                        <ExternalLink className="w-3 h-3 text-sky-400" />
                      </a>
                    )}
                    {selectedOppForDetail.linkedin_post_url && (
                      <a
                        href={selectedOppForDetail.linkedin_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono text-xs font-bold transition-all"
                      >
                        <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                        <span>LinkedIn Post</span>
                        <ExternalLink className="w-3 h-3 text-blue-400" />
                      </a>
                    )}
                    {selectedOppForDetail.x_post_url && (
                      <a
                        href={selectedOppForDetail.x_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/20 font-mono text-xs font-bold transition-all"
                      >
                        <FaXTwitter className="w-3.5 h-3.5" />
                        <span>X Announcement</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {selectedOppForDetail.contact_support_url && (
                      <a
                        href={selectedOppForDetail.contact_support_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-xs font-bold transition-all"
                      >
                        <Phone className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Support Desk</span>
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="sticky bottom-0 bg-[#080d19]/95 backdrop-blur-md p-4 sm:p-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 z-20">
                <button
                  onClick={() => setSelectedOppForDetail(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono font-medium text-slate-300 cursor-pointer transition-colors"
                >
                  Close
                </button>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => setSelectedOppForReferral(selectedOppForDetail)}
                    className="py-2.5 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Refer a Friend</span>
                  </button>

                  {isAlreadyApplied(selectedOppForDetail.id) ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownloadAppPdf(selectedOppForDetail)}
                        disabled={downloadingPdfId === selectedOppForDetail.id}
                        className="py-2.5 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {downloadingPdfId === selectedOppForDetail.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating PDF...</span>
                          </>
                        ) : (
                          <>
                            <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Download My Application (PDF)</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-300 font-bold px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Application Submitted</span>
                      </div>
                    </>
                  ) : getOpportunityStatus(selectedOppForDetail) === 'open' ? (
                    <button
                      onClick={() => handleOpenApply(selectedOppForDetail)}
                      className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-mono font-bold text-white shadow-lg shadow-cyan-500/20 transition-all text-center cursor-pointer active:scale-95"
                    >
                      Apply for this Opportunity
                    </button>
                  ) : getOpportunityStatus(selectedOppForDetail) === 'coming_soon' ? (
                    <button
                      disabled
                      className="py-2.5 px-5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  ) : (
                    <button
                      disabled
                      className="py-2.5 px-5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-slate-400 text-xs font-mono font-bold cursor-not-allowed"
                    >
                      Applications Closed
                    </button>
                  )}
                </div>
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
                        const qLabel = (q.label && q.label.trim()) || q.id || `Question ${idx + 1}`;
                        const isRequired = !!q.required;
                        const currentVal =
                          answers[qLabel] !== undefined
                            ? answers[qLabel]
                            : q.id && answers[q.id] !== undefined
                            ? answers[q.id]
                            : '';

                        if (q.type === 'textarea') {
                          return (
                            <div key={qLabel} className="space-y-1">
                              <label className="text-xs font-medium text-slate-300 block">
                                {q.label} {isRequired && <span className="text-rose-400">*</span>}
                              </label>
                              <textarea
                                rows={3}
                                required={isRequired}
                                value={currentVal}
                                onChange={(e) => handleFieldChange(qLabel, e.target.value)}
                                placeholder="Your answer..."
                                className="w-full p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                              />
                            </div>
                          );
                        }

                        if (q.type === 'select' && Array.isArray(q.options)) {
                          return (
                            <div key={qLabel} className="space-y-1">
                              <label className="text-xs font-medium text-slate-300 block">
                                {q.label} {isRequired && <span className="text-rose-400">*</span>}
                              </label>
                              <select
                                required={isRequired}
                                value={currentVal}
                                onChange={(e) => handleFieldChange(qLabel, e.target.value)}
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
                          <div key={qLabel} className="space-y-1">
                            <label className="text-xs font-medium text-slate-300 block">
                              {q.label} {isRequired && <span className="text-rose-400">*</span>}
                            </label>
                            <input
                              type={q.type || 'text'}
                              required={isRequired}
                              value={currentVal}
                              onChange={(e) => handleFieldChange(qLabel, e.target.value)}
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

      {/* ── Modal 3: Refer a Friend Share Modal ── */}
      <AnimatePresence>
        {selectedOppForReferral && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setSelectedOppForReferral(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#080d19]/98 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden z-10 my-6 flex flex-col font-sans"
            >
              {/* Header */}
              <div className="bg-[#080d19]/95 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-display">Refer a Friend</h3>
                    <p className="text-[11px] font-mono text-slate-400">Share opportunity with your referral link</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOppForReferral(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Target Opportunity</span>
                  <h4 className="text-sm sm:text-base font-bold text-white font-display">{selectedOppForReferral.title}</h4>
                  <p className="text-xs text-cyan-300 font-mono">{selectedOppForReferral.partner_name || 'Zenemoo AI Partner'}</p>
                </div>

                {/* Referral Link Box */}
                <div>
                  <span className="text-[11px] font-mono font-semibold text-slate-300 block mb-1.5">
                    Your Opportunity Referral Link:
                  </span>
                  {(() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.zenemoo.in';
                    const refCode = talentProfile?.registration_code || '';
                    const referralUrl = `${origin}/opportunity/${selectedOppForReferral.id}?ref=${refCode}`;
                    return (
                      <div className="space-y-3">
                        <div className="bg-black/60 px-3.5 py-2.5 rounded-xl border border-white/10 text-xs font-mono text-cyan-300 select-all break-all">
                          {referralUrl}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                  await navigator.clipboard.writeText(referralUrl);
                                }
                                setCopiedRefLink(true);
                                try {
                                  confetti({ particleCount: 20, spread: 45, origin: { y: 0.8 }, colors: ['#06B6D4', '#3B82F6'] });
                                } catch (_) {}
                                setTimeout(() => setCopiedRefLink(false), 2000);
                              } catch (_) {}
                            }}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold border border-cyan-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            {copiedRefLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedRefLink ? 'Copied Link!' : 'Copy Link'}</span>
                          </button>

                          <button
                            onClick={() => {
                              const msg = `Zenemoo has an opportunity you may be interested in: "${selectedOppForReferral.title}".\n\nApply here with my referral link:\n${referralUrl}`;
                              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
                            }}
                            className="py-2.5 px-4 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] text-xs font-mono font-bold border border-[#25D366]/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={async () => {
                              if (navigator.share) {
                                try {
                                  await navigator.share({
                                    title: `Zenemoo: ${selectedOppForReferral.title}`,
                                    text: `Apply for "${selectedOppForReferral.title}" on Zenemoo AI Contributor Network:`,
                                    url: referralUrl,
                                  });
                                } catch (_) {}
                              }
                            }}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                            title="More share options"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-start gap-2 text-[11px] text-slate-300 font-mono">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    When candidates click your link and submit their application, they will be automatically recorded under your referrals dashboard.
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
