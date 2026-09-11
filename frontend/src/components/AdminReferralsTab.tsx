import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Share2,
  Search,
  Filter,
  RefreshCw,
  Trophy,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  TrendingUp,
  Download,
  Calendar,
  Briefcase,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  User,
  FileSpreadsheet,
  FileText,
  FileCode,
  Eye,
  Mail,
  Phone,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { CandidateApplication, getStoredCandidateApplications, updateCandidateApplicationStatus } from '../lib/opportunityApplicationStore';
import { OpportunityProgram, getStoredOpportunities } from '../lib/opportunityStore';
import {
  generateReferralCSV,
  generateReferralXLSX,
  generateReferralPDF,
  downloadFile,
  ReferralExportApplicant,
  ReferralExportSummary,
} from '../utils/referralExportUtils';

interface AdminReferralsTabProps {
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminReferralsTab: React.FC<AdminReferralsTabProps> = ({ showToast }) => {
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hierarchical Navigation State:
  // Level 1: null (Project Cards View)
  // Level 2: selectedProject (Referrers for that project)
  // Level 3: selectedReferrer (Applications for that referrer under that project)
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [selectedReferrer, setSelectedReferrer] = useState<{
    referrer_name: string;
    referral_code: string;
    referrer_email?: string;
  } | null>(null);

  const [selectedAppDetail, setSelectedAppDetail] = useState<CandidateApplication | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [apps, opps] = await Promise.all([
        getStoredCandidateApplications(),
        getStoredOpportunities(),
      ]);
      setApplications(apps || []);
      setOpportunities(opps || []);
    } catch (err) {
      console.error('[Admin Referrals Data Load Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter only applications that have referral attribution
  const referredApps = useMemo(() => {
    return applications.filter((app) => !!app.referral_code || !!app.referrer_name);
  }, [applications]);

  // Status Badge Helper
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
          label: 'Pending',
          badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          icon: Clock,
        };
    }
  };

  // ── Project-Level Aggregation ──
  const projectAggregations = useMemo(() => {
    const map: Record<
      string,
      {
        opportunity_id: string;
        opportunity_title: string;
        total: number;
        accepted: number;
        shortlisted: number;
        pending: number;
        rejected: number;
        selected: number;
        uniqueReferrers: Set<string>;
      }
    > = {};

    // Populate all opportunities from opportunity store
    opportunities.forEach((opp) => {
      map[opp.id] = {
        opportunity_id: opp.id,
        opportunity_title: opp.title,
        total: 0,
        accepted: 0,
        shortlisted: 0,
        pending: 0,
        rejected: 0,
        selected: 0,
        uniqueReferrers: new Set<string>(),
      };
    });

    // Populate referral data
    referredApps.forEach((app) => {
      const oppId = app.opportunity_id || 'general';
      if (!map[oppId]) {
        map[oppId] = {
          opportunity_id: oppId,
          opportunity_title: app.opportunity_title || 'Project Opportunity',
          total: 0,
          accepted: 0,
          shortlisted: 0,
          pending: 0,
          rejected: 0,
          selected: 0,
          uniqueReferrers: new Set<string>(),
        };
      }

      map[oppId].total++;
      const s = (app.status || 'pending').toLowerCase();
      if (s === 'accepted') map[oppId].accepted++;
      else if (s === 'shortlisted') map[oppId].shortlisted++;
      else if (s === 'rejected') map[oppId].rejected++;
      else map[oppId].pending++;

      map[oppId].selected = map[oppId].accepted + map[oppId].shortlisted;

      if (app.referral_code || app.referrer_name) {
        map[oppId].uniqueReferrers.add((app.referral_code || app.referrer_name || '').toUpperCase());
      }
    });

    return Object.values(map);
  }, [opportunities, referredApps]);

  // Filtered Project Aggregations
  const filteredProjects = useMemo(() => {
    return projectAggregations.filter((proj) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return proj.opportunity_title.toLowerCase().includes(q);
    });
  }, [projectAggregations, searchQuery]);

  // ── Referrers for the Currently Selected Project ──
  const projectReferrers = useMemo(() => {
    if (!selectedProject) return [];
    const map: Record<
      string,
      {
        referrer_name: string;
        referral_code: string;
        referrer_email?: string;
        total: number;
        accepted: number;
        shortlisted: number;
        pending: number;
        rejected: number;
        selected: number;
      }
    > = {};

    const appsForProj = referredApps.filter((a) => a.opportunity_id === selectedProject.id);

    appsForProj.forEach((app) => {
      const code = app.referral_code || 'ZEN-UNKNOWN';
      const name = app.referrer_name || 'Zenemoo Contributor';
      const key = code.toUpperCase();

      if (!map[key]) {
        map[key] = {
          referrer_name: name,
          referral_code: code,
          referrer_email: app.referrer_email || undefined,
          total: 0,
          accepted: 0,
          shortlisted: 0,
          pending: 0,
          rejected: 0,
          selected: 0,
        };
      }

      map[key].total++;
      const s = (app.status || 'pending').toLowerCase();
      if (s === 'accepted') map[key].accepted++;
      else if (s === 'shortlisted') map[key].shortlisted++;
      else if (s === 'rejected') map[key].rejected++;
      else map[key].pending++;

      map[key].selected = map[key].accepted + map[key].shortlisted;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [selectedProject, referredApps]);

  // Filtered Referrers for Project
  const filteredProjectReferrers = useMemo(() => {
    return projectReferrers.filter((ref) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        ref.referrer_name.toLowerCase().includes(q) ||
        ref.referral_code.toLowerCase().includes(q)
      );
    });
  }, [projectReferrers, searchQuery]);

  // ── Applications for Selected Referrer & Selected Project ──
  const referrerProjectApps = useMemo(() => {
    if (!selectedProject || !selectedReferrer) return [];
    return referredApps.filter((app) => {
      const matchProj = app.opportunity_id === selectedProject.id;
      const matchRef =
        (app.referral_code && app.referral_code.toUpperCase() === selectedReferrer.referral_code.toUpperCase()) ||
        (app.referrer_name && app.referrer_name.toLowerCase() === selectedReferrer.referrer_name.toLowerCase());
      return matchProj && matchRef;
    });
  }, [selectedProject, selectedReferrer, referredApps]);

  // Filtered Applications for Referrer
  const filteredReferrerApps = useMemo(() => {
    return referrerProjectApps.filter((app) => {
      if (statusFilter !== 'all' && (app.status || '').toLowerCase() !== statusFilter) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (app.applicant_name || '').toLowerCase().includes(q) ||
        (app.applicant_email || '').toLowerCase().includes(q) ||
        (app.applicant_phone || '').toLowerCase().includes(q) ||
        (app.applicant_id || '').toLowerCase().includes(q)
      );
    });
  }, [referrerProjectApps, statusFilter, searchQuery]);

  // Global Metrics
  const globalMetrics = useMemo(() => {
    const totalReferred = referredApps.length;
    const totalAll = applications.length;
    const selected = referredApps.filter(
      (a) => (a.status || '').toLowerCase() === 'accepted' || (a.status || '').toLowerCase() === 'shortlisted'
    ).length;
    const pending = referredApps.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
    const uniqueReferrers = new Set(referredApps.map((a) => (a.referral_code || a.referrer_name || '').toUpperCase())).size;

    return {
      totalReferred,
      totalAll,
      selected,
      pending,
      uniqueReferrers,
      sharePercent: totalAll > 0 ? Math.round((totalReferred / totalAll) * 100) : 0,
    };
  }, [referredApps, applications]);

  // ── Admin Export Handler ──
  const handleAdminExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setIsExporting(true);
    setIsExportMenuOpen(false);

    try {
      let exportSummary: ReferralExportSummary;
      let exportApplicants: ReferralExportApplicant[];
      let filenamePrefix = 'Zenemoo_Admin_Referral_Report';

      if (selectedReferrer && selectedProject) {
        // Referrer-level report
        exportSummary = {
          opportunityTitle: selectedProject.title,
          referrerName: selectedReferrer.referrer_name,
          referralCode: selectedReferrer.referral_code,
          totalReferred: referrerProjectApps.length,
          totalApplications: referrerProjectApps.length,
          selectedCount: referrerProjectApps.filter((a) => (a.status || '').toLowerCase() === 'accepted' || (a.status || '').toLowerCase() === 'shortlisted').length,
          pendingCount: referrerProjectApps.filter((a) => (a.status || '').toLowerCase() === 'pending').length,
          rejectedCount: referrerProjectApps.filter((a) => (a.status || '').toLowerCase() === 'rejected').length,
          reportType: 'Referrer Report',
          generatedAt: new Date().toLocaleString('en-IN'),
        };
        exportApplicants = filteredReferrerApps.map((a) => ({
          applicant_name: a.applicant_name,
          opportunity_title: a.opportunity_title || selectedProject.title,
          status: a.status || 'pending',
          created_at: a.created_at,
          referral_code: a.referral_code || selectedReferrer.referral_code,
          referrer_name: a.referrer_name || selectedReferrer.referrer_name,
          referral_source: a.referral_source || 'talent_hub',
          applicant_email: a.applicant_email,
          applicant_phone: a.applicant_phone,
        }));
        filenamePrefix = `Zenemoo_${selectedReferrer.referral_code}_${selectedProject.title.slice(0, 15)}`;
      } else if (selectedProject) {
        // Project-level report
        const projApps = referredApps.filter((a) => a.opportunity_id === selectedProject.id);
        exportSummary = {
          opportunityTitle: selectedProject.title,
          totalReferred: projApps.length,
          totalApplications: projApps.length,
          selectedCount: projApps.filter((a) => (a.status || '').toLowerCase() === 'accepted' || (a.status || '').toLowerCase() === 'shortlisted').length,
          pendingCount: projApps.filter((a) => (a.status || '').toLowerCase() === 'pending').length,
          rejectedCount: projApps.filter((a) => (a.status || '').toLowerCase() === 'rejected').length,
          reportType: 'Project Referral Report',
          generatedAt: new Date().toLocaleString('en-IN'),
        };
        exportApplicants = projApps.map((a) => ({
          applicant_name: a.applicant_name,
          opportunity_title: a.opportunity_title || selectedProject.title,
          status: a.status || 'pending',
          created_at: a.created_at,
          referral_code: a.referral_code,
          referrer_name: a.referrer_name,
          referral_source: a.referral_source || 'talent_hub',
          applicant_email: a.applicant_email,
          applicant_phone: a.applicant_phone,
        }));
        filenamePrefix = `Zenemoo_Project_${selectedProject.title.slice(0, 20)}`;
      } else {
        // Master report
        exportSummary = {
          opportunityTitle: 'All Opportunities & Projects',
          totalReferred: referredApps.length,
          totalApplications: referredApps.length,
          selectedCount: globalMetrics.selected,
          pendingCount: globalMetrics.pending,
          rejectedCount: referredApps.filter((a) => (a.status || '').toLowerCase() === 'rejected').length,
          reportType: 'Complete Referral Master Report',
          generatedAt: new Date().toLocaleString('en-IN'),
        };
        exportApplicants = referredApps.map((a) => ({
          applicant_name: a.applicant_name,
          opportunity_title: a.opportunity_title,
          status: a.status || 'pending',
          created_at: a.created_at,
          referral_code: a.referral_code,
          referrer_name: a.referrer_name,
          referral_source: a.referral_source || 'talent_hub',
          applicant_email: a.applicant_email,
          applicant_phone: a.applicant_phone,
        }));
        filenamePrefix = 'Zenemoo_Master_Referral_Report';
      }

      const cleanPrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateSlug = new Date().toISOString().slice(0, 10);

      if (format === 'csv') {
        const csvContent = generateReferralCSV(exportSummary, exportApplicants, true);
        downloadFile(csvContent, `${cleanPrefix}_${dateSlug}.csv`, 'text/csv');
      } else if (format === 'xlsx') {
        const xlsxBuffer = await generateReferralXLSX(exportSummary, exportApplicants, true);
        downloadFile(xlsxBuffer, `${cleanPrefix}_${dateSlug}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else if (format === 'pdf') {
        const pdfBuffer = await generateReferralPDF(exportSummary, exportApplicants, true);
        downloadFile(pdfBuffer, `${cleanPrefix}_${dateSlug}.pdf`, 'application/pdf');
      }

      if (showToast) showToast('Export Complete', `Generated ${format.toUpperCase()} report successfully`, 'success');
    } catch (err: any) {
      console.error('[Admin Export Error]:', err);
      if (showToast) showToast('Export Failed', err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── Top Header & Global Metrics ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
              Talent Referral Intelligence
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display mt-1">
            Talent Referrals Management
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Hierarchical project explorer: Projects → Referrers → Applications
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Data</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={isExporting || referredApps.length === 0}
              className="py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {isExportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsExportMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#0a0f1d] border border-cyan-500/40 shadow-2xl p-1.5 z-30 space-y-1 text-xs font-mono"
                  >
                    <button
                      onClick={() => handleAdminExport('pdf')}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>PDF Document</span>
                    </button>
                    <button
                      onClick={() => handleAdminExport('xlsx')}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => handleAdminExport('csv')}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>CSV Spreadsheet</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Global Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#090e1c]/80 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Total Referred</span>
          <span className="text-2xl font-extrabold text-white font-mono">{globalMetrics.totalReferred}</span>
          <span className="text-[10px] font-mono text-cyan-400 block">{globalMetrics.sharePercent}% of all candidates</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#090e1c]/80 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Active Referrers</span>
          <span className="text-2xl font-extrabold text-cyan-300 font-mono">{globalMetrics.uniqueReferrers}</span>
          <span className="text-[10px] font-mono text-slate-400 block">Talent members referring</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#090e1c]/80 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Selected / Hired</span>
          <span className="text-2xl font-extrabold text-emerald-300 font-mono">{globalMetrics.selected}</span>
          <span className="text-[10px] font-mono text-emerald-400/80 block">Accepted & Shortlisted</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#090e1c]/80 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Pending Review</span>
          <span className="text-2xl font-extrabold text-amber-300 font-mono">{globalMetrics.pending}</span>
          <span className="text-[10px] font-mono text-amber-400/80 block">Awaiting screening</span>
        </div>
      </div>

      {/* ── Breadcrumb & Filter Bar ── */}
      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Hierarchical Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => {
              setSelectedProject(null);
              setSelectedReferrer(null);
              setSearchQuery('');
            }}
            className={`font-bold transition-colors cursor-pointer ${
              !selectedProject ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Projects
          </button>

          {selectedProject && (
            <>
              <span className="text-slate-600">/</span>
              <button
                onClick={() => {
                  setSelectedReferrer(null);
                  setSearchQuery('');
                }}
                className={`font-bold transition-colors cursor-pointer truncate max-w-[180px] ${
                  !selectedReferrer ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                {selectedProject.title}
              </button>
            </>
          )}

          {selectedReferrer && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-300 font-bold truncate max-w-[160px]">
                {selectedReferrer.referrer_name} ({selectedReferrer.referral_code})
              </span>
            </>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              selectedReferrer
                ? 'Search applicant name/email...'
                : selectedProject
                ? 'Search referrer name/code...'
                : 'Search project title...'
            }
            className="pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-full sm:w-60 font-sans"
          />
        </div>
      </div>

      {/* ── LEVEL 1: PROJECT CARDS VIEW (Default) ── */}
      {!selectedProject && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">
              Opportunities & Projects ({filteredProjects.length})
            </h2>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-2">
              <Briefcase className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-xs font-bold text-white">No projects found</p>
              <p className="text-[11px] text-slate-400 font-mono">
                {searchQuery ? 'Try another search keyword.' : 'No opportunities recorded in database.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((proj) => (
                <div
                  key={proj.opportunity_id}
                  onClick={() => {
                    setSelectedProject({ id: proj.opportunity_id, title: proj.opportunity_title });
                    setSearchQuery('');
                  }}
                  className="rounded-2xl bg-[#080d19]/90 border border-white/10 hover:border-cyan-500/40 p-5 space-y-4 transition-all duration-200 cursor-pointer group shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                      Opportunity Project
                    </span>
                    <h3 className="text-base font-bold text-white font-display line-clamp-1 group-hover:text-cyan-300 transition-colors">
                      {proj.opportunity_title}
                    </h3>

                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 block">Referred</span>
                        <span className="text-sm font-extrabold text-white font-mono">{proj.total}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 block">Selected</span>
                        <span className="text-sm font-extrabold text-emerald-300 font-mono">{proj.selected}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 block">Referrers</span>
                        <span className="text-sm font-extrabold text-cyan-300 font-mono">{proj.uniqueReferrers.size}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-mono font-bold text-cyan-400 group-hover:text-cyan-300">
                    <span>View Referrers</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LEVEL 2: REFERRERS FOR SELECTED PROJECT ── */}
      {selectedProject && !selectedReferrer && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white font-display">
                Referrers for: {selectedProject.title}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Click a referrer to inspect all candidates attributed to them
              </p>
            </div>

            <button
              onClick={() => setSelectedProject(null)}
              className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Projects</span>
            </button>
          </div>

          {filteredProjectReferrers.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-2">
              <Users className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-xs font-bold text-white">No referrers for this project yet</p>
              <p className="text-[11px] text-slate-400 font-mono">
                When contributors share their referral links for this project, they will appear here.
              </p>
            </div>
          ) : (
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-white/5 border-b border-white/10 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Referrer Name</th>
                      <th className="py-3 px-4">Referral Code</th>
                      <th className="py-3 px-4 text-center">Total Referred</th>
                      <th className="py-3 px-4 text-center">Selected</th>
                      <th className="py-3 px-4 text-center">Pending</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {filteredProjectReferrers.map((ref) => (
                      <tr
                        key={ref.referral_code}
                        onClick={() => {
                          setSelectedReferrer({
                            referrer_name: ref.referrer_name,
                            referral_code: ref.referral_code,
                            referrer_email: ref.referrer_email,
                          });
                          setSearchQuery('');
                        }}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-white group-hover:text-cyan-300">
                          {ref.referrer_name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-300 font-bold">
                          {ref.referral_code}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                          {ref.total}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-300">
                          {ref.selected}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-300">
                          {ref.pending}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button className="py-1 px-3 rounded-lg bg-cyan-500/15 group-hover:bg-cyan-500/25 text-cyan-300 font-mono text-xs font-bold inline-flex items-center gap-1 cursor-pointer">
                            <span>View Applications</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LEVEL 3: APPLICATIONS FOR SELECTED REFERRER ── */}
      {selectedProject && selectedReferrer && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  Referrer: {selectedReferrer.referrer_name} ({selectedReferrer.referral_code})
                </span>
              </div>
              <h2 className="text-base font-bold text-white font-display mt-0.5">
                Referred Candidates for {selectedProject.title} ({filteredReferrerApps.length})
              </h2>
            </div>

            <button
              onClick={() => setSelectedReferrer(null)}
              className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Referrers</span>
            </button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-mono max-w-fit">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({referrerProjectApps.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'pending' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('shortlisted')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'shortlisted' ? 'bg-blue-500/20 text-blue-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Shortlisted
            </button>
            <button
              onClick={() => setStatusFilter('accepted')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'accepted' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Accepted
            </button>
          </div>

          {/* Applications Table */}
          {filteredReferrerApps.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-2">
              <Users className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-xs font-bold text-white">No applications match the active filter</p>
            </div>
          ) : (
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-white/5 border-b border-white/10 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Applicant Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Applied Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {filteredReferrerApps.map((app) => {
                      const badge = getStatusBadge(app.status || 'pending');
                      const BadgeIcon = badge.icon;
                      const formattedDate = app.created_at
                        ? new Date(app.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'N/A';

                      return (
                        <tr
                          key={app.id}
                          onClick={() => setSelectedAppDetail(app)}
                          className="hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-semibold text-white group-hover:text-cyan-300">
                            {app.applicant_name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                            {app.applicant_email}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                            {app.applicant_phone}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${badge.badgeClass}`}
                            >
                              <BadgeIcon className="w-3 h-3" />
                              <span>{badge.label}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {formattedDate}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button className="p-1.5 rounded-lg bg-white/5 group-hover:bg-cyan-500/20 text-slate-400 group-hover:text-cyan-300 transition-colors cursor-pointer">
                              <Eye className="w-4 h-4" />
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
      )}

      {/* ── Admin Application Detail Drawer ── */}
      <AnimatePresence>
        {selectedAppDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setSelectedAppDetail(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-[#080d19]/98 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden z-10 my-6 flex flex-col font-sans max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-[#080d19]/95 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
                    {selectedAppDetail.applicant_name ? selectedAppDetail.applicant_name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-display">
                      {selectedAppDetail.applicant_name}
                    </h3>
                    <p className="text-[10px] font-mono text-cyan-400">Application #{selectedAppDetail.applicant_id || selectedAppDetail.id.slice(0, 8)}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAppDetail(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 text-xs font-sans overflow-y-auto">
                {/* Referrer Attribution Banner */}
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold">Referral Attribution</span>
                    <span className="font-mono text-[10px] text-cyan-400 uppercase">{selectedAppDetail.referral_source || 'talent_hub'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-mono">Referred By:</span>
                    <span className="font-bold text-white">{selectedAppDetail.referrer_name || 'Zenemoo Contributor'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-mono">Referral Code:</span>
                    <span className="font-mono font-bold text-cyan-300">{selectedAppDetail.referral_code || 'N/A'}</span>
                  </div>
                </div>

                {/* Candidate Info Grid */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400 font-mono">Opportunity:</span>
                    <span className="font-bold text-white text-right">{selectedAppDetail.opportunity_title}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400 font-mono">Email:</span>
                    <span className="font-mono text-slate-200">{selectedAppDetail.applicant_email}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400 font-mono">Phone:</span>
                    <span className="font-mono text-slate-200">{selectedAppDetail.applicant_phone}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400 font-mono">Application Status:</span>
                    <span className="font-mono font-bold text-cyan-300 uppercase">{selectedAppDetail.status || 'pending'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono">Submitted At:</span>
                    <span className="font-mono text-slate-200">
                      {selectedAppDetail.created_at
                        ? new Date(selectedAppDetail.created_at).toLocaleString('en-IN')
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Custom Answers If Present */}
                {selectedAppDetail.answers && Object.keys(selectedAppDetail.answers).length > 0 && (
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Application Question Answers</span>
                    <div className="space-y-2 pt-1">
                      {Object.entries(selectedAppDetail.answers).map(([key, val]) => (
                        <div key={key} className="bg-black/30 p-2.5 rounded-xl border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-cyan-400 font-mono block">{key}</span>
                          <span className="text-slate-200 font-sans block">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
