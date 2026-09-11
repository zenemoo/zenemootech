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
  Building2,
  ChevronRight,
  HelpCircle,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTalentHubAuth, OpportunityItem } from './TalentHubAuthContext';
import { talentHubApi } from '../../services/talentHubApi';

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
  applicant_name: string;
  opportunity_id: string;
  opportunity_title: string;
  status: string;
  created_at: string;
}

export const TalentHubReferrals: React.FC = () => {
  const { talentProfile, token, opportunities } = useTalentHubAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReferralSummaryStats>({
    total: 0,
    applications: 0,
    selected: 0,
    accepted: 0,
    shortlisted: 0,
    pending: 0,
    rejected: 0,
  });
  const [opportunityStats, setOpportunityStats] = useState<OpportunityReferralStat[]>([]);
  const [referredApplications, setReferredApplications] = useState<ReferredApplicationItem[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOppId, setCopiedOppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'selected' | 'rejected'>('all');

  const referralCode = talentProfile?.registration_code || '';

  const fetchReferralData = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await talentHubApi.getReferrals(token);
      if (res && res.success) {
        setStats(res.stats || { total: 0, applications: 0, selected: 0, accepted: 0, shortlisted: 0, pending: 0, rejected: 0 });
        setOpportunityStats(res.opportunity_referrals || []);
        setReferredApplications(res.referred_applications || []);
      }
    } catch (err) {
      console.warn('[TalentHub Referrals Fetch Error]:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  // Construct absolute referral URL for an opportunity
  const getOpportunityReferralUrl = useCallback((oppId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.zenemoo.in';
    return `${origin}/opportunity/${oppId}?ref=${referralCode}`;
  }, [referralCode]);

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

  const handleWhatsAppShare = (opp: OpportunityItem) => {
    const url = getOpportunityReferralUrl(opp.id);
    const message = `Zenemoo has an opportunity you may be interested in: "${opp.title}".\n\nApply here with my referral link:\n${url}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async (opp: OpportunityItem) => {
    const url = getOpportunityReferralUrl(opp.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Zenemoo Opportunity: ${opp.title}`,
          text: `Apply for "${opp.title}" on Zenemoo AI Contributor Network:`,
          url,
        });
        return;
      } catch (_) {}
    }
    handleCopyLink(opp.id);
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

  // Filtered referred applications list
  const filteredReferredApps = useMemo(() => {
    return referredApplications.filter((app) => {
      const s = (app.status || 'pending').toLowerCase();
      if (statusFilter === 'pending' && s !== 'pending') return false;
      if (statusFilter === 'selected' && s !== 'accepted' && s !== 'shortlisted') return false;
      if (statusFilter === 'rejected' && s !== 'rejected') return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        (app.applicant_name || '').toLowerCase().includes(q) ||
        (app.opportunity_title || '').toLowerCase().includes(q)
      );
    });
  }, [referredApplications, statusFilter, searchQuery]);

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
              Refer Contributors & Track Applications
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Share active AI opportunities with your network using your personal referral link. When candidates apply through your link, their submissions are automatically attributed to your profile.
            </p>
          </div>

          {/* Referral Code Box */}
          <div className="bg-[#050814]/90 border border-cyan-400/40 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-2.5 min-w-[260px] sm:min-w-[300px]">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
              My Permanent Referral Code
            </span>
            <div className="flex items-center justify-between gap-3 bg-black/60 px-4 py-2.5 rounded-xl border border-white/10">
              <span className="text-base sm:text-lg font-mono font-extrabold text-cyan-300 tracking-wider">
                {referralCode || 'ZEN-TALENT'}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold border border-cyan-500/40 transition-all cursor-pointer active:scale-95"
                title="Copy Referral Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Permanent & locked to your verified profile</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Global Statistics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-5 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Total Referred</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-white">{stats.total}</div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Referred Applications</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Selected / Hired</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-300">{stats.selected}</div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Accepted & Shortlisted</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-amber-300">{stats.pending}</div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Under Evaluation</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-rose-300">{stats.rejected}</div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Not Selected</p>
          </div>
        </div>
      </div>

      {/* ── Section 1: Opportunity-Wise Referral Links ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-cyan-400" />
              Opportunity Referral Links
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Choose an opportunity below to copy your direct referral link or share directly to WhatsApp.
            </p>
          </div>
        </div>

        {opportunities.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#080d19]/80 border border-white/10 text-center text-slate-400 font-mono text-xs">
            No active opportunities available at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {opportunities.map((opp) => {
              const oppStat = opportunityStats.find((s) => s.opportunity_id === opp.id);
              const isCopied = copiedOppId === opp.id;
              const refUrl = getOpportunityReferralUrl(opp.id);

              return (
                <div
                  key={opp.id}
                  className="p-5 rounded-3xl bg-[#080d19]/90 border border-white/10 hover:border-cyan-500/40 shadow-xl flex flex-col justify-between space-y-4 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-medium text-slate-300 truncate">{opp.partner_name || 'Zenemoo AI Partner'}</span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-white font-display line-clamp-2">
                      {opp.title}
                    </h3>

                    {/* Stats Pill */}
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                        Referred: <strong className="text-white">{oppStat?.total || 0}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                        Selected: <strong>{oppStat?.selected || 0}</strong>
                      </span>
                    </div>

                    {/* Referral Link Preview */}
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-semibold">
                        Your Referral Link:
                      </span>
                      <div className="bg-black/60 px-3 py-2 rounded-xl border border-white/5 text-[11px] font-mono text-cyan-300 truncate select-all">
                        {refUrl}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleCopyLink(opp.id)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 text-xs font-mono font-bold border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                    </button>

                    <button
                      onClick={() => handleWhatsAppShare(opp)}
                      className="py-2.5 px-3.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-xs font-mono font-bold border border-[#25D366]/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title="Share to WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleNativeShare(opp)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                      title="Share via device options"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: Referred Candidates & Applications List ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Referred Candidate Applications
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Live status tracking of all candidates who submitted applications using your referral link.
            </p>
          </div>

          <button
            onClick={fetchReferralData}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono border border-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#080d19]/90 border border-white/10 p-3 rounded-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name or opportunity..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'selected', label: 'Selected' },
                { id: 'rejected', label: 'Rejected' },
              ] as const
            ).map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table / List View */}
        {isLoading ? (
          <div className="p-12 rounded-2xl bg-[#080d19]/80 border border-white/10 text-center text-slate-400 font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
            Loading referred applications...
          </div>
        ) : filteredReferredApps.length === 0 ? (
          <div className="p-10 rounded-3xl bg-[#080d19]/80 border border-white/10 text-center max-w-lg mx-auto shadow-xl space-y-3">
            <Users className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white font-display">No referred applications yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              {searchQuery
                ? 'No referred candidates match your current search.'
                : 'Share your opportunity referral links with colleagues, linguists, and contributors to start tracking applications here!'}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl bg-[#080d19]/90 border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">Candidate</th>
                    <th className="py-3.5 px-4 font-semibold">Opportunity</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Applied Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredReferredApps.map((app) => {
                    const statusConfig = getStatusBadge(app.status);
                    const StatusIcon = statusConfig.icon;
                    const dateFormatted = new Date(app.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{app.applicant_name}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-300 font-medium truncate max-w-xs">{app.opportunity_title}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${statusConfig.badgeClass}`}
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
