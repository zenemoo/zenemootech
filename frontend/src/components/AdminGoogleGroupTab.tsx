import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  ArrowUpRight,
  ShieldCheck,
  Mail,
  Zap,
  Check,
  X,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  UserCheck,
  UserX,
  AlertTriangle,
  Download,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { googleGroupApi } from '../services/api';

interface GoogleGroupMember {
  id?: string | null;
  email: string;
  role: string;
  type?: string;
  status?: string;
  deliverySettings?: string;
  isSupabaseEligible?: boolean;
}

interface GoogleGroupExclusion {
  email: string;
  excludedAt?: string;
}

interface OverviewData {
  targetGroupEmail: string;
  connectionStatus: string;
  totalEligible: number;
  groupMemberCount: number;
  syncedCount: number;
  pendingSyncCount: number;
  excludedCount: number;
  eligibleExcludedCount?: number;
  externalMemberCount: number;
  sourceBreakdown?: Record<string, { totalProcessed: number; uniqueAdded: number }>;
  lastCheckTime?: string;
  appsScriptMessage?: string | null;
}

interface AdminGoogleGroupTabProps {
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm?: (
    title: string,
    message: string,
    onConfirm: () => void,
    opts?: { confirmText?: string; cancelText?: string; intent?: 'danger' | 'warning' | 'info' }
  ) => void;
}

export const AdminGoogleGroupTab: React.FC<AdminGoogleGroupTabProps> = ({ showToast, showConfirm }) => {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [members, setMembers] = useState<GoogleGroupMember[]>([]);
  const [exclusions, setExclusions] = useState<GoogleGroupExclusion[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'exclusions'>('members');

  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingExclusions, setIsLoadingExclusions] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [restoringEmail, setRestoringEmail] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState<'all' | 'synced' | 'external'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [searchExclusionsQuery, setSearchExclusionsQuery] = useState('');
  const [currentExclusionPage, setCurrentExclusionPage] = useState(1);
  const [exclusionPageSize, setExclusionPageSize] = useState(25);

  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Load Overview Metrics
  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingOverview(true);
    try {
      const res = await googleGroupApi.getOverview();
      if (res.data?.success) {
        setOverview(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load Google Group overview:', err.message);
      if (!silent && showToast) {
        showToast('Connection Warning', 'Unable to fetch Google Group metrics. Check Apps Script deployment.', 'warning');
      }
    } finally {
      if (!silent) setIsLoadingOverview(false);
    }
  }, [showToast]);

  // Load Member List
  const loadMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      const res = await googleGroupApi.getMembers();
      if (res.data?.success && Array.isArray(res.data.members)) {
        setMembers(res.data.members);
      }
    } catch (err: any) {
      console.warn('Failed to load Google Group members:', err.message);
      if (showToast) {
        showToast('Members Fetch Note', 'Could not retrieve live member list.', 'info');
      }
    } finally {
      setIsLoadingMembers(false);
    }
  }, [showToast]);

  // Load Exclusions List
  const loadExclusions = useCallback(async () => {
    setIsLoadingExclusions(true);
    try {
      const res = await googleGroupApi.getExclusions();
      if (res.data?.success && Array.isArray(res.data.exclusions)) {
        setExclusions(res.data.exclusions);
      }
    } catch (err: any) {
      console.warn('Failed to load Google Group exclusions:', err.message);
    } finally {
      setIsLoadingExclusions(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadMembers();
    loadExclusions();
  }, [loadOverview, loadMembers, loadExclusions]);

  // Copy helper
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
    if (showToast) showToast('Copied', `${email} copied to clipboard`, 'info');
  };

  // Trigger Differential Sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await googleGroupApi.triggerSync();
      const data = res.data;
      if (data?.success) {
        setLastSyncResult(data);
        setShowSyncModal(true);
        if (showToast) {
          showToast(
            'Sync Successful',
            `Added ${data.addedCount || 0} new member(s) to Google Group (${data.excludedCount || 0} excluded skipped).`,
            'success'
          );
        }
        await loadOverview(true);
        await loadMembers();
      } else {
        if (showToast) {
          showToast('Sync Incomplete', data?.message || 'Failed to complete synchronization.', 'error');
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      if (showToast) {
        showToast('Sync Failed', msg, 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Remove Single Member & Exclude Permanently
  const handleRemoveMember = (memberEmail: string) => {
    const confirmAction = async () => {
      try {
        const res = await googleGroupApi.removeMember(memberEmail);
        if (res.data?.success) {
          if (showToast) {
            showToast('Member Removed & Excluded', `${memberEmail} has been removed from the Google Group and excluded from automatic re-add.`, 'success');
          }
          setMembers((prev) => prev.filter((m) => m.email.toLowerCase() !== memberEmail.toLowerCase()));
          await Promise.all([loadOverview(true), loadExclusions()]);
        } else {
          if (showToast) {
            showToast('Remove Failed', res.data?.message || 'Could not remove member.', 'error');
          }
        }
      } catch (err: any) {
        if (showToast) {
          showToast('Error', err.response?.data?.message || err.message, 'error');
        }
      }
    };

    const confirmTitle = 'Remove member and prevent automatic re-add';
    const confirmMessage = `Remove this member from the Google Group?\n\nThis will also prevent automatic synchronization from adding this email (${memberEmail}) again.\n\nYou can restore automatic synchronization later.`;

    if (showConfirm) {
      showConfirm(
        confirmTitle,
        confirmMessage,
        confirmAction,
        {
          confirmText: 'Remove & Exclude',
          cancelText: 'Cancel',
          intent: 'danger',
        }
      );
    } else {
      if (window.confirm(`${confirmTitle}\n\n${confirmMessage}`)) {
        confirmAction();
      }
    }
  };

  // Restore Sync for Excluded Email
  const handleRestoreExclusion = (targetEmail: string) => {
    const performRestore = async () => {
      setRestoringEmail(targetEmail);
      try {
        const res = await googleGroupApi.restoreExclusion(targetEmail);
        if (res.data?.success) {
          if (showToast) {
            showToast(
              'Sync Restored',
              'Automatic sync restored. The member will be eligible to be added during the next synchronization.',
              'success'
            );
          }
          setExclusions((prev) => prev.filter((item) => item.email.toLowerCase() !== targetEmail.toLowerCase()));
          await loadOverview(true);
        } else {
          if (showToast) {
            showToast('Restore Failed', res.data?.message || 'Could not restore sync eligibility.', 'error');
          }
        }
      } catch (err: any) {
        if (showToast) {
          showToast('Error', err.response?.data?.message || err.message, 'error');
        }
      } finally {
        setRestoringEmail(null);
      }
    };

    const confirmTitle = 'Restore Automatic Sync Eligibility';
    const confirmMessage = `Restore automatic sync eligibility for "${targetEmail}"?\n\nThe email will be evaluated during the next synchronization run and added if eligible in Supabase.`;

    if (showConfirm) {
      showConfirm(
        confirmTitle,
        confirmMessage,
        performRestore,
        {
          confirmText: 'Restore Sync',
          cancelText: 'Cancel',
          intent: 'info',
        }
      );
    } else {
      if (window.confirm(`${confirmTitle}\n\n${confirmMessage}`)) {
        performRestore();
      }
    }
  };

  // Export Member List as CSV
  const handleExportCSV = () => {
    if (members.length === 0) return;
    const header = ['Email', 'Role', 'Status', 'In Supabase'];
    const rows = members.map((m) => [
      `"${m.email}"`,
      `"${m.role || 'MEMBER'}"`,
      `"${m.status || 'ACTIVE'}"`,
      `"${m.isSupabaseEligible ? 'Yes' : 'No'}"`,
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `zenemoo_googlegroup_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast('Export Complete', 'Downloaded Google Group member list CSV.', 'success');
  };

  // Filtered & Paginated Members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch = m.email.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchSearch) return false;

      if (originFilter === 'synced') return m.isSupabaseEligible === true;
      if (originFilter === 'external') return m.isSupabaseEligible === false;
      return true;
    });
  }, [members, searchQuery, originFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const paginatedMembers = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return filteredMembers.slice(from, from + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  // Filtered & Paginated Exclusions
  const filteredExclusions = useMemo(() => {
    return exclusions.filter((e) =>
      e.email.toLowerCase().includes(searchExclusionsQuery.toLowerCase().trim())
    );
  }, [exclusions, searchExclusionsQuery]);

  const totalExclusionPages = Math.max(1, Math.ceil(filteredExclusions.length / exclusionPageSize));
  const paginatedExclusions = useMemo(() => {
    const from = (currentExclusionPage - 1) * exclusionPageSize;
    return filteredExclusions.slice(from, from + exclusionPageSize);
  }, [filteredExclusions, currentExclusionPage, exclusionPageSize]);

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800/80 bg-gradient-to-br from-gray-900 via-gray-900/90 to-gray-950 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 via-orange-500/20 to-amber-500/20 text-orange-400 ring-1 ring-orange-500/30">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white md:text-2xl">Google Group Management</h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    overview?.connectionStatus === 'ONLINE'
                      ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                      : overview?.connectionStatus === 'NOT_CONFIGURED'
                      ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                      : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      overview?.connectionStatus === 'ONLINE'
                        ? 'bg-emerald-400 animate-pulse'
                        : overview?.connectionStatus === 'NOT_CONFIGURED'
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                  />
                  {overview?.connectionStatus || 'CONNECTING'}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                <span>Target:</span>
                <span className="font-mono text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                  {overview?.targetGroupEmail || 'zenemoocommunity@googlegroups.com'}
                </span>
                <a
                  href={`https://groups.google.com/g/${(overview?.targetGroupEmail || 'zenemoocommunity@googlegroups.com').split('@')[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-3 w-3" /> Open in Google
                </a>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                loadOverview();
                loadMembers();
                loadExclusions();
              }}
              disabled={isLoadingOverview || isLoadingMembers || isLoadingExclusions}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-2.5 text-xs font-medium text-gray-200 transition-all hover:border-gray-600 hover:bg-gray-700/80 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingOverview || isLoadingMembers || isLoadingExclusions ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={handleTriggerSync}
              disabled={isSyncing || overview?.pendingSyncCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 px-5 py-2.5 text-xs font-semibold text-gray-950 shadow-lg shadow-orange-500/20 transition-all hover:opacity-95 hover:shadow-orange-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className={`h-4 w-4 ${isSyncing ? 'animate-bounce' : ''}`} />
              {isSyncing ? 'Synchronizing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Eligible in Supabase */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Supabase Eligible</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400 ring-1 ring-blue-500/20">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {isLoadingOverview ? '—' : overview?.totalEligible ?? 0}
            </span>
            <span className="text-xs text-gray-400">records</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">8 Supabase sources</p>
        </div>

        {/* Card 2: Current Group Members */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Group Members</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 ring-1 ring-emerald-500/20">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {isLoadingOverview ? '—' : overview?.groupMemberCount ?? members.length}
            </span>
            <span className="text-xs text-emerald-400">in Google Group</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Live directory count</p>
        </div>

        {/* Card 3: Already Synced */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Already Synced</span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400 ring-1 ring-purple-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {isLoadingOverview ? '—' : overview?.syncedCount ?? 0}
            </span>
            <span className="text-xs text-purple-400">
              {overview?.totalEligible
                ? `${Math.round(((overview.syncedCount || 0) / overview.totalEligible) * 100)}%`
                : '0%'}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Present in Group</p>
        </div>

        {/* Card 4: Manually Excluded */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Excluded from Sync</span>
            <div className="rounded-lg bg-red-500/10 p-2 text-red-400 ring-1 ring-red-500/20">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-400">
              {isLoadingOverview ? '—' : overview?.excludedCount ?? exclusions.length}
            </span>
            <span className="text-xs text-red-400/80">blocked</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Never re-added automatically</p>
        </div>

        {/* Card 5: Pending Sync */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Pending Sync</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 ring-1 ring-amber-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">
              {isLoadingOverview ? '—' : overview?.pendingSyncCount ?? 0}
            </span>
            <span className="text-xs text-amber-400/80">to add</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Ready for next run</p>
        </div>
      </div>

      {/* 3. Source Breakdown Bar */}
      {overview?.sourceBreakdown && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-semibold text-gray-300">Supabase Data Sources Breakdown:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(overview.sourceBreakdown).map(([source, stats]) => (
              <div
                key={source}
                className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-950/60 px-3 py-1.5 text-xs text-gray-300"
              >
                <span className="font-medium capitalize text-gray-200">{source.replace(/_/g, ' ')}:</span>
                <span className="font-mono text-orange-400 font-semibold">{stats.totalProcessed}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Sub-Navigation Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition-all ${
            activeSubTab === 'members'
              ? 'border-orange-500 text-orange-400 bg-orange-500/5'
              : 'border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Active Members ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('exclusions')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition-all ${
            activeSubTab === 'exclusions'
              ? 'border-red-500 text-red-400 bg-red-500/5'
              : 'border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-200'
          }`}
        >
          <UserX className="h-4 w-4" />
          <span>Excluded from Sync ({exclusions.length})</span>
          {exclusions.length > 0 && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-300 font-mono">
              {exclusions.length}
            </span>
          )}
        </button>
      </div>

      {/* 5. Tab Content: Active Members */}
      {activeSubTab === 'members' && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 shadow-2xl backdrop-blur-xl">
          {/* Controls Bar */}
          <div className="border-b border-gray-800/80 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Input */}
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search members by email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950/70 pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills & Export */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl border border-gray-800 bg-gray-950/70 p-1">
                  <button
                    onClick={() => {
                      setOriginFilter('all');
                      setCurrentPage(1);
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                      originFilter === 'all'
                        ? 'bg-orange-500 text-gray-950 font-semibold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All ({members.length})
                  </button>
                  <button
                    onClick={() => {
                      setOriginFilter('synced');
                      setCurrentPage(1);
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                      originFilter === 'synced'
                        ? 'bg-orange-500 text-gray-950 font-semibold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    In Supabase
                  </button>
                  <button
                    onClick={() => {
                      setOriginFilter('external');
                      setCurrentPage(1);
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                      originFilter === 'external'
                        ? 'bg-orange-500 text-gray-950 font-semibold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    External Only
                  </button>
                </div>

                <button
                  onClick={handleExportCSV}
                  disabled={members.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-700 hover:text-white disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-gray-400" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-800 bg-gray-950/50 text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Member Email</th>
                  <th className="px-5 py-3 font-semibold">Group Role</th>
                  <th className="px-5 py-3 font-semibold">Supabase Status</th>
                  <th className="px-5 py-3 font-semibold">Delivery</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {isLoadingMembers ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
                        <span>Loading Google Group members...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-8 w-8 text-gray-600" />
                        <span className="font-medium text-gray-400">No members match your criteria</span>
                        <span className="text-xs text-gray-500">Try adjusting search or trigger a new sync run</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedMembers.map((m) => (
                    <tr key={m.email} className="transition-colors hover:bg-gray-800/30">
                      <td className="px-5 py-3 font-mono text-gray-200">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                          <span className="select-all font-medium text-white">{m.email}</span>
                          <button
                            onClick={() => handleCopyEmail(m.email)}
                            className="text-gray-500 hover:text-gray-300 transition-colors"
                            title="Copy email"
                          >
                            {copiedEmail === m.email ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                            m.role === 'OWNER'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : m.role === 'MANAGER'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {m.role || 'MEMBER'}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        {m.isSupabaseEligible ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> In Supabase
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                            External User
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-gray-400">
                        <span className="font-mono text-[11px] text-gray-400">{m.deliverySettings || 'ALL_MAIL'}</span>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleRemoveMember(m.email)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/20 active:scale-95"
                          title="Remove member and prevent automatic re-add"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove & Exclude
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-3 border-t border-gray-800 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-400">
            <div>
              Showing <span className="font-semibold text-white">{filteredMembers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
              <span className="font-semibold text-white">
                {Math.min(currentPage * pageSize, filteredMembers.length)}
              </span>{' '}
              of <span className="font-semibold text-white">{filteredMembers.length}</span> members
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-gray-300 focus:border-orange-500 focus:outline-none"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-medium text-gray-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab Content: Excluded from Sync */}
      {activeSubTab === 'exclusions' && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 shadow-2xl backdrop-blur-xl">
          {/* Controls Bar */}
          <div className="border-b border-gray-800/80 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search excluded emails..."
                  value={searchExclusionsQuery}
                  onChange={(e) => {
                    setSearchExclusionsQuery(e.target.value);
                    setCurrentExclusionPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950/70 pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                {searchExclusionsQuery && (
                  <button
                    onClick={() => setSearchExclusionsQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
                <span>Excluded emails are permanently skipped during automatic and manual synchronization.</span>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-800 bg-gray-950/50 text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Excluded Email</th>
                  <th className="px-5 py-3 font-semibold">Exclusion Date</th>
                  <th className="px-5 py-3 font-semibold">Sync Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {isLoadingExclusions ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-red-400" />
                        <span>Loading exclusion list...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedExclusions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UserCheck className="h-8 w-8 text-gray-600" />
                        <span className="font-medium text-gray-400">No excluded members found</span>
                        <span className="text-xs text-gray-500">
                          When members are removed by an admin, they appear here to prevent automatic re-adding.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedExclusions.map((e) => (
                    <tr key={e.email} className="transition-colors hover:bg-gray-800/30">
                      <td className="px-5 py-3 font-mono text-gray-200">
                        <div className="flex items-center gap-2">
                          <UserX className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          <span className="select-all font-medium text-white">{e.email}</span>
                          <button
                            onClick={() => handleCopyEmail(e.email)}
                            className="text-gray-500 hover:text-gray-300 transition-colors"
                            title="Copy email"
                          >
                            {copiedEmail === e.email ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-3 text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-500" />
                          <span>{formatDate(e.excludedAt)}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400 border border-red-500/20">
                          <ShieldCheck className="h-3 w-3" /> Excluded from Sync
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleRestoreExclusion(e.email)}
                          disabled={restoringEmail === e.email}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/20 active:scale-95 disabled:opacity-50"
                          title="Restore automatic sync eligibility"
                        >
                          <RotateCcw className={`h-3.5 w-3.5 ${restoringEmail === e.email ? 'animate-spin' : ''}`} />
                          {restoringEmail === e.email ? 'Restoring...' : 'Restore Sync'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-3 border-t border-gray-800 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-400">
            <div>
              Showing <span className="font-semibold text-white">{filteredExclusions.length > 0 ? (currentExclusionPage - 1) * exclusionPageSize + 1 : 0}</span> to{' '}
              <span className="font-semibold text-white">
                {Math.min(currentExclusionPage * exclusionPageSize, filteredExclusions.length)}
              </span>{' '}
              of <span className="font-semibold text-white">{filteredExclusions.length}</span> exclusions
            </div>

            <div className="flex items-center gap-2">
              <select
                value={exclusionPageSize}
                onChange={(e) => {
                  setExclusionPageSize(Number(e.target.value));
                  setCurrentExclusionPage(1);
                }}
                className="rounded-lg border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-gray-300 focus:border-red-500 focus:outline-none"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              <button
                onClick={() => setCurrentExclusionPage((p) => Math.max(1, p - 1))}
                disabled={currentExclusionPage === 1}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-medium text-gray-300">
                {currentExclusionPage} / {totalExclusionPages}
              </span>
              <button
                onClick={() => setCurrentExclusionPage((p) => Math.min(totalExclusionPages, p + 1))}
                disabled={currentExclusionPage >= totalExclusionPages}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Sync Summary Modal */}
      <AnimatePresence>
        {showSyncModal && lastSyncResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Synchronization Complete</h3>
                </div>
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between rounded-xl bg-gray-950 p-3">
                  <span className="text-gray-400">Newly Added Members:</span>
                  <span className="font-mono font-bold text-emerald-400">+{lastSyncResult.addedCount || 0}</span>
                </div>
                <div className="flex justify-between rounded-xl bg-gray-950 p-3">
                  <span className="text-gray-400">Excluded (Skipped):</span>
                  <span className="font-mono font-bold text-red-400">{lastSyncResult.excludedCount || 0}</span>
                </div>
                <div className="flex justify-between rounded-xl bg-gray-950 p-3">
                  <span className="text-gray-400">Already in Group (Skipped):</span>
                  <span className="font-mono font-bold text-gray-300">{lastSyncResult.skippedCount || 0}</span>
                </div>
                <div className="flex justify-between rounded-xl bg-gray-950 p-3">
                  <span className="text-gray-400">Failed Additions:</span>
                  <span className="font-mono font-bold text-red-400">{lastSyncResult.failedCount || 0}</span>
                </div>
              </div>

              {lastSyncResult.errors && lastSyncResult.errors.length > 0 && (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                  <span className="font-semibold">Errors during sync:</span>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    {lastSyncResult.errors.slice(0, 3).map((e: any, idx: number) => (
                      <li key={idx} className="font-mono">{e.email}: {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="w-full rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-gray-950 hover:bg-orange-400 transition-colors"
                >
                  Close Summary
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

