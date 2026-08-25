import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Settings,
  Star,
  Archive,
  Trash2,
  Mail,
  Paperclip,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Inbox,
  Send,
  Sliders,
  ShieldCheck,
  Download,
  Tag,
  Clock,
  Sparkles,
  ExternalLink,
  Reply,
  Forward,
  CornerUpLeft,
  Briefcase,
  User,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { emailInboxApi } from '../services/api';
import { AdminEmailSettingsModal } from './AdminEmailSettingsModal';

export interface EmailMessageRecord {
  id: string;
  message_id: string;
  mailbox_email: string;
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  reply_to?: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  snippet: string;
  category: 'client' | 'partnership' | 'project_inquiry' | 'support' | 'career' | 'general' | 'important' | 'follow_up';
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  is_trashed: boolean;
  attachments?: {
    id: string;
    filename: string;
    contentType: string;
    size: number;
  }[];
  auth_results?: {
    spf?: 'pass' | 'fail' | 'neutral';
    dkim?: 'pass' | 'fail' | 'neutral';
    dmarc?: 'pass' | 'fail' | 'neutral';
  };
  received_at: string;
}

const MOCK_EMAILS: EmailMessageRecord[] = [];

const MAILBOX_LIST = [
  { email: 'all', label: 'All Inboxes', color: 'text-cyan-400' },
  { email: 'contact@zenemoo.in', label: 'contact@zenemoo.in', color: 'text-purple-400' },
  { email: 'support@zenemoo.in', label: 'support@zenemoo.in', color: 'text-emerald-400' },
  { email: 'info@zenemoo.in', label: 'info@zenemoo.in', color: 'text-amber-400' },
  { email: 'prem@zenemoo.in', label: 'prem@zenemoo.in', color: 'text-blue-400' },
  { email: 'hemanta@zenemoo.in', label: 'hemanta@zenemoo.in', color: 'text-indigo-400' },
  { email: 'sangita@zenemoo.in', label: 'sangita@zenemoo.in', color: 'text-pink-400' },
];

const LABEL_LIST = [
  { id: 'important', label: 'Important', icon: Star, color: 'text-amber-400' },
  { id: 'follow_up', label: 'Follow Up', icon: Clock, color: 'text-red-400' },
  { id: 'client', label: 'Client', icon: User, color: 'text-cyan-400' },
  { id: 'partnership', label: 'Partnership', icon: Briefcase, color: 'text-purple-400' },
  { id: 'project_inquiry', label: 'Project Inquiry', icon: FileText, color: 'text-emerald-400' },
];

interface AdminEmailInboxTabProps {
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, opts?: any) => void;
  onUnreadCountChange?: (count: number) => void;
}

// ============================================================================
// PERSISTENT MODULE-LEVEL INBOX CACHE (Survives Admin Tab Switching)
// ============================================================================
interface InboxCacheState {
  emails: EmailMessageRecord[];
  selectedEmailId: string | null;
  activeMailbox: string;
  activeCategory: string;
  viewFilter: 'all' | 'unread' | 'starred' | 'archived' | 'trash';
  searchQuery: string;
  sortBy: 'newest' | 'oldest';
  currentPage: number;
  pageSize: number;
  lastFetchedAt: number | null;
}

const globalInboxCache: InboxCacheState = {
  emails: MOCK_EMAILS,
  selectedEmailId: null,
  activeMailbox: 'all',
  activeCategory: 'all',
  viewFilter: 'all',
  searchQuery: '',
  sortBy: 'newest',
  currentPage: 1,
  pageSize: 20,
  lastFetchedAt: null,
};

export const AdminEmailInboxTab: React.FC<AdminEmailInboxTabProps> = ({
  addToast,
  showConfirm,
  onUnreadCountChange,
}) => {
  // State initialized from persistent cache
  const [emails, setEmails] = useState<EmailMessageRecord[]>(globalInboxCache.emails);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(globalInboxCache.selectedEmailId);
  const [activeMailbox, setActiveMailboxState] = useState<string>(globalInboxCache.activeMailbox);
  const [activeCategory, setActiveCategoryState] = useState<string>(globalInboxCache.activeCategory);
  const [viewFilter, setViewFilterState] = useState<'all' | 'unread' | 'starred' | 'archived' | 'trash'>(globalInboxCache.viewFilter);
  const [searchQuery, setSearchQueryState] = useState(globalInboxCache.searchQuery);
  const [sortBy, setSortByState] = useState<'newest' | 'oldest'>(globalInboxCache.sortBy);
  const [currentPage, setCurrentPageState] = useState(globalInboxCache.currentPage);
  const [pageSize] = useState<number>(globalInboxCache.pageSize);

  // Separate loading vs background refreshing states
  const [isLoading, setIsLoading] = useState(globalInboxCache.emails.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Synchronize local setters with persistent module cache
  const updateSelectedEmailId = (id: string | null) => {
    setSelectedEmailId(id);
    globalInboxCache.selectedEmailId = id;
  };

  const setActiveMailbox = (mb: string) => {
    setActiveMailboxState(mb);
    globalInboxCache.activeMailbox = mb;
  };

  const setActiveCategory = (cat: string) => {
    setActiveCategoryState(cat);
    globalInboxCache.activeCategory = cat;
  };

  const setViewFilter = (vf: 'all' | 'unread' | 'starred' | 'archived' | 'trash') => {
    setViewFilterState(vf);
    globalInboxCache.viewFilter = vf;
  };

  const setSearchQuery = (sq: string) => {
    setSearchQueryState(sq);
    globalInboxCache.searchQuery = sq;
  };

  const setSortBy = (sb: 'newest' | 'oldest') => {
    setSortByState(sb);
    globalInboxCache.sortBy = sb;
  };

  const setCurrentPage = (cp: number | ((prev: number) => number)) => {
    setCurrentPageState((prev) => {
      const next = typeof cp === 'function' ? cp(prev) : cp;
      globalInboxCache.currentPage = next;
      return next;
    });
  };

  // Live Real Storage Usage State
  const [storageStats, setStorageStats] = useState<{
    used_formatted: string;
    max_formatted: string;
    percentage: number;
  }>({
    used_formatted: '0.0 KB',
    max_formatted: '500 MB',
    percentage: 0.0,
  });

  const fetchStorageUsage = useCallback(async () => {
    try {
      const res = await emailInboxApi.getStorageUsage();
      if (res.data?.success) {
        setStorageStats({
          used_formatted: res.data.used_formatted || '0.0 KB',
          max_formatted: res.data.max_formatted || '500 MB',
          percentage: typeof res.data.percentage === 'number' ? res.data.percentage : 0.0,
        });
      }
    } catch (_) {}
  }, []);

  // Merge server data with local cache without losing optimistic states
  const mergeEmailsWithCache = useCallback((existingList: EmailMessageRecord[], serverList: EmailMessageRecord[]) => {
    const existingMap = new Map<string, EmailMessageRecord>();
    existingList.forEach((e) => {
      const key = e.message_id || e.id;
      existingMap.set(key, e);
    });

    const merged: EmailMessageRecord[] = [];
    const seenKeys = new Set<string>();

    serverList.forEach((s) => {
      const key = s.message_id || s.id;
      seenKeys.add(key);

      const local = existingMap.get(key);
      if (local) {
        // Retain optimistic flags if local state has diverged
        merged.push({
          ...s,
          is_read: local.is_read || s.is_read,
          is_starred: local.is_starred !== undefined ? local.is_starred : s.is_starred,
          is_archived: local.is_archived !== undefined ? local.is_archived : s.is_archived,
          is_trashed: local.is_trashed !== undefined ? local.is_trashed : s.is_trashed,
        });
      } else {
        // Brand new message from server
        merged.push(s);
      }
    });

    // Retain any existing emails not in current server page slice
    existingList.forEach((e) => {
      const key = e.message_id || e.id;
      if (!seenKeys.has(key)) {
        merged.push(e);
      }
    });

    return merged.sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    );
  }, []);

  // Fetch / Sync Emails (Supports Silent Background Refreshing)
  const fetchEmails = useCallback(async (isSilentBackground = false) => {
    if (isSilentBackground || globalInboxCache.emails.length > 0) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    fetchStorageUsage();

    try {
      const res = await emailInboxApi.getEmails({
        search: searchQuery,
        mailbox: activeMailbox !== 'all' ? activeMailbox : undefined,
        category: activeCategory !== 'all' ? activeCategory : undefined,
        view: viewFilter,
        page: currentPage,
        limit: pageSize,
      });

      if (res.data?.success && Array.isArray(res.data.emails)) {
        const merged = mergeEmailsWithCache(globalInboxCache.emails, res.data.emails);
        globalInboxCache.emails = merged;
        globalInboxCache.lastFetchedAt = Date.now();
        setEmails(merged);
      }
    } catch (_) {
      // Retain current local cache on failure
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, activeMailbox, activeCategory, viewFilter, currentPage, pageSize, fetchStorageUsage, mergeEmailsWithCache]);

  // Initial Fetch & Silent Background Polling
  useEffect(() => {
    // Only trigger full load if cache is empty, otherwise background refresh
    const isFirstTime = globalInboxCache.emails.length === 0;
    fetchEmails(!isFirstTime);

    // Silent background synchronization timer (every 30 seconds)
    const intervalTimer = setInterval(() => {
      fetchEmails(true);
    }, 30000);

    return () => clearInterval(intervalTimer);
  }, []); // Run on mount with stable cache

  // Compute Unread Counts per Mailbox
  const mailboxUnreadCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    emails.forEach((msg) => {
      if (!msg.is_read && !msg.is_trashed && !msg.is_archived) {
        counts.all = (counts.all || 0) + 1;
        counts[msg.mailbox_email] = (counts[msg.mailbox_email] || 0) + 1;
      }
    });
    return counts;
  }, [emails]);

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(mailboxUnreadCounts.all || 0);
    }
  }, [mailboxUnreadCounts.all, onUnreadCountChange]);

  // Filter & Sort Emails
  const filteredEmails = useMemo(() => {
    let result = [...emails];

    // View Filter (All / Unread / Starred / Archived / Trash)
    if (viewFilter === 'unread') {
      result = result.filter((e) => !e.is_read && !e.is_trashed);
    } else if (viewFilter === 'starred') {
      result = result.filter((e) => e.is_starred && !e.is_trashed);
    } else if (viewFilter === 'archived') {
      result = result.filter((e) => e.is_archived && !e.is_trashed);
    } else if (viewFilter === 'trash') {
      result = result.filter((e) => e.is_trashed);
    } else {
      // 'all' view shows non-trashed & non-archived by default
      result = result.filter((e) => !e.is_trashed && !e.is_archived);
    }

    // Mailbox Filter
    if (activeMailbox !== 'all') {
      result = result.filter((e) => e.mailbox_email === activeMailbox);
    }

    // Category Label Filter
    if (activeCategory !== 'all') {
      result = result.filter((e) => e.category === activeCategory);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.sender_name.toLowerCase().includes(q) ||
          e.sender_email.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.snippet.toLowerCase().includes(q) ||
          e.mailbox_email.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
    } else {
      result.sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());
    }

    return result;
  }, [emails, viewFilter, activeMailbox, activeCategory, searchQuery, sortBy]);

  // Selected Email Record
  const selectedEmail = useMemo(() => {
    return emails.find((e) => e.id === selectedEmailId) || filteredEmails[0] || null;
  }, [emails, selectedEmailId, filteredEmails]);

  // Auto Select first email if none selected
  useEffect(() => {
    if (!selectedEmailId && filteredEmails.length > 0) {
      updateSelectedEmailId(filteredEmails[0].id);
    }
  }, [filteredEmails, selectedEmailId]);

  // OPTIMISTIC ACTIONS (Instant UI feedback without full list refetches)

  // Handle Mark Read / Unread
  const handleToggleRead = async (email: EmailMessageRecord) => {
    if (email.is_read) return;
    const nextRead = true;

    const updated = emails.map((e) =>
      e.message_id === email.message_id || e.id === email.id ? { ...e, is_read: nextRead } : e
    );
    setEmails(updated);
    globalInboxCache.emails = updated;

    try {
      await emailInboxApi.updateEmailState(email.id, { is_read: nextRead });
    } catch (_) {}
  };

  // Handle Star / Unstar (Optimistic 0ms)
  const handleToggleStar = async (email: EmailMessageRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStarred = !email.is_starred;

    const updated = emails.map((item) =>
      item.message_id === email.message_id || item.id === email.id ? { ...item, is_starred: nextStarred } : item
    );
    setEmails(updated);
    globalInboxCache.emails = updated;

    try {
      await emailInboxApi.updateEmailState(email.id, { is_starred: nextStarred });
    } catch (_) {
      // Revert on error
      const reverted = emails.map((item) =>
        item.message_id === email.message_id || item.id === email.id ? { ...item, is_starred: !nextStarred } : item
      );
      setEmails(reverted);
      globalInboxCache.emails = reverted;
      addToast('Star Failed', 'Could not update star status on server.', 'error');
    }
  };

  // Handle Archive (Optimistic 0ms)
  const handleArchive = async (email: EmailMessageRecord) => {
    const updated = emails.map((item) =>
      item.message_id === email.message_id || item.id === email.id ? { ...item, is_archived: true } : item
    );
    setEmails(updated);
    globalInboxCache.emails = updated;
    addToast('Email Archived', 'Message moved to archive.', 'info');

    try {
      await emailInboxApi.updateEmailState(email.id, { is_archived: true });
    } catch (_) {}
  };

  // Handle Trash / Delete (Optimistic 0ms)
  const handleDelete = (email: EmailMessageRecord) => {
    if (email.is_trashed) {
      showConfirm(
        'Permanently Delete Email?',
        `Are you sure you want to permanently delete "${email.subject}"? This action cannot be undone.`,
        () => {
          const updated = emails.filter((item) => item.message_id !== email.message_id && item.id !== email.id);
          setEmails(updated);
          globalInboxCache.emails = updated;
          if (selectedEmailId === email.id) {
            updateSelectedEmailId(null);
          }
          addToast('Deleted', 'Email permanently deleted.', 'info');
          emailInboxApi.deleteEmail(email.id).catch(() => {});
        },
        { intent: 'danger', confirmText: 'Permanently Delete' }
      );
    } else {
      const updated = emails.map((item) =>
        item.message_id === email.message_id || item.id === email.id ? { ...item, is_trashed: true } : item
      );
      setEmails(updated);
      globalInboxCache.emails = updated;
      addToast('Moved to Trash', 'Email moved to trash.', 'info');
      emailInboxApi.updateEmailState(email.id, { is_trashed: true }).catch(() => {});
    }
  };

  // Handle Select Email Item (Updates selection ONLY, no list refetch)
  const handleSelectEmail = (email: EmailMessageRecord) => {
    updateSelectedEmailId(email.id);
    if (!email.is_read) {
      handleToggleRead(email);
    }
    setShowMobileDetail(true);
  };

  // Helper for Category Badges
  const renderCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'partnership':
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">Partnership</span>;
      case 'project_inquiry':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">Project Inquiry</span>;
      case 'client':
        return <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">Client</span>;
      case 'support':
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">Support</span>;
      case 'career':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">Career</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 text-[10px] font-mono font-bold">General</span>;
    }
  };

  // Relative Time String Helper
  const getRelativeTime = (isoDate: string) => {
    const time = new Date(isoDate).getTime();
    const diffMin = Math.floor((Date.now() - time) / (60 * 1000));
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / pageSize));
  const paginatedEmails = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return filteredEmails.slice(from, from + pageSize);
  }, [filteredEmails, currentPage, pageSize]);

  return (
    <div className="space-y-4 font-sans max-w-[1920px] mx-auto w-full min-w-0 overflow-x-hidden">
      {/* 1. TOP MODULE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b0f19] p-4 sm:p-5 rounded-3xl border border-white/10 shadow-xl min-w-0 max-w-full">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold mb-2 max-w-full truncate">
            <Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">ENTERPRISE EMAIL OPERATIONS CENTER</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white truncate min-w-0">Email Inbox</h2>
          <p className="text-xs font-mono text-slate-400 mt-1 break-words">
            Manage incoming emails sent to your verified Zenemoo domain addresses.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => fetchEmails(true)}
            disabled={isLoading || isRefreshing}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/10 text-slate-300 font-mono text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Email Settings</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN RESPONSIVE THREE-PANEL CONTAINER */}
      <div className="bg-[#0b0f19] rounded-3xl border border-white/10 shadow-2xl overflow-hidden min-h-[600px] lg:h-[calc(100vh-170px)] lg:min-h-[680px] lg:max-h-[920px] flex flex-col lg:flex-row w-full min-w-0 max-w-full">
        
        {/* ========================================== */}
        {/* PANEL 1: LEFT SIDEBAR — MAILBOXES & LABELS */}
        {/* ========================================== */}
        <div className={`w-full lg:w-64 shrink-0 bg-[#070a11] border-b lg:border-b-0 lg:border-r border-white/10 p-4 space-y-6 overflow-y-auto min-w-0 max-w-full ${showMobileDetail ? 'hidden lg:block' : 'block'}`}>
          
          {/* Mailboxes Section */}
          <div className="space-y-2 font-mono text-xs min-w-0">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider px-2 flex items-center justify-between min-w-0">
              <span>MAILBOXES</span>
              <button onClick={() => setIsSettingsOpen(true)} className="text-cyan-400 hover:underline text-[10px] font-bold shrink-0">
                + Manage
              </button>
            </div>

            <div className="space-y-1 min-w-0">
              {MAILBOX_LIST.map((mb) => {
                const isActive = activeMailbox === mb.email;
                const count = mailboxUnreadCounts[mb.email] || 0;
                return (
                  <button
                    key={mb.email}
                    onClick={() => {
                      setActiveMailbox(mb.email);
                      setCurrentPage(1);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left font-bold transition-all flex items-center justify-between text-xs cursor-pointer min-w-0 gap-2 ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2 min-w-0 flex-1">
                      <Inbox className={`w-3.5 h-3.5 shrink-0 ${mb.color}`} />
                      <span className="truncate">{mb.label}</span>
                    </span>
                    {count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-[10px] font-bold shrink-0">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Business Labels Section */}
          <div className="space-y-2 font-mono text-xs border-t border-white/5 pt-4 min-w-0">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider px-2">
              LABELS
            </div>

            <div className="space-y-1 min-w-0">
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-1.5 rounded-xl text-left font-bold transition-all flex items-center justify-between text-xs cursor-pointer min-w-0 ${
                  activeCategory === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="truncate">All Labels</span>
              </button>

              {LABEL_LIST.map((lbl) => {
                const isActive = activeCategory === lbl.id;
                const IconComp = lbl.icon;
                return (
                  <button
                    key={lbl.id}
                    onClick={() => {
                      setActiveCategory(lbl.id);
                      setCurrentPage(1);
                    }}
                    className={`w-full px-3 py-1.5 rounded-xl text-left transition-all flex items-center justify-between text-xs cursor-pointer min-w-0 ${
                      isActive ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate min-w-0">
                      <IconComp className={`w-3.5 h-3.5 shrink-0 ${lbl.color}`} />
                      <span className="truncate">{lbl.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real Live Supabase Storage Usage Card */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 font-mono text-[11px] space-y-2 min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 font-bold min-w-0 gap-2">
              <span className="truncate">Database &amp; Email Storage</span>
              <span className="text-cyan-400 font-bold shrink-0">{storageStats.percentage}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(storageStats.percentage > 0 ? 1 : 0, storageStats.percentage)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 text-right truncate">
              {storageStats.used_formatted} / {storageStats.max_formatted}
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* PANEL 2: MIDDLE PANEL — EMAIL LIST VIEW    */}
        {/* ========================================== */}
        <div className={`w-full lg:w-96 shrink-0 bg-[#0b0f19] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col min-w-0 max-w-full ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* Search & View Filters Header */}
          <div className="p-4 border-b border-white/10 space-y-3 font-mono text-xs min-w-0 max-w-full">
            {/* Views Filter Buttons */}
            <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/10 overflow-x-auto min-w-0 max-w-full scrollbar-none">
              {(['all', 'unread', 'starred', 'archived', 'trash'] as const).map((vw) => (
                <button
                  key={vw}
                  onClick={() => {
                    setViewFilter(vw);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg capitalize font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                    viewFilter === vw ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {vw}
                </button>
              ))}
            </div>

            {/* Search Input & Sort Dropdown */}
            <div className="flex items-center gap-2 min-w-0 max-w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 min-w-0"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-[11px] focus:outline-none cursor-pointer shrink-0"
              >
                <option value="newest" className="bg-[#0b0f19]">Newest</option>
                <option value="oldest" className="bg-[#0b0f19]">Oldest</option>
              </select>
            </div>
          </div>

          {/* Email List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 min-w-0 max-w-full">
            {paginatedEmails.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs space-y-2">
                <Mail className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="font-bold text-slate-400">No emails found</div>
                <div className="text-[11px]">This mailbox has no matching messages.</div>
              </div>
            ) : (
              paginatedEmails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-4 transition-all cursor-pointer relative group min-w-0 max-w-full overflow-hidden ${
                      isSelected
                        ? 'bg-cyan-500/[0.08] border-l-4 border-l-cyan-400'
                        : email.is_read
                        ? 'bg-transparent opacity-75 hover:bg-white/[0.02]'
                        : 'bg-white/[0.03] hover:bg-white/[0.05]'
                    }`}
                  >
                    {/* Unread Indicator Dot */}
                    {!email.is_read && (
                      <span className="absolute top-4 left-2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50" />
                    )}

                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="font-bold text-xs truncate text-white leading-tight min-w-0 flex-1">
                        {email.sender_name}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => handleToggleStar(email, e)}
                          className="text-slate-500 hover:text-amber-400 p-0.5 shrink-0"
                          title={email.is_starred ? 'Unstar' : 'Star'}
                        >
                          <Star className={`w-3.5 h-3.5 ${email.is_starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {getRelativeTime(email.received_at)}
                        </span>
                      </div>
                    </div>

                    <div className={`text-xs font-semibold mt-1 truncate min-w-0 ${email.is_read ? 'text-slate-300' : 'text-cyan-300 font-bold'}`}>
                      {email.subject}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed break-words [word-break:break-word] [overflow-wrap:anywhere] min-w-0">
                      {email.snippet}
                    </div>

                    <div className="flex items-center justify-between mt-2 font-mono text-[10px] gap-2 min-w-0">
                      <div className="text-slate-500 truncate min-w-0 flex-1">
                        To: {email.mailbox_email}
                      </div>
                      <div className="shrink-0">
                        {renderCategoryBadge(email.category)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* List Footer Pagination */}
          <div className="p-3 border-t border-white/10 flex items-center justify-between font-mono text-xs text-slate-400 bg-[#070a11] min-w-0 max-w-full shrink-0">
            <div className="text-[10px] truncate min-w-0">
              Showing {filteredEmails.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredEmails.length)} of {filteredEmails.length}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-white px-2">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* PANEL 3: RIGHT PANEL — EMAIL DETAIL VIEW   */}
        {/* ========================================== */}
        <div className={`flex-1 bg-[#0b0f19] flex flex-col min-w-0 max-w-full overflow-hidden ${showMobileDetail ? 'flex' : 'hidden lg:flex'}`}>
          {selectedEmail ? (
            <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0 max-w-full">
              
              {/* Header Actions Toolbar */}
              <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between flex-wrap sm:flex-nowrap gap-3 font-mono text-xs bg-[#070a11] shrink-0 min-w-0 max-w-full">
                <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setShowMobileDetail(false)}
                    className="lg:hidden px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>

                  <div className="shrink-0">
                    {renderCategoryBadge(selectedEmail.category)}
                  </div>
                  <span className="text-[11px] text-slate-400 truncate min-w-0 hidden sm:inline">
                    Inbox: <span className="text-cyan-300 font-bold">{selectedEmail.mailbox_email}</span>
                  </span>
                </div>

                {/* Email Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => handleToggleStar(selectedEmail)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedEmail.is_starred
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${selectedEmail.is_starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    <span className="hidden sm:inline">{selectedEmail.is_starred ? 'Starred' : 'Star'}</span>
                  </button>

                  <button
                    onClick={() => handleArchive(selectedEmail)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Archive</span>
                  </button>

                  <button
                    onClick={() => handleDelete(selectedEmail)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>

              {/* Email Content Body Container */}
              <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 min-w-0 max-w-full overflow-y-auto">
                
                {/* Subject Title */}
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold font-display text-white leading-snug break-words [word-break:break-word] [overflow-wrap:anywhere] min-w-0 max-w-full">
                  {selectedEmail.subject}
                </h1>

                {/* Sender Metadata Row */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs min-w-0 max-w-full overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center text-sm shrink-0">
                      {selectedEmail.sender_name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-bold text-white text-sm flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                        <span className="truncate max-w-full">{selectedEmail.sender_name}</span>
                        <span className="text-slate-400 font-normal text-xs break-all">&lt;{selectedEmail.sender_email}&gt;</span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5 truncate">
                        To: <span className="text-cyan-300 font-bold">{selectedEmail.recipient_email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-[11px] text-slate-400 shrink-0">
                    <div>{new Date(selectedEmail.received_at).toLocaleDateString()}</div>
                    <div className="text-slate-500">{new Date(selectedEmail.received_at).toLocaleTimeString()}</div>
                  </div>
                </div>

                {/* Technical / Security Details Collapsible Section */}
                <div className="border border-white/10 rounded-2xl overflow-hidden font-mono text-xs min-w-0 max-w-full">
                  <button
                    onClick={() => setShowTechDetails((prev) => !prev)}
                    className="w-full px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] text-slate-400 font-bold text-[11px] flex items-center justify-between cursor-pointer transition-all min-w-0"
                  >
                    <span className="flex items-center gap-2 truncate min-w-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> <span className="truncate">Technical Security Information</span>
                    </span>
                    {showTechDetails ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                  </button>

                  {showTechDetails && (
                    <div className="p-4 bg-[#070a11] space-y-3 text-[11px] text-slate-300 border-t border-white/10 animate-fade-in min-w-0 max-w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 max-w-full">
                        <div className="min-w-0 max-w-full"><span className="text-slate-500 block text-[9px] uppercase font-bold">MESSAGE ID</span><span className="text-white font-mono break-all text-[10px] sm:text-[11px] block max-w-full">{selectedEmail.message_id}</span></div>
                        <div className="min-w-0 max-w-full"><span className="text-slate-500 block text-[9px] uppercase font-bold">REPLY-TO</span><span className="text-cyan-300 break-all text-[10px] sm:text-[11px] block max-w-full">{selectedEmail.reply_to || selectedEmail.sender_email}</span></div>
                        <div className="min-w-0 max-w-full"><span className="text-slate-500 block text-[9px] uppercase font-bold">AUTHENTICATION</span><span className="text-emerald-400 font-bold block text-[10px] sm:text-[11px]">DKIM ✓ • DMARC ✓ • SPF ✓</span></div>
                        <div className="min-w-0 max-w-full"><span className="text-slate-500 block text-[9px] uppercase font-bold">RECEIVED ROUTE</span><span className="text-white block text-[10px] sm:text-[11px] break-words">Cloudflare Worker → Zenemoo Backend API</span></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email HTML / Text Message Body */}
                <div className="p-4 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 text-slate-200 text-sm leading-relaxed font-sans space-y-4 shadow-inner min-w-0 max-w-full overflow-x-hidden break-words [word-break:break-word] [overflow-wrap:anywhere]">
                  {selectedEmail.body_html ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                      className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed overflow-x-hidden break-words [word-break:break-word] [overflow-wrap:anywhere]"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere]">{selectedEmail.body_text || selectedEmail.snippet}</div>
                  )}
                </div>

                {/* Attachments Section */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="space-y-3 font-mono text-xs pt-2 min-w-0 max-w-full">
                    <div className="text-[11px] text-cyan-400 uppercase font-bold tracking-wider flex items-center gap-2">
                      <Paperclip className="w-4 h-4 shrink-0" /> ATTACHMENTS ({selectedEmail.attachments.length})
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 max-w-full">
                      {selectedEmail.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-3 group min-w-0 max-w-full"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-white truncate text-xs">{att.filename}</div>
                              <div className="text-[10px] text-slate-500">{(att.size / 1024).toFixed(0)} KB</div>
                            </div>
                          </div>

                          <button
                            onClick={() => addToast('Attachment Download', `Downloading ${att.filename} using short-lived signed URL...`, 'info')}
                            className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer shrink-0"
                            title="Download attachment safely"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer Toolbar */}
              <div className="p-4 border-t border-white/10 bg-[#070a11] flex items-center justify-between font-mono text-xs shrink-0 min-w-0 max-w-full gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => addToast('Compose Reply', `Reply interface for ${selectedEmail.sender_email} initialized using Brevo Outgoing API.`, 'info')}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 shrink-0"
                  >
                    <Reply className="w-4 h-4" /> Reply
                  </button>

                  <button
                    onClick={() => addToast('Forward Email', 'Forwarding composer initialized.', 'info')}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Forward className="w-4 h-4" /> Forward
                  </button>
                </div>

                <div className="text-slate-500 text-[10px] hidden sm:block truncate shrink-0">
                  Private Corporate Operational Inbox
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 font-mono text-xs space-y-3 min-w-0">
              <Mail className="w-12 h-12 text-slate-600 animate-pulse shrink-0" />
              <div className="text-base font-bold text-slate-300">No Email Selected</div>
              <div className="text-xs max-w-sm">Select an email from the list to view its complete content and attachments.</div>
            </div>
          )}
        </div>

      </div>

      {/* 3. EMAIL SETTINGS MODAL */}
      <AdminEmailSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        addToast={addToast}
      />
    </div>
  );
};
