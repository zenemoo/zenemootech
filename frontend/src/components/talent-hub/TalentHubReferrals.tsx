import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Briefcase,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Award,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  X,
  User,
  Calendar,
  Lock,
  ChevronDown,
  Hash,
  Mail,
  Phone,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTalentHubAuth, OpportunityItem } from './TalentHubAuthContext';
import { talentHubApi } from '../../services/talentHubApi';
import {
  generateReferralCSV,
  generateReferralXLSX,
  generateReferralPDF,
  downloadFile,
  ReferralExportApplicant,
  ReferralExportSummary,
} from '../../utils/referralExportUtils';

interface ReferralSummaryStats {
  total: number;
  applications: number;
  selected: number;
  accepted: number;
  shortlisted: number;
  pending: number;
  rejected: number;
}

interface OpportunityReferralStat {
  opportunity_id: string;
  opportunity_title: string;
  total: number;
  pending: number;
  shortlisted: number;
  accepted: number;
  rejected: number;
  selected: number;
}

interface ReferredApplicationItem {
  id: string;
  applicant_id?: string;
  applicant_name: string;
  applicant_email?: string;
  applicant_phone?: string;
  opportunity_id: string;
  opportunity_title: string;
  status: string;
  created_at: string;
  referral_code?: string;
  referral_source?: string;
}

// Session-scoped cache to avoid refetches on route transitions
interface ReferralCache {
  stats: ReferralSummaryStats | null;
  opportunityStats: OpportunityReferralStat[];
  referredApplications: ReferredApplicationItem[];
  token: string | null;
  timestamp: number;
}

let referralSessionCache: ReferralCache = {
  stats: null,
  opportunityStats: [],
  referredApplications: [],
  token: null,
  timestamp: 0,
};

export const invalidateReferralSessionCache = () => {
  referralSessionCache = {
    stats: null,
    opportunityStats: [],
    referredApplications: [],
    token: null,
    timestamp: 0,
  };
};

export const TalentHubReferrals: React.FC = () => {
  const { talentProfile, token, opportunities } = useTalentHubAuth();

  const [isLoading, setIsLoading] = useState(!referralSessionCache.stats);
  const [stats, setStats] = useState<ReferralSummaryStats>(
    referralSessionCache.stats || {
      total: 0,
      applications: 0,
      selected: 0,
      accepted: 0,
      shortlisted: 0,
      pending: 0,
      rejected: 0,
    }
  );
  const [opportunityStats, setOpportunityStats] = useState<OpportunityReferralStat[]>(referralSessionCache.opportunityStats || []);
  const [referredApplications, setReferredApplications] = useState<ReferredApplicationItem[]>(referralSessionCache.referredApplications || []);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOppId, setCopiedOppId] = useState<string | null>(null);
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);

  // Project Referral Modal & Selected Candidate Detail State
  const [selectedProjectForModal, setSelectedProjectForModal] = useState<{
    opportunity_id: string;
    opportunity_title: string;
    oppItem?: OpportunityItem;
  } | null>(null);
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState<ReferredApplicationItem | null>(null);

  // Modal Specific Filters
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState<'all' | 'pending' | 'selected' | 'rejected'>('all');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Main Page Project Search / Filter
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'open' | 'active_referrals' | 'closed'>('all');

  const referralCode = talentProfile?.registration_code || '';

  const fetchReferralData = useCallback(async (isManual = false) => {
    if (!token) return;
    const now = Date.now();
    if (!isManual && referralSessionCache.token === token && referralSessionCache.stats && now - referralSessionCache.timestamp < 3 * 60 * 1000) {
      setStats(referralSessionCache.stats);
      setOpportunityStats(referralSessionCache.opportunityStats);
      setReferredApplications(referralSessionCache.referredApplications);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await talentHubApi.getReferrals(token);
      if (res && res.success) {
        const fetchedStats = res.stats || { total: 0, applications: 0, selected: 0, accepted: 0, shortlisted: 0, pending: 0, rejected: 0 };
        const fetchedOppStats = res.opportunity_referrals || [];
        const fetchedReferredApps = res.referred_applications || [];

        setStats(fetchedStats);
        setOpportunityStats(fetchedOppStats);
        setReferredApplications(fetchedReferredApps);

        referralSessionCache = {
          stats: fetchedStats,
          opportunityStats: fetchedOppStats,
          referredApplications: fetchedReferredApps,
          token,
          timestamp: Date.now(),
        };
      }
    } catch (err) {
      console.warn('[TalentHub Referrals Fetch Error]:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReferralData(false);
  }, [fetchReferralData]);

  // Construct absolute referral URL for an opportunity
  const getOpportunityReferralUrl = useCallback((oppId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.zenemoo.in';
    return `${origin}/opportunity/${oppId}?ref=${referralCode}`;
  }, [referralCode]);

  // Status Classifier for Opportunities
  const getOpportunityStatusCategory = (opp?: OpportunityItem | null, rawStatus?: string): 'open' | 'coming_soon' | 'closed' => {
    const s = (opp?.status || rawStatus || 'active').toLowerCase();
    if (s === 'closed' || s === 'completed' || s === 'archived' || s === 'stopped') return 'closed';
    if (s === 'coming_soon' || s === 'upcoming' || s === 'pending' || s === 'draft') return 'coming_soon';
    return 'open';
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralCode);
      } else {
        const el = document.createElement('textarea');
        el.value = referralCode;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedCode(true);
      try {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.8 },
          colors: ['#06B6D4', '#3B82F6', '#10B981'],
        });
      } catch (_) {}
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (_) {}
  };

  const handleCopyAppId = async (appId: string) => {
    if (!appId) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(appId);
      } else {
        const el = document.createElement('textarea');
        el.value = appId;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedAppId(appId);
      setTimeout(() => setCopiedAppId(null), 2000);
    } catch (_) {}
  };

  const handleCopyLink = async (oppId: string) => {
    const url = getOpportunityReferralUrl(oppId);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement('textarea');
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedOppId(oppId);
      try {
        confetti({
          particleCount: 20,
          spread: 40,
          origin: { y: 0.8 },
          colors: ['#06B6D4', '#3B82F6', '#10B981'],
        });
      } catch (_) {}
      setTimeout(() => setCopiedOppId(null), 2000);
    } catch (_) {}
  };

  const handleWhatsAppShare = (oppTitle: string, oppId: string) => {
    const url = getOpportunityReferralUrl(oppId);
    const message = `Zenemoo has an opportunity you may be interested in: "${oppTitle}".\n\nApply here with my referral link:\n${url}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async (oppTitle: string, oppId: string) => {
    const url = getOpportunityReferralUrl(oppId);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Zenemoo Opportunity: ${oppTitle}`,
          text: `Apply for "${oppTitle}" on Zenemoo AI Contributor Network:`,
          url,
        });
        return;
      } catch (_) {}
    }
    handleCopyLink(oppId);
  };

  // Status classification badge helper
  const getStatusBadge = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'accepted':
        return {
          label: 'Accepted',
          badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          icon: CheckCircle2,
        };
      case 'shortlisted':
        return {
          label: 'Shortlisted',
          badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
          icon: Sparkles,
        };
      case 'rejected':
        return {
          label: 'Rejected',
          badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
          icon: XCircle,
        };
      case 'pending':
      default:
        return {
          label: 'Pending Review',
          badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          icon: Clock,
        };
    }
  };

  // Build unified project cards combining live opportunities and historical referral stats
  const unifiedProjectCards = useMemo(() => {
    const map: Record<string, {
      opportunity_id: string;
      opportunity_title: string;
      oppItem?: OpportunityItem;
      statusCategory: 'open' | 'coming_soon' | 'closed';
      total: number;
      pending: number;
      shortlisted: number;
      accepted: number;
      rejected: number;
      selected: number;
    }> = {};

    // 1. Populate all current opportunities
    opportunities.forEach((opp) => {
      const statusCat = getOpportunityStatusCategory(opp);
      map[opp.id] = {
        opportunity_id: opp.id,
        opportunity_title: opp.title,
        oppItem: opp,
        statusCategory: statusCat,
        total: 0,
        pending: 0,
        shortlisted: 0,
        accepted: 0,
        rejected: 0,
        selected: 0,
      };
    });

    // 2. Merge referral stats from backend
    opportunityStats.forEach((stat) => {
      const oppId = stat.opportunity_id;
      if (map[oppId]) {
        map[oppId].total = stat.total;
        map[oppId].pending = stat.pending;
        map[oppId].shortlisted = stat.shortlisted;
        map[oppId].accepted = stat.accepted;
        map[oppId].rejected = stat.rejected;
        map[oppId].selected = stat.selected || (stat.accepted + stat.shortlisted);
      } else {
        // Historical opportunity that is no longer in active opportunities feed
        map[oppId] = {
          opportunity_id: oppId,
          opportunity_title: stat.opportunity_title || 'Opportunity Project',
          oppItem: undefined,
          statusCategory: 'closed',
          total: stat.total,
          pending: stat.pending,
          shortlisted: stat.shortlisted,
          accepted: stat.accepted,
          rejected: stat.rejected,
          selected: stat.selected || (stat.accepted + stat.shortlisted),
        };
      }
    });

    return Object.values(map);
  }, [opportunities, opportunityStats]);

  // Filtered Project Cards
  const filteredProjectCards = useMemo(() => {
    return unifiedProjectCards.filter((card) => {
      if (projectStatusFilter === 'open' && card.statusCategory !== 'open') return false;
      if (projectStatusFilter === 'closed' && card.statusCategory !== 'closed') return false;
      if (projectStatusFilter === 'active_referrals' && card.total === 0) return false;

      const q = projectSearchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        card.opportunity_title.toLowerCase().includes(q) ||
        (card.oppItem?.partner_name || '').toLowerCase().includes(q) ||
        (card.oppItem?.description || '').toLowerCase().includes(q)
      );
    });
  }, [unifiedProjectCards, projectStatusFilter, projectSearchQuery]);

  // Project Modal Specific Referred Applicants List
  const modalProjectApplicants = useMemo(() => {
    if (!selectedProjectForModal) return [];
    return referredApplications.filter(
      (app) => app.opportunity_id === selectedProjectForModal.opportunity_id
    );
  }, [referredApplications, selectedProjectForModal]);

  // Filtered modal applicants
  const filteredModalApplicants = useMemo(() => {
    return modalProjectApplicants.filter((app) => {
      const s = (app.status || 'pending').toLowerCase();
      if (modalStatusFilter === 'pending' && s !== 'pending') return false;
      if (modalStatusFilter === 'selected' && s !== 'accepted' && s !== 'shortlisted') return false;
      if (modalStatusFilter === 'rejected' && s !== 'rejected') return false;

      const q = modalSearchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        (app.applicant_name || '').toLowerCase().includes(q) ||
        (app.applicant_id || '').toLowerCase().includes(q) ||
        (app.applicant_email || '').toLowerCase().includes(q) ||
        (app.applicant_phone || '').toLowerCase().includes(q) ||
        (app.opportunity_title || '').toLowerCase().includes(q)
      );
    });
  }, [modalProjectApplicants, modalStatusFilter, modalSearchQuery]);

  // Modal Summary Stats for the selected project
  const modalProjectStats = useMemo(() => {
    if (!selectedProjectForModal) {
      return { total: 0, applications: 0, selected: 0, pending: 0, rejected: 0 };
    }
    const apps = modalProjectApplicants;
    let pending = 0;
    let selected = 0;
    let rejected = 0;
    apps.forEach((a) => {
      const s = (a.status || 'pending').toLowerCase();
      if (s === 'accepted' || s === 'shortlisted') selected++;
      else if (s === 'rejected') rejected++;
      else pending++;
    });
    return {
      total: apps.length,
      applications: apps.length,
      selected,
      pending,
      rejected,
    };
  }, [selectedProjectForModal, modalProjectApplicants]);

  // ── Export Handlers (CSV, Excel, PDF) ──
  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!selectedProjectForModal) return;
    setIsExporting(true);
    setIsExportMenuOpen(false);

    try {
      const exportSummary: ReferralExportSummary = {
        opportunityTitle: selectedProjectForModal.opportunity_title,
        referrerName: talentProfile?.full_name || 'Zenemoo Contributor',
        referralCode: referralCode || 'ZEN-UNKNOWN',
        totalReferred: modalProjectStats.total,
        totalApplications: modalProjectStats.applications,
        selectedCount: modalProjectStats.selected,
        pendingCount: modalProjectStats.pending,
        rejectedCount: modalProjectStats.rejected,
        reportType: 'Project Referral Report',
        generatedAt: new Date().toLocaleString('en-IN'),
      };

      const exportApplicants: ReferralExportApplicant[] = filteredModalApplicants.map((app) => ({
        applicant_id: app.applicant_id || (app.id ? `APP-2026-${app.id.substring(0, 4)}` : '-'),
        applicant_name: app.applicant_name || '-',
        applicant_email: app.applicant_email || '-',
        applicant_phone: app.applicant_phone || '-',
        opportunity_title: app.opportunity_title || selectedProjectForModal.opportunity_title,
        status: app.status || 'pending',
        created_at: app.created_at,
        referral_code: app.referral_code || referralCode,
        referrer_name: talentProfile?.full_name || 'Zenemoo Contributor',
        referral_source: app.referral_source || 'talent_hub',
      }));

      const safeProjectName = selectedProjectForModal.opportunity_title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      const dateSlug = new Date().toISOString().slice(0, 10);

      if (format === 'csv') {
        const csvContent = generateReferralCSV(exportSummary, exportApplicants, false);
        downloadFile(csvContent, `Zenemoo_Referral_Report_${safeProjectName}_${dateSlug}.csv`, 'text/csv');
      } else if (format === 'xlsx') {
        const xlsxBuffer = await generateReferralXLSX(exportSummary, exportApplicants, false);
        downloadFile(xlsxBuffer, `Zenemoo_Referral_Report_${safeProjectName}_${dateSlug}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else if (format === 'pdf') {
        const pdfBuffer = await generateReferralPDF(exportSummary, exportApplicants, false);
        downloadFile(pdfBuffer, `Zenemoo_Referral_Report_${safeProjectName}_${dateSlug}.pdf`, 'application/pdf');
      }
    } catch (err) {
      console.error('[Export Error]:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12">
      {/* ── Top Hero: My Permanent Referral Identity ── */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#091224] via-[#0d1b38] to-[#12162b] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase">
              <Share2 className="w-3.5 h-3.5" />
              <span>Zenemoo Referral Program</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Refer Contributors & Track Projects
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Share active AI opportunities with your network using your permanent referral link. When candidates apply through your link, submissions are automatically recorded under your dashboard.
            </p>
          </div>

          {/* Referral Code Card */}
          <div className="shrink-0 bg-[#060a14]/90 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-3 min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                My Permanent Referral Code
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5">
              <span className="font-mono text-base sm:text-lg font-extrabold tracking-wider text-cyan-300 select-all">
                {referralCode || 'ZEN-LOADING'}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                title="Copy Referral Code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{copiedCode ? '✓ Code copied to clipboard!' : 'Permanent talent identity'}</span>
              <button
                onClick={() => fetchReferralData(true)}
                disabled={isLoading}
                className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-[#090e1c]/80 border border-white/10 p-4 sm:p-5 space-y-1 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 font-medium">Total Referred</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-display">{stats.total}</div>
          <p className="text-[10px] font-mono text-slate-500">All referred candidates</p>
        </div>

        <div className="rounded-2xl bg-[#090e1c]/80 border border-white/10 p-4 sm:p-5 space-y-1 relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 font-medium">Applications</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-display">{stats.applications}</div>
          <p className="text-[10px] font-mono text-blue-400/80">Submitted successfully</p>
        </div>

        <div className="rounded-2xl bg-[#090e1c]/80 border border-white/10 p-4 sm:p-5 space-y-1 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 font-medium">Selected / Hired</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-display">
            {stats.selected || (stats.accepted + stats.shortlisted)}
          </div>
          <p className="text-[10px] font-mono text-emerald-400/80">Accepted & Shortlisted</p>
        </div>

        <div className="rounded-2xl bg-[#090e1c]/80 border border-white/10 p-4 sm:p-5 space-y-1 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 font-medium">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-display">{stats.pending}</div>
          <p className="text-[10px] font-mono text-amber-400/80">Under review by team</p>
        </div>

        <div className="rounded-2xl bg-[#090e1c]/80 border border-white/10 p-4 sm:p-5 space-y-1 relative overflow-hidden group hover:border-rose-500/40 transition-all col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 font-medium">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-300 font-display">{stats.rejected}</div>
          <p className="text-[10px] font-mono text-slate-500">Not selected</p>
        </div>
      </div>

      {/* ── Project-Wise Opportunity Referral Cards Section ── */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-cyan-400" />
              Project-Wise Referral Hub
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Select any project to view specific candidates, share links, and export reports
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-40 sm:w-48 font-sans"
              />
            </div>

            <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/10 text-xs">
              <button
                onClick={() => setProjectStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
                  projectStatusFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({unifiedProjectCards.length})
              </button>
              <button
                onClick={() => setProjectStatusFilter('open')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
                  projectStatusFilter === 'open' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setProjectStatusFilter('active_referrals')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
                  projectStatusFilter === 'active_referrals' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                My Referrals
              </button>
            </div>
          </div>
        </div>

        {/* Project Cards Grid */}
        {filteredProjectCards.length === 0 ? (
          <div className="text-center py-12 rounded-3xl bg-white/[0.02] border border-white/10 p-8 space-y-3">
            <Briefcase className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-white font-display">No opportunities found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
              {projectSearchQuery
                ? 'No project titles match your search criteria. Try a different keyword.'
                : 'No active opportunities are currently accepting referrals.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredProjectCards.map((project) => {
              const isOpen = project.statusCategory === 'open';
              const isComingSoon = project.statusCategory === 'coming_soon';
              const referralUrl = getOpportunityReferralUrl(project.opportunity_id);

              return (
                <div
                  key={project.opportunity_id}
                  className="rounded-2xl bg-[#080d19]/90 border border-white/10 hover:border-cyan-500/40 p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between gap-5 group shadow-lg"
                >
                  <div className="space-y-3">
                    {/* Header: Title & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                          Opportunity Project
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-white font-display line-clamp-1 group-hover:text-cyan-300 transition-colors">
                          {project.opportunity_title}
                        </h3>
                      </div>

                      {/* Status Badge */}
                      {isOpen ? (
                        <span className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Accepting Applications
                        </span>
                      ) : isComingSoon ? (
                        <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                          Not Open Yet
                        </span>
                      ) : (
                        <span className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                          Closed
                        </span>
                      )}
                    </div>

                    {/* Project Referral Metrics */}
                    <div className="grid grid-cols-4 gap-2 py-3 px-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">Referred</span>
                        <span className="text-sm sm:text-base font-extrabold text-white font-mono">{project.total}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">Applied</span>
                        <span className="text-sm sm:text-base font-extrabold text-blue-300 font-mono">{project.total}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">Selected</span>
                        <span className="text-sm sm:text-base font-extrabold text-emerald-300 font-mono">{project.selected}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">Pending</span>
                        <span className="text-sm sm:text-base font-extrabold text-amber-300 font-mono">{project.pending}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    {/* Sharing Actions: Enabled only when Open */}
                    {isOpen ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyLink(project.opportunity_id)}
                            className="flex-1 py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 text-xs font-mono font-bold border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            {copiedOppId === project.opportunity_id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied Link!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleWhatsAppShare(project.opportunity_title, project.opportunity_id)}
                            className="py-2 px-3 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-xs font-mono font-bold border border-[#25D366]/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            title="Share on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          <button
                            onClick={() => handleNativeShare(project.opportunity_title, project.opportunity_id)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                            title="Share link"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{isComingSoon ? 'Sharing unavailable (Upcoming)' : 'Sharing unavailable (Closed)'}</span>
                        </span>
                        <span className="text-[10px] text-slate-600">Past data preserved</span>
                      </div>
                    )}

                    {/* View Project Referrals Button */}
                    <button
                      onClick={() => {
                        setSelectedProjectForModal({
                          opportunity_id: project.opportunity_id,
                          opportunity_title: project.opportunity_title,
                          oppItem: project.oppItem,
                        });
                        setModalSearchQuery('');
                        setModalStatusFilter('all');
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold border border-white/10 hover:border-cyan-500/40 flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        <span>View Project Referrals ({project.total})</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal 1: Project Referral Details Modal / Drawer ── */}
      <AnimatePresence>
        {selectedProjectForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setSelectedProjectForModal(null)}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-[#080d19]/98 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden z-10 my-6 flex flex-col font-sans max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-[#080d19]/95 px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="space-y-0.5 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                      Project Referral Details
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Code: {referralCode}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white font-display truncate">
                    {selectedProjectForModal.opportunity_title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Export Button & Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                      disabled={isExporting || filteredModalApplicants.length === 0}
                      className="py-1.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
                      <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    <AnimatePresence>
                      {isExportMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setIsExportMenuOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                            className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#0a0f1d] border border-cyan-500/40 shadow-2xl p-1.5 z-30 space-y-1 text-xs font-mono"
                          >
                            <button
                              onClick={() => handleExport('pdf')}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-400" />
                              <span>PDF Report</span>
                            </button>
                            <button
                              onClick={() => handleExport('xlsx')}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Excel (.xlsx)</span>
                            </button>
                            <button
                              onClick={() => handleExport('csv')}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                            >
                              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                              <span>CSV File</span>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={() => setSelectedProjectForModal(null)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 overflow-y-auto">
                {/* Project Specific Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <span className="text-[10px] font-mono text-slate-400 block">Total Referred</span>
                    <span className="text-xl font-extrabold text-white font-mono">{modalProjectStats.total}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <span className="text-[10px] font-mono text-slate-400 block">Applications</span>
                    <span className="text-xl font-extrabold text-blue-300 font-mono">{modalProjectStats.applications}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <span className="text-[10px] font-mono text-slate-400 block">Selected</span>
                    <span className="text-xl font-extrabold text-emerald-300 font-mono">{modalProjectStats.selected}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <span className="text-[10px] font-mono text-slate-400 block">Pending</span>
                    <span className="text-xl font-extrabold text-amber-300 font-mono">{modalProjectStats.pending}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-mono text-slate-400 block">Rejected</span>
                    <span className="text-xl font-extrabold text-rose-300 font-mono">{modalProjectStats.rejected}</span>
                  </div>
                </div>

                {/* Search & Status Filter for Candidates */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      placeholder="Search applicant name or ID..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-mono">
                    <button
                      onClick={() => setModalStatusFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        modalStatusFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({modalProjectApplicants.length})
                    </button>
                    <button
                      onClick={() => setModalStatusFilter('pending')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        modalStatusFilter === 'pending' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setModalStatusFilter('selected')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        modalStatusFilter === 'selected' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Selected
                    </button>
                  </div>
                </div>

                {/* Candidate List Table with Application ID */}
                {filteredModalApplicants.length === 0 ? (
                  <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-2">
                    <Users className="w-7 h-7 text-slate-500 mx-auto" />
                    <p className="text-xs font-bold text-white">No referred candidates found for this project</p>
                    <p className="text-[11px] text-slate-400 font-mono max-w-sm mx-auto">
                      {modalSearchQuery
                        ? 'No applicants match your search filter.'
                        : 'When candidates apply with your referral link, they will appear here.'}
                    </p>
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-white/5 border-b border-white/10 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Application ID</th>
                            <th className="py-3 px-4">Applicant</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Applied Date</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200">
                          {filteredModalApplicants.map((app) => {
                            const badge = getStatusBadge(app.status);
                            const BadgeIcon = badge.icon;
                            const appId = app.applicant_id || (app.id ? `APP-2026-${app.id.substring(0, 4)}` : 'APP-RECORD');
                            const isCopied = copiedAppId === appId;
                            const formattedDate = app.created_at
                              ? new Date(app.created_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Recent';

                            return (
                              <tr
                                key={app.id}
                                onClick={() => setSelectedCandidateDetail(app)}
                                className="hover:bg-white/5 transition-colors cursor-pointer group"
                              >
                                <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                                  <div className="inline-flex items-center gap-1.5">
                                    <span className="tracking-wide select-all">{appId}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyAppId(appId);
                                      }}
                                      className="p-1 rounded-md bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition-colors"
                                      title="Copy Application ID"
                                    >
                                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
                                      {app.applicant_name ? app.applicant_name.charAt(0).toUpperCase() : 'C'}
                                    </div>
                                    <span className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                                      {app.applicant_name || 'Candidate'}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${badge.badgeClass}`}
                                  >
                                    <BadgeIcon className="w-3 h-3" />
                                    <span>{badge.label}</span>
                                  </span>
                                </td>

                                <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                                  {formattedDate}
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCandidateDetail(app);
                                    }}
                                    className="p-1.5 rounded-lg bg-white/5 group-hover:bg-cyan-500/20 text-slate-400 group-hover:text-cyan-300 transition-colors cursor-pointer"
                                    title="View Application Details"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal 2: Authorized Candidate Detail View ── */}
      <AnimatePresence>
        {selectedCandidateDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setSelectedCandidateDetail(null)}
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
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
                    {selectedCandidateDetail.applicant_name ? selectedCandidateDetail.applicant_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-display">
                      {selectedCandidateDetail.applicant_name || 'Referred Candidate'}
                    </h3>
                    <p className="text-[10px] font-mono text-cyan-400">Referral Attribution Record</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCandidateDetail(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 text-xs font-sans">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                  {/* Application ID with Copy Action */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-400 font-mono">Application ID</span>
                    <div className="inline-flex items-center gap-2">
                      <span className="font-mono font-extrabold text-cyan-300 select-all">
                        {selectedCandidateDetail.applicant_id || (selectedCandidateDetail.id ? `APP-2026-${selectedCandidateDetail.id.substring(0, 4)}` : 'APP-RECORD')}
                      </span>
                      <button
                        onClick={() => handleCopyAppId(selectedCandidateDetail.applicant_id || (selectedCandidateDetail.id ? `APP-2026-${selectedCandidateDetail.id.substring(0, 4)}` : 'APP-RECORD'))}
                        className="py-1 px-2 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedAppId === (selectedCandidateDetail.applicant_id || `APP-2026-${selectedCandidateDetail.id.substring(0, 4)}`) ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy ID</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Applicant Name */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-400 font-mono">Applicant Name</span>
                    <span className="font-bold text-white">
                      {selectedCandidateDetail.applicant_name || '-'}
                    </span>
                  </div>

                  {/* Applicant Email (shown if present) */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-400 font-mono">Applicant Email</span>
                    <span className="font-mono text-slate-200">
                      {selectedCandidateDetail.applicant_email || '-'}
                    </span>
                  </div>

                  {/* Applicant Contact / Phone (shown if present) */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-400 font-mono">Contact / Phone</span>
                    <span className="font-mono text-slate-200">
                      {selectedCandidateDetail.applicant_phone || '-'}
                    </span>
                  </div>

                  {/* Opportunity */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-400 font-mono">Opportunity</span>
                    <span className="font-bold text-white text-right max-w-xs truncate">
                      {selectedCandidateDetail.opportunity_title}
                    </span>
                  </div>

                  {/* Application Status */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-400 font-mono">Application Status</span>
                    {(() => {
                      const badge = getStatusBadge(selectedCandidateDetail.status);
                      const BadgeIcon = badge.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${badge.badgeClass}`}>
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })()}
                  </div>

                  {/* Applied Date */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-400 font-mono">Applied Date</span>
                    <span className="font-mono text-slate-200">
                      {selectedCandidateDetail.created_at
                        ? new Date(selectedCandidateDetail.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </span>
                  </div>

                  {/* Referral Code */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-400 font-mono">Referral Code</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {selectedCandidateDetail.referral_code || referralCode || '-'}
                    </span>
                  </div>

                  {/* Referral Source */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono">Referral Source</span>
                    <span className="font-mono text-slate-300 uppercase text-[10px] px-2 py-0.5 rounded bg-white/5">
                      {selectedCandidateDetail.referral_source || 'talent_hub'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-start gap-2 text-[11px] text-slate-300 font-mono">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Referral Attribution Record: Application ID and submission details are verified by the Zenemoo Talent Network engine.
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
