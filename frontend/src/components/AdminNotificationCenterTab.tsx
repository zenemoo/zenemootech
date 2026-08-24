import React, { useState, useMemo, useEffect } from 'react';
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
  UserCheck,
  Briefcase,
  Handshake,
  ShieldCheck,
  Sparkles,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  Check,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { notificationApi } from '../services/api';

export interface NotificationRecordItem {
  id: string;
  type: string; // 'inquiry' | 'subscriber' | 'application' | 'partner' | 'login' | 'security' | 'booking' | 'system'
  title: string;
  description: string;
  timestamp: string;
  url?: string | null;
  read?: boolean;
  booking_id?: string;
  client_name?: string;
  email?: string;
  company_name?: string;
  meet_url?: string;
  raw?: any;
}

interface AdminNotificationCenterTabProps {
  notifications: NotificationRecordItem[];
  readNotificationIds: string[];
  onMarkAllRead: () => void;
  onToggleRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onRefresh: () => void;
  onNavigateTab: (tabName: string) => void;
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, opts?: any) => void;
}

export const AdminNotificationCenterTab: React.FC<AdminNotificationCenterTabProps> = ({
  notifications,
  readNotificationIds,
  onMarkAllRead,
  onToggleRead,
  onDeleteNotification,
  onRefresh,
  onNavigateTab,
  addToast,
  showConfirm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination State (Default: 20 per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Active Action Menu Popup (id)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Active Detail Drawer Notification
  const [detailNotif, setDetailNotif] = useState<NotificationRecordItem | null>(null);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      addToast('Notifications Updated', 'Latest notification records reloaded.', 'info');
    } catch (_) {
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter & Search Logic
  const filteredNotifications = useMemo(() => {
    let list = [...notifications];

    // Read / Unread Filter
    if (readFilter === 'unread') {
      list = list.filter((n) => !readNotificationIds.includes(n.id));
    } else if (readFilter === 'read') {
      list = list.filter((n) => readNotificationIds.includes(n.id));
    }

    // Type Filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'booking') {
        list = list.filter(
          (n) =>
            n.type === 'booking' ||
            n.type.includes('booking') ||
            n.type.includes('meet') ||
            n.title.toLowerCase().includes('booking') ||
            n.title.toLowerCase().includes('call')
        );
      } else if (typeFilter === 'inquiry') {
        list = list.filter((n) => n.type === 'inquiry' || n.title.toLowerCase().includes('inquiry'));
      } else if (typeFilter === 'subscriber') {
        list = list.filter((n) => n.type === 'subscriber' || n.title.toLowerCase().includes('subscriber'));
      } else if (typeFilter === 'application') {
        list = list.filter((n) => n.type === 'application' || n.title.toLowerCase().includes('application'));
      } else if (typeFilter === 'partner') {
        list = list.filter((n) => n.type === 'partner' || n.title.toLowerCase().includes('partner'));
      } else if (typeFilter === 'security') {
        list = list.filter((n) => n.type === 'security' || n.type === 'login' || n.type === 'cloudinary');
      }
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.description?.toLowerCase().includes(q) ||
          n.type?.toLowerCase().includes(q) ||
          (n.booking_id && n.booking_id.toLowerCase().includes(q)) ||
          (n.client_name && n.client_name.toLowerCase().includes(q)) ||
          (n.email && n.email.toLowerCase().includes(q)) ||
          (n.company_name && n.company_name.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, readNotificationIds, readFilter, typeFilter, searchQuery]);

  // Reset to page 1 whenever search, filter, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, readFilter, typeFilter, pageSize]);

  // Calculate Total Pages
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));

  // Automatically clamp page if items were deleted or list shrunk
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Slice Current Page Notifications
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredNotifications.length);
  const paginatedNotifications = useMemo(() => {
    return filteredNotifications.slice(startIndex, endIndex);
  }, [filteredNotifications, startIndex, endIndex]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readNotificationIds.includes(n.id)).length;
  }, [notifications, readNotificationIds]);

  // Helper to generate collapsed page numbers with ellipsis
  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }

    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
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
  const renderCategoryIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('booking') || t.includes('call') || t.includes('meet')) {
      return <Calendar className="w-4 h-4 text-cyan-400" />;
    }
    if (t === 'inquiry') return <Mail className="w-4 h-4 text-purple-400" />;
    if (t === 'subscriber') return <Sparkles className="w-4 h-4 text-amber-400" />;
    if (t === 'application') return <Briefcase className="w-4 h-4 text-blue-400" />;
    if (t === 'partner') return <Handshake className="w-4 h-4 text-emerald-400" />;
    if (t === 'login' || t === 'security') return <ShieldCheck className="w-4 h-4 text-red-400" />;
    return <Bell className="w-4 h-4 text-slate-400" />;
  };

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
            Stay updated with call bookings, contact inquiries, newsletter signups, applications, and security alerts.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}

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
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by title, message, type, booking ID, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Read / Unread Status Filter */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setReadFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                readFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setReadFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                readFilter === 'unread' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setReadFilter('read')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                readFilter === 'read' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>

          {/* Type Filter Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all" className="bg-[#0b0f19]">Category: All Types</option>
            <option value="booking" className="bg-[#0b0f19]">Category: Call Bookings</option>
            <option value="inquiry" className="bg-[#0b0f19]">Category: Contact Inquiries</option>
            <option value="subscriber" className="bg-[#0b0f19]">Category: Subscribers</option>
            <option value="application" className="bg-[#0b0f19]">Category: Applications</option>
            <option value="partner" className="bg-[#0b0f19]">Category: Enterprise Partners</option>
            <option value="security" className="bg-[#0b0f19]">Category: System &amp; Security</option>
          </select>
        </div>
      </div>

      {/* 3. NOTIFICATIONS LIST VIEW (Render only paginated slice) */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-[#0b0f19] p-12 sm:p-16 rounded-3xl border border-white/10 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
              <Bell className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-white">You're all caught up</h3>
              <p className="text-xs font-mono text-slate-400 max-w-sm mx-auto">
                {searchQuery || readFilter !== 'all' || typeFilter !== 'all'
                  ? 'No notifications match your search or active filter settings.'
                  : 'There are no new notifications right now.'}
              </p>
            </div>
            {(searchQuery || readFilter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setReadFilter('all');
                  setTypeFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all cursor-pointer"
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          paginatedNotifications.map((notif) => {
            const isRead = readNotificationIds.includes(notif.id);
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
                  <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${isRead ? 'bg-white/5 border-white/10' : 'bg-cyan-500/10 border-cyan-500/30'}`}>
                    {renderCategoryIcon(notif.type)}
                  </div>

                  {/* Notification Content */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm leading-snug font-display ${isRead ? 'font-semibold text-slate-200' : 'font-bold text-white'}`}>
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
                      if (!isRead) onToggleRead(notif.id);
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
                            onToggleRead(notif.id);
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
                            if (!isRead) onToggleRead(notif.id);
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
                            showConfirm(
                              'Delete notification?',
                              'This notification record will be permanently removed from your view.',
                              () => onDeleteNotification(notif.id),
                              { intent: 'danger', confirmText: 'Delete Notification' }
                            );
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

      {/* 4. PROFESSIONAL PAGINATION FOOTER */}
      {filteredNotifications.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0f19] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs shadow-xl">
          {/* Left: Showing X–Y of Z */}
          <div className="text-slate-400 text-center md:text-left">
            Showing <span className="text-white font-bold">{filteredNotifications.length === 0 ? 0 : startIndex + 1}</span>–
            <span className="text-white font-bold">{endIndex}</span> of{' '}
            <span className="text-cyan-300 font-bold">{filteredNotifications.length}</span> notifications
          </div>

          {/* Center: Pagination Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer font-bold"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Collapsed Page Number Buttons */}
            <div className="hidden sm:flex items-center gap-1">
              {getPageNumbers(currentPage, totalPages).map((page, idx) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-500 font-mono">
                      ...
                    </span>
                  );
                }
                const pageNum = page as number;
                const isActive = currentPage === pageNum;
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl font-bold font-mono text-xs transition-all flex items-center justify-center cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                        : 'border border-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Mobile Current Page Indicator */}
            <span className="sm:hidden px-3 py-1 text-slate-300 font-mono font-bold">
              Page {currentPage} of {totalPages}
            </span>

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer font-bold"
              aria-label="Next Page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value={20} className="bg-[#0b0f19]">20 per page</option>
              <option value={50} className="bg-[#0b0f19]">50 per page</option>
              <option value={100} className="bg-[#0b0f19]">100 per page</option>
            </select>
          </div>
        </div>
      )}

      {/* 5. POLISHED NOTIFICATION DETAILS DRAWER / MODAL */}
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
                onClick={() => {
                  onToggleRead(detailNotif.id);
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {readNotificationIds.includes(detailNotif.id) ? (
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
};
