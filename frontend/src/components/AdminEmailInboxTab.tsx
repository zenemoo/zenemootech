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
  Briefcase,
  User,
  FileText,
  X,
  CheckCircle2,
  Activity,
  Info,
  Calendar,
  Reply,
  Forward,
} from 'lucide-react';
import { emailInboxApi } from '../services/api';
import { AdminEmailSettingsModal } from './AdminEmailSettingsModal';
import { EmailComposeModal } from './EmailComposeModal';
import { decodeMimeHeader, normalizeMojibake } from '../utils/emailEncodingHelper';

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
  status?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sent_at?: string;
  received_at: string;
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
}

export type InboxView =
  | { type: 'mailbox'; value: string }
  | { type: 'label'; value: string };

export interface AdvancedFiltersState {
  fromSender: string;
  toRecipient: string;
  subjectQuery: string;
  dateRange: 'all' | 'today' | 'yesterday' | '7days' | '30days';
  statusFilter: 'all' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  hasAttachment: 'any' | 'yes' | 'no';
  starredFilter: 'all' | 'starred' | 'not_starred';
  labelFilter: string;
}

const initialAdvancedFilters: AdvancedFiltersState = {
  fromSender: '',
  toRecipient: '',
  subjectQuery: '',
  dateRange: 'all',
  statusFilter: 'all',
  hasAttachment: 'any',
  starredFilter: 'all',
  labelFilter: 'all',
};

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
  { id: 'all', label: 'All Labels', icon: Tag, color: 'text-cyan-400' },
  { id: 'general', label: 'General', icon: Mail, color: 'text-slate-400' },
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
// FRONTEND MIME HEADER STRIPPER & BODY CLEANER
// ============================================================================
function extractHumanEmailBody(bodyText?: string, bodyHtml?: string): { cleanText: string; cleanHtml: string; rawHeaders?: string } {
  let rawText = (bodyText || '').trim();
  let rawHtml = (bodyHtml || '').trim();
  let rawHeaders = '';

  const headerMatchPattern = /^(Received|ARC-Seal|ARC-Message-Signature|ARC-Authentication-Results|DKIM-Signature|Return-Path|MIME-Version|Content-Type|Authentication-Results|Received-SPF):/i;

  if (rawText && headerMatchPattern.test(rawText)) {
    const doubleNewlineSplit = rawText.split(/\r?\n\r?\n/);
    if (doubleNewlineSplit.length > 1) {
      rawHeaders = doubleNewlineSplit[0];
      const remainingSections = doubleNewlineSplit.slice(1);
      
      const bodyLines: string[] = [];
      remainingSections.forEach((sec) => {
        const lines = sec.split(/\r?\n/);
        const filteredLines = lines.filter(
          (line) => !/^(Content-Type|Content-Transfer-Encoding|Content-Disposition|Boundary)=?/i.test(line.trim()) && !line.trim().startsWith('--')
        );
        if (filteredLines.length > 0) {
          bodyLines.push(filteredLines.join('\n'));
        }
      });
      
      if (bodyLines.length > 0) {
        rawText = bodyLines.join('\n\n').trim();
      }
    }
  }

  if (rawHtml && (rawHtml.includes('Received:') || rawHtml.includes('ARC-Seal:') || rawHtml.includes('DKIM-Signature:'))) {
    const preMatch = rawHtml.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (preMatch && preMatch[1] && headerMatchPattern.test(preMatch[1].trim())) {
      const split = preMatch[1].trim().split(/\r?\n\r?\n/);
      if (split.length > 1) {
        rawHeaders = rawHeaders || split[0];
        rawText = rawText || split.slice(1).join('\n\n').trim();
        rawHtml = '';
      }
    }
  }

  let cleanHtml = rawHtml ? normalizeMojibake(sanitizeHtmlContent(rawHtml)) : '';
  let cleanText = normalizeMojibake(rawText || '');

  if (!cleanHtml && cleanText) {
    const escaped = escapeHtml(cleanText);
    const linkified = escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-cyan-400 underline font-medium hover:text-cyan-300">$1</a>'
    );
    cleanHtml = `<div class="whitespace-pre-wrap font-sans text-slate-200 text-sm leading-relaxed [overflow-wrap:anywhere] [word-break:break-word]">${linkified}</div>`;
  }

  return { cleanText, cleanHtml, rawHeaders };
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeHtmlContent(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

// ============================================================================
// PERSISTENT MODULE-LEVEL INBOX CACHE (Survives Admin Tab Switching)
// ============================================================================
interface InboxCacheState {
  incomingEmails: EmailMessageRecord[];
  sentEmails: EmailMessageRecord[];
  sentTotalCount: number;
  selectedEmailId: string | null;
  mailTab: 'incoming' | 'sent';
  activeSidebarView: InboxView;
  viewFilter: 'all' | 'unread' | 'starred' | 'archived' | 'trash';
  searchQuery: string;
  sortBy: 'newest' | 'oldest';
  currentPage: number;
  pageSize: number;
  lastFetchedAt: number | null;
}

const globalInboxCache: InboxCacheState = {
  incomingEmails: [],
  sentEmails: [],
  sentTotalCount: 0,
  selectedEmailId: null,
  mailTab: 'incoming',
  activeSidebarView: { type: 'mailbox', value: 'all' },
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
  // Navigation & Cache State
  const [incomingEmails, setIncomingEmails] = useState<EmailMessageRecord[]>(globalInboxCache.incomingEmails);
  const [sentEmails, setSentEmails] = useState<EmailMessageRecord[]>(globalInboxCache.sentEmails);
  const [sentTotalCount, setSentTotalCount] = useState<number>(globalInboxCache.sentTotalCount);

  const [mailTab, setMailTabState] = useState<'incoming' | 'sent'>(globalInboxCache.mailTab);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(globalInboxCache.selectedEmailId);
  const [activeSidebarView, setActiveSidebarViewState] = useState<InboxView>(globalInboxCache.activeSidebarView);
  const [viewFilter, setViewFilterState] = useState<'all' | 'unread' | 'starred' | 'archived' | 'trash'>(globalInboxCache.viewFilter);

  // Search & Filters
  const [searchQuery, setSearchQueryState] = useState(globalInboxCache.searchQuery);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersState>(initialAdvancedFilters);

  const [sortBy, setSortByState] = useState<'newest' | 'oldest'>(globalInboxCache.sortBy);
  const [currentPage, setCurrentPageState] = useState(globalInboxCache.currentPage);
  const [pageSize] = useState<number>(globalInboxCache.pageSize);

  // Detail Section Tab ('email' | 'delivery' | 'technical')
  const [detailTab, setDetailTab] = useState<'email' | 'delivery' | 'technical'>('email');

  // Loading & Modal UI
  const [isLoading, setIsLoading] = useState((mailTab === 'incoming' ? incomingEmails : sentEmails).length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Compose Reply & Forward Modal State
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeMode, setComposeMode] = useState<'reply' | 'forward'>('reply');

  const handleOpenReply = (email?: EmailMessageRecord) => {
    const target = email || selectedEmail;
    if (target) {
      updateSelectedEmailId(target.id);
      setComposeMode('reply');
      setIsComposeOpen(true);
    }
  };

  const handleOpenForward = (email?: EmailMessageRecord) => {
    const target = email || selectedEmail;
    if (target) {
      updateSelectedEmailId(target.id);
      setComposeMode('forward');
      setIsComposeOpen(true);
    }
  };

  const handleSendSuccess = (sentRecord: EmailMessageRecord) => {
    const updated = [sentRecord, ...sentEmails];
    setSentEmails(updated);
    globalInboxCache.sentEmails = updated;
    globalInboxCache.sentTotalCount = (globalInboxCache.sentTotalCount || 0) + 1;
    setSentTotalCount(globalInboxCache.sentTotalCount);
  };

  // Derived context for API params
  const activeMailbox = activeSidebarView.type === 'mailbox' ? activeSidebarView.value : 'all';
  const activeCategory = activeSidebarView.type === 'label' ? activeSidebarView.value : 'all';

  // Cache Sync Handlers
  const setMailTab = (tab: 'incoming' | 'sent') => {
    setMailTabState(tab);
    globalInboxCache.mailTab = tab;
    setCurrentPage(1);
    setSelectedEmailId(null);
  };

  const updateSelectedEmailId = (id: string | null) => {
    setSelectedEmailId(id);
    globalInboxCache.selectedEmailId = id;
  };

  const setActiveSidebarView = (view: InboxView) => {
    setActiveSidebarViewState(view);
    globalInboxCache.activeSidebarView = view;
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

  // Real Storage Usage State
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

  // Merge server list with optimistic cache
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
        merged.push({
          ...s,
          is_read: local.is_read || s.is_read,
          is_starred: local.is_starred !== undefined ? local.is_starred : s.is_starred,
          is_archived: local.is_archived !== undefined ? local.is_archived : s.is_archived,
          is_trashed: local.is_trashed !== undefined ? local.is_trashed : s.is_trashed,
          category: local.category || s.category,
        });
      } else {
        merged.push(s);
      }
    });

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

  // Fetch Emails API (Incoming or Sent)
  const fetchEmails = useCallback(async (isSilentBackground = false) => {
    const currentList = mailTab === 'incoming' ? globalInboxCache.incomingEmails : globalInboxCache.sentEmails;
    if (isSilentBackground || currentList.length > 0) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    fetchStorageUsage();

    try {
      if (mailTab === 'incoming') {
        const res = await emailInboxApi.getEmails({
          search: searchQuery,
          mailbox: activeMailbox !== 'all' ? activeMailbox : undefined,
          category: activeCategory !== 'all' ? activeCategory : undefined,
          view: viewFilter,
          page: currentPage,
          limit: pageSize,
        });

        if (res.data?.success && Array.isArray(res.data.emails)) {
          const merged = mergeEmailsWithCache(globalInboxCache.incomingEmails, res.data.emails);
          globalInboxCache.incomingEmails = merged;
          setIncomingEmails(merged);
        }
      } else {
        const res = await emailInboxApi.getSentEmails({
          search: searchQuery,
          mailbox: activeMailbox !== 'all' ? activeMailbox : undefined,
          category: activeCategory !== 'all' ? activeCategory : undefined,
          status: advancedFilters.statusFilter !== 'all' ? advancedFilters.statusFilter : undefined,
          view: viewFilter,
          page: currentPage,
          limit: pageSize,
        });

        if (res.data?.success && Array.isArray(res.data.emails)) {
          const merged = mergeEmailsWithCache(globalInboxCache.sentEmails, res.data.emails);
          globalInboxCache.sentEmails = merged;
          globalInboxCache.sentTotalCount = res.data.count || res.data.emails.length;
          setSentEmails(merged);
          setSentTotalCount(res.data.count || res.data.emails.length);
        }
      }
      globalInboxCache.lastFetchedAt = Date.now();
    } catch (_) {
      // Retain local cache on network error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [mailTab, searchQuery, activeMailbox, activeCategory, viewFilter, advancedFilters.statusFilter, currentPage, pageSize, fetchStorageUsage, mergeEmailsWithCache]);

  // Sync Sent Count in background when viewing Incoming
  const syncSentCountInBackground = useCallback(async () => {
    try {
      const res = await emailInboxApi.getSentEmails({ limit: 1 });
      if (res.data?.success && typeof res.data.count === 'number') {
        globalInboxCache.sentTotalCount = res.data.count;
        setSentTotalCount(res.data.count);
      }
    } catch (_) {}
  }, []);

  // Mount & Background Polling (Every 25s)
  useEffect(() => {
    fetchEmails(globalInboxCache.incomingEmails.length > 0);
    syncSentCountInBackground();

    const intervalTimer = setInterval(() => {
      fetchEmails(true);
      syncSentCountInBackground();
    }, 25000);

    return () => clearInterval(intervalTimer);
  }, []); // Run on mount

  // Sync on filter/tab/page change
  useEffect(() => {
    fetchEmails(true);
  }, [mailTab, activeSidebarView, viewFilter, searchQuery, currentPage, sortBy, fetchEmails]);

  // Compute Unread Counts per Mailbox
  const mailboxUnreadCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    incomingEmails.forEach((msg) => {
      if (!msg.is_read && !msg.is_trashed && !msg.is_archived) {
        counts.all = (counts.all || 0) + 1;
        counts[msg.mailbox_email] = (counts[msg.mailbox_email] || 0) + 1;
      }
    });
    return counts;
  }, [incomingEmails]);

  // Compute Unread Counts per Label
  const labelUnreadCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    const list = mailTab === 'incoming' ? incomingEmails : sentEmails;
    list.forEach((msg) => {
      if (!msg.is_read && !msg.is_trashed && !msg.is_archived) {
        counts.all = (counts.all || 0) + 1;
        const cat = msg.category || 'general';
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [mailTab, incomingEmails, sentEmails]);

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(mailboxUnreadCounts.all || 0);
    }
  }, [mailboxUnreadCounts.all, onUnreadCountChange]);

  // Combined Advanced & Standard Email Filter Engine
  const filteredEmails = useMemo(() => {
    let result = mailTab === 'incoming' ? [...incomingEmails] : [...sentEmails];

    // Status View Filter (All / Unread / Starred / Archived / Trash)
    if (viewFilter === 'unread') {
      result = result.filter((e) => !e.is_read && !e.is_trashed);
    } else if (viewFilter === 'starred') {
      result = result.filter((e) => e.is_starred && !e.is_trashed);
    } else if (viewFilter === 'archived') {
      result = result.filter((e) => e.is_archived && !e.is_trashed);
    } else if (viewFilter === 'trash') {
      result = result.filter((e) => e.is_trashed);
    } else {
      result = result.filter((e) => !e.is_trashed && !e.is_archived);
    }

    // Sidebar Context Filter (Mailbox or Label)
    if (activeSidebarView.type === 'mailbox') {
      if (activeSidebarView.value !== 'all') {
        result = result.filter((e) => e.mailbox_email.toLowerCase() === activeSidebarView.value.toLowerCase());
      }
    } else if (activeSidebarView.type === 'label') {
      if (activeSidebarView.value !== 'all') {
        result = result.filter((e) => (e.category || 'general') === activeSidebarView.value);
      }
    }

    // Advanced Filters: FROM
    if (advancedFilters.fromSender.trim()) {
      const q = advancedFilters.fromSender.toLowerCase().trim();
      result = result.filter((e) => e.sender_name.toLowerCase().includes(q) || e.sender_email.toLowerCase().includes(q));
    }

    // Advanced Filters: TO
    if (advancedFilters.toRecipient.trim()) {
      const q = advancedFilters.toRecipient.toLowerCase().trim();
      result = result.filter((e) => e.recipient_email.toLowerCase().includes(q));
    }

    // Advanced Filters: SUBJECT
    if (advancedFilters.subjectQuery.trim()) {
      const q = advancedFilters.subjectQuery.toLowerCase().trim();
      result = result.filter((e) => e.subject.toLowerCase().includes(q));
    }

    // Advanced Filters: DATE
    if (advancedFilters.dateRange !== 'all') {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (advancedFilters.dateRange === 'today') {
        result = result.filter((e) => now - new Date(e.received_at).getTime() <= oneDay);
      } else if (advancedFilters.dateRange === 'yesterday') {
        result = result.filter((e) => {
          const diff = now - new Date(e.received_at).getTime();
          return diff > oneDay && diff <= 2 * oneDay;
        });
      } else if (advancedFilters.dateRange === '7days') {
        result = result.filter((e) => now - new Date(e.received_at).getTime() <= 7 * oneDay);
      } else if (advancedFilters.dateRange === '30days') {
        result = result.filter((e) => now - new Date(e.received_at).getTime() <= 30 * oneDay);
      }
    }

    // Advanced Filters: STATUS
    if (advancedFilters.statusFilter !== 'all') {
      result = result.filter((e) => (e.status || 'sent').toLowerCase() === advancedFilters.statusFilter);
    }

    // Advanced Filters: ATTACHMENTS
    if (advancedFilters.hasAttachment === 'yes') {
      result = result.filter((e) => e.attachments && e.attachments.length > 0);
    } else if (advancedFilters.hasAttachment === 'no') {
      result = result.filter((e) => !e.attachments || e.attachments.length === 0);
    }

    // Advanced Filters: STARRED
    if (advancedFilters.starredFilter === 'starred') {
      result = result.filter((e) => e.is_starred);
    } else if (advancedFilters.starredFilter === 'not_starred') {
      result = result.filter((e) => !e.is_starred);
    }

    // Advanced Filters: LABEL
    if (advancedFilters.labelFilter !== 'all') {
      result = result.filter((e) => (e.category || 'general') === advancedFilters.labelFilter);
    }

    // Search Query (Debounced text search across sender, recipient, subject, snippet, ID)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.sender_name.toLowerCase().includes(q) ||
          e.sender_email.toLowerCase().includes(q) ||
          e.recipient_email.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.snippet.toLowerCase().includes(q) ||
          e.message_id.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
    } else {
      result.sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());
    }

    return result;
  }, [mailTab, incomingEmails, sentEmails, viewFilter, activeSidebarView, advancedFilters, searchQuery, sortBy]);

  // Selected Email Record
  const selectedEmail = useMemo(() => {
    return (mailTab === 'incoming' ? incomingEmails : sentEmails).find((e) => e.id === selectedEmailId) || filteredEmails[0] || null;
  }, [mailTab, incomingEmails, sentEmails, selectedEmailId, filteredEmails]);

  // Auto Select first email if none selected
  useEffect(() => {
    if (!selectedEmailId && filteredEmails.length > 0) {
      updateSelectedEmailId(filteredEmails[0].id);
    }
  }, [filteredEmails, selectedEmailId]);

  // OPTIMISTIC ACTIONS

  const handleToggleRead = async (email: EmailMessageRecord) => {
    if (email.is_read) return;
    const nextRead = true;
    const updateList = (list: EmailMessageRecord[]) =>
      list.map((e) => (e.message_id === email.message_id || e.id === email.id ? { ...e, is_read: nextRead } : e));

    if (mailTab === 'incoming') {
      const updated = updateList(incomingEmails);
      setIncomingEmails(updated);
      globalInboxCache.incomingEmails = updated;
    } else {
      const updated = updateList(sentEmails);
      setSentEmails(updated);
      globalInboxCache.sentEmails = updated;
    }

    try {
      await emailInboxApi.updateEmailState(email.id, { is_read: nextRead });
    } catch (_) {}
  };

  const handleToggleStar = async (email: EmailMessageRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStarred = !email.is_starred;
    const updateList = (list: EmailMessageRecord[]) =>
      list.map((item) => (item.message_id === email.message_id || item.id === email.id ? { ...item, is_starred: nextStarred } : item));

    if (mailTab === 'incoming') {
      const updated = updateList(incomingEmails);
      setIncomingEmails(updated);
      globalInboxCache.incomingEmails = updated;
    } else {
      const updated = updateList(sentEmails);
      setSentEmails(updated);
      globalInboxCache.sentEmails = updated;
    }

    try {
      await emailInboxApi.updateEmailState(email.id, { is_starred: nextStarred });
    } catch (_) {
      // Revert on error
      const revertList = (list: EmailMessageRecord[]) =>
        list.map((item) => (item.message_id === email.message_id || item.id === email.id ? { ...item, is_starred: !nextStarred } : item));
      if (mailTab === 'incoming') {
        const reverted = revertList(incomingEmails);
        setIncomingEmails(reverted);
        globalInboxCache.incomingEmails = reverted;
      } else {
        const reverted = revertList(sentEmails);
        setSentEmails(reverted);
        globalInboxCache.sentEmails = reverted;
      }
      addToast('Star Failed', 'Could not update star status on server.', 'error');
    }
  };

  const handleChangeCategory = async (email: EmailMessageRecord, newCategory: string) => {
    const nextCat = newCategory as any;
    const updateList = (list: EmailMessageRecord[]) =>
      list.map((item) => (item.message_id === email.message_id || item.id === email.id ? { ...item, category: nextCat } : item));

    if (mailTab === 'incoming') {
      const updated = updateList(incomingEmails);
      setIncomingEmails(updated);
      globalInboxCache.incomingEmails = updated;
    } else {
      const updated = updateList(sentEmails);
      setSentEmails(updated);
      globalInboxCache.sentEmails = updated;
    }

    addToast('Label Updated', `Email label changed to ${newCategory.replace('_', ' ')}.`, 'success');

    try {
      await emailInboxApi.updateEmailState(email.id, { category: nextCat });
    } catch (_) {}
  };

  const handleArchive = async (email: EmailMessageRecord) => {
    const updateList = (list: EmailMessageRecord[]) =>
      list.map((item) => (item.message_id === email.message_id || item.id === email.id ? { ...item, is_archived: true } : item));

    if (mailTab === 'incoming') {
      const updated = updateList(incomingEmails);
      setIncomingEmails(updated);
      globalInboxCache.incomingEmails = updated;
    } else {
      const updated = updateList(sentEmails);
      setSentEmails(updated);
      globalInboxCache.sentEmails = updated;
    }

    addToast('Email Archived', 'Message moved to archive.', 'info');
    try {
      await emailInboxApi.updateEmailState(email.id, { is_archived: true });
    } catch (_) {}
  };

  const handleDelete = (email: EmailMessageRecord) => {
    if (email.is_trashed) {
      showConfirm(
        'Permanently Delete Email?',
        `Are you sure you want to permanently delete "${email.subject}"? This action cannot be undone.`,
        () => {
          const filterList = (list: EmailMessageRecord[]) => list.filter((item) => item.message_id !== email.message_id && item.id !== email.id);
          if (mailTab === 'incoming') {
            const updated = filterList(incomingEmails);
            setIncomingEmails(updated);
            globalInboxCache.incomingEmails = updated;
          } else {
            const updated = filterList(sentEmails);
            setSentEmails(updated);
            globalInboxCache.sentEmails = updated;
          }
          if (selectedEmailId === email.id) updateSelectedEmailId(null);
          addToast('Deleted', 'Email permanently deleted.', 'info');
          emailInboxApi.deleteEmail(email.id).catch(() => {});
        },
        { intent: 'danger', confirmText: 'Permanently Delete' }
      );
    } else {
      const updateList = (list: EmailMessageRecord[]) =>
        list.map((item) => (item.message_id === email.message_id || item.id === email.id ? { ...item, is_trashed: true } : item));
      if (mailTab === 'incoming') {
        const updated = updateList(incomingEmails);
        setIncomingEmails(updated);
        globalInboxCache.incomingEmails = updated;
      } else {
        const updated = updateList(sentEmails);
        setSentEmails(updated);
        globalInboxCache.sentEmails = updated;
      }
      addToast('Moved to Trash', 'Email moved to trash.', 'info');
      emailInboxApi.updateEmailState(email.id, { is_trashed: true }).catch(() => {});
    }
  };

  const handleSelectEmail = (email: EmailMessageRecord) => {
    updateSelectedEmailId(email.id);
    if (!email.is_read) handleToggleRead(email);
    setShowMobileDetail(true);
  };

  // Helper for Category Badges
  const renderCategoryBadge = (cat?: string) => {
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
      case 'important':
        return <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">Important</span>;
      case 'follow_up':
        return <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono font-bold">Follow Up</span>;
      case 'general':
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 text-[10px] font-mono font-bold">General</span>;
    }
  };

  // Helper for Delivery Status Badges
  const renderStatusBadge = (status?: string) => {
    const st = (status || 'sent').toLowerCase();
    switch (st) {
      case 'delivered':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">Delivered</span>;
      case 'opened':
        return <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">Opened</span>;
      case 'clicked':
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">Clicked</span>;
      case 'bounced':
      case 'failed':
        return <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono font-bold">Bounced</span>;
      case 'sent':
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 text-[10px] font-mono font-bold">Sent</span>;
    }
  };

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

  // Clean Email Content
  const parsedEmailContent = useMemo(() => {
    if (!selectedEmail) return { cleanText: '', cleanHtml: '' };
    return extractHumanEmailBody(selectedEmail.body_text, selectedEmail.body_html);
  }, [selectedEmail]);

  // Active Filter Chips Helper
  const hasActiveAdvancedFilters = useMemo(() => {
    return (
      advancedFilters.fromSender !== '' ||
      advancedFilters.toRecipient !== '' ||
      advancedFilters.subjectQuery !== '' ||
      advancedFilters.dateRange !== 'all' ||
      advancedFilters.statusFilter !== 'all' ||
      advancedFilters.hasAttachment !== 'any' ||
      advancedFilters.starredFilter !== 'all' ||
      advancedFilters.labelFilter !== 'all'
    );
  }, [advancedFilters]);

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
            Manage incoming and sent emails across your verified Zenemoo addresses.
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
        {/* PANEL 1: LEFT SIDEBAR — MAIL, MAILBOXES, LABELS */}
        {/* ========================================== */}
        <div className={`w-full lg:w-64 shrink-0 bg-[#070a11] border-b lg:border-b-0 lg:border-r border-white/10 p-4 space-y-6 overflow-y-auto min-w-0 max-w-full ${showMobileDetail ? 'hidden lg:block' : 'block'}`}>
          
          {/* MAIL Section (Incoming vs Sent Navigation) */}
          <div className="space-y-2 font-mono text-xs min-w-0">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider px-2">
              MAIL
            </div>

            <div className="space-y-1 min-w-0">
              <button
                onClick={() => setMailTab('incoming')}
                className={`w-full px-3 py-2 rounded-xl text-left font-bold transition-all flex items-center justify-between text-xs cursor-pointer min-w-0 gap-2 ${
                  mailTab === 'incoming'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-transparent text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                <span className="truncate flex items-center gap-2 min-w-0 flex-1">
                  <Inbox className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span className="truncate">Incoming</span>
                </span>
                {mailboxUnreadCounts.all > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-[10px] font-bold shrink-0">
                    {mailboxUnreadCounts.all}
                  </span>
                )}
              </button>

              <button
                onClick={() => setMailTab('sent')}
                className={`w-full px-3 py-2 rounded-xl text-left font-bold transition-all flex items-center justify-between text-xs cursor-pointer min-w-0 gap-2 ${
                  mailTab === 'sent'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-transparent text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                <span className="truncate flex items-center gap-2 min-w-0 flex-1">
                  <Send className="w-4 h-4 shrink-0 text-purple-400" />
                  <span className="truncate">Sent</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold shrink-0">
                  {sentTotalCount || sentEmails.length}
                </span>
              </button>
            </div>
          </div>

          {/* Mailboxes Section */}
          <div className="space-y-2 font-mono text-xs border-t border-white/5 pt-4 min-w-0">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider px-2 flex items-center justify-between min-w-0">
              <span>MAILBOXES</span>
              <button onClick={() => setIsSettingsOpen(true)} className="text-cyan-400 hover:underline text-[10px] font-bold shrink-0 cursor-pointer">
                + Manage
              </button>
            </div>

            <div className="space-y-1 min-w-0">
              {MAILBOX_LIST.map((mb) => {
                const isActive = activeSidebarView.type === 'mailbox' && activeSidebarView.value === mb.email;
                const count = mailboxUnreadCounts[mb.email] || 0;
                return (
                  <button
                    key={mb.email}
                    onClick={() => {
                      setActiveSidebarView({ type: 'mailbox', value: mb.email });
                      setCurrentPage(1);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left font-bold transition-all flex items-center justify-between text-xs cursor-pointer min-w-0 gap-2 ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'bg-transparent text-slate-300 hover:bg-white/[0.04]'
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
              {LABEL_LIST.map((lbl) => {
                const isActive = activeSidebarView.type === 'label' && activeSidebarView.value === lbl.id;
                const count = labelUnreadCounts[lbl.id] || 0;
                const IconComp = lbl.icon;
                return (
                  <button
                    key={lbl.id}
                    onClick={() => {
                      setActiveSidebarView({ type: 'label', value: lbl.id });
                      setCurrentPage(1);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left transition-all flex items-center justify-between text-xs cursor-pointer min-w-0 gap-2 ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-bold'
                        : 'bg-transparent text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate min-w-0 flex-1">
                      <IconComp className={`w-3.5 h-3.5 shrink-0 ${lbl.color}`} />
                      <span className="truncate">{lbl.label}</span>
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

          {/* Database Storage Stats */}
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
        {/* PANEL 2: MIDDLE PANEL — LIST & FILTERS     */}
        {/* ========================================== */}
        <div className={`w-full lg:w-96 shrink-0 bg-[#0b0f19] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col min-w-0 max-w-full ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* Controls & Advanced Filters Header */}
          <div className="p-4 border-b border-white/10 space-y-3 font-mono text-xs min-w-0 max-w-full bg-[#070a11]/50">
            
            {/* Mobile Mail Tab Pills (Incoming vs Sent) */}
            <div className="lg:hidden flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/10 gap-1">
              <button
                onClick={() => setMailTab('incoming')}
                className={`flex-1 py-1.5 rounded-lg text-center font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  mailTab === 'incoming' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" /> Incoming
              </button>
              <button
                onClick={() => setMailTab('sent')}
                className={`flex-1 py-1.5 rounded-lg text-center font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  mailTab === 'sent' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                }`}
              >
                <Send className="w-3.5 h-3.5" /> Sent ({sentTotalCount})
              </button>
            </div>

            {/* View Filter Pills (All / Unread / Starred / Archived / Trash) */}
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

            {/* Search Input, Advanced Filter Toggle & Sort */}
            <div className="flex items-center gap-2 min-w-0 max-w-full">
              <button
                onClick={() => setIsAdvancedFilterOpen((prev) => !prev)}
                className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isAdvancedFilterOpen || hasActiveAdvancedFilters
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/10'
                }`}
                title="Advanced Email Filters"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Advanced Filter</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isAdvancedFilterOpen ? 'rotate-180' : ''}`} />
              </button>

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

            {/* EXPANDABLE ADVANCED FILTER PANEL */}
            {isAdvancedFilterOpen && (
              <div className="p-3.5 rounded-2xl bg-[#090d17] border border-cyan-500/30 space-y-3 font-mono text-[11px] animate-fade-in shadow-xl">
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1 font-bold">From Sender</label>
                    <input
                      type="text"
                      placeholder="e.g. contact@..."
                      value={advancedFilters.fromSender}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, fromSender: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-[11px] focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1 font-bold">To Recipient</label>
                    <input
                      type="text"
                      placeholder="e.g. client@..."
                      value={advancedFilters.toRecipient}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, toRecipient: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-[11px] focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1 font-bold">Subject Contains</label>
                    <input
                      type="text"
                      placeholder="Subject keyword..."
                      value={advancedFilters.subjectQuery}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, subjectQuery: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-[11px] focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1 font-bold">Date Range</label>
                    <select
                      value={advancedFilters.dateRange}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateRange: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200 text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-[#0b0f19]">All Time</option>
                      <option value="today" className="bg-[#0b0f19]">Today</option>
                      <option value="yesterday" className="bg-[#0b0f19]">Yesterday</option>
                      <option value="7days" className="bg-[#0b0f19]">Last 7 Days</option>
                      <option value="30days" className="bg-[#0b0f19]">Last 30 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1 font-bold">Delivery Status</label>
                    <select
                      value={advancedFilters.statusFilter}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, statusFilter: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200 text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-[#0b0f19]">All Status</option>
                      <option value="sent" className="bg-[#0b0f19]">Sent</option>
                      <option value="delivered" className="bg-[#0b0f19]">Delivered</option>
                      <option value="opened" className="bg-[#0b0f19]">Opened</option>
                      <option value="clicked" className="bg-[#0b0f19]">Clicked</option>
                      <option value="bounced" className="bg-[#0b0f19]">Bounced</option>
                      <option value="failed" className="bg-[#0b0f19]">Failed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1 font-bold">Attachments</label>
                    <select
                      value={advancedFilters.hasAttachment}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, hasAttachment: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200 text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="any" className="bg-[#0b0f19]">Any</option>
                      <option value="yes" className="bg-[#0b0f19]">Has Attachments</option>
                      <option value="no" className="bg-[#0b0f19]">No Attachments</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
                  <button
                    onClick={() => setAdvancedFilters(initialAdvancedFilters)}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-bold cursor-pointer"
                  >
                    Clear Filters
                  </button>

                  <button
                    onClick={() => setIsAdvancedFilterOpen(false)}
                    className="px-4 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-bold cursor-pointer shadow-md"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}

            {/* ACTIVE FILTER CHIPS BAR */}
            {hasActiveAdvancedFilters && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 font-mono text-[10px]">
                {advancedFilters.fromSender && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    From: {advancedFilters.fromSender}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setAdvancedFilters({ ...advancedFilters, fromSender: '' })} />
                  </span>
                )}
                {advancedFilters.toRecipient && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    To: {advancedFilters.toRecipient}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setAdvancedFilters({ ...advancedFilters, toRecipient: '' })} />
                  </span>
                )}
                {advancedFilters.statusFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    Status: {advancedFilters.statusFilter}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setAdvancedFilters({ ...advancedFilters, statusFilter: 'all' })} />
                  </span>
                )}
                {advancedFilters.dateRange !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    Date: {advancedFilters.dateRange}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setAdvancedFilters({ ...advancedFilters, dateRange: 'all' })} />
                  </span>
                )}
                <button
                  onClick={() => setAdvancedFilters(initialAdvancedFilters)}
                  className="text-slate-400 hover:text-white underline text-[10px] cursor-pointer ml-auto"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Email List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 min-w-0 max-w-full">
            {paginatedEmails.length === 0 ? (
              (isLoading || isRefreshing) ? (
                <div className="p-12 text-center text-slate-500 font-mono text-xs space-y-3">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                  <div className="font-bold text-slate-300">Checking {mailTab === 'incoming' ? 'Inbox' : 'Sent Box'}...</div>
                  <div className="text-[11px] text-slate-500">
                    Synchronizing messages for {activeSidebarView.type === 'mailbox' ? (activeSidebarView.value === 'all' ? 'all inboxes' : activeSidebarView.value) : `label: ${activeSidebarView.value}`}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 font-mono text-xs space-y-2">
                  <Mail className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="font-bold text-slate-400">No emails found</div>
                  <div className="text-[11px]">This view has no matching messages.</div>
                </div>
              )
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
                    {/* Unread Dot Indicator */}
                    {!email.is_read && mailTab === 'incoming' && (
                      <span className="absolute top-4 left-2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50" />
                    )}

                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="font-bold text-xs truncate text-white leading-tight min-w-0 flex-1">
                        {mailTab === 'incoming' ? email.sender_name : `To: ${email.recipient_email}`}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => handleToggleStar(email, e)}
                          className="text-slate-500 hover:text-amber-400 p-0.5 shrink-0 cursor-pointer"
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
                      {decodeMimeHeader(email.subject)}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed break-words [word-break:break-word] [overflow-wrap:anywhere] min-w-0">
                      {normalizeMojibake(decodeMimeHeader(email.snippet))}
                    </div>

                    <div className="flex items-center justify-between mt-2 font-mono text-[10px] gap-2 min-w-0">
                      <div className="text-slate-500 truncate min-w-0 flex-1 flex items-center gap-1.5">
                        {mailTab === 'incoming' ? (
                          <>To: <span className="text-slate-300 font-medium">{email.mailbox_email}</span></>
                        ) : (
                          <>From: <span className="text-slate-300 font-medium">{email.sender_email}</span></>
                        )}
                        {email.attachments && email.attachments.length > 0 && (
                          <Paperclip className="w-3 h-3 text-cyan-400 shrink-0" />
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        {mailTab === 'sent' && renderStatusBadge(email.status)}
                        {renderCategoryBadge(email.category)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Pagination */}
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
                  {/* Back to emails button (for Mobile & Tablet) */}
                  <button
                    onClick={() => setShowMobileDetail(false)}
                    className="lg:hidden px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to emails
                  </button>

                  <div className="shrink-0 flex items-center gap-2">
                    {mailTab === 'sent' && renderStatusBadge(selectedEmail.status)}
                    {renderCategoryBadge(selectedEmail.category)}
                    
                    {/* Interactive Category Selector */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono hidden xl:inline">Label:</span>
                      <select
                        value={selectedEmail.category || 'general'}
                        onChange={(e) => handleChangeCategory(selectedEmail, e.target.value)}
                        className="px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 text-cyan-300 text-[11px] font-mono font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="general" className="bg-[#0b0f19]">General</option>
                        <option value="important" className="bg-[#0b0f19]">Important</option>
                        <option value="follow_up" className="bg-[#0b0f19]">Follow Up</option>
                        <option value="client" className="bg-[#0b0f19]">Client</option>
                        <option value="partnership" className="bg-[#0b0f19]">Partnership</option>
                        <option value="project_inquiry" className="bg-[#0b0f19]">Project Inquiry</option>
                        <option value="support" className="bg-[#0b0f19]">Support</option>
                        <option value="career" className="bg-[#0b0f19]">Career</option>
                      </select>
                    </div>
                  </div>
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

              {/* DETAIL VIEW SECTION TABS: Email | Delivery Status | Technical Info */}
              <div className="px-4 pt-3 border-b border-white/10 bg-[#070a11] flex items-center gap-2 font-mono text-xs shrink-0">
                <button
                  onClick={() => setDetailTab('email')}
                  className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    detailTab === 'email'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email Body
                </button>

                <button
                  onClick={() => setDetailTab('delivery')}
                  className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    detailTab === 'delivery'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" /> Delivery Status
                </button>

                <button
                  onClick={() => setDetailTab('technical')}
                  className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    detailTab === 'technical'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Technical Info
                </button>
              </div>

              {/* TAB 1: EMAIL BODY & PREVIEW */}
              {detailTab === 'email' && (
                <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 min-w-0 max-w-full overflow-y-auto">
                  {/* Subject Title */}
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold font-display text-white leading-snug break-words [word-break:break-word] [overflow-wrap:anywhere] min-w-0 max-w-full">
                    {decodeMimeHeader(selectedEmail.subject)}
                  </h1>

                  {/* Sender & Recipient Metadata Box */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs min-w-0 max-w-full overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center text-sm shrink-0">
                        {(decodeMimeHeader(selectedEmail.sender_name) || 'Z').substring(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="font-bold text-white text-sm flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                          <span className="truncate max-w-full">{decodeMimeHeader(selectedEmail.sender_name)}</span>
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

                  {/* HTML / Text Message Body Container */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/10 text-slate-200 text-sm leading-relaxed font-sans space-y-4 shadow-inner min-w-0 max-w-full overflow-x-hidden break-words [word-break:break-word] [overflow-wrap:anywhere]">
                    {parsedEmailContent.cleanHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: parsedEmailContent.cleanHtml }}
                        className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed overflow-x-hidden break-words [word-break:break-word] [overflow-wrap:anywhere]"
                      />
                    ) : (
                      <div className="whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere]">
                        {parsedEmailContent.cleanText || selectedEmail.snippet}
                      </div>
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
                              onClick={() => addToast('Attachment Download', `Downloading ${att.filename}...`, 'info')}
                              className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer shrink-0"
                              title="Download attachment"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DELIVERY STATUS TIMELINE */}
              {detailTab === 'delivery' && (
                <div className="p-6 sm:p-8 space-y-6 flex-1 font-mono text-xs text-slate-300 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">Provider Delivery Timeline</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Real-time status updates from Brevo &amp; Cloudflare routing pipeline.</p>
                    </div>
                    {renderStatusBadge(selectedEmail.status)}
                  </div>

                  <div className="space-y-6 relative border-l-2 border-cyan-500/30 ml-4 pl-6 pt-2">
                    <div className="relative">
                      <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-cyan-400 border-2 border-[#0b0f19]" />
                      <div className="font-bold text-white text-sm">1. Message Submitted / Dispatched</div>
                      <div className="text-slate-400 text-xs mt-1">Dispatched via Zenemoo Authenticated Gateway</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{new Date(selectedEmail.received_at).toLocaleString()}</div>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#0b0f19]" />
                      <div className="font-bold text-white text-sm">2. Recipient Server Delivery</div>
                      <div className="text-slate-400 text-xs mt-1">Handoff confirmed to target MX server for {selectedEmail.recipient_email}</div>
                      <div className="text-emerald-400 text-[10px] mt-0.5">Status: Delivered</div>
                    </div>

                    {selectedEmail.status === 'opened' || selectedEmail.status === 'clicked' ? (
                      <div className="relative">
                        <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-purple-400 border-2 border-[#0b0f19]" />
                        <div className="font-bold text-white text-sm">3. Recipient Opened / Interacted</div>
                        <div className="text-slate-400 text-xs mt-1">Recipient loaded email images or clicked embedded link.</div>
                        <div className="text-purple-300 text-[10px] mt-0.5">Status: {selectedEmail.status.toUpperCase()}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* TAB 3: TECHNICAL SECURITY INFO */}
              {detailTab === 'technical' && (
                <div className="p-6 sm:p-8 space-y-6 flex-1 font-mono text-xs text-slate-300 overflow-y-auto">
                  <div className="border-b border-white/10 pb-4">
                    <h3 className="text-base font-bold text-white">Technical Security &amp; Transport Route</h3>
                    <p className="text-slate-400 text-xs mt-0.5">RFC Header verification and domain authentication checks.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                      <span className="text-slate-500 text-[10px] font-bold block uppercase">MESSAGE ID</span>
                      <span className="text-white font-mono text-xs break-all">{selectedEmail.message_id}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                      <span className="text-slate-500 text-[10px] font-bold block uppercase">AUTHENTICATION</span>
                      <span className="text-emerald-400 font-bold text-xs block">SPF ✓ • DKIM ✓ • DMARC ✓</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                      <span className="text-slate-500 text-[10px] font-bold block uppercase">REPLY-TO ADDRESS</span>
                      <span className="text-cyan-300 text-xs break-all">{selectedEmail.reply_to || selectedEmail.sender_email}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                      <span className="text-slate-500 text-[10px] font-bold block uppercase">INGRESS ROUTE</span>
                      <span className="text-slate-200 text-xs block">Cloudflare Worker → Zenemoo Node Backend</span>
                    </div>
                  </div>

                  {parsedEmailContent.rawHeaders && (
                    <div className="space-y-2 pt-2">
                      <span className="text-slate-400 font-bold text-xs block">RAW TRANSPORT HEADERS</span>
                      <pre className="p-4 rounded-2xl bg-black/50 border border-white/10 text-[10px] text-slate-400 whitespace-pre-wrap break-all max-h-60 overflow-y-auto leading-relaxed">
                        {parsedEmailContent.rawHeaders}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Sticky Footer Toolbar */}
              <div className="p-4 border-t border-white/10 bg-[#070a11] flex items-center justify-between font-mono text-xs shrink-0 min-w-0 max-w-full gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleOpenReply(selectedEmail)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 shrink-0"
                  >
                    <Reply className="w-4 h-4" /> Reply
                  </button>

                  <button
                    onClick={() => handleOpenForward(selectedEmail)}
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
              <div className="text-xs max-w-sm">Select an email from the list to view its complete content, delivery status, and technical headers.</div>
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

      {/* 4. EMAIL COMPOSE MODAL (REPLY & FORWARD) */}
      {selectedEmail && (
        <EmailComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          mode={composeMode}
          originalEmail={selectedEmail}
          onSendSuccess={handleSendSuccess}
          addToast={addToast}
        />
      )}
    </div>
  );
};
