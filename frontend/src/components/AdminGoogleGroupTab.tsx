import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  RefreshCw,
  Search,
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
  Layers,
  Sparkles,
  UserCheck,
  UserX,
  AlertTriangle,
  Download,
  RotateCcw,
  ShieldAlert,
  Eye,
  User,
  ListChecks,
} from 'lucide-react';
import { googleGroupApi } from '../services/api';

interface PendingCandidate {
  email: string;
  sources: string[];
}

interface GoogleGroupMember {
  id?: string | null;
  email: string;
  role: string;
  type?: string;
  status?: string;
  deliverySettings?: string;
  isSupabaseEligible?: boolean;
  sources?: string[];
  isExcluded?: boolean;
  excludedAt?: string | null;
  joinedAt?: string | null;
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
  quotaExceeded?: boolean;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
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
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'members' | 'exclusions'>('pending');

  // Loading States
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingExclusions, setIsLoadingExclusions] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<any>(null);
  const syncPollIntervalRef = useRef<any>(null);
  const [restoringEmail, setRestoringEmail] = useState<string | null>(null);

  // Pending Candidates State (Server-Side Paginated - 10 per page)
  const [pendingCandidates, setPendingCandidates] = useState<PendingCandidate[]>([]);
  const [pendingPagination, setPendingPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [pendingSearch, setPendingSearch] = useState('');
  const [copiedBatch, setCopiedBatch] = useState(false);

  // Group Members State (Server-Side Paginated)
  const [members, setMembers] = useState<GoogleGroupMember[]>([]);
  const [membersPagination, setMembersPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [membersSearch, setMembersSearch] = useState('');
  const [originFilter, setOriginFilter] = useState<'all' | 'synced' | 'external'>('all');

  // Exclusions State
  const [exclusions, setExclusions] = useState<GoogleGroupExclusion[]>([]);
  const [exclusionsSearch, setExclusionsSearch] = useState('');
  const [exclusionPage, setExclusionPage] = useState(1);
  const [exclusionPageSize, setExclusionPageSize] = useState(10);

  // Copy & Modal States
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [detailsCopied, setDetailsCopied] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Member Details Modal State
  const [selectedMember, setSelectedMember] = useState<GoogleGroupMember | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Target group URL
  const targetGroupEmail = overview?.targetGroupEmail || 'zenemoocommunity@googlegroups.com';
  const groupUrlName = targetGroupEmail.split('@')[0];
  const googleGroupsDirectUrl = `https://groups.google.com/g/${groupUrlName}/members`;

  // 1. Load Overview Metrics
  const loadOverview = useCallback(async (silent = false, forceRefresh = false) => {
    if (!silent) setIsLoadingOverview(true);
    try {
      const res = await googleGroupApi.getOverview({ forceRefresh });
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

  // 2. Load Pending Candidates (Server-Side 10 per page)
  const loadPending = useCallback(async (pageToLoad = 1, forceRefresh = false, searchStr = '') => {
    setIsLoadingPending(true);
    try {
      const res = await googleGroupApi.getPendingMembers({
        page: pageToLoad,
        pageSize: 10,
        search: searchStr,
        forceRefresh,
      });
      if (res.data?.success) {
        setPendingCandidates(res.data.data || []);
        if (res.data.pagination) {
          setPendingPagination(res.data.pagination);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load pending members:', err.message);
    } finally {
      setIsLoadingPending(false);
    }
  }, []);

  // 3. Load Live Members (Server-Side Paginated)
  const loadMembers = useCallback(async (pageToLoad = 1, forceRefresh = false, searchStr = '', filterVal = originFilter) => {
    setIsLoadingMembers(true);
    try {
      const res = await googleGroupApi.getMembers({
        page: pageToLoad,
        pageSize: membersPagination.pageSize,
        search: searchStr,
        originFilter: filterVal,
        forceRefresh,
      });
      if (res.data?.success) {
        setMembers(res.data.members || []);
        if (res.data.pagination) {
          setMembersPagination(res.data.pagination);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load Google Group members:', err.message);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [originFilter, membersPagination.pageSize]);

  // 4. Load Exclusions List
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

  // 5. Global Refresh Action (Forces fresh read from Google Groups)
  const handleGlobalRefresh = async () => {
    if (showToast) {
      showToast('Refreshing Group', 'Fetching live membership and reconciling with Supabase...', 'info');
    }
    await Promise.all([
      loadOverview(false, true),
      loadPending(pendingPagination.page, true, pendingSearch),
      loadMembers(membersPagination.page, true, membersSearch, originFilter),
      loadExclusions(),
    ]);
    if (showToast) {
      showToast('Group Reconciled', 'Google Group membership & pending candidate list updated.', 'success');
    }
  };

  // Poll sync status
  const startPollingSync = useCallback(() => {
    if (syncPollIntervalRef.current) clearInterval(syncPollIntervalRef.current);
    setIsSyncing(true);

    syncPollIntervalRef.current = setInterval(async () => {
      try {
        const res = await googleGroupApi.getSyncStatus();
        const data = res.data;
        if (data?.success) {
          setSyncProgress(data);
          if (data.status === 'COMPLETED' || data.status === 'PARTIAL_SUCCESS') {
            clearInterval(syncPollIntervalRef.current);
            syncPollIntervalRef.current = null;
            setIsSyncing(false);
            setLastSyncResult(data);
            setShowSyncModal(true);
            if (showToast) {
              if (data.status === 'COMPLETED') {
                showToast(
                  'Sync Successful',
                  `Added ${data.addedCount || 0} new member(s) (${data.skippedCount || 0} skipped, ${data.remainingPending ?? 0} remaining pending).`,
                  'success'
                );
              } else {
                showToast(
                  'Sync Partial Success',
                  `Added ${data.addedCount || 0} member(s), but ${data.failedCount || 0} failed (${data.remainingPending ?? 0} remaining pending).`,
                  'warning'
                );
              }
            }
            await Promise.all([
              loadOverview(true, true),
              loadPending(1, true, pendingSearch),
              loadMembers(1, true, membersSearch, originFilter),
            ]);
          } else if (data.status === 'FAILED') {
            clearInterval(syncPollIntervalRef.current);
            syncPollIntervalRef.current = null;
            setIsSyncing(false);
            setLastSyncResult(data);
            setShowSyncModal(true);
            if (showToast) {
              showToast('Sync Notice', data.message || 'Synchronization encountered an issue.', 'error');
            }
            await loadOverview(true, true);
          }
        }
      } catch (err: any) {
        console.warn('Sync status poll error:', err.message);
      }
    }, 2000);
  }, [showToast, loadOverview, loadPending, loadMembers, pendingSearch, membersSearch, originFilter]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (syncPollIntervalRef.current) clearInterval(syncPollIntervalRef.current);
    };
  }, []);

  // Initial load
  useEffect(() => {
    loadOverview();
    loadPending(1);
    loadMembers(1);
    loadExclusions();

    googleGroupApi.getSyncStatus().then((res) => {
      if (res.data?.success && res.data.status === 'RUNNING') {
        setSyncProgress(res.data);
        startPollingSync();
      }
    }).catch(() => {});
  }, [loadOverview, loadPending, loadMembers, loadExclusions, startPollingSync]);

  // Keyboard shortcut: close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDetailsOpen) setIsDetailsOpen(false);
        if (showSyncModal) setShowSyncModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailsOpen, showSyncModal]);

  // Copy Single Email Helper
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
    if (showToast) showToast('Email copied', `${email} copied to clipboard`, 'info');
  };

  // Copy 10 Visible Pending Emails (Format: newline-separated plain emails only)
  const handleCopy10Emails = () => {
    if (pendingCandidates.length === 0) return;
    const cleanEmails = pendingCandidates.map((c) => c.email.trim()).filter(Boolean);
    const plainText = cleanEmails.join('\n');

    navigator.clipboard.writeText(plainText);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2500);

    if (showToast) {
      showToast(
        'Emails Copied',
        `✓ ${cleanEmails.length} email(s) copied. You can paste directly into Google Groups > Direct add members.`,
        'success'
      );
    }
  };

  // Trigger Differential Sync (Sync Page or Batch)
  const handleTriggerSync = async (specificEmails?: string[]) => {
    setIsSyncing(true);
    try {
      const payload: { limit?: number; emails?: string[] } = {};
      if (specificEmails && specificEmails.length > 0) {
        payload.emails = specificEmails;
        payload.limit = specificEmails.length;
      } else {
        payload.limit = 10;
      }

      const res = await googleGroupApi.triggerSync(payload);
      const data = res.data;
      if (data?.success) {
        if (showToast) {
          showToast('Sync Started', 'Background synchronization initiated in safe batches of 10.', 'info');
        }
        startPollingSync();
      } else {
        setIsSyncing(false);
        if (showToast) {
          showToast('Sync Error', data?.message || 'Could not start synchronization.', 'error');
        }
      }
    } catch (err: any) {
      setIsSyncing(false);
      const msg = err.response?.data?.message || err.message;
      if (showToast) {
        showToast('Sync Failed', msg, 'error');
      }
    }
  };

  // Remove Single Member & Exclude Permanently
  const handleRemoveMember = (memberEmail: string) => {
    const confirmAction = async () => {
      try {
        const res = await googleGroupApi.removeMember(memberEmail);
        if (res.data?.success) {
          if (showToast) {
            showToast('Member Removed & Excluded', `${memberEmail} removed from Google Group and excluded from automatic re-add.`, 'success');
          }
          await Promise.all([
            loadOverview(true, true),
            loadMembers(membersPagination.page, true, membersSearch, originFilter),
            loadExclusions(),
          ]);
          if (selectedMember && selectedMember.email.toLowerCase() === memberEmail.toLowerCase()) {
            setIsDetailsOpen(false);
            setSelectedMember(null);
          }
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
    const confirmMessage = `This will remove "${memberEmail}" from the Google Group and permanently exclude it from automatic re-adding.`;

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
            showToast('Sync Restored', `Automatic sync restored for ${targetEmail}.`, 'success');
          }
          await Promise.all([
            loadOverview(true, true),
            loadPending(1, true, pendingSearch),
            loadExclusions(),
          ]);
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
    const confirmMessage = `Restore automatic sync eligibility for "${targetEmail}"?`;

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
    const header = ['Email', 'Role', 'Status', 'In Supabase', 'Sources', 'Delivery'];
    const rows = members.map((m) => [
      `"${m.email}"`,
      `"${m.role || 'MEMBER'}"`,
      `"${m.status || 'ACTIVE'}"`,
      `"${m.isSupabaseEligible ? 'Yes' : 'No'}"`,
      `"${(m.sources || []).join('; ') || (m.isSupabaseEligible ? 'In Supabase' : 'None')}"`,
      `"${m.deliverySettings || 'ALL_MAIL'}"`,
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `google_group_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
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

  // Filtered Exclusions
  const filteredExclusions = useMemo(() => {
    if (!exclusionsSearch.trim()) return exclusions;
    const q = exclusionsSearch.toLowerCase().trim();
    return exclusions.filter((e) => e.email.toLowerCase().includes(q));
  }, [exclusions, exclusionsSearch]);

  const totalExclusionPages = Math.max(1, Math.ceil(filteredExclusions.length / exclusionPageSize));
  const paginatedExclusions = useMemo(() => {
    const from = (exclusionPage - 1) * exclusionPageSize;
    return filteredExclusions.slice(from, from + exclusionPageSize);
  }, [filteredExclusions, exclusionPage, exclusionPageSize]);

  // Source badge renderer
  const renderSourceBadge = (sources?: string[], isEligible = false) => {
    const srcList = sources || [];
    if (srcList.length === 0) {
      if (isEligible) {
        return (
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            In Supabase
          </span>
        );
      }
      return <span className="text-gray-500 text-[11px]">—</span>;
    }

    if (srcList.length === 1) {
      const src = srcList[0];
      let badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      let label = 'Subscribers';

      if (src.includes('Talent')) {
        badgeClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        label = 'Talent Reg.';
      } else if (src.includes('Applicant')) {
        badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        label = 'Opp. Applicant';
      } else if (src.includes('Referrer')) {
        badgeClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        label = 'Opp. Referrer';
      }

      return (
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${badgeClass}`}>
          {label}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        <span>{srcList.length} sources</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0 overflow-hidden">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800/80 bg-gradient-to-br from-gray-900 via-gray-900/90 to-gray-950 p-4 sm:p-6 shadow-2xl backdrop-blur-xl w-full min-w-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between min-w-0">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 via-orange-500/20 to-amber-500/20 text-orange-400 ring-1 ring-orange-500/30">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight break-words">
                  Google Group Management
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold shrink-0 ${
                    overview?.connectionStatus === 'ONLINE'
                      ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                      : overview?.connectionStatus === 'QUOTA_EXCEEDED'
                      ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                      : overview?.connectionStatus === 'NOT_CONFIGURED'
                      ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                      : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      overview?.connectionStatus === 'ONLINE'
                        ? 'bg-emerald-400 animate-pulse'
                        : overview?.connectionStatus === 'QUOTA_EXCEEDED'
                        ? 'bg-amber-400'
                        : overview?.connectionStatus === 'NOT_CONFIGURED'
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                  />
                  {overview?.connectionStatus === 'QUOTA_EXCEEDED'
                    ? 'QUOTA REACHED (Cached)'
                    : overview?.connectionStatus || 'ONLINE'}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-400 min-w-0">
                <span className="shrink-0 text-gray-500 font-medium">Target:</span>
                <span className="font-mono text-[11px] sm:text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 break-all select-all">
                  {targetGroupEmail}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0 min-w-0">
            <button
              onClick={handleGlobalRefresh}
              disabled={isLoadingOverview || isLoadingPending || isLoadingMembers}
              className="flex-1 sm:flex-initial inline-flex justify-center items-center gap-2 rounded-xl border border-gray-700/80 bg-gray-800/80 px-3.5 sm:px-4 py-2.5 text-xs font-medium text-gray-200 transition-all hover:border-gray-600 hover:bg-gray-700/80 hover:text-white disabled:opacity-50 min-h-[40px]"
              title="Query real Google Group membership and recalculate pending members"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingOverview || isLoadingPending || isLoadingMembers ? 'animate-spin' : ''}`} />
              Refresh Group
            </button>

            <a
              href={googleGroupsDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex justify-center items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3.5 sm:px-4 py-2.5 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 transition-all min-h-[40px]"
              title="Open Google Groups web management directly"
            >
              <ExternalLink className="h-4 w-4" />
              Open Google Group
            </a>
          </div>
        </div>
      </div>

      {/* Quota Notice Banner */}
      {overview?.connectionStatus === 'QUOTA_EXCEEDED' && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-3.5 sm:p-4 backdrop-blur-md w-full min-w-0 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-300">
              Google Groups Daily Read Quota Reached (Using Last Known Safe State)
            </p>
            <p className="text-[11px] text-gray-300 mt-0.5">
              Google Groups read quota reached. Last known safe count ({overview.groupMemberCount}) is preserved.
            </p>
          </div>
        </div>
      )}

      {/* Live Sync Banner */}
      {isSyncing && (
        <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 p-3.5 sm:p-4 backdrop-blur-md w-full min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <RefreshCw className="h-5 w-5 text-orange-400 animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white">
                {syncProgress?.message || 'Synchronization in progress in background...'}
              </p>
              {syncProgress?.totalCandidates > 0 && (
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Processed {syncProgress.processedCount || 0} of {syncProgress.totalCandidates} • Added: <span className="text-emerald-400 font-medium">{syncProgress.addedCount || 0}</span> • Skipped: <span className="text-gray-400 font-medium">{syncProgress.skippedCount || 0}</span> • Failed: <span className="text-rose-400 font-medium">{syncProgress.failedCount || 0}</span>
                </p>
              )}
            </div>
          </div>
          {syncProgress?.totalBatches > 1 && (
            <div className="shrink-0 text-xs font-mono font-semibold text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20 self-start sm:self-auto">
              Batch {syncProgress.currentBatch || 1} / {syncProgress.totalBatches}
            </div>
          )}
        </div>
      )}

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 w-full min-w-0">
        {/* Card 1: Supabase Eligible */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-md min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-gray-400 break-words">
              Supabase Eligible
            </span>
            <div className="rounded-lg bg-orange-500/10 p-2 text-orange-400 ring-1 ring-orange-500/20 shrink-0">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-white">
              {isLoadingOverview ? '—' : overview?.totalEligible ?? 0}
            </span>
            <span className="text-xs text-orange-400/80">unique emails</span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Subscribers, Talent & Opps</p>
        </div>

        {/* Card 2: Google Group Members */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-md min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-gray-400 break-words">
              Google Group Members
            </span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400 ring-1 ring-purple-500/20 shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-white">
              {isLoadingOverview ? '—' : overview?.groupMemberCount ?? 0}
            </span>
            <span className="text-xs text-purple-400/80">live in group</span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Community audience</p>
        </div>

        {/* Card 3: Already Synced */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-md min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-gray-400 break-words">
              Already Synced
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 ring-1 ring-emerald-500/20 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-emerald-400">
              {isLoadingOverview ? '—' : overview?.syncedCount ?? 0}
            </span>
            <span className="text-xs text-emerald-400/80">
              {overview?.totalEligible
                ? `${Math.round(((overview.syncedCount || 0) / overview.totalEligible) * 100)}%`
                : '0%'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Present in Group</p>
        </div>

        {/* Card 4: Excluded */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-md min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-gray-400 break-words">
              Excluded
            </span>
            <div className="rounded-lg bg-red-500/10 p-2 text-red-400 ring-1 ring-red-500/20 shrink-0">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-red-400">
              {isLoadingOverview ? '—' : overview?.excludedCount ?? exclusions.length}
            </span>
            <span className="text-xs text-red-400/80">blocked</span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Never re-added automatically</p>
        </div>

        {/* Card 5: Pending Sync */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-md min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-gray-400 break-words">
              Pending Sync
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 ring-1 ring-amber-500/20 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-amber-400">
              {isLoadingOverview ? '—' : overview?.pendingSyncCount ?? 0}
            </span>
            <span className="text-xs text-amber-400/80">waiting</span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Ready to add to group</p>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex border-b border-gray-800 w-full overflow-x-auto scrollbar-none gap-1 sm:gap-0">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`flex items-center justify-center sm:justify-start gap-2 border-b-2 px-4 sm:px-5 py-3 text-xs font-semibold transition-all whitespace-nowrap min-w-0 ${
            activeSubTab === 'pending'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-200'
          }`}
        >
          <Clock className="h-4 w-4 shrink-0" />
          <span>Pending Members ({overview?.pendingSyncCount ?? pendingPagination.total})</span>
          {overview?.pendingSyncCount ? (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 font-mono">
              {overview.pendingSyncCount}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex items-center justify-center sm:justify-start gap-2 border-b-2 px-4 sm:px-5 py-3 text-xs font-semibold transition-all whitespace-nowrap min-w-0 ${
            activeSubTab === 'members'
              ? 'border-orange-500 text-orange-400 bg-orange-500/5'
              : 'border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-200'
          }`}
        >
          <Users className="h-4 w-4 shrink-0" />
          <span>Group Members ({overview?.groupMemberCount ?? membersPagination.total})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('exclusions')}
          className={`flex items-center justify-center sm:justify-start gap-2 border-b-2 px-4 sm:px-5 py-3 text-xs font-semibold transition-all whitespace-nowrap min-w-0 ${
            activeSubTab === 'exclusions'
              ? 'border-red-500 text-red-400 bg-red-500/5'
              : 'border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-200'
          }`}
        >
          <UserX className="h-4 w-4 shrink-0" />
          <span>Excluded ({exclusions.length})</span>
        </button>
      </div>

      {/* 4. Tab Content: PENDING MEMBERS (Workflow Center) */}
      {activeSubTab === 'pending' && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 shadow-2xl backdrop-blur-xl w-full min-w-0 overflow-hidden">
          {/* Action & Info Header Bar */}
          <div className="border-b border-gray-800/80 p-3.5 sm:p-5 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-transparent">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between min-w-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Pending Members
                  </h2>
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                    {pendingPagination.total} people waiting to join
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Page {pendingPagination.page} of {pendingPagination.totalPages} • Showing{' '}
                  {pendingPagination.total > 0 ? (pendingPagination.page - 1) * pendingPagination.pageSize + 1 : 0}–
                  {Math.min(pendingPagination.page * pendingPagination.pageSize, pendingPagination.total)} of{' '}
                  {pendingPagination.total}
                </p>
              </div>

              {/* Action Buttons: [Copy 10 Emails] & [Sync Page] */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={handleCopy10Emails}
                  disabled={pendingCandidates.length === 0}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px] ${
                    copiedBatch
                      ? 'bg-emerald-500 text-gray-950 shadow-emerald-500/20 ring-2 ring-emerald-400'
                      : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-gray-950 hover:opacity-95 shadow-orange-500/20'
                  }`}
                  title="Copy exactly the visible 10 email addresses (newline separated) to paste in Google Groups"
                >
                  {copiedBatch ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>✓ {pendingCandidates.length} emails copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy {pendingCandidates.length} Emails</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleTriggerSync(pendingCandidates.map((c) => c.email))}
                  disabled={isSyncing || pendingCandidates.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-xs font-semibold text-gray-200 transition-all hover:bg-gray-700 hover:text-white disabled:opacity-50 min-h-[38px]"
                  title="Attempt direct API insertion via Google Workspace Admin SDK"
                >
                  <Zap className={`h-4 w-4 text-orange-400 ${isSyncing ? 'animate-bounce' : ''}`} />
                  {isSyncing ? 'Syncing...' : `Sync Page (${pendingCandidates.length})`}
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="mt-3.5 relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Filter pending by email or source..."
                value={pendingSearch}
                onChange={(e) => {
                  setPendingSearch(e.target.value);
                  loadPending(1, false, e.target.value);
                }}
                className="w-full rounded-xl border border-gray-800 bg-gray-950/70 pl-10 pr-8 py-2 text-xs text-white placeholder-gray-500 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {pendingSearch && (
                <button
                  onClick={() => {
                    setPendingSearch('');
                    loadPending(1, false, '');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-800 bg-gray-950/50 text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-semibold w-16 text-center">#</th>
                  <th className="px-5 py-3 font-semibold">Pending Email Address</th>
                  <th className="px-4 py-3 font-semibold">Supabase Origin Source</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {isLoadingPending ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
                        <span>Loading pending candidates...</span>
                      </div>
                    </td>
                  </tr>
                ) : pendingCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
                        <span className="font-semibold text-gray-300">Google Group is Fully Synchronized</span>
                        <span className="text-xs text-gray-500">0 pending community members waiting to join</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingCandidates.map((candidate, idx) => {
                    const rowNum = (pendingPagination.page - 1) * pendingPagination.pageSize + idx + 1;
                    return (
                      <tr key={candidate.email} className="transition-colors hover:bg-gray-800/40 group">
                        <td className="px-5 py-3 font-mono text-gray-500 text-center">{rowNum}</td>
                        <td className="px-5 py-3 font-mono text-gray-200">
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                            <span
                              className="select-all font-medium text-white group-hover:text-amber-400 transition-colors"
                              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                            >
                              {candidate.email}
                            </span>
                            <button
                              onClick={() => handleCopyEmail(candidate.email)}
                              className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                              title="Copy email"
                            >
                              {copiedEmail === candidate.email ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3">{renderSourceBadge(candidate.sources, true)}</td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" /> Pending Addition
                          </span>
                        </td>

                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleCopyEmail(candidate.email)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-700/80 bg-gray-800/80 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition-all"
                          >
                            <Copy className="h-3 w-3 text-amber-400" />
                            Copy
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-gray-800/60">
            {isLoadingPending ? (
              <div className="py-12 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
                  <span className="text-xs">Loading pending candidates...</span>
                </div>
              </div>
            ) : pendingCandidates.length === 0 ? (
              <div className="py-10 px-4 text-center text-gray-500">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/60 mb-2" />
                <span className="text-xs font-medium text-gray-300 block">No pending members</span>
              </div>
            ) : (
              pendingCandidates.map((candidate, idx) => {
                const rowNum = (pendingPagination.page - 1) * pendingPagination.pageSize + idx + 1;
                return (
                  <div key={candidate.email} className="p-3.5 space-y-2.5 bg-gray-950/20">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <span className="font-mono text-xs text-gray-500 font-bold shrink-0 mt-0.5">#{rowNum}</span>
                        <span
                          className="font-mono text-xs font-semibold text-white select-all"
                          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                        >
                          {candidate.email}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyEmail(candidate.email)}
                        className="text-gray-500 hover:text-gray-300 transition-colors p-1 shrink-0"
                        title="Copy email"
                      >
                        {copiedEmail === candidate.email ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      {renderSourceBadge(candidate.sources, true)}
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                        Pending
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-800 p-3.5 sm:p-5 text-xs text-gray-400 w-full min-w-0">
            <div className="text-center sm:text-left">
              Page <span className="font-semibold text-white">{pendingPagination.page}</span> of{' '}
              <span className="font-semibold text-white">{pendingPagination.totalPages}</span> ({pendingPagination.total} total)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadPending(Math.max(1, pendingPagination.page - 1), false, pendingSearch)}
                disabled={!pendingPagination.hasPrevious}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-medium text-gray-300">
                {pendingPagination.page} / {pendingPagination.totalPages}
              </span>
              <button
                onClick={() => loadPending(Math.min(pendingPagination.totalPages, pendingPagination.page + 1), false, pendingSearch)}
                disabled={!pendingPagination.hasNext}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab Content: GROUP MEMBERS */}
      {activeSubTab === 'members' && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 shadow-2xl backdrop-blur-xl w-full min-w-0 overflow-hidden">
          {/* Controls Bar */}
          <div className="border-b border-gray-800/80 p-3.5 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
              {/* Search Input */}
              <div className="relative flex-1 sm:max-w-md min-w-0 w-full">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by email, role, status, or source..."
                  value={membersSearch}
                  onChange={(e) => {
                    setMembersSearch(e.target.value);
                    loadMembers(1, false, e.target.value, originFilter);
                  }}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950/70 pl-10 pr-8 py-2 text-xs text-white placeholder-gray-500 transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                {membersSearch && (
                  <button
                    onClick={() => {
                      setMembersSearch('');
                      loadMembers(1, false, '', originFilter);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills & Export */}
              <div className="flex flex-wrap items-center gap-2 min-w-0 w-full sm:w-auto">
                <div className="flex flex-wrap sm:flex-nowrap rounded-xl border border-gray-800 bg-gray-950/70 p-1 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setOriginFilter('all');
                      loadMembers(1, false, membersSearch, 'all');
                    }}
                    className={`flex-1 sm:flex-initial rounded-lg px-2.5 sm:px-3 py-1 text-xs font-medium transition-colors text-center ${
                      originFilter === 'all'
                        ? 'bg-orange-500 text-gray-950 font-semibold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setOriginFilter('synced');
                      loadMembers(1, false, membersSearch, 'synced');
                    }}
                    className={`flex-1 sm:flex-initial rounded-lg px-2.5 sm:px-3 py-1 text-xs font-medium transition-colors text-center ${
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
                      loadMembers(1, false, membersSearch, 'external');
                    }}
                    className={`flex-1 sm:flex-initial rounded-lg px-2.5 sm:px-3 py-1 text-xs font-medium transition-colors text-center ${
                      originFilter === 'external'
                        ? 'bg-orange-500 text-gray-950 font-semibold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    External
                  </button>
                </div>

                <button
                  onClick={handleExportCSV}
                  disabled={members.length === 0}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-700 hover:text-white disabled:opacity-50 min-h-[34px]"
                >
                  <Download className="h-3.5 w-3.5 text-gray-400" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-800 bg-gray-950/50 text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Member Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Supabase Source</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Delivery</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {isLoadingMembers ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
                        <span>Loading Google Group members...</span>
                      </div>
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-8 w-8 text-gray-600" />
                        <span className="font-medium text-gray-400">No members match your criteria</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr
                      key={m.email}
                      onClick={() => {
                        setSelectedMember(m);
                        setIsDetailsOpen(true);
                      }}
                      className="transition-colors hover:bg-gray-800/40 cursor-pointer group"
                    >
                      <td className="px-5 py-3 font-mono text-gray-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                          <span
                            className="select-all font-medium text-white group-hover:text-orange-400 transition-colors"
                            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                          >
                            {m.email}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyEmail(m.email);
                            }}
                            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
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

                      <td className="px-4 py-3">
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

                      <td className="px-4 py-3">{renderSourceBadge(m.sources, m.isSupabaseEligible)}</td>

                      <td className="px-4 py-3">
                        {m.isExcluded ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400 border border-red-500/20">
                            <ShieldAlert className="h-3 w-3" /> Excluded
                          </span>
                        ) : m.isSupabaseEligible ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> In Supabase
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                            External / Not in Supabase
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">
                        {m.deliverySettings || 'ALL_MAIL'}
                      </td>

                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMember(m);
                              setIsDetailsOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-700/80 bg-gray-800/80 px-2.5 py-1 text-xs font-medium text-gray-200 transition-all hover:bg-gray-700 hover:text-white"
                          >
                            <Eye className="h-3.5 w-3.5 text-orange-400" />
                            Details
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMember(m.email);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-gray-800/60">
            {isLoadingMembers ? (
              <div className="py-12 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
                  <span className="text-xs">Loading members...</span>
                </div>
              </div>
            ) : members.length === 0 ? (
              <div className="py-10 px-4 text-center text-gray-500">
                <Users className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                <span className="text-xs font-medium text-gray-400 block">No members match your criteria</span>
              </div>
            ) : (
              members.map((m) => (
                <div key={m.email} className="p-3.5 space-y-2.5 bg-gray-950/20">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div
                      className="flex items-start gap-2 min-w-0 flex-1 cursor-pointer"
                      onClick={() => {
                        setSelectedMember(m);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <Mail className="h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5" />
                      <span
                        className="font-mono text-xs font-semibold text-white select-all"
                        style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                      >
                        {m.email}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyEmail(m.email)}
                      className="text-gray-500 hover:text-gray-300 transition-colors p-1 shrink-0"
                    >
                      {copiedEmail === m.email ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-medium">
                      {m.role || 'MEMBER'}
                    </span>
                    {renderSourceBadge(m.sources, m.isSupabaseEligible)}
                    <span className="font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                      {m.deliverySettings || 'ALL_MAIL'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setIsDetailsOpen(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-700/80 bg-gray-800/80 px-3 py-2 text-xs font-medium text-gray-200"
                    >
                      <Eye className="h-3.5 w-3.5 text-orange-400" />
                      Details
                    </button>
                    <button
                      onClick={() => handleRemoveMember(m.email)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Members Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-800 p-3.5 sm:p-5 text-xs text-gray-400 w-full min-w-0">
            <div>
              Showing Page <span className="font-semibold text-white">{membersPagination.page}</span> of{' '}
              <span className="font-semibold text-white">{membersPagination.totalPages}</span> ({membersPagination.total} total)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadMembers(Math.max(1, membersPagination.page - 1), false, membersSearch, originFilter)}
                disabled={!membersPagination.hasPrevious}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-medium text-gray-300">
                {membersPagination.page} / {membersPagination.totalPages}
              </span>
              <button
                onClick={() => loadMembers(Math.min(membersPagination.totalPages, membersPagination.page + 1), false, membersSearch, originFilter)}
                disabled={!membersPagination.hasNext}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab Content: EXCLUSIONS */}
      {activeSubTab === 'exclusions' && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 shadow-2xl backdrop-blur-xl w-full min-w-0 overflow-hidden">
          <div className="border-b border-gray-800/80 p-3.5 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
              <div className="relative flex-1 sm:max-w-md min-w-0 w-full">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search excluded emails..."
                  value={exclusionsSearch}
                  onChange={(e) => {
                    setExclusionsSearch(e.target.value);
                    setExclusionPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950/70 pl-10 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                />
                {exclusionsSearch && (
                  <button
                    onClick={() => setExclusionsSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
                <span>Permanently skipped during automatic and manual sync.</span>
              </div>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto min-w-0">
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
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedExclusions.map((e) => (
                    <tr key={e.email} className="transition-colors hover:bg-gray-800/30">
                      <td className="px-5 py-3 font-mono text-gray-200">
                        <div className="flex items-center gap-2">
                          <UserX className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          <span
                            className="select-all font-medium text-white"
                            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                          >
                            {e.email}
                          </span>
                          <button
                            onClick={() => handleCopyEmail(e.email)}
                            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
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
                          <Clock className="h-3.5 w-3.5 text-gray-500 shrink-0" />
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
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
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

          {/* Exclusions Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-800 p-3.5 sm:p-5 text-xs text-gray-400 w-full min-w-0">
            <div>
              Showing {filteredExclusions.length > 0 ? (exclusionPage - 1) * exclusionPageSize + 1 : 0} to{' '}
              {Math.min(exclusionPage * exclusionPageSize, filteredExclusions.length)} of {filteredExclusions.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setExclusionPage((p) => Math.max(1, p - 1))}
                disabled={exclusionPage === 1}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-1.5 font-medium text-gray-300">
                {exclusionPage} / {totalExclusionPages}
              </span>
              <button
                onClick={() => setExclusionPage((p) => Math.min(totalExclusionPages, p + 1))}
                disabled={exclusionPage >= totalExclusionPages}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Member Details Modal */}
      <AnimatePresence>
        {isDetailsOpen && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl text-white"
            >
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-800/80">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Member Details</h2>
                    <p className="text-xs text-gray-400">Google Group Community Profile & Eligibility</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="rounded-xl border border-gray-800 bg-gray-950/60 p-2 text-gray-400 hover:border-gray-700 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Member Email</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedMember.email);
                        setDetailsCopied(true);
                        setTimeout(() => setDetailsCopied(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700/80 bg-gray-800/80 px-2.5 py-1 text-[11px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      {detailsCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p
                    className="font-mono text-sm font-bold text-white select-all"
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                  >
                    {selectedMember.email}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3.5 space-y-3">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                    Membership Information
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-gray-500 block text-[11px] mb-1">Group Role</span>
                      <span className="bg-gray-800 text-gray-200 px-2 py-0.5 rounded font-semibold">
                        {selectedMember.role || 'MEMBER'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px] mb-1">Supabase Status</span>
                      <span className={selectedMember.isSupabaseEligible ? 'text-emerald-400 font-medium' : 'text-gray-400'}>
                        {selectedMember.isSupabaseEligible ? 'In Supabase' : 'External / Not in Supabase'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px] mb-1">Delivery</span>
                      <span className="font-mono text-gray-300">{selectedMember.deliverySettings || 'ALL_MAIL'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-2.5 pt-4 border-t border-gray-800/80">
                <button
                  onClick={() => handleRemoveMember(selectedMember.email)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove & Exclude
                </button>

                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:text-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Sync Results Diagnostics Modal */}
      <AnimatePresence>
        {showSyncModal && lastSyncResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl text-white my-8"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${
                      lastSyncResult.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                        : lastSyncResult.status === 'PARTIAL_SUCCESS'
                        ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                        : 'bg-red-500/10 text-red-400 ring-red-500/20'
                    }`}
                  >
                    {lastSyncResult.status === 'COMPLETED' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : lastSyncResult.status === 'PARTIAL_SUCCESS' ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {lastSyncResult.status === 'COMPLETED'
                        ? 'Synchronization Complete'
                        : lastSyncResult.status === 'PARTIAL_SUCCESS'
                        ? 'Synchronization Partial Success'
                        : 'Synchronization Report'}
                    </h3>
                    <p className="text-xs text-gray-400">Execution report & diagnostics</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status Message */}
              {lastSyncResult.message && (
                <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300">
                  {lastSyncResult.message}
                </div>
              )}

              {/* Run Outcome Breakdown */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-2.5">
                  <span className="text-[10px] sm:text-[11px] text-gray-400 block">Newly Added</span>
                  <span className="text-sm sm:text-base font-bold text-emerald-400 mt-1 block">
                    {lastSyncResult.addedCount || 0}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-2.5">
                  <span className="text-[10px] sm:text-[11px] text-gray-400 block">Skipped / Exists</span>
                  <span className="text-sm sm:text-base font-bold text-gray-400 mt-1 block">
                    {lastSyncResult.skippedCount || 0}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-2.5">
                  <span className="text-[10px] sm:text-[11px] text-gray-400 block">Excluded</span>
                  <span className="text-sm sm:text-base font-bold text-red-400 mt-1 block">
                    {lastSyncResult.excludedCount || 0}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-2.5">
                  <span className="text-[10px] sm:text-[11px] text-gray-400 block">Failed</span>
                  <span className="text-sm sm:text-base font-bold text-rose-400 mt-1 block">
                    {lastSyncResult.failedCount || 0}
                  </span>
                </div>
              </div>

              {/* Remaining Pending Banner */}
              <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-xs">
                <span className="text-gray-300 font-medium">Remaining Pending:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {lastSyncResult.remainingPending ?? 0} emails
                </span>
              </div>

              {/* Errors Diagnostics */}
              {Array.isArray(lastSyncResult.errors) && lastSyncResult.errors.length > 0 && (
                <div className="mt-3.5">
                  <span className="text-xs font-semibold text-rose-400 block mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Diagnostics / Failure Details ({lastSyncResult.errors.length}):
                  </span>
                  <div className="max-h-28 overflow-y-auto rounded-xl border border-rose-500/20 bg-rose-950/30 p-2.5 font-mono text-[11px] text-rose-300 space-y-1">
                    {lastSyncResult.errors.slice(0, 5).map((errObj: any, idx: number) => (
                      <div key={idx} className="truncate">
                        • {typeof errObj === 'string' ? errObj : (errObj.email ? `${errObj.email}: ` : '') + (errObj.error || errObj.message || 'Addition failed')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-xs font-semibold text-gray-950 transition-all hover:opacity-90"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminGoogleGroupTab;
