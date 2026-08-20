import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  X,
  Sparkles,
  Briefcase,
  Megaphone,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { notificationApi } from '../services/api';
import { getInstallationId, sanitizeZenemooUrl } from '../services/notificationService';

export interface ZenemooNotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  notification_type?: string;
  target_type?: string;
  url?: string;
  opportunity_id?: string;
  created_at: string;
  is_read: boolean;
}

interface NotificationCenterProps {
  onNotificationOpen?: () => void;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<ZenemooNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications for the last 7 days using the centralized API
  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setHasError(false);
    try {
      const installationId = getInstallationId();
      const res = await notificationApi.getAll({ installation_id: installationId });
      if (res.data && res.data.success) {
        const rawList: ZenemooNotificationItem[] = res.data.data || [];
        
        // 7-day client-side safeguard filter
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const filtered = rawList.filter((item) => {
          const itemTime = new Date(item.created_at).getTime();
          return isNaN(itemTime) || itemTime >= sevenDaysAgo;
        });

        setNotifications(filtered);
        const unread = filtered.filter((n) => !n.is_read).length;
        setUnreadCount(unread);

        // Check if there is a brand new notification to trigger a live toast
        if (filtered.length > 0) {
          const latest = filtered[0];
          const latestTime = new Date(latest.created_at).getTime();
          const seenKey = `zenemoo_toast_seen_${latest.id}`;
          const isRecent = Date.now() - latestTime < 10 * 60 * 1000; // within 10 minutes
          
          if (!latest.is_read && isRecent && !sessionStorage.getItem(seenKey)) {
            sessionStorage.setItem(seenKey, 'true');
            window.dispatchEvent(
              new CustomEvent('zenemoo:live-notification', {
                detail: latest,
              })
            );
          }
        }
      }
    } catch (err) {
      console.warn('[NotificationCenter Fetch Warn]:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount and poll periodically (every 45s)
  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 45000);

    const handleRefresh = () => fetchNotifications(false);
    window.addEventListener('zenemoo:refresh-notifications', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('zenemoo:refresh-notifications', handleRefresh);
    };
  }, [fetchNotifications]);

  // Requirement #1 & #3 & #4 & #8: Internal scrolling vs Outside scroll auto-close
  useEffect(() => {
    if (!isOpen) return;

    let touchStartedInside = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (panelRef.current && panelRef.current.contains(e.target as Node)) {
        touchStartedInside = true;
      } else {
        touchStartedInside = false;
      }
    };

    const handleTouchMove = () => {
      // Only close if user swiped outside the notification panel
      if (!touchStartedInside) {
        setIsOpen(false);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // If mouse wheel is inside the notification panel, let it scroll internally
      if (panelRef.current && panelRef.current.contains(e.target as Node)) {
        return;
      }
      // If wheel is outside the notification panel, close it
      setIsOpen(false);
    };

    // Outside page scroll detection
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY) > 8 && !touchStartedInside) {
        setIsOpen(false);
      }
      lastScrollY = currentScrollY;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen]);

  // Requirement #11: Close on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const installationId = getInstallationId();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await notificationApi.markRead(id, installationId);
    } catch (err) {
      console.warn('[Mark Read Error]:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    const installationId = getInstallationId();
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      await notificationApi.markAllRead(installationId);
    } catch (err) {
      console.warn('[Mark All Read Error]:', err);
    }
  };

  // Click individual notification -> mark as read, close panel, navigate safely
  const handleNotificationClick = async (item: ZenemooNotificationItem) => {
    await handleMarkAsRead(item.id);
    setIsOpen(false);

    if (item.url) {
      const target = item.url.trim();
      if (target.startsWith('/') || target.startsWith('#')) {
        // Internal page or hash navigation
        if (target.startsWith('#')) {
          const el = document.querySelector(target);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            return;
          }
        }
        window.location.href = target;
      } else {
        const safeUrl = sanitizeZenemooUrl(target);
        window.location.href = safeUrl;
      }
    }
  };

  // Format category badge & icon
  const getCategoryMeta = (type?: string, notifType?: string) => {
    const raw = (notifType || type || '').toLowerCase();
    if (raw.includes('opportunity') || raw.includes('job')) {
      return {
        label: 'Opportunity',
        icon: <Briefcase className="w-3.5 h-3.5 text-cyan-400" />,
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        emoji: '🎯',
      };
    }
    if (raw.includes('announcement') || raw.includes('broadcast')) {
      return {
        label: 'Announcement',
        icon: <Megaphone className="w-3.5 h-3.5 text-purple-400" />,
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        emoji: '📢',
      };
    }
    if (raw.includes('important') || raw.includes('warning') || raw.includes('alert')) {
      return {
        label: 'Important',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        emoji: '⚠️',
      };
    }
    if (raw.includes('success') || raw.includes('payment') || raw.includes('confirmed')) {
      return {
        label: 'Update',
        icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        emoji: '🎉',
      };
    }
    return {
      label: 'Info',
      icon: <Info className="w-3.5 h-3.5 text-blue-400" />,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      emoji: 'ℹ️',
    };
  };

  // Relative time format
  const formatTimeAgo = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return 'Recently';
    const diff = Math.max(0, Date.now() - time);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 🔔 BELL BUTTON (Desktop & Mobile) */}
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) fetchNotifications(false);
        }}
        className={`relative p-2 sm:p-2.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-center group ${
          isOpen
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.35)] scale-95'
            : 'bg-slate-900/90 border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white shadow-sm active:scale-95'
        }`}
        title="Zenemoo Notification Center"
        aria-label="Zenemoo Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-400 group-hover:rotate-12 transition-transform duration-200" />

        {/* UNREAD COUNT BADGE (Requirement #4: 0 -> hidden, 1-9 -> exact, >9 -> 9+) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-[10px] font-mono font-extrabold flex items-center justify-center shadow-lg shadow-cyan-500/40 animate-pulse border border-black/40">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── NOTIFICATION PANEL (Desktop Dropdown & Mobile Floating Modal ~60-65% Viewport) ── */}
      {isOpen && (
        <>
          {/* Subtle Mobile Backdrop (Soft dim without obscuring website & bottom nav) */}
          <div
            className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[2px] sm:hidden transition-opacity duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Floating Glassmorphic Notification Panel */}
          <div
            ref={panelRef}
            className="fixed top-[62px] left-[10px] right-[10px] sm:absolute sm:top-[calc(100%+10px)] sm:left-auto sm:right-0 w-[calc(100vw-20px)] sm:w-[370px] max-w-[390px] mx-auto max-h-[min(480px,62vh)] sm:max-h-[520px] rounded-2xl sm:rounded-3xl bg-[#080d19]/95 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_0_20px_rgba(6,182,212,0.15)] z-[60] overflow-hidden text-xs font-sans flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {/* Compact Fixed Header */}
            <div className="py-2.5 px-3 sm:px-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-extrabold text-xs sm:text-sm text-white tracking-tight truncate">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-bold shrink-0">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 block leading-none mt-0.5">
                    Last 7 days
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-white/10 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Read all</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close notifications panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dedicated Scrollable Notification List (Consumes majority of ~60-65vh container) */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-white/5 p-2 space-y-1.5 [scrollbar-width:thin] [scrollbar-color:rgba(6,182,212,0.3)_transparent]"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {/* Loading Skeleton State */}
              {isLoading && notifications.length === 0 ? (
                <div className="space-y-1.5 p-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-2.5 w-20 bg-white/10 rounded-full" />
                        <div className="h-2 w-10 bg-white/5 rounded-full" />
                      </div>
                      <div className="h-2.5 w-3/4 bg-white/10 rounded-full" />
                      <div className="h-2 w-full bg-white/5 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : hasError && notifications.length === 0 ? (
                /* Error State */
                <div className="p-6 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-slate-200 font-bold text-xs">Unable to load notifications</p>
                    <p className="text-[10px] text-slate-400 font-mono">Please check your network</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchNotifications(true)}
                    className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                /* Empty State */
                <div className="p-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-slate-200 font-bold text-xs">No new notifications</p>
                    <p className="text-[10px] text-slate-400 font-mono">You're all caught up for the last 7 days.</p>
                  </div>
                </div>
              ) : (
                /* Compact Notification Cards */
                notifications.map((item) => {
                  const category = getCategoryMeta(item.type, item.notification_type);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer relative group flex items-start gap-2.5 ${
                        !item.is_read
                          ? 'bg-gradient-to-br from-cyan-950/40 to-slate-900/90 border-cyan-500/40 text-white shadow-sm hover:border-cyan-400'
                          : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05] hover:border-white/15'
                      }`}
                    >
                      {/* Unread Cyan Dot Indicator */}
                      {!item.is_read && (
                        <span className="absolute top-2.5 left-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,1)]" />
                      )}

                      {/* Category Icon */}
                      <div className="pl-0.5 shrink-0 mt-0.5">
                        <div className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-xs shadow-inner">
                          <span>{category.emoji}</span>
                        </div>
                      </div>

                      {/* Text Details */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-[11px] sm:text-xs ${
                              !item.is_read ? 'font-extrabold text-white' : 'font-medium text-slate-200'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 shrink-0">
                            {formatTimeAgo(item.created_at)}
                          </span>
                        </div>

                        <p className="text-[10.5px] sm:text-[11px] text-slate-300/90 leading-snug line-clamp-2 font-sans">
                          {item.message}
                        </p>

                        {/* Footer Info / Category Tag */}
                        <div className="flex items-center justify-between pt-1 text-[9px] font-mono">
                          <span className={`px-1.5 py-0.2 rounded border text-[8.5px] font-bold uppercase tracking-wider ${category.badgeColor}`}>
                            {category.label}
                          </span>

                          {item.url && (
                            <span className="text-cyan-400 group-hover:text-cyan-300 flex items-center gap-0.5 font-bold">
                              <span>Open</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Ultra-Compact Footer Bar */}
            <div className="py-1.5 px-3 bg-black/60 border-t border-white/10 text-center font-mono text-[9px] text-slate-400 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1 text-slate-400">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Zenemoo AI Network
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
