import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Copy,
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
  Eye,
  ExternalLink,
  Maximize2,
  Loader2,
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
} from 'lucide-react';
import DOMPurify from 'dompurify';
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
    url?: string;
  }[];
  auth_results?: {
    spf?: 'pass' | 'fail' | 'neutral';
    dkim?: 'pass' | 'fail' | 'neutral';
    dmarc?: 'pass' | 'fail' | 'neutral';
  };
  raw_headers?: string;
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
// DOMPURIFY SAFE EMAIL SANITIZER
// ============================================================================
function sanitizeEmailHtmlWithDomPurify(rawHtml: string): string {
  if (!rawHtml) return '';

  const clean = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'base', 'meta', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
    ALLOW_DATA_ATTR: false,
  });

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(clean, 'text/html');

    // Force external links to open safely
    const links = doc.querySelectorAll('a');
    links.forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      a.classList.add('text-cyan-400', 'hover:underline');
      const href = a.getAttribute('href') || '';
      if (/^(javascript|vbscript|data):/i.test(href)) {
        a.setAttribute('href', '#blocked-link');
      }
    });

    // Make all images responsive with lazy loading
    const images = doc.querySelectorAll('img');
    images.forEach((img) => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.setAttribute('loading', 'lazy');
      img.classList.add('rounded-lg', 'my-2');
    });

    // Wrap tables in responsive horizontal scroll wrappers
    const tables = doc.querySelectorAll('table');
    tables.forEach((table) => {
      table.style.maxWidth = '100%';
      table.style.display = 'block';
      table.style.overflowX = 'auto';
    });

    return doc.body.innerHTML;
  } catch (_) {
    return clean;
  }
}

// Convert HTML to Plain Text for quick copy
function htmlToPlainText(html: string): string {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const breaks = doc.querySelectorAll('br');
    breaks.forEach((b) => b.replaceWith('\n'));
    const blockElements = doc.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, tr, li, blockquote');
    blockElements.forEach((el) => el.after(doc.createTextNode('\n')));
    return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  } catch (_) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAttachmentIcon(contentType: string, filename: string) {
  const type = (contentType || '').toLowerCase();
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (type.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-purple-400" />;
  }
  if (type.includes('pdf') || ext === 'pdf') {
    return <FileText className="w-4 h-4 text-rose-400" />;
  }
  if (type.includes('csv') || type.includes('sheet') || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
  }
  if (type.includes('zip') || type.includes('tar') || ['zip', 'rar', '7z', 'gz'].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-amber-400" />;
  }
  if (type.includes('json') || type.includes('javascript') || type.includes('html') || ['js', 'ts', 'json', 'py', 'html'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-cyan-400" />;
  }
  return <FileText className="w-4 h-4 text-cyan-400" />;
}

// Module-level persistent cache for loaded email details
const emailDetailCache: Record<string, EmailMessageRecord> = {};

export const AdminEmailInboxTab: React.FC<AdminEmailInboxTabProps> = ({
  addToast,
  showConfirm,
  onUnreadCountChange,
}) => {
  // Navigation & View State
  const [mailTab, setMailTab] = useState<'incoming' | 'sent'>('incoming');
  const [activeSidebarView, setActiveSidebarView] = useState<InboxView>({ type: 'mailbox', value: 'all' });
  const [viewFilter, setViewFilter] = useState<'all' | 'unread' | 'starred' | 'archived' | 'trash'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Server-Side Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [unreadTotalCount, setUnreadTotalCount] = useState<number>(0);

  // Email List & Detail State
  const [emailsList, setEmailsList] = useState<EmailMessageRecord[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmailDetail, setSelectedEmailDetail] = useState<EmailMessageRecord | null>(null);
  const [detailTab, setDetailTab] = useState<'email' | 'delivery' | 'technical'>('email');

  // Loading States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showMobileDetail, setShowMobileDetail] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Advanced Filters
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState<boolean>(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersState>(initialAdvancedFilters);

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeMode, setComposeMode] = useState<'reply' | 'forward'>('reply');

  // Attachment Preview Modal State
  const [previewAttachment, setPreviewAttachment] = useState<{
    attachment: { id: string; filename: string; contentType: string; size: number };
    emailId: string;
    url: string;
  } | null>(null);

  // Storage Stats State
  const [storageStats, setStorageStats] = useState<{
    used_formatted: string;
    max_formatted: string;
    percentage: number;
  }>({
    used_formatted: '0.0 KB',
    max_formatted: '500 MB',
    percentage: 0.0,
  });

  const activeMailbox = activeSidebarView.type === 'mailbox' ? activeSidebarView.value : 'all';
  const activeCategory = activeSidebarView.type === 'label' ? activeSidebarView.value : 'all';

  // Fetch Storage Usage
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

  // Fetch Emails via Server-Side API
  const fetchEmails = useCallback(
    async (targetPage = currentPage, isSilent = false) => {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      fetchStorageUsage();

      try {
        if (mailTab === 'incoming') {
          const res = await emailInboxApi.getEmails({
            search: appliedSearchQuery || undefined,
            mailbox: activeMailbox !== 'all' ? activeMailbox : undefined,
            category: activeCategory !== 'all' ? activeCategory : undefined,
            view: viewFilter,
            sortBy,
            order: sortBy === 'oldest' ? 'asc' : 'desc',
            page: targetPage,
            pageSize,
            fromSender: advancedFilters.fromSender.trim() || undefined,
            toRecipient: advancedFilters.toRecipient.trim() || undefined,
            subjectQuery: advancedFilters.subjectQuery.trim() || undefined,
            dateRange: advancedFilters.dateRange !== 'all' ? advancedFilters.dateRange : undefined,
            hasAttachment: advancedFilters.hasAttachment !== 'any' ? advancedFilters.hasAttachment : undefined,
            starredFilter: advancedFilters.starredFilter !== 'all' ? advancedFilters.starredFilter : undefined,
            labelFilter: advancedFilters.labelFilter !== 'all' ? advancedFilters.labelFilter : undefined,
          });

          if (res.data?.success && Array.isArray(res.data.emails)) {
            const list = res.data.emails;
            setEmailsList(list);
            const total = typeof res.data.total === 'number' ? res.data.total : list.length;
            const unread = typeof res.data.unreadCount === 'number' ? res.data.unreadCount : 0;
            const tPages = typeof res.data.totalPages === 'number' ? res.data.totalPages : Math.max(1, Math.ceil(total / pageSize));

            setTotalCount(total);
            setUnreadTotalCount(unread);
            setTotalPages(tPages);
            setCurrentPage(targetPage);

            if (onUnreadCountChange) {
              onUnreadCountChange(unread);
            }

            // Auto-select first email if none selected
            if (!selectedEmailId && list.length > 0) {
              setSelectedEmailId(list[0].id);
            }
          }
        } else {
          // Sent emails
          const res = await emailInboxApi.getSentEmails({
            search: appliedSearchQuery || undefined,
            mailbox: activeMailbox !== 'all' ? activeMailbox : undefined,
            category: activeCategory !== 'all' ? activeCategory : undefined,
            status: advancedFilters.statusFilter !== 'all' ? advancedFilters.statusFilter : undefined,
            view: viewFilter,
            sortBy,
            order: sortBy === 'oldest' ? 'asc' : 'desc',
            page: targetPage,
            pageSize,
          });

          if (res.data?.success && Array.isArray(res.data.emails)) {
            const list = res.data.emails;
            setEmailsList(list);
            const total = typeof res.data.total === 'number' ? res.data.total : (res.data.count ?? list.length);
            const tPages = typeof res.data.totalPages === 'number' ? res.data.totalPages : Math.max(1, Math.ceil(total / pageSize));

            setTotalCount(total);
            setTotalPages(tPages);
            setCurrentPage(targetPage);

            if (!selectedEmailId && list.length > 0) {
              setSelectedEmailId(list[0].id);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch emails:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      mailTab,
      activeMailbox,
      activeCategory,
      viewFilter,
      appliedSearchQuery,
      sortBy,
      pageSize,
      advancedFilters,
      selectedEmailId,
      onUnreadCountChange,
      fetchStorageUsage,
    ]
  );

  // Trigger fetch when tab, filters, page, or sort changes
  useEffect(() => {
    fetchEmails(currentPage);
  }, [mailTab, activeSidebarView, viewFilter, appliedSearchQuery, sortBy, pageSize, currentPage]);

  // Lazy Load Selected Email Full Detail
  useEffect(() => {
    if (!selectedEmailId) {
      setSelectedEmailDetail(null);
      return;
    }

    // Check memory cache first
    if (emailDetailCache[selectedEmailId]) {
      setSelectedEmailDetail(emailDetailCache[selectedEmailId]);
      return;
    }

    // Find in current lightweight list
    const currentListItem = emailsList.find((e) => e.id === selectedEmailId);
    if (currentListItem) {
      setSelectedEmailDetail(currentListItem);
    }

    // If sent email, detail is already complete
    if (mailTab === 'sent') return;

    // Fetch complete detail on demand (includes body_html, body_text, raw_headers)
    setIsDetailLoading(true);
    emailInboxApi
      .getEmailById(selectedEmailId)
      .then((res) => {
        if (res.data?.success && res.data.email) {
          const detail = res.data.email;
          emailDetailCache[selectedEmailId] = detail;
          setSelectedEmailDetail(detail);

          // Update read state in list view
          setEmailsList((prev) =>
            prev.map((e) => (e.id === selectedEmailId ? { ...e, is_read: true } : e))
          );
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch email detail:', err);
      })
      .finally(() => {
        setIsDetailLoading(false);
      });
  }, [selectedEmailId, mailTab, emailsList]);

  // Periodic Silent Background Sync (Every 30s)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchEmails(currentPage, true);
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchEmails, currentPage]);

  // Handlers
  const handleSelectEmail = (email: EmailMessageRecord) => {
    setSelectedEmailId(email.id);
    setShowMobileDetail(true);
  };

  const handleToggleStar = async (e: React.MouseEvent, email: EmailMessageRecord) => {
    e.stopPropagation();
    const nextStarred = !email.is_starred;
    setEmailsList((prev) =>
      prev.map((item) => (item.id === email.id ? { ...item, is_starred: nextStarred } : item))
    );
    if (selectedEmailDetail?.id === email.id) {
      setSelectedEmailDetail({ ...selectedEmailDetail, is_starred: nextStarred });
    }
    try {
      await emailInboxApi.updateEmailState(email.id, { is_starred: nextStarred });
    } catch (_) {}
  };

  const handleToggleRead = async (email: EmailMessageRecord) => {
    const nextRead = !email.is_read;
    setEmailsList((prev) =>
      prev.map((item) => (item.id === email.id ? { ...item, is_read: nextRead } : item))
    );
    if (selectedEmailDetail?.id === email.id) {
      setSelectedEmailDetail({ ...selectedEmailDetail, is_read: nextRead });
    }
    setUnreadTotalCount((prev) => Math.max(0, prev + (nextRead ? -1 : 1)));
    try {
      await emailInboxApi.updateEmailState(email.id, { is_read: nextRead });
    } catch (_) {}
  };

  const handleArchive = async (email: EmailMessageRecord) => {
    setEmailsList((prev) => prev.filter((item) => item.id !== email.id));
    if (selectedEmailId === email.id) {
      const remaining = emailsList.filter((item) => item.id !== email.id);
      setSelectedEmailId(remaining[0]?.id || null);
    }
    addToast('Email Archived', `Archived email: ${email.subject}`, 'info');
    try {
      await emailInboxApi.updateEmailState(email.id, { is_archived: true });
    } catch (_) {}
  };

  const handleDelete = (email: EmailMessageRecord) => {
    showConfirm(
      'Move to Trash?',
      `Are you sure you want to move "${email.subject}" to Trash?`,
      async () => {
        setEmailsList((prev) => prev.filter((item) => item.id !== email.id));
        if (selectedEmailId === email.id) {
          const remaining = emailsList.filter((item) => item.id !== email.id);
          setSelectedEmailId(remaining[0]?.id || null);
        }
        addToast('Moved to Trash', `Email moved to Trash`, 'warning');
        try {
          await emailInboxApi.updateEmailState(email.id, { is_trashed: true });
        } catch (_) {}
      }
    );
  };

  const handleCopyBody = () => {
    if (!selectedEmailDetail) return;
    const text = selectedEmailDetail.body_text || htmlToPlainText(selectedEmailDetail.body_html || '');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    addToast('Copied', 'Email body copied to clipboard', 'success');
  };

  const handleOpenReply = (email?: EmailMessageRecord) => {
    const target = email || selectedEmailDetail;
    if (target) {
      setSelectedEmailId(target.id);
      setComposeMode('reply');
      setIsComposeOpen(true);
    }
  };

  const handleOpenForward = (email?: EmailMessageRecord) => {
    const target = email || selectedEmailDetail;
    if (target) {
      setSelectedEmailId(target.id);
      setComposeMode('forward');
      setIsComposeOpen(true);
    }
  };

  const handleSendSuccess = (sentRecord: EmailMessageRecord) => {
    if (mailTab === 'sent') {
      setEmailsList((prev) => [sentRecord, ...prev]);
    }
    fetchStorageUsage();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearchQuery(searchQuery);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setAppliedSearchQuery('');
    setCurrentPage(1);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render Sanitize HTML
  const sanitizedHtmlContent = useMemo(() => {
    if (!selectedEmailDetail?.body_html) return '';
    return sanitizeEmailHtmlWithDomPurify(selectedEmailDetail.body_html);
  }, [selectedEmailDetail?.body_html]);

  return (
    <div className="space-y-4">
      {/* TOP HEADER: STORAGE & METRICS BAR */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white font-display">Zenemoo Enterprise Email Inbox</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                ● Live Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Encrypted Brevo SMTP relay &amp; Cloudflare routing gateway. Server-side paginated.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Storage: <strong className="text-white">{storageStats.used_formatted}</strong> / {storageStats.max_formatted}</span>
          </div>

          <button
            type="button"
            onClick={() => fetchEmails(currentPage, false)}
            disabled={isLoading || isRefreshing}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer transition-colors"
            title="Email Settings & Domain Verification"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN 3-COLUMN INBOX CONTAINER */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden flex flex-col md:flex-row h-[780px]">
        {/* ========================================================================= */}
        {/* COLUMN 1: SIDEBAR (Mailbox Accounts, Views, Labels) */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-56 lg:w-64 border-r border-white/10 p-4 space-y-5 overflow-y-auto shrink-0 bg-[#070a11]/60 font-mono text-xs ${
            showMobileDetail ? 'hidden md:block' : 'block'
          }`}
        >
          {/* TAB SELECTOR: INCOMING VS SENT */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMailTab('incoming');
                setCurrentPage(1);
              }}
              className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                mailTab === 'incoming'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Inbox ({unreadTotalCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMailTab('sent');
                setCurrentPage(1);
              }}
              className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                mailTab === 'sent'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Sent</span>
            </button>
          </div>

          {/* VIEWS (All, Unread, Starred, Archived, Trash) */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block px-2">Folders</span>
            {[
              { id: 'all', label: 'All Mail', icon: Mail },
              { id: 'unread', label: 'Unread', icon: CheckCircle2, badge: unreadTotalCount },
              { id: 'starred', label: 'Starred', icon: Star },
              { id: 'archived', label: 'Archived', icon: Archive },
              { id: 'trash', label: 'Trash', icon: Trash2 },
            ].map((v) => {
              const Icon = v.icon;
              const isActive = viewFilter === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setViewFilter(v.id as any);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/20'
                      : 'text-slate-400 hover:bg-white/[0.03] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{v.label}</span>
                  </div>
                  {v.badge !== undefined && v.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                      {v.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* MAILBOX ACCOUNTS */}
          <div className="space-y-1 pt-2 border-t border-white/5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block px-2">
              Mailbox Inboxes
            </span>
            {MAILBOX_LIST.map((mb) => {
              const isActive = activeSidebarView.type === 'mailbox' && activeSidebarView.value === mb.email;
              return (
                <button
                  key={mb.email}
                  type="button"
                  onClick={() => {
                    setActiveSidebarView({ type: 'mailbox', value: mb.email });
                    setCurrentPage(1);
                  }}
                  className={`w-full px-3 py-1.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white font-bold border border-white/15'
                      : 'text-slate-400 hover:bg-white/[0.03] hover:text-white'
                  }`}
                >
                  <span className="truncate">{mb.label}</span>
                </button>
              );
            })}
          </div>

          {/* LABELS & CATEGORIES */}
          <div className="space-y-1 pt-2 border-t border-white/5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block px-2">Labels</span>
            {LABEL_LIST.map((lbl) => {
              const Icon = lbl.icon;
              const isActive = activeSidebarView.type === 'label' && activeSidebarView.value === lbl.id;
              return (
                <button
                  key={lbl.id}
                  type="button"
                  onClick={() => {
                    setActiveSidebarView({ type: 'label', value: lbl.id });
                    setCurrentPage(1);
                  }}
                  className={`w-full px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white font-bold border border-white/15'
                      : 'text-slate-400 hover:bg-white/[0.03] hover:text-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${lbl.color}`} />
                  <span className="truncate">{lbl.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: EMAIL LIST (Search, Controls, Paginated List, Bottom Bar) */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-white/10 flex flex-col shrink-0 bg-[#090d16]/70 ${
            showMobileDetail ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* SEARCH & FILTER CONTROLS BAR */}
          <div className="p-3 border-b border-white/10 space-y-2 bg-[#070a11]/40 font-mono text-xs">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sender, email, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-16 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-bold hover:bg-cyan-500/30 cursor-pointer"
                >
                  Find
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer"
                >
                  <option value="newest" className="bg-[#090d16] text-white">Newest First</option>
                  <option value="oldest" className="bg-[#090d16] text-white">Oldest First</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer"
                >
                  <option value={20} className="bg-[#090d16] text-white">20</option>
                  <option value={50} className="bg-[#090d16] text-white">50</option>
                  <option value={100} className="bg-[#090d16] text-white">100</option>
                </select>
              </div>
            </div>
          </div>

          {/* EMAILS LIST AREA */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-2 font-mono text-xs">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                <p>Loading emails from Supabase...</p>
              </div>
            ) : emailsList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2 font-mono text-xs">
                <Mail className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="font-bold text-white">No Emails Found</p>
                <p className="text-[11px] text-slate-500">
                  {appliedSearchQuery || viewFilter !== 'all'
                    ? 'No messages match current query/filter.'
                    : 'Your mailbox is currently clear.'}
                </p>
              </div>
            ) : (
              emailsList.map((email) => {
                const isSelected = selectedEmailId === email.id;
                const senderDisplay = decodeMimeHeader(email.sender_name) || email.sender_email;
                const subjectDisplay = decodeMimeHeader(email.subject) || '(No Subject)';
                const hasAtts = email.attachments && email.attachments.length > 0;

                return (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                        : 'hover:bg-white/[0.02]'
                    } ${!email.is_read ? 'bg-white/[0.015]' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleStar(e, email)}
                          className="text-slate-400 hover:text-amber-400 cursor-pointer shrink-0"
                        >
                          <Star className={`w-3.5 h-3.5 ${email.is_starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                        </button>
                        <span
                          className={`truncate text-xs ${
                            !email.is_read ? 'font-bold text-white' : 'font-medium text-slate-300'
                          }`}
                        >
                          {senderDisplay}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {new Date(email.received_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <p
                      className={`text-xs truncate mb-1 ${
                        !email.is_read ? 'font-bold text-white' : 'text-slate-300'
                      }`}
                    >
                      {subjectDisplay}
                    </p>

                    <p className="text-[11px] text-slate-400 truncate line-clamp-1">{email.snippet}</p>

                    <div className="flex items-center gap-2 mt-2 font-mono text-[10px]">
                      <span className="px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/10">
                        {email.category || 'general'}
                      </span>
                      {hasAtts && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Paperclip className="w-3 h-3 text-cyan-400" />
                          <span>{email.attachments!.length}</span>
                        </span>
                      )}
                      {!email.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-auto" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* BOTTOM PAGINATION BAR */}
          {totalCount > 0 && (
            <div className="p-2.5 border-t border-white/10 bg-[#070a11] flex items-center justify-between font-mono text-xs text-slate-400">
              <span className="text-[11px]">
                {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || isLoading}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2 text-white font-bold text-[11px]">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || isLoading}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: SELECTED EMAIL DETAIL VIEW */}
        {/* ========================================================================= */}
        <div
          className={`flex-1 flex flex-col bg-[#0b0f19] overflow-hidden ${
            showMobileDetail ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedEmailDetail ? (
            <>
              {/* DETAIL HEADER & ACTION TOOLBAR */}
              <div className="p-4 border-b border-white/10 bg-[#070a11]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMobileDetail(false)}
                    className="md:hidden p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReply()}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10 transition-all"
                    >
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenForward()}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Forward className="w-3.5 h-3.5" /> Forward
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleRead(selectedEmailDetail)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
                    title={selectedEmailDetail.is_read ? 'Mark as Unread' : 'Mark as Read'}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleArchive(selectedEmailDetail)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
                    title="Archive"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(selectedEmailDetail)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyBody}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
                    title="Copy Body"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* EMAIL SENDER & METADATA SECTION */}
              <div className="p-4 sm:p-6 border-b border-white/10 space-y-3 bg-[#080c16]/50">
                <h2 className="text-base sm:text-lg font-bold text-white font-display">
                  {decodeMimeHeader(selectedEmailDetail.subject) || '(No Subject)'}
                </h2>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {(selectedEmailDetail.sender_name || selectedEmailDetail.sender_email || 'Z')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-sm">
                          {decodeMimeHeader(selectedEmailDetail.sender_name) || selectedEmailDetail.sender_email}
                        </strong>
                        <span className="text-slate-400">&lt;{selectedEmailDetail.sender_email}&gt;</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        To: <span className="text-cyan-300">{selectedEmailDetail.recipient_email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 sm:text-right">
                    <div>{new Date(selectedEmailDetail.received_at).toLocaleString()}</div>
                    {selectedEmailDetail.auth_results && (
                      <div className="flex items-center gap-2 text-[10px] text-emerald-400 pt-0.5">
                        <ShieldCheck className="w-3 h-3" />
                        <span>SPF: {selectedEmailDetail.auth_results.spf || 'pass'}</span>
                        <span>&bull;</span>
                        <span>DKIM: {selectedEmailDetail.auth_results.dkim || 'pass'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ATTACHMENTS LIST BAR */}
              {selectedEmailDetail.attachments && selectedEmailDetail.attachments.length > 0 && (
                <div className="px-6 py-3 bg-white/[0.02] border-b border-white/10 font-mono text-xs space-y-2">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Attachments ({selectedEmailDetail.attachments.length})</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {selectedEmailDetail.attachments.map((att) => {
                      const downloadUrl = emailInboxApi.getAttachmentDownloadUrl(selectedEmailDetail.id, att.id || att.filename);
                      const isPdfOrImage =
                        (att.contentType || '').includes('pdf') ||
                        (att.contentType || '').includes('image') ||
                        att.filename.endsWith('.pdf') ||
                        att.filename.endsWith('.png') ||
                        att.filename.endsWith('.jpg');

                      return (
                        <div
                          key={att.id || att.filename}
                          className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2 hover:border-cyan-500/30 transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {getAttachmentIcon(att.contentType, att.filename)}
                            <div className="min-w-0">
                              <p className="text-white truncate font-medium text-[11px]">{att.filename}</p>
                              <p className="text-[10px] text-slate-500">{formatFileSize(att.size)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isPdfOrImage && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewAttachment({
                                    attachment: att,
                                    emailId: selectedEmailDetail.id,
                                    url: emailInboxApi.getAttachmentDownloadUrl(selectedEmailDetail.id, att.id || att.filename, true),
                                  })
                                }
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300"
                                title="Preview Attachment"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <a
                              href={downloadUrl}
                              download={att.filename}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                              title="Download Attachment"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EMAIL BODY DISPLAY */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto font-sans leading-relaxed text-slate-200">
                {isDetailLoading ? (
                  <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                    <p>Fetching complete email body...</p>
                  </div>
                ) : sanitizedHtmlContent ? (
                  <div
                    className="max-w-full overflow-x-auto [overflow-wrap:anywhere] [word-break:break-word] text-slate-200 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtmlContent }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap font-sans text-slate-200 text-sm leading-relaxed [overflow-wrap:anywhere] [word-break:break-word]">
                    {selectedEmailDetail.body_text || selectedEmailDetail.snippet}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 font-mono text-xs space-y-2">
              <Inbox className="w-10 h-10 text-slate-600" />
              <p className="text-white font-bold">Select an email to view</p>
              <p className="text-slate-500 text-[11px]">Messages are securely synced from Cloudflare &amp; Brevo.</p>
            </div>
          )}
        </div>
      </div>

      {/* EMAIL COMPOSE MODAL */}
      {isComposeOpen && selectedEmailDetail && (
        <EmailComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          mode={composeMode}
          originalEmail={selectedEmailDetail}
          onSendSuccess={handleSendSuccess}
          addToast={addToast}
        />
      )}

      {/* ATTACHMENT PREVIEW MODAL */}
      {previewAttachment && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0b0f19] border border-white/15 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#070a11] border-b border-white/10 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2 text-white font-bold truncate">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="truncate">{previewAttachment.attachment.filename}</span>
                <span className="text-slate-500 font-normal">({formatFileSize(previewAttachment.attachment.size)})</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={emailInboxApi.getAttachmentDownloadUrl(previewAttachment.emailId, previewAttachment.attachment.id || previewAttachment.attachment.filename)}
                  download={previewAttachment.attachment.filename}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold flex items-center gap-1.5 text-xs hover:bg-cyan-500/30"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[400px]">
              {(previewAttachment.attachment.contentType || '').includes('image') ||
              ['png', 'jpg', 'jpeg', 'gif', 'webp'].some((ext) => previewAttachment.attachment.filename.endsWith(ext)) ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.attachment.filename}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg"
                />
              ) : (
                <iframe
                  src={previewAttachment.url}
                  title={previewAttachment.attachment.filename}
                  className="w-full h-[75vh] rounded-xl border border-white/10 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <AdminEmailSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          addToast={addToast}
        />
      )}
    </div>
  );
};
