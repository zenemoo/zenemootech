import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  Search,
  CheckCheck,
  Trash2,
  Eye,
  MoreVertical,
  RefreshCw,
  X,
  ExternalLink,
  Calendar,
  Mail,
  Briefcase,
  Handshake,
  ShieldCheck,
  Sparkles,
  Check,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { notificationApi } from '../services/api';

export interface NotificationRecordItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  url?: string | null;
  read?: boolean;
  is_read?: boolean;
  booking_id?: string;
  client_name?: string;
  email?: string;
  company_name?: string;
  meet_url?: string;
  metadata?: any;
  raw?: any;
}

interface AdminNotificationCenterTabProps {
  onNavigateTab: (tabName: string) => void;
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, opts?: any) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const AdminNotificationCenterTab: React.FC<AdminNotificationCenterTabProps> = React.memo(({
  onNavigateTab,
  addToast,
  showConfirm,
  onUnreadCountChange,
}) => {
  // Server-Side Paginated Notification State
  const [notifications, setNotifications] = useState<NotificationRecordItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Action Menu Popup (id)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Active Detail Drawer Notification
  const [detailNotif, setDetailNotif] = useState<NotificationRecordItem | null>(null);

  // Delete Older Data Modal State
  const [isDeleteOlderModalOpen, setIsDeleteOlderModalOpen] = useState(false);
  const [retentionDays, setRetentionDays] = useState<7 | 15 | 30>(30);
  const [isDeletingOlder, setIsDeletingOlder] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep stable ref for parent callbacks to prevent unnecessary dependency changes
  const onUnreadCountChangeRef = useRef(onUnreadCountChange);
  const addToastRef = useRef(addToast);
  const showConfirmRef = useRef(showConfirm);
  const onNavigateTabRef = useRef(onNavigateTab);

  useEffect(() => {
    onUnreadCountChangeRef.current = onUnreadCountChange;
    addToastRef.current = addToast;
    showConfirmRef.current = showConfirm;
    onNavigateTabRef.current = onNavigateTab;
  });

  // 400ms Search Debounce to eliminate rapid network requests
  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = searchQuery.trim();
      setDebouncedSearch((prev) => {
        if (prev !== trimmed) {
          setPage(1);
          return trimmed;
        }
        return prev;
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handler functions for filters to cleanly reset page to 1
  const handleCategoryFilterChange = (cat: string) => {
    setCategoryFilter(cat);
    setPage(1);
  };

  const handleReadFilterChange = (status: 'all' | 'unread' | 'read') => {
    setReadFilter(status);
    setPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  // Primary Server-Side Fetch Function
  const fetchNotifications = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await notificationApi.getAdminNotifications({
          page,
          pageSize,
          search: debouncedSearch || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          status: readFilter !== 'all' ? readFilter : undefined,
        });

        if (res.data && res.data.success) {
          const list: NotificationRecordItem[] = (res.data.notifications || res.data.data || []).map((n: any) => ({
            id: n.id,
            type: n.notification_type || n.type || 'general',
            title: n.title,
            description: n.message || n.description || '',
            timestamp: n.created_at || n.timestamp || new Date().toISOString(),
            url: n.url || null,
            is_read: Boolean(n.is_read || n.read),
            read: Boolean(n.is_read || n.read),
            booking_id: n.metadata?.booking_id,
            client_name: n.metadata?.client || n.metadata?.client_name,
            email: n.metadata?.email,
            company_name: n.metadata?.company || n.metadata?.company_name,
            meet_url: n.metadata?.meet_url,
            metadata: n.metadata || {},
            raw: n,
          }));

          setNotifications(list);
          const totalRecs = res.data.total ?? list.length;
          setTotal(totalRecs);
          const computedTotalPages = res.data.totalPages ?? Math.max(1, Math.ceil(totalRecs / pageSize));
          setTotalPages(computedTotalPages);

          const unread = res.data.unreadCount ?? res.data.unread_count ?? 0;
          setUnreadCount(unread);
          if (onUnreadCountChangeRef.current) {
            onUnreadCountChangeRef.current(unread);
          }
        }
      } catch (err: any) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.warn('[Admin Notifications Fetch Error]:', err);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, pageSize, debouncedSearch, categoryFilter, readFilter]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefreshClick = () => {
    fetchNotifications(true);
    addToastRef.current('Notifications Updated', 'Latest notification records reloaded from server.', 'info');
  };

  // Bulk Mark All as Read (Server-Side)
  const handleMarkAllRead = async () => {
    try {
      const res = await notificationApi.adminMarkAllRead();
      addToastRef.current('Marked as Read', res.data?.message || 'All notifications marked as read.', 'success');
      await fetchNotifications();
    } catch (e: any) {
      addToastRef.current('Error', e.message || 'Failed to mark all notifications as read.', 'error');
    }
  };

  // Single Toggle Read / Unread
  const handleToggleRead = async (notif: NotificationRecordItem) => {
    const nextRead = !notif.is_read;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: nextRead, read: nextRead } : n))
    );
    setUnreadCount((prev) => (nextRead ? Math.max(0, prev - 1) : prev + 1));
    if (onUnreadCountChangeRef.current) {
      onUnreadCountChangeRef.current(nextRead ? Math.max(0, unreadCount - 1) : unreadCount + 1);
    }
    try {
      await notificationApi.adminMarkRead(notif.id, nextRead);
    } catch (_) {
      fetchNotifications();
    }
  };

  // Single Notification Deletion
  const handleDeleteSingle = (id: string, title: string) => {
    showConfirmRef.current(
      'Delete Notification Entry?',
      `Are you sure you want to delete "${title}"? This record will be permanently deleted from the database.`,
      async () => {
        try {
          await notificationApi.adminDelete(id);
          addToastRef.current('Notification Deleted', 'Notification removed permanently.', 'info');
          if (notifications.length === 1 && page > 1) {
            setPage((p) => Math.max(1, p - 1));
          } else {
            await fetchNotifications();
          }
        } catch (err: any) {
          addToastRef.current('Error', 'Failed to delete notification record.', 'error');
        }
      },
      { intent: 'danger', confirmText: 'Delete Notification' }
    );
  };

  // Safe Server-Side Delete Older Data Execution
  const handleExecuteDeleteOlder = async () => {
    setIsDeletingOlder(true);
    try {
      const res = await notificationApi.deleteOlder(retentionDays);
      if (res.data && res.data.success) {
        const deletedCount = res.data.deletedCount ?? 0;
        addToastRef.current(
          'Cleanup Successful',
          `${deletedCount} notification${deletedCount === 1 ? '' : 's'} older than ${retentionDays} days permanently deleted.`,
          'success'
        );
        setIsDeleteOlderModalOpen(false);
        setPage(1);
        await fetchNotifications();
      } else {
        addToastRef.current('Cleanup Failed', res.data?.message || 'Failed to delete older notifications.', 'error');
      }
    } catch (err: any) {
      addToastRef.current('Error', err.response?.data?.message || err.message || 'Server error during cleanup.', 'error');
    } finally {
      setIsDeletingOlder(false);
    }
  };

  // Helper to generate compact collapsed page numbers with ellipsis
  const getPageNumbers = (current: number, totalCountPages: number): (number | string)[] => {
    if (totalCountPages <= 7) {
      return Array.from({ length: totalCountPages }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', totalCountPages];
    }
    if (current >= totalCountPages - 3) {
      return [1, '...', totalCountPages - 4, totalCountPages - 3, totalCountPages - 2, totalCountPages - 1, totalCountPages];
    }
    return [1, '...', current - 1, current, current + 1, '...', totalCountPages];
  };

  // Relative Time Formatter
  const getRelativeTime = (isoStr: string) => {
    try {
      const past = new Date(isoStr).getTime();
      const now = Date.now();
      const diffSec = Math.floor((now - past) / 1000);
      if (isNaN(diffSec) || diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (_) {
      return 'Recently';
    }
  };

  // Render Category Icon Helper
  const renderCategoryIcon = (typeStr: string) => {
    const t = (typeStr || '').toLowerCase();
    if (t.includes('booking') || t.includes('call') || t.includes('meet')) {
      return <Calendar className="w-4 h-4 text-cyan-400" />;
    }
    if (t.includes('email')) return <Mail className="w-4 h-4 text-amber-400" />;
    if (t === 'inquiry') return <Mail className="w-4 h-4 text-purple-400" />;
    if (t === 'subscriber') return <Sparkles className="w-4 h-4 text-amber-400" />;
    if (t === 'application') return <Briefcase className="w-4 h-4 text-blue-400" />;
    if (t === 'partner') return <Handshake className="w-4 h-4 text-emerald-400" />;
    if (t === 'login' || t === 'security') return <ShieldCheck className="w-4 h-4 text-red-400" />;
    return <Bell className="w-4 h-4 text-slate-400" />;
  };

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. TOP HEADER & SUMMARY CARD */}
      <div className="bg-[#0b0f19] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold mb-2">
            <Bell className="w-3.5 h-3.5" /> DEDICATED NOTIFICATIONS CENTER
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-3">
            <span>System Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold animate-pulse">
                {unreadCount} Unread
              </span>
            )}
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Server-side paginated operational logs, call bookings, inquiries, and automated system alerts.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-start md:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all read</span>
            </button>
          )}

          {/* Delete Older Data Action Button */}
          <button
            onClick={() => setIsDeleteOlderModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            title="Clean up old notifications by retention period"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Older Data</span>
          </button>

          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            aria-label="Refresh Notifications"
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/10 text-slate-300 font-mono text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR */}
      <div className="bg-[#0b0f19] p-4 rounded-2xl border border-white/10 space-y-3 font-mono text-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Debounced Server Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search across all notifications by title or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Read / Unread Status Filter */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => handleReadFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                readFilter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleReadFilterChange('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                readFilter === 'unread'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => handleReadFilterChange('read')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                readFilter === 'read'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Read
            </button>
          </div>

          {/* Category Filter Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryFilterChange(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all" className="bg-[#0b0f19]">Category: All Types</option>
            <option value="booking" className="bg-[#0b0f19]">Category: Call Bookings</option>
            <option value="email" className="bg-[#0b0f19]">Category: Email Delivery</option>
            <option value="system" className="bg-[#0b0f19]">Category: System &amp; Security</option>
          </select>
        </div>
      </div>

      {/* 3. NOTIFICATIONS LIST VIEW */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-[#0b0f19] p-12 rounded-3xl border border-white/10 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-t-2 border-cyan-400 border-r-2 border-transparent animate-spin mx-auto" />
            <p className="text-xs font-mono text-slate-400">Loading notifications from server...</p>
          </div>
        ) : notifications.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-[#0b0f19] p-12 sm:p-16 rounded-3xl border border-white/10 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
              <Bell className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-white">No notifications found</h3>
              <p className="text-xs font-mono text-slate-400 max-w-sm mx-auto">
                {searchQuery || readFilter !== 'all' || categoryFilter !== 'all'
                  ? 'No notifications match your active search or filter criteria.'
                  : 'There are no notifications in the database.'}
              </p>
            </div>
            {(searchQuery || readFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setReadFilter('all');
                  setCategoryFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all cursor-pointer"
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          notifications.map((notif) => {
            const isRead = Boolean(notif.is_read);
            const isMenuOpen = activeMenuId === notif.id;

            return (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
                  isRead
                    ? 'bg-white/[0.015] border-white/5 opacity-70 hover:opacity-100 hover:bg-white/[0.03]'
                    : 'bg-[#0c1322] border-cyan-500/30 text-white shadow-lg shadow-cyan-500/5 hover:border-cyan-500/50'
                }`}
              >
                {/* Left Section: Icon & Text */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Category Icon Badge */}
                  <div
                    className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                      isRead ? 'bg-white/5 border-white/10' : 'bg-cyan-500/10 border-cyan-500/30'
                    }`}
                  >
                    {renderCategoryIcon(notif.type)}
                  </div>

                  {/* Notification Content */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm leading-snug font-display ${
                          isRead ? 'font-semibold text-slate-200' : 'font-bold text-white'
                        }`}
                      >
                        {notif.title}
                      </h4>

                      {!isRead && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-400/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Unread
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-cyan-400/80 font-bold ml-auto sm:ml-0">
                        {getRelativeTime(notif.timestamp)}
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed ${isRead ? 'text-slate-400' : 'text-slate-300'}`}>
                      {notif.description}
                    </p>

                    {/* Metadata Pill Line if available */}
                    {notif.booking_id && (
                      <div className="pt-1 flex items-center gap-2 font-mono text-[11px] text-cyan-300 font-bold">
                        <span>Ref: {notif.booking_id}</span>
                        {notif.client_name && <span>&bull; {notif.client_name}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action Menu (3-Dot Action Button) */}
                <div className="relative shrink-0 self-end sm:self-center flex items-center gap-2">
                  {/* Quick View Details Button */}
                  <button
                    onClick={() => {
                      if (!isRead) handleToggleRead(notif);
                      setDetailNotif(notif);
                    }}
                    className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="View Full Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Details</span>
                  </button>

                  {/* Three Dot Trigger */}
                  <button
                    onClick={() => setActiveMenuId(isMenuOpen ? null : notif.id)}
                    aria-label="Notification actions"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Action Dropdown Popup */}
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                      <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[#090d16] border border-white/15 shadow-2xl p-1.5 z-50 font-mono text-xs space-y-1">
                        <button
                          onClick={() => {
                            handleToggleRead(notif);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 text-slate-200 transition-colors cursor-pointer"
                        >
                          {isRead ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Mark as unread
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Mark as read
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            if (!isRead) handleToggleRead(notif);
                            setDetailNotif(notif);
                          }}
                          className="w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left flex items-center gap-2 text-slate-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-400" /> View details
                        </button>

                        <div className="border-t border-white/10 my-1" />

                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            handleDeleteSingle(notif.id, notif.title);
                          }}
                          className="w-full px-3 py-2 rounded-lg hover:bg-red-500/20 text-left flex items-center gap-2 text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. SERVER-SIDE PAGINATION FOOTER */}
      {total > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0f19] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs shadow-xl">
          {/* Left: Showing X–Y of Z */}
          <div className="text-slate-400 text-center md:text-left">
            Showing <span className="text-white font-bold">{startIndex}</span>–
            <span className="text-white font-bold">{endIndex}</span> of{' '}
            <span className="text-cyan-300 font-bold">{total}</span> notifications
          </div>

          {/* Center: Pagination Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
            {/* Previous Button */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer font-bold"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Collapsed Page Number Buttons */}
            <div className="hidden sm:flex items-center gap-1">
              {getPageNumbers(page, totalPages).map((pNum, idx) => {
                if (pNum === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-500 font-mono">
                      ...
                    </span>
                  );
                }
                const num = pNum as number;
                const isActive = page === num;
                return (
                  <button
                    key={`page-${num}`}
                    onClick={() => setPage(num)}
                    disabled={isLoading}
                    className={`w-8 h-8 rounded-xl font-bold font-mono text-xs transition-all flex items-center justify-center cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                        : 'border border-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Mobile Current Page Indicator */}
            <span className="sm:hidden px-3 py-1 text-slate-300 font-mono font-bold">
              Page {page} of {totalPages}
            </span>

            {/* Next Button */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer font-bold"
              aria-label="Next Page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Page Size Selector (10, 25, 50) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value={10} className="bg-[#0b0f19]">10 / page</option>
              <option value={25} className="bg-[#0b0f19]">25 / page</option>
              <option value={50} className="bg-[#0b0f19]">50 / page</option>
            </select>
          </div>
        </div>
      )}

      {/* 5. DELETE OLDER DATA CONFIRMATION MODAL */}
      {isDeleteOlderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-red-500/40 max-w-md w-full relative space-y-5 bg-[#0b0f19] text-slate-200 shadow-2xl">
            <button
              onClick={() => !isDeletingOlder && setIsDeleteOlderModalOpen(false)}
              disabled={isDeletingOlder}
              aria-label="Close delete older modal"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-white">Delete Older Notifications?</h3>
              <p className="text-xs font-mono text-slate-400">
                Safely purge historical notification records from the database
              </p>
            </div>

            {/* Retention Range Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-slate-300 font-bold">
                Choose retention cutoff:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([7, 15, 30] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setRetentionDays(days)}
                    disabled={isDeletingOlder}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-mono font-bold transition-all text-center cursor-pointer ${
                      retentionDays === days
                        ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-sm shadow-red-500/20'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    &gt; {days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Critical Warning Box */}
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 space-y-1.5 font-mono text-xs">
              <div className="flex items-center gap-1.5 text-red-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Permanent Deletion Warning</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                This will permanently delete all notification records older than{' '}
                <strong className="text-red-300">{retentionDays} days</strong> from the database. This action cannot be undone.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setIsDeleteOlderModalOpen(false)}
                disabled={isDeletingOlder}
                className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteOlder}
                disabled={isDeletingOlder}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingOlder ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. POLISHED NOTIFICATION DETAILS DRAWER / MODAL */}
      {detailNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/40 max-w-xl w-full my-6 space-y-6 max-h-[85vh] overflow-y-auto relative shadow-2xl bg-[#0b0f19] text-slate-200">
            {/* Close Button */}
            <button
              onClick={() => setDetailNotif(null)}
              aria-label="Close detail modal"
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3 border-b border-white/10 pb-4 pr-10">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                {renderCategoryIcon(detailNotif.type)}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-cyan-300 font-mono text-[10px] uppercase font-bold mb-1">
                  {detailNotif.type}
                </div>
                <h3 className="text-xl font-bold font-display text-white leading-snug">
                  {detailNotif.title}
                </h3>
                <p className="text-xs font-mono text-cyan-400 mt-1">
                  {new Date(detailNotif.timestamp).toLocaleString()} ({getRelativeTime(detailNotif.timestamp)})
                </p>
              </div>
            </div>

            {/* Description Body */}
            <div className="space-y-2 font-mono text-xs">
              <label className="block text-slate-400 font-bold uppercase text-[10px]">NOTIFICATION MESSAGE</label>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white leading-relaxed">
                {detailNotif.description}
              </div>
            </div>

            {/* Metadata if available */}
            {detailNotif.booking_id && (
              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 font-mono text-xs space-y-2">
                <div className="text-[10px] text-cyan-400 uppercase font-bold">ASSOCIATED CALL BOOKING</div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[9px]">BOOKING ID</span>
                    <span className="text-white font-bold">{detailNotif.booking_id}</span>
                  </div>
                  {detailNotif.client_name && (
                    <div>
                      <span className="text-slate-500 block text-[9px]">CLIENT NAME</span>
                      <span className="text-white">{detailNotif.client_name}</span>
                    </div>
                  )}
                  {detailNotif.company_name && (
                    <div>
                      <span className="text-slate-500 block text-[9px]">COMPANY</span>
                      <span className="text-white">{detailNotif.company_name}</span>
                    </div>
                  )}
                  {detailNotif.email && (
                    <div>
                      <span className="text-slate-500 block text-[9px]">EMAIL</span>
                      <span className="text-cyan-300">{detailNotif.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10 font-mono text-xs">
              <button
                onClick={() => handleToggleRead(detailNotif)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {detailNotif.is_read ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Mark Unread
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Mark Read
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                {detailNotif.type.includes('booking') || detailNotif.booking_id ? (
                  <button
                    onClick={() => {
                      setDetailNotif(null);
                      onNavigateTab('call-bookings');
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    <span>Open Call Bookings</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ) : detailNotif.type === 'inquiry' ? (
                  <button
                    onClick={() => {
                      setDetailNotif(null);
                      onNavigateTab('inquiries');
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>View Inquiries</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ) : null}

                <button
                  onClick={() => setDetailNotif(null)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

