import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Eye,
  Database,
  Calendar,
  User,
  Shield,
  Send,
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
  const [syncProgress, setSyncProgress] = useState<any>(null);
  const syncPollIntervalRef = useRef<any>(null);
  const [restoringEmail, setRestoringEmail] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState<'all' | 'synced' | 'external'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [searchExclusionsQuery, setSearchExclusionsQuery] = useState('');
  const [currentExclusionPage, setCurrentExclusionPage] = useState(1);
  const [exclusionPageSize, setExclusionPageSize] = useState(25);

  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [detailsCopied, setDetailsCopied] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Member Details Modal State
  const [selectedMember, setSelectedMember] = useState<GoogleGroupMember | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
          if (data.status === 'COMPLETED') {
            clearInterval(syncPollIntervalRef.current);
            syncPollIntervalRef.current = null;
            setIsSyncing(false);
            setLastSyncResult(data);
            setShowSyncModal(true);
            if (showToast) {
              showToast(
                'Sync Successful',
                `Added ${data.addedCount || 0} new member(s) to Google Group (${data.skippedCount || 0} skipped, ${data.excludedCount || 0} excluded).`,
                'success'
              );
            }
            await Promise.all([loadOverview(true), loadMembers()]);
          } else if (data.status === 'FAILED') {
            clearInterval(syncPollIntervalRef.current);
            syncPollIntervalRef.current = null;
            setIsSyncing(false);
            if (showToast) {
              showToast('Sync Failed', data.message || 'Synchronization failed.', 'error');
            }
            await loadOverview(true);
          }
        }
      } catch (err: any) {
        console.warn('Sync status poll error:', err.message);
      }
    }, 2000);
  }, [showToast, loadOverview, loadMembers]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (syncPollIntervalRef.current) clearInterval(syncPollIntervalRef.current);
    };
  }, []);

  // Check sync status on mount & resume polling if running
  useEffect(() => {
    loadOverview();
    loadMembers();
    loadExclusions();

    googleGroupApi.getSyncStatus().then((res) => {
      if (res.data?.success && res.data.status === 'RUNNING') {
        setSyncProgress(res.data);
        startPollingSync();
      }
    }).catch(() => {});
  }, [loadOverview, loadMembers, loadExclusions, startPollingSync]);

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

  // Copy helper
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
    if (showToast) showToast('Email copied', `${email} copied to clipboard`, 'info');
  };

  // Details Modal Copy helper
  const handleDetailsCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setDetailsCopied(true);
    setTimeout(() => setDetailsCopied(false), 2000);
    if (showToast) showToast('Email copied', `${email} copied to clipboard`, 'info');
  };

  // Open Member Details
  const handleOpenDetails = (member: GoogleGroupMember) => {
    setSelectedMember(member);
    setIsDetailsOpen(true);
    setDetailsCopied(false);
  };

  // Close Member Details
  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedMember(null);
  };

  // Trigger Differential Sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await googleGroupApi.triggerSync();
      const data = res.data;
      if (data?.success) {
        if (showToast) {
          showToast('Sync Started', 'Background synchronization initiated in safe batches.', 'info');
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
            showToast('Member Removed & Excluded', `${memberEmail} has been removed from the Google Group and excluded from automatic re-add.`, 'success');
          }
          setMembers((prev) => prev.filter((m) => m.email.toLowerCase() !== memberEmail.toLowerCase()));
          if (selectedMember && selectedMember.email.toLowerCase() === memberEmail.toLowerCase()) {
            handleCloseDetails();
          }
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
    const confirmMessage = `This will remove the member from the Google Group and prevent automatic synchronization from adding this email (${memberEmail}) again.`;

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
          if (selectedMember && selectedMember.email.toLowerCase() === targetEmail.toLowerCase()) {
            setSelectedMember((prev) => (prev ? { ...prev, isExcluded: false, excludedAt: null } : null));
          }
          await Promise.all([loadOverview(true), loadMembers()]);
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

  // Filtered Members (Search covers email, role, status, delivery, and sources)
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Origin filter
      if (originFilter === 'synced' && !m.isSupabaseEligible) return false;
      if (originFilter === 'external' && m.isSupabaseEligible) return false;

      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesEmail = m.email.toLowerCase().includes(q);
        const matchesRole = (m.role || '').toLowerCase().includes(q);
        const matchesStatus = (m.status || '').toLowerCase().includes(q);
        const matchesDelivery = (m.deliverySettings || '').toLowerCase().includes(q);
        const matchesSources = (m.sources || []).some((s) => s.toLowerCase().includes(q));
        const matchesSupabase = m.isSupabaseEligible
          ? 'supabase'.includes(q) || 'in supabase'.includes(q)
          : 'external'.includes(q);

        if (!matchesEmail && !matchesRole && !matchesStatus && !matchesDelivery && !matchesSources && !matchesSupabase) {
          return false;
        }
      }
      return true;
    });
  }, [members, originFilter, searchQuery]);

  // Paginated Members
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const paginatedMembers = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return filteredMembers.slice(from, from + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  // Filtered Exclusions
  const filteredExclusions = useMemo(() => {
    if (!searchExclusionsQuery.trim()) return exclusions;
    const q = searchExclusionsQuery.toLowerCase().trim();
    return exclusions.filter((e) => e.email.toLowerCase().includes(q));
  }, [exclusions, searchExclusionsQuery]);

  // Paginated Exclusions
  const totalExclusionPages = Math.max(1, Math.ceil(filteredExclusions.length / exclusionPageSize));
  const paginatedExclusions = useMemo(() => {
    const from = (currentExclusionPage - 1) * exclusionPageSize;
    return filteredExclusions.slice(from, from + exclusionPageSize);
  }, [filteredExclusions, currentExclusionPage, exclusionPageSize]);

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

  // Source name formatter helper
  const formatSourceName = (key: string) => {
    switch (key) {
      case 'subscribers':
        return 'Subscribers';
      case 'talent_registrations':
        return 'Talent Registrations';
      case 'opportunity_applications':
        return 'Opportunity Applications';
      default:
        return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  // Compact source badge renderer for table
  const renderSourceBadge = (member: GoogleGroupMember) => {
    const sources = member.sources || [];
    if (sources.length === 0) {
      if (member.isSupabaseEligible) {
        return (
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            In Supabase
          </span>
        );
      }
      return <span className="text-gray-500 text-[11px]">—</span>;
    }

    if (sources.length === 1) {
      const src = sources[0];
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleOpenDetails(member);
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
        title="Click to view all sources in details"
      >
        <span>{sources.length} sources</span>
        <ArrowUpRight className="h-3 w-3" />
      </button>
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
                    : overview?.connectionStatus || 'CONNECTING'}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-400 min-w-0">
                <span className="shrink-0 text-gray-500 font-medium">Target:</span>
                <span className="font-mono text-[11px] sm:text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 break-all select-all">
                  {overview?.targetGroupEmail || 'zenemoocommunity@googlegroups.com'}
                </span>
                <a
                  href={`https://groups.google.com/g/${(overview?.targetGroupEmail || 'zenemoocommunity@googlegroups.com').split('@')[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-gray-400 hover:text-white transition-colors shrink-0"
                >
                  <ExternalLink className="h-3 w-3" /> Open in Google
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0 min-w-0">
            <button
              onClick={() => {
                loadOverview();
                loadMembers();
                loadExclusions();
              }}
              disabled={isLoadingOverview || isLoadingMembers || isLoadingExclusions}
              className="flex-1 sm:flex-initial inline-flex justify-center items-center gap-2 rounded-xl border border-gray-700/80 bg-gray-800/80 px-3.5 sm:px-4 py-2.5 text-xs font-medium text-gray-200 transition-all hover:border-gray-600 hover:bg-gray-700/80 hover:text-white disabled:opacity-50 min-h-[40px]"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingOverview || isLoadingMembers || isLoadingExclusions ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={handleTriggerSync}
              disabled={isSyncing || overview?.pendingSyncCount === 0}
              className="flex-1 sm:flex-initial inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 px-4 sm:px-5 py-2.5 text-xs font-semibold text-gray-950 shadow-lg shadow-orange-500/20 transition-all hover:opacity-95 hover:shadow-orange-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
            >
              <Zap className={`h-4 w-4 ${isSyncing ? 'animate-bounce' : ''}`} />
              {isSyncing
                ? syncProgress?.totalBatches
                  ? `Syncing (${syncProgress.currentBatch || 1}/${syncProgress.totalBatches})...`
                  : 'Syncing...'
                : 'Sync Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Quota Exceeded Informative Notice Banner */}
      {overview?.connectionStatus === 'QUOTA_EXCEEDED' && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-3.5 sm:p-4 backdrop-blur-md w-full min-w-0 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-300">
              Google Groups Daily Read Quota Reached (Using Last Known State)
            </p>
            <p className="text-[11px] text-gray-300 mt-0.5">
              Google Groups daily <code className="font-mono text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">groups.read</code> quota is temporarily reached. Member count ({overview.groupMemberCount || 148}) and previous records are safely retained. Additions remain protected.
            </p>
          </div>
        </div>
      )}

      {/* Live Sync Progress Bar / Banner */}
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
                  Processed {syncProgress.processedCount || 0} of {syncProgress.totalCandidates} • Added: <span className="text-emerald-400 font-medium">{syncProgress.addedCount || 0}</span> • Skipped: <span className="text-gray-400 font-medium">{syncProgress.skippedCount || 0}</span>
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
        {/* Card 1: Total Eligible in Supabase */}
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
          <p className="mt-2 text-[11px] text-gray-400">3 Approved sources</p>
        </div>

        {/* Card 2: Current Google Group Members */}
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
              {isLoadingOverview ? '—' : overview?.groupMemberCount ?? members.length}
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

        {/* Card 4: Manually Excluded */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-md min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-gray-400 break-words">
              Excluded from Sync
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
            <span className="text-xs text-amber-400/80">to add</span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Ready for next run</p>
        </div>
      </div>

      {/* 3. Source Breakdown Bar */}
      {overview?.sourceBreakdown && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-3.5 sm:p-4 backdrop-blur-md w-full min-w-0">
          <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
            <Sparkles className="h-4 w-4 text-orange-400 shrink-0" />
            <span className="text-xs font-semibold text-gray-300">Supabase Data Sources Breakdown:</span>
          </div>
          <div className="flex flex-wrap gap-2 w-full min-w-0">
            {Object.entries(overview.sourceBreakdown).map(([source, stats]) => (
              <div
                key={source}
                className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-950/60 px-3 py-1.5 text-xs text-gray-300 min-w-0"
              >
                <span className="font-medium text-gray-200">{formatSourceName(source)}:</span>
                <span className="font-mono text-orange-400 font-semibold">{stats.totalProcessed}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Sub-Navigation Tabs */}
      <div className="flex border-b border-gray-800 w-full overflow-x-auto scrollbar-none gap-1 sm:gap-0">
        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex items-center justify-center sm:justify-start gap-2 border-b-2 px-4 sm:px-5 py-3 text-xs font-semibold transition-all whitespace-nowrap min-w-0 ${
            activeSubTab === 'members'
              ? 'border-orange-500 text-orange-400 bg-orange-500/5'
              : 'border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-200'
          }`}
        >
          <Users className="h-4 w-4 shrink-0" />
          <span>Active Members ({members.length})</span>
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
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950/70 pl-10 pr-8 py-2 text-xs text-white placeholder-gray-500 transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
              <div className="flex flex-wrap items-center gap-2 min-w-0 w-full sm:w-auto">
                <div className="flex flex-wrap sm:flex-nowrap rounded-xl border border-gray-800 bg-gray-950/70 p-1 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setOriginFilter('all');
                      setCurrentPage(1);
                    }}
                    className={`flex-1 sm:flex-initial rounded-lg px-2.5 sm:px-3 py-1 text-xs font-medium transition-colors text-center ${
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
                      setCurrentPage(1);
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

          {/* Desktop/Tablet Compact Table View */}
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
                ) : paginatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-8 w-8 text-gray-600" />
                        <span className="font-medium text-gray-400">No members match your criteria</span>
                        <span className="text-xs text-gray-500">Try adjusting search or trigger a new sync run</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedMembers.map((m) => (
                    <tr
                      key={m.email}
                      onClick={() => handleOpenDetails(m)}
                      className="transition-colors hover:bg-gray-800/40 cursor-pointer group"
                    >
                      <td className="px-5 py-3 font-mono text-gray-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                          <span className="select-all font-medium text-white break-all group-hover:text-orange-400 transition-colors">
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

                      <td className="px-4 py-3">{renderSourceBadge(m)}</td>

                      <td className="px-4 py-3">
                        {m.isExcluded ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400 border border-red-500/20">
                            <ShieldAlert className="h-3 w-3" /> Excluded
                          </span>
                        ) : m.isSupabaseEligible ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                            External
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
                              handleOpenDetails(m);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-700/80 bg-gray-800/80 px-2.5 py-1 text-xs font-medium text-gray-200 transition-all hover:bg-gray-700 hover:text-white active:scale-95"
                            title="View complete member details"
                          >
                            <Eye className="h-3.5 w-3.5 text-orange-400" />
                            Details
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMember(m.email);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/20 active:scale-95"
                            title="Remove member and prevent automatic re-add"
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

          {/* Mobile Card List View (< 768px) */}
          <div className="block md:hidden divide-y divide-gray-800/60">
            {isLoadingMembers ? (
              <div className="py-12 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
                  <span className="text-xs">Loading members...</span>
                </div>
              </div>
            ) : paginatedMembers.length === 0 ? (
              <div className="py-10 px-4 text-center text-gray-500">
                <Users className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                <span className="text-xs font-medium text-gray-400 block">No members match your criteria</span>
              </div>
            ) : (
              paginatedMembers.map((m) => (
                <div
                  key={m.email}
                  className="p-3.5 space-y-2.5 bg-gray-950/20 hover:bg-gray-900/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div
                      className="flex items-start gap-2 min-w-0 flex-1 cursor-pointer"
                      onClick={() => handleOpenDetails(m)}
                    >
                      <Mail className="h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5" />
                      <span className="font-mono text-xs font-semibold text-white break-all select-all">
                        {m.email}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyEmail(m.email)}
                      className="text-gray-500 hover:text-gray-300 transition-colors p-1 shrink-0"
                      title="Copy email"
                    >
                      {copiedEmail === m.email ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${
                        m.role === 'OWNER'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : m.role === 'MANAGER'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {m.role || 'MEMBER'}
                    </span>

                    {renderSourceBadge(m)}

                    {m.isExcluded ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 font-medium text-red-400 border border-red-500/20">
                        <ShieldAlert className="h-3 w-3" /> Excluded
                      </span>
                    ) : m.isSupabaseEligible ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Synced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-0.5 font-medium text-gray-400">
                        External User
                      </span>
                    )}

                    <span className="font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                      {m.deliverySettings || 'ALL_MAIL'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenDetails(m)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-700/80 bg-gray-800/80 px-3 py-2 text-xs font-medium text-gray-200 transition-all hover:bg-gray-700 hover:text-white active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5 text-orange-400" />
                      Details
                    </button>
                    <button
                      onClick={() => handleRemoveMember(m.email)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/20 active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-800 p-3.5 sm:p-5 text-xs text-gray-400 w-full min-w-0">
            <div className="text-center sm:text-left">
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
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-1.5 font-medium text-gray-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab Content: Excluded from Sync */}
      {activeSubTab === 'exclusions' && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 shadow-2xl backdrop-blur-xl w-full min-w-0 overflow-hidden">
          {/* Controls Bar */}
          <div className="border-b border-gray-800/80 p-3.5 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
              <div className="relative flex-1 sm:max-w-md min-w-0 w-full">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search excluded emails..."
                  value={searchExclusionsQuery}
                  onChange={(e) => {
                    setSearchExclusionsQuery(e.target.value);
                    setCurrentExclusionPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950/70 pl-10 pr-8 py-2 text-xs text-white placeholder-gray-500 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
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

              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-400 min-w-0">
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
                <span className="break-words">Permanently skipped during automatic and manual sync.</span>
              </div>
            </div>
          </div>

          {/* Desktop/Tablet Table View */}
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
                          <span className="select-all font-medium text-white break-all">{e.email}</span>
                          <button
                            onClick={() => handleCopyEmail(e.email)}
                            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
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

          {/* Mobile Card List View for Exclusions (< 768px) */}
          <div className="block md:hidden divide-y divide-gray-800/60">
            {isLoadingExclusions ? (
              <div className="py-12 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-red-400" />
                  <span className="text-xs">Loading exclusions...</span>
                </div>
              </div>
            ) : paginatedExclusions.length === 0 ? (
              <div className="py-10 px-4 text-center text-gray-500">
                <UserCheck className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                <span className="text-xs font-medium text-gray-400 block">No excluded members found</span>
              </div>
            ) : (
              paginatedExclusions.map((e) => (
                <div key={e.email} className="p-3.5 space-y-2.5 bg-gray-950/20">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <UserX className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                      <span className="font-mono text-xs font-semibold text-white break-all select-all">
                        {e.email}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyEmail(e.email)}
                      className="text-gray-500 hover:text-gray-300 transition-colors p-1 shrink-0"
                      title="Copy email"
                    >
                      {copiedEmail === e.email ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <span>{formatDate(e.excludedAt)}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-400 border border-red-500/20">
                      <ShieldCheck className="h-3 w-3" /> Excluded
                    </span>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => handleRestoreExclusion(e.email)}
                      disabled={restoringEmail === e.email}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/20 active:scale-95 disabled:opacity-50"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${restoringEmail === e.email ? 'animate-spin' : ''}`} />
                      {restoringEmail === e.email ? 'Restoring...' : 'Restore Sync'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-800 p-3.5 sm:p-5 text-xs text-gray-400 w-full min-w-0">
            <div className="text-center sm:text-left">
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
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-gray-300 focus:border-red-500 focus:outline-none"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

              <button
                onClick={() => setCurrentExclusionPage((p) => Math.max(1, p - 1))}
                disabled={currentExclusionPage === 1}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-1.5 font-medium text-gray-300">
                {currentExclusionPage} / {totalExclusionPages}
              </span>
              <button
                onClick={() => setCurrentExclusionPage((p) => Math.min(totalExclusionPages, p + 1))}
                disabled={currentExclusionPage >= totalExclusionPages}
                className="rounded-lg border border-gray-800 bg-gray-950 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Member Details Modal / Drawer */}
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
              {/* Header */}
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
                  onClick={handleCloseDetails}
                  className="rounded-xl border border-gray-800 bg-gray-950/60 p-2 text-gray-400 hover:border-gray-700 hover:text-white transition-colors"
                  title="Close (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body Content */}
              <div className="mt-4 space-y-4 text-xs">
                {/* A. Member Email Card */}
                <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Member Email</span>
                    <button
                      onClick={() => handleDetailsCopyEmail(selectedMember.email)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700/80 bg-gray-800/80 px-2.5 py-1 text-[11px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      title="Copy email"
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
                  <p className="font-mono text-sm font-bold text-white break-all select-all">
                    {selectedMember.email}
                  </p>
                </div>

                {/* B. Google Group Info */}
                <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Google Group</span>
                    <a
                      href={`https://groups.google.com/g/${(overview?.targetGroupEmail || 'zenemoocommunity@googlegroups.com').split('@')[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" /> View in Google
                    </a>
                  </div>
                  <p className="font-mono text-xs text-gray-300 break-all">
                    {overview?.targetGroupEmail || 'zenemoocommunity@googlegroups.com'}
                  </p>
                </div>

                {/* C. Membership Properties */}
                <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3.5 space-y-3">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                    Google Group Membership
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-gray-500 block text-[11px] mb-1">Group Role</span>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          selectedMember.role === 'OWNER'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : selectedMember.role === 'MANAGER'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-gray-800 text-gray-200'
                        }`}
                      >
                        {selectedMember.role || 'MEMBER'}
                      </span>
                    </div>

                    {selectedMember.type && (
                      <div>
                        <span className="text-gray-500 block text-[11px] mb-1">Member Type</span>
                        <span className="font-mono text-gray-300">{selectedMember.type}</span>
                      </div>
                    )}

                    {selectedMember.status && (
                      <div>
                        <span className="text-gray-500 block text-[11px] mb-1">Member Status</span>
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {selectedMember.status}
                        </span>
                      </div>
                    )}

                    {selectedMember.deliverySettings && (
                      <div>
                        <span className="text-gray-500 block text-[11px] mb-1">Delivery</span>
                        <span className="font-mono text-gray-300">{selectedMember.deliverySettings}</span>
                      </div>
                    )}

                    {selectedMember.joinedAt && (
                      <div className="col-span-2">
                        <span className="text-gray-500 block text-[11px] mb-1">Added to Group</span>
                        <span className="text-gray-300">{formatDate(selectedMember.joinedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* D. Supabase Eligibility & Sources */}
                <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Supabase Eligibility
                    </span>
                    {selectedMember.isSupabaseEligible ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> In Supabase
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-800 px-2.5 py-0.5 text-[11px] font-medium text-gray-400">
                        Not in Supabase
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-gray-500 block text-[11px] mb-2 font-medium">Eligible Sources:</span>
                    {selectedMember.sources && selectedMember.sources.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedMember.sources.map((src) => (
                          <div
                            key={src}
                            className="flex items-center gap-2 rounded-lg bg-gray-900/80 px-3 py-1.5 text-xs text-gray-200 border border-gray-800"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="font-medium">{src}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic bg-gray-900/40 p-2.5 rounded-lg border border-gray-800/50">
                        Not found in eligible Supabase sources
                      </p>
                    )}
                  </div>
                </div>

                {/* E. Synchronization Status */}
                <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3.5 space-y-2">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                    Sync Status
                  </span>

                  {selectedMember.isExcluded ? (
                    <div className="rounded-lg bg-red-500/10 p-3 border border-red-500/20 space-y-1.5 text-red-300">
                      <div className="flex items-center gap-2 font-semibold text-red-400">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <span>🚫 Excluded from automatic synchronization</span>
                      </div>
                      {selectedMember.excludedAt && (
                        <p className="text-[11px] text-gray-400">
                          Excluded on: {formatDate(selectedMember.excludedAt)}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-400">
                        This email was removed by an administrator and is permanently prevented from being automatically re-added.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20 space-y-1 text-emerald-300">
                      <div className="flex items-center gap-2 font-semibold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>✓ Synced</span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Active member in the Google Group community.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-gray-800/80">
                <div>
                  {selectedMember.isExcluded ? (
                    <button
                      onClick={() => handleRestoreExclusion(selectedMember.email)}
                      disabled={restoringEmail === selectedMember.email}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${restoringEmail === selectedMember.email ? 'animate-spin' : ''}`} />
                      {restoringEmail === selectedMember.email ? 'Restoring...' : 'Restore Sync'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRemoveMember(selectedMember.email)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 hover:border-red-500/40 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove & Exclude
                    </button>
                  )}
                </div>

                <button
                  onClick={handleCloseDetails}
                  className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Sync Summary Modal */}
      <AnimatePresence>
        {showSyncModal && lastSyncResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl text-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Synchronization Complete</h3>
                    <p className="text-xs text-gray-400">Google Group synchronization summary</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <span className="text-[11px] text-gray-400 block">Total Evaluated</span>
                  <span className="text-base font-bold text-white mt-1 block">{lastSyncResult.totalEligible || 0}</span>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <span className="text-[11px] text-gray-400 block">Already in Group</span>
                  <span className="text-base font-bold text-emerald-400 mt-1 block">{lastSyncResult.alreadyExisting || 0}</span>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <span className="text-[11px] text-gray-400 block">Excluded Skipped</span>
                  <span className="text-base font-bold text-red-400 mt-1 block">{lastSyncResult.excludedCount || 0}</span>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                  <span className="text-[11px] text-gray-400 block">Newly Added</span>
                  <span className="text-base font-bold text-orange-400 mt-1 block">{lastSyncResult.addedCount || 0}</span>
                </div>
              </div>

              {Array.isArray(lastSyncResult.addedEmails) && lastSyncResult.addedEmails.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-semibold text-gray-300 block mb-2">
                    Newly Added Members ({lastSyncResult.addedEmails.length}):
                  </span>
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-800 bg-gray-950/80 p-2.5 font-mono text-[11px] text-orange-300 space-y-1">
                    {lastSyncResult.addedEmails.map((email: string) => (
                      <div key={email} className="truncate">
                        + {email}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
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
