import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Send,
  Zap,
  RefreshCw,
  Search,
  History,
  Plus,
  Eye,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  X,
  Clock,
  Mail,
  User,
  Paperclip,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Download,
  Code,
  Reply,
  Forward,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Sliders,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { emailApi } from '../services/api';

export interface EmailHistoryItem {
  id: string;
  sender: string;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  status: 'sent' | 'failed' | string;
  messageId?: string;
  errorMessage?: string | null;
  attachments_meta?: Array<{
    name?: string;
    filename?: string;
    type?: string;
    size?: number;
    image?: string;
    pdf?: string;
  }>;
  hasAttachments?: boolean;
  attachmentsCount?: number;
  createdAt: string;
  html?: string;
}

interface AdminMessageHistoryTabProps {
  onComposeClick: () => void;
  onReplyClick?: (email: { to: string; subject: string; bodyHtml?: string }) => void;
  onForwardClick?: (email: { subject: string; bodyHtml?: string }) => void;
  showConfirmDialog: (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: { confirmText?: string; cancelText?: string; intent?: 'danger' | 'warning' | 'info' }
  ) => void;
  showToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminMessageHistoryTab: React.FC<AdminMessageHistoryTabProps> = ({
  onComposeClick,
  onReplyClick,
  onForwardClick,
  showConfirmDialog,
  showToast,
}) => {
  // 1. Data State
  const [logs, setLogs] = useState<EmailHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Keep stable reference to showToast to prevent effect re-triggering loops
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // 2. Metrics & Counts State
  const [totalCount, setTotalCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);

  // 3. Search & Filters State
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7days' | '30days' | '90days'>('30days');

  // 4. Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState(1);
  const [goToPageInput, setGoToPageInput] = useState('');

  // 5. Message Detail Modal State (On-Demand Loading)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<EmailHistoryItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [isRecipientsExpanded, setIsRecipientsExpanded] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(false);

  // 6. Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== appliedSearch) {
        setAppliedSearch(trimmed);
        setCurrentPage(1);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, appliedSearch]);

  // 7. Data Fetching (Server-Side Pagination & Filter)
  const fetchLogs = useCallback(
    async (
      pageToFetch: number,
      sizeToFetch: number,
      statusToFetch: string,
      searchToFetch: string,
      rangeToFetch: string,
      signal?: AbortSignal,
      isManualRefresh = false
    ) => {
      if (!isManualRefresh) {
        setIsLoading(true);
      }
      setFetchError(null);

      try {
        const res = await emailApi.getHistory(
          {
            page: pageToFetch,
            pageSize: sizeToFetch,
            status: statusToFetch === 'all' ? undefined : statusToFetch,
            search: searchToFetch || undefined,
            dateRange: rangeToFetch,
          },
          signal
        );

        if (res.data && res.data.success) {
          const list = Array.isArray(res.data.data) ? res.data.data : [];
          setLogs(list);
          setFilteredTotal(typeof res.data.total === 'number' ? res.data.total : list.length);
          setTotalCount(typeof res.data.totalCount === 'number' ? res.data.totalCount : res.data.total || list.length);
          setSentCount(typeof res.data.sentCount === 'number' ? res.data.sentCount : list.filter((l: any) => l.status === 'sent').length);
          setFailedCount(typeof res.data.failedCount === 'number' ? res.data.failedCount : list.filter((l: any) => l.status === 'failed').length);
          setTotalPages(Math.max(1, res.data.totalPages || Math.ceil((res.data.total || list.length) / sizeToFetch)));
          if (res.data.page && res.data.page !== pageToFetch) {
            setCurrentPage(res.data.page);
          }
          setFetchError(null);
        } else if (res.data && Array.isArray(res.data.data)) {
          setLogs(res.data.data);
          setFilteredTotal(res.data.data.length);
          setTotalCount(res.data.data.length);
          setFetchError(null);
        }
      } catch (err: any) {
        // Drop cancelled / aborted requests silently without error UI
        if (
          err.name === 'CanceledError' ||
          err.name === 'AbortError' ||
          err.code === 'ERR_CANCELED' ||
          err.message === 'canceled'
        ) {
          return;
        }

        console.error('Failed to load email history:', err);
        const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout') || err.message?.includes('15000ms');
        const userMsg = isTimeout
          ? 'Request timed out. Please try again.'
          : (err.response?.data?.message || err.message || 'Unable to load message history.');
        
        setFetchError(userMsg);
        showToastRef.current?.('Unable to load message history', userMsg, 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  // Trigger fetch on dependencies change with AbortController
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchLogs(currentPage, pageSize, statusFilter, appliedSearch, dateRangeFilter, controller.signal, false);

    return () => {
      controller.abort();
    };
  }, [currentPage, pageSize, statusFilter, appliedSearch, dateRangeFilter, fetchLogs]);

  // Refresh handler (single request with cancellation)
  const handleRefresh = async () => {
    if (isRefreshing || isLoading) return;
    setIsRefreshing(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    await fetchLogs(currentPage, pageSize, statusFilter, appliedSearch, dateRangeFilter, controller.signal, true);
    if (!fetchError) {
      showToastRef.current?.('Email history refreshed', 'Loaded latest encrypted logs from Supabase', 'success');
    }
  };

  // Retry handler after failure
  const handleRetry = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchLogs(currentPage, pageSize, statusFilter, appliedSearch, dateRangeFilter, controller.signal, false);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setStatusFilter('all');
    setDateRangeFilter('30days');
    setPageSize(20);
    setCurrentPage(1);
    setFetchError(null);
  };

  // On-demand message detail fetching
  const openMessageDetail = async (id: string, initialItem?: EmailHistoryItem) => {
    setSelectedMessageId(id);
    setSelectedDetail(initialItem || null);
    setShowHtmlSource(false);
    setIsRecipientsExpanded(false);
    setCopiedMsgId(false);
    setIsLoadingDetail(true);

    try {
      const res = await emailApi.getHistoryById(id);
      if (res.data && res.data.success && res.data.data) {
        setSelectedDetail(res.data.data);
      } else {
        // Fallback to initial item if detail endpoint doesn't return full body
        setSelectedDetail((prev) => prev || initialItem || null);
      }
    } catch (err: any) {
      console.warn('Could not fetch single email detail:', err);
      if (!initialItem) {
        showToast('Unable to load message body', err.message || 'Please retry', 'error');
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Delete message record
  const handleDeleteLog = (item: EmailHistoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    showConfirmDialog(
      'Delete Email Log Record',
      `Are you sure you want to delete this email log record for "${item.subject}" from Supabase?`,
      async () => {
        try {
          await emailApi.deleteHistory(item.id);
          showToast('Email log record deleted successfully', undefined, 'success');
          if (selectedMessageId === item.id) {
            setSelectedMessageId(null);
            setSelectedDetail(null);
          }
          // Reload current page
          fetchLogs(currentPage, pageSize, statusFilter, appliedSearch, dateRangeFilter);
        } catch (err: any) {
          showToast('Failed to delete email record', err.message || 'Error occurred', 'error');
        }
      },
      { confirmText: 'Yes, Delete Record', intent: 'danger' }
    );
  };

  // Copy Message ID helper
  const handleCopyMessageId = (msgId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(msgId);
    setCopiedMsgId(true);
    showToast('Message ID copied to clipboard', msgId, 'info');
    setTimeout(() => setCopiedMsgId(false), 2000);
  };

  // Handle "Go to Page"
  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(goToPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
      setGoToPageInput('');
    } else {
      showToast('Invalid page number', `Enter a page between 1 and ${totalPages}`, 'warning');
    }
  };

  // Format timestamp helper
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return dateStr;
    }
  };

  // Format file size helper
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Generate page numbers with ellipsis
  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  }, [currentPage, totalPages]);

  // Range start and end text for "Showing X–Y of Z"
  const rangeStart = filteredTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredTotal);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. TOP METRICS CARDS (3-card header matching Image 2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Dispatched Emails */}
        <div className="modern-dashboard-card p-6 flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1.5 z-10">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold block">
              DISPATCHED EMAILS
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white font-display block">
                {totalCount.toLocaleString()}
              </span>
              {filteredTotal !== totalCount && (
                <span className="text-xs font-mono text-slate-400 font-normal">
                  ({filteredTotal} matched)
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-cyan-400 block font-medium">
              End-to-End Encrypted Logs
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-all">
            <Send className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: SMTP Relay Gateway */}
        <div className="modern-dashboard-card p-6 flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1.5 z-10">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold block">
              SMTP RELAY GATEWAY
            </span>
            <span className="text-sm font-bold text-white block font-mono">
              Brevo (smtp-relay.brevo.com)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                Active Gateway (Port 587)
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Storage Security & Refresh */}
        <div className="modern-dashboard-card p-6 flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1.5 z-10">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold block">
              STORAGE SECURITY
            </span>
            <span className="text-sm font-bold text-white block font-mono">
              AES-256 Supabase Tables
            </span>
            <span className="text-[11px] font-mono text-purple-400 block font-bold">
              Metadata Attachments Only
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-200 hover:text-white flex items-center gap-2 shrink-0 cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Refresh logs from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 2. SUB-TABS & DATE RANGE BAR */}
      <div className="glass-panel p-2.5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 transition-all cursor-default"
          >
            <History className="w-4 h-4 text-cyan-400" />
            Sent Logs &amp; History ({totalCount})
          </button>

          <button
            type="button"
            onClick={onComposeClick}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 text-slate-300 hover:text-white hover:bg-white/5 border border-transparent transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            Compose Email
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2 justify-end">
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="pl-8.5 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 transition-all cursor-pointer appearance-none"
            >
              <option value="today" className="bg-[#0f111a] text-white">Today</option>
              <option value="7days" className="bg-[#0f111a] text-white">Last 7 Days</option>
              <option value="30days" className="bg-[#0f111a] text-white">Last 30 Days</option>
              <option value="90days" className="bg-[#0f111a] text-white">Last 90 Days</option>
              <option value="all" className="bg-[#0f111a] text-white">All Time</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS CONTROLS BAR */}
      <div className="glass-panel p-3.5 rounded-2xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by recipient, subject., message ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setAppliedSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls: Status, Rows, Reset */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
          {/* Status Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs font-mono">Status:</span>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="pl-3 pr-7 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none"
              >
                <option value="all" className="bg-[#0f111a] text-white">All</option>
                <option value="sent" className="bg-[#0f111a] text-white">Sent</option>
                <option value="failed" className="bg-[#0f111a] text-white">Failed</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Rows / Page Size Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs font-mono">Rows:</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
                className="pl-3 pr-7 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none"
              >
                <option value={20} className="bg-[#0f111a] text-white">20</option>
                <option value={50} className="bg-[#0f111a] text-white">50</option>
                <option value={100} className="bg-[#0f111a] text-white">100</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            title="Reset all filters"
          >
            <X className="w-3 h-3 text-slate-400" />
            Reset
          </button>
        </div>
      </div>

      {/* 4. MAIN CONTENT VIEW: DESKTOP TABLE / TABLET LIST / MOBILE LIST */}
      <div className="space-y-4">
        {/* Inline error notice if error occurs while cached logs are present */}
        {fetchError && logs.length > 0 && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {isLoading ? (
          /* Loading State Skeleton */
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs font-mono text-slate-300 font-semibold">
                  Loading encrypted email logs from Supabase (Page {currentPage})...
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Rows: {pageSize}</span>
            </div>
            <div className="space-y-2.5">
              {[...Array(Math.min(6, pageSize))].map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse flex items-center px-4 gap-4">
                  <div className="w-6 h-4 rounded bg-white/10"></div>
                  <div className="w-16 h-5 rounded bg-emerald-500/10"></div>
                  <div className="w-44 h-4 rounded bg-white/10"></div>
                  <div className="flex-1 h-4 rounded bg-white/10"></div>
                  <div className="w-32 h-4 rounded bg-white/10"></div>
                </div>
              ))}
            </div>
          </div>
        ) : fetchError && logs.length === 0 ? (
          /* Dedicated Error State with Retry Button */
          <div className="glass-panel p-10 text-center rounded-3xl border border-red-500/20 bg-red-950/10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Unable to load message history</h4>
              <p className="text-xs font-mono text-red-300 max-w-md mx-auto">
                {fetchError}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
              {(appliedSearch || statusFilter !== 'all' || dateRangeFilter !== '30days') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-mono cursor-pointer transition-all"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        ) : logs.length === 0 ? (
          /* Empty State */
          <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
            <Send className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-base font-bold text-white">No Email History Found</h4>
            <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
              {appliedSearch || statusFilter !== 'all' || dateRangeFilter !== 'all'
                ? 'No email logs match your current search or filter criteria. Try resetting filters.'
                : 'Dispatched emails sent via Brevo SMTP will appear here automatically with AES-256 encrypted database storage.'}
            </p>
            {(appliedSearch || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold cursor-pointer hover:bg-cyan-500/30 transition-all"
              >
                Clear Search &amp; Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 4A. DESKTOP VIEW (≥ 1200px / xl:block) - Clean Table Matching Image 2 */}
            <div className="hidden xl:block overflow-hidden rounded-2xl border border-white/10 glass-panel">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4 w-28">Status</th>
                    <th className="py-3.5 px-4 w-64">To</th>
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4 w-44">Sent At</th>
                    <th className="py-3.5 px-4 w-44">Message ID</th>
                    <th className="py-3.5 px-4 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs">
                  {logs.map((log, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const recipientText = Array.isArray(log.recipients)
                      ? log.recipients.join(', ')
                      : String(log.recipients || '');
                    const isSent = (log.status || 'sent').toLowerCase() === 'sent';
                    const formattedMsgId = log.messageId
                      ? log.messageId.length > 18
                        ? `${log.messageId.slice(0, 16)}...`
                        : log.messageId
                      : 'N/A';

                    return (
                      <tr
                        key={log.id || idx}
                        onClick={() => openMessageDetail(log.id, log)}
                        className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        {/* Row Index */}
                        <td className="py-3.5 px-4 text-center text-slate-500 font-bold">
                          {rowNumber}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                              isSent
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}
                          >
                            {isSent ? '✓ SENT' : '✕ FAILED'}
                          </span>
                        </td>

                        {/* Recipient Email */}
                        <td className="py-3.5 px-4 font-sans text-slate-200 font-medium truncate max-w-[240px]">
                          <span title={recipientText} className="truncate block">
                            {recipientText || '(No recipient)'}
                          </span>
                        </td>

                        {/* Subject Line & Attachment Icons */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 max-w-md font-sans">
                            <span className="text-white font-semibold truncate group-hover:text-cyan-300 transition-colors">
                              {log.subject || '(No Subject)'}
                            </span>
                            {log.hasAttachments && (
                              <span className="shrink-0 p-0.5 px-1.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono flex items-center gap-1" title={`${log.attachmentsCount} attachment(s)`}>
                                <Paperclip className="w-2.5 h-2.5" />
                                {log.attachmentsCount}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Sent Timestamp */}
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>

                        {/* Message ID */}
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          <span
                            className="hover:text-cyan-300 transition-colors"
                            title={log.messageId || ''}
                          >
                            {formattedMsgId}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => openMessageDetail(log.id, log)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-all cursor-pointer"
                              title="View Full Decrypted Email"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteLog(log, e)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4B. TABLET VIEW (768px – 1199px / md:block xl:hidden) - Simplified List Cards */}
            <div className="hidden md:block xl:hidden space-y-3">
              {logs.map((log) => {
                const isSent = (log.status || 'sent').toLowerCase() === 'sent';
                const recipientText = Array.isArray(log.recipients)
                  ? log.recipients.join(', ')
                  : String(log.recipients || '');

                return (
                  <div
                    key={log.id}
                    onClick={() => openMessageDetail(log.id, log)}
                    className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer space-y-2.5 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`mt-0.5 p-1.5 rounded-full ${
                            isSent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {isSent ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white text-sm truncate group-hover:text-cyan-300 transition-colors">
                              {log.subject || '(No Subject)'}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 shrink-0">
                              {formatDateTime(log.createdAt)}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-cyan-400 truncate">
                            to: <span className="text-slate-300">{recipientText}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openMessageDetail(log.id, log)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-all"
                          title="View Decrypted Message"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteLog(log, e)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isSent ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {isSent ? '✓ SENT' : '✕ FAILED'}
                      </span>
                      {log.hasAttachments && (
                        <span className="text-cyan-400 flex items-center gap-1 text-[10px]">
                          <Paperclip className="w-3 h-3" /> {log.attachmentsCount} file(s) attached
                        </span>
                      )}
                      <span className="text-slate-500 truncate max-w-[200px]">
                        ID: {log.messageId ? `${log.messageId.slice(0, 16)}...` : 'N/A'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4C. MOBILE VIEW (≤ 767px / block md:hidden) - Touch-Friendly Single Column */}
            <div className="block md:hidden space-y-3">
              {logs.map((log) => {
                const isSent = (log.status || 'sent').toLowerCase() === 'sent';
                const recipientText = Array.isArray(log.recipients)
                  ? log.recipients.join(', ')
                  : String(log.recipients || '');

                return (
                  <div
                    key={log.id}
                    onClick={() => openMessageDetail(log.id, log)}
                    className="glass-panel p-4 rounded-2xl border border-white/10 active:border-cyan-500/60 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className={`mt-0.5 p-1 rounded-full shrink-0 ${
                            isSent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {isSent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h4 className="font-bold text-white text-xs truncate">
                            {log.subject || '(No Subject)'}
                          </h4>
                          <div className="text-[11px] font-mono text-cyan-400 truncate">
                            to: <span className="text-slate-300">{recipientText}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {formatDateTime(log.createdAt).split(',')[0]}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-bold uppercase ${
                          isSent ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {isSent ? '✓ SENT' : '✕ FAILED'}
                      </span>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openMessageDetail(log.id, log)}
                          className="p-1 rounded-lg bg-white/5 text-slate-300 hover:text-cyan-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteLog(log, e)}
                          className="p-1 rounded-lg bg-red-500/10 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5. BOTTOM PAGINATION BAR (Full Featured with Go to Page) */}
            <div className="glass-panel p-3.5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
              {/* Left: Showing Range */}
              <div className="text-slate-400 text-xs font-mono text-center sm:text-left">
                Showing <span className="text-white font-bold">{rangeStart}–{rangeEnd}</span> of{' '}
                <span className="text-white font-bold">{filteredTotal}</span>
              </div>

              {/* Center: Previous / Numbered Pills / Next */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || isLoading}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page Numbers */}
                {paginationRange.map((pageItem, pIdx) => {
                  if (pageItem === '...') {
                    return (
                      <span key={`dots_${pIdx}`} className="px-2 py-1.5 text-slate-500">
                        ...
                      </span>
                    );
                  }

                  const pNum = Number(pageItem);
                  const isActive = pNum === currentPage;

                  return (
                    <button
                      key={`page_${pNum}`}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      disabled={isLoading}
                      className={`min-w-8 h-8 px-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isActive
                          ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 font-extrabold'
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || isLoading}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right: Go to Page */}
              <form onSubmit={handleGoToPage} className="flex items-center gap-2 justify-center sm:justify-end">
                <span className="text-slate-400 text-xs font-mono whitespace-nowrap">Go to page:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  placeholder={String(currentPage)}
                  value={goToPageInput}
                  onChange={(e) => setGoToPageInput(e.target.value)}
                  className="w-12 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white text-center text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={!goToPageInput}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-mono font-bold cursor-pointer transition-all disabled:opacity-40"
                >
                  Go
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* 6. MESSAGE DETAILS MODAL (On-Demand Loading & Safe Sanitization) */}
      <AnimatePresence>
        {selectedMessageId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => {
              setSelectedMessageId(null);
              setSelectedDetail(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#090a10] border border-white/10 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-5 shadow-2xl my-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/10 gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-bold text-white font-display truncate">
                      {selectedDetail?.subject || '(No Subject)'}
                    </h3>
                    {selectedDetail?.status && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          selectedDetail.status.toLowerCase() === 'sent'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}
                      >
                        {selectedDetail.status.toLowerCase() === 'sent' ? '✓ SENT' : '✕ FAILED'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-400 flex-wrap">
                    <span>From: <strong className="text-cyan-300">{selectedDetail?.sender || 'contact@zenemoo.in'}</strong></span>
                    <span>•</span>
                    <span>{formatDateTime(selectedDetail?.createdAt)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMessageId(null);
                    setSelectedDetail(null);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-all"
                  title="Close Window"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Info Panel */}
              <div className="space-y-3 font-mono text-xs bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                {/* Recipients (Collapsible if > 3) */}
                <div>
                  <span className="text-slate-400">Recipients (To):</span>{' '}
                  {selectedDetail?.recipients && selectedDetail.recipients.length > 3 ? (
                    <div>
                      <span className="text-white font-bold">
                        {isRecipientsExpanded
                          ? selectedDetail.recipients.join(', ')
                          : `${selectedDetail.recipients.slice(0, 3).join(', ')} (+${selectedDetail.recipients.length - 3} more)`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsRecipientsExpanded(!isRecipientsExpanded)}
                        className="ml-2 text-cyan-400 hover:underline cursor-pointer font-semibold inline-flex items-center gap-0.5"
                      >
                        {isRecipientsExpanded ? 'Hide' : 'Show all recipients'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-white font-bold">
                      {Array.isArray(selectedDetail?.recipients)
                        ? selectedDetail.recipients.join(', ')
                        : selectedDetail?.recipients || 'N/A'}
                    </span>
                  )}
                </div>

                {selectedDetail?.cc && selectedDetail.cc.length > 0 && (
                  <div>
                    <span className="text-slate-400">CC:</span>{' '}
                    <span className="text-slate-200">
                      {Array.isArray(selectedDetail.cc) ? selectedDetail.cc.join(', ') : selectedDetail.cc}
                    </span>
                  </div>
                )}

                {selectedDetail?.bcc && selectedDetail.bcc.length > 0 && (
                  <div>
                    <span className="text-slate-400">BCC:</span>{' '}
                    <span className="text-slate-200">
                      {Array.isArray(selectedDetail.bcc) ? selectedDetail.bcc.join(', ') : selectedDetail.bcc}
                    </span>
                  </div>
                )}

                {/* Message ID with Copy */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400">Brevo Message ID:</span>
                  <span className="text-cyan-400 font-mono select-all">
                    {selectedDetail?.messageId || 'N/A'}
                  </span>
                  {selectedDetail?.messageId && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyMessageId(selectedDetail.messageId!, e)}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 cursor-pointer"
                      title="Copy Message ID"
                    >
                      {copiedMsgId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {selectedDetail?.errorMessage && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                    <span className="font-bold">Error:</span> {selectedDetail.errorMessage}
                  </div>
                )}

                {/* Attachment Chips */}
                {selectedDetail?.attachments_meta && selectedDetail.attachments_meta.length > 0 && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <span className="text-slate-400 font-bold block">Attachments:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedDetail.attachments_meta.map((att, idx) => {
                        const filename = att.filename || att.name || `attachment_${idx + 1}`;
                        const sizeStr = formatFileSize(att.size);
                        return (
                          <div
                            key={idx}
                            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-cyan-300 text-xs flex items-center gap-2"
                          >
                            <Paperclip className="w-3 h-3 text-cyan-400" />
                            <span className="font-semibold text-white">{filename}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({sizeStr})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Message Body Display (Sanitized Rendered HTML with Source Toggle) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 font-bold">
                    Decrypted Email Body:
                  </span>
                  {selectedDetail?.html && (
                    <button
                      type="button"
                      onClick={() => setShowHtmlSource(!showHtmlSource)}
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                      {showHtmlSource ? 'View Rendered Content' : 'View HTML Source'}
                    </button>
                  )}
                </div>

                {isLoadingDetail ? (
                  <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center gap-2 text-slate-400 font-mono text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    Fetching decrypted message body...
                  </div>
                ) : showHtmlSource ? (
                  /* Raw HTML Source Block */
                  <pre className="p-4 rounded-2xl bg-[#040508] border border-white/10 text-slate-300 font-mono text-xs leading-relaxed max-h-96 overflow-auto whitespace-pre-wrap select-all">
                    {selectedDetail?.html || '(No HTML content)'}
                  </pre>
                ) : (
                  /* Sanitized Rendered HTML Block */
                  <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0e17] border border-white/10 text-slate-200 font-sans text-sm leading-relaxed max-h-96 overflow-y-auto shadow-inner">
                    {selectedDetail?.html ? (
                      <div
                        className="email-render-container prose prose-invert max-w-none text-slate-200 break-words"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(selectedDetail.html, {
                            USE_PROFILES: { html: true },
                            ADD_ATTR: ['target'],
                          }),
                        }}
                      />
                    ) : (
                      <p className="text-slate-400 font-mono text-xs italic">
                        (No message body content found for this email record.)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions: Reply, Forward, Delete, Close */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {onReplyClick && selectedDetail && (
                    <button
                      type="button"
                      onClick={() => {
                        const recStr = Array.isArray(selectedDetail.recipients)
                          ? selectedDetail.recipients[0] || ''
                          : String(selectedDetail.recipients || '');
                        onReplyClick({
                          to: recStr,
                          subject: `Re: ${selectedDetail.subject}`,
                          bodyHtml: selectedDetail.html,
                        });
                        setSelectedMessageId(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                  )}

                  {onForwardClick && selectedDetail && (
                    <button
                      type="button"
                      onClick={() => {
                        onForwardClick({
                          subject: `Fwd: ${selectedDetail.subject}`,
                          bodyHtml: selectedDetail.html,
                        });
                        setSelectedMessageId(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Forward className="w-3.5 h-3.5" /> Forward
                    </button>
                  )}

                  {selectedDetail && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLog(selectedDetail)}
                      className="px-3.5 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMessageId(null);
                    setSelectedDetail(null);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold cursor-pointer transition-all"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
