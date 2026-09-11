import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { CandidateApplication, getStoredCandidateApplications } from '../lib/opportunityApplicationStore';
import { OpportunityProgram, getStoredOpportunities } from '../lib/opportunityStore';
import { ExportButton } from './ExportButton';

interface AdminReferralsTabProps {
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminReferralsTab: React.FC<AdminReferralsTabProps> = ({ showToast }) => {
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOppId, setSelectedOppId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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

  // Filter only applications that have referral attribution (or all for analysis)
  const referredApps = useMemo(() => {
    return applications.filter((app) => !!app.referral_code || !!app.referrer_name);
  }, [applications]);

  // Top Referrers Leaderboard Aggregation
  const topReferrers = useMemo(() => {
    const map: Record<
      string,
      {
        referrer_name: string;
        referral_code: string;
        total: number;
        accepted: number;
        shortlisted: number;
        pending: number;
        rejected: number;
      }
    > = {};

    referredApps.forEach((app) => {
      const code = app.referral_code || 'ZEN-UNKNOWN';
      const name = app.referrer_name || 'Zenemoo Contributor';
      const key = code.toUpperCase();

      if (!map[key]) {
        map[key] = {
          referrer_name: name,
          referral_code: code,
          total: 0,
          accepted: 0,
          shortlisted: 0,
          pending: 0,
          rejected: 0,
        };
      }

      map[key].total++;
      const s = (app.status || 'pending').toLowerCase();
      if (s === 'accepted') map[key].accepted++;
      else if (s === 'shortlisted') map[key].shortlisted++;
      else if (s === 'rejected') map[key].rejected++;
      else map[key].pending++;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [referredApps]);

  // Computed Overview Metrics
  const metrics = useMemo(() => {
    const totalReferred = referredApps.length;
    const totalAll = applications.length;
    const acceptedReferred = referredApps.filter((a) => (a.status || '').toLowerCase() === 'accepted').length;
    const shortlistedReferred = referredApps.filter((a) => (a.status || '').toLowerCase() === 'shortlisted').length;
    const selectedReferred = acceptedReferred + shortlistedReferred;
    const pendingReferred = referredApps.filter((a) => (a.status || '').toLowerCase() === 'pending').length;

    const referralSharePercent = totalAll > 0 ? Math.round((totalReferred / totalAll) * 100) : 0;
    const conversionRate = totalReferred > 0 ? Math.round((selectedReferred / totalReferred) * 100) : 0;

    return {
      totalReferred,
      totalAll,
      selectedReferred,
      pendingReferred,
      referralSharePercent,
      conversionRate,
      uniqueReferrersCount: topReferrers.length,
    };
  }, [referredApps, applications, topReferrers]);

  // Filtered List for Table
  const filteredList = useMemo(() => {
    return referredApps.filter((app) => {
      if (selectedOppId !== 'all' && app.opportunity_id !== selectedOppId) {
        return false;
      }

      if (statusFilter !== 'all' && (app.status || '').toLowerCase() !== statusFilter) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const applicant = (app.applicant_name || '').toLowerCase();
      const oppTitle = (app.opportunity_title || '').toLowerCase();
      const refCode = (app.referral_code || '').toLowerCase();
      const refName = (app.referrer_name || '').toLowerCase();
      const appId = (app.applicant_id || '').toLowerCase();

      return (
        applicant.includes(q) ||
        oppTitle.includes(q) ||
        refCode.includes(q) ||
        refName.includes(q) ||
        appId.includes(q)
      );
    });
  }, [referredApps, selectedOppId, statusFilter, searchQuery]);

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'accepted':
        return {
          label: 'Accepted',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: CheckCircle2,
        };
      case 'shortlisted':
        return {
          label: 'Shortlisted',
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          icon: Sparkles,
        };
      case 'rejected':
        return {
          label: 'Rejected',
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          icon: XCircle,
        };
      case 'pending':
      default:
        return {
          label: 'Pending',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: Clock,
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Share2 className="w-3.5 h-3.5" />
            <span>Referral Attribution &amp; Analytics</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">Talent Referral Management</h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Monitor incoming candidate applications referred by verified Zenemoo contributors.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-5 rounded-2xl bg-[#0d121f] border border-cyan-500/20 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Total Referred Apps</span>
            <Share2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-white">{metrics.totalReferred}</div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              {metrics.referralSharePercent}% of all applications ({metrics.totalAll})
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0d121f] border border-emerald-500/20 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Selected / Hired</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-300">
              {metrics.selectedReferred}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Conversion: {metrics.conversionRate}%</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0d121f] border border-amber-500/20 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-amber-300">
              {metrics.pendingReferred}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Awaiting administrative decision</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0d121f] border border-purple-500/20 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Active Referrers</span>
            <Trophy className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-purple-300">
              {metrics.uniqueReferrersCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Contributors generating referrals</p>
          </div>
        </div>
      </div>

      {/* ── Top Referrers Leaderboard ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Top Referrers Leaderboard
          </h3>
          <span className="text-xs font-mono text-slate-400">{topReferrers.length} Contributors Ranked</span>
        </div>

        {topReferrers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0d121f] border border-white/10 text-center text-slate-400 font-mono text-xs">
            No referral activity recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topReferrers.slice(0, 6).map((ref, idx) => (
              <div
                key={ref.referral_code}
                className="p-4 rounded-2xl bg-[#0d121f] border border-white/10 hover:border-cyan-500/40 shadow-lg flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
                      idx === 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : idx === 1
                        ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                        : idx === 2
                        ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-sans">{ref.referrer_name}</h4>
                    <span className="text-[11px] font-mono text-cyan-400">{ref.referral_code}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold font-display text-white">{ref.total}</div>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">{ref.accepted + ref.shortlisted} hired</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Referred Applications Search & Table ── */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0d121f] p-3.5 rounded-2xl border border-white/10">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, referrer, referral code, or opportunity..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Opportunity Selector */}
            <select
              value={selectedOppId}
              onChange={(e) => setSelectedOppId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Opportunities</option>
              {opportunities.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.title}
                </option>
              ))}
            </select>

            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Applications Table */}
        {isLoading ? (
          <div className="p-12 text-center rounded-2xl bg-[#0d121f] border border-white/10 text-slate-400 font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
            Loading referred applications...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#0d121f] border border-white/10 text-center text-slate-400 font-mono text-xs">
            No referred candidate applications found matching the selected filters.
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0d121f] border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">Applicant</th>
                    <th className="py-3.5 px-4 font-semibold">Opportunity</th>
                    <th className="py-3.5 px-4 font-semibold">Referrer</th>
                    <th className="py-3.5 px-4 font-semibold">Referral Code</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Applied Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredList.map((app) => {
                    const statusConfig = getStatusBadge(app.status);
                    const StatusIcon = statusConfig.icon;
                    const dateFormatted = app.created_at
                      ? new Date(app.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—';

                    return (
                      <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{app.applicant_name}</div>
                          <div className="text-cyan-300 font-mono text-[11px]">{app.applicant_email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-300 font-medium max-w-xs truncate">{app.opportunity_title}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-emerald-300 font-sans">{app.referrer_name || 'Zenemoo Contributor'}</div>
                          {app.referrer_email && (
                            <div className="text-[10px] font-mono text-slate-400">{app.referrer_email}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/30">
                            {app.referral_code || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${statusConfig.badgeClass}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusConfig.label}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                          {dateFormatted}
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
    </div>
  );
};
