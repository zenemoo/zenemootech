import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Search, Calendar, Info, AlertTriangle, CheckCircle, CreditCard, Users, Briefcase, RefreshCw, X } from 'lucide-react';
import { portalApi } from '../services/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  created_by: string;
  created_at: string;
  is_read: boolean;
}

interface NotificationBellProps {
  onOpenFullPage?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenFullPage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await portalApi.getMyNotifications();
      if (res.data && res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await portalApi.markNotificationRead(id);
    } catch (e) {}
  };

  const handleDelete = async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await portalApi.deleteNotification(id);
      fetchNotifications();
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    for (const n of unread) {
      try {
        await portalApi.markNotificationRead(n.id);
      } catch (e) {}
    }
  };

  // Filter & Search Logic
  const filteredNotifs = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || n.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  // Date Grouping Helper
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yestStr = yest.toISOString().split('T')[0];

  const todayNotifs = filteredNotifs.filter((n) => new Date(n.created_at).toISOString().split('T')[0] === todayStr);
  const yestNotifs = filteredNotifs.filter((n) => new Date(n.created_at).toISOString().split('T')[0] === yestStr);
  const olderNotifs = filteredNotifs.filter(
    (n) =>
      new Date(n.created_at).toISOString().split('T')[0] !== todayStr &&
      new Date(n.created_at).toISOString().split('T')[0] !== yestStr
  );

  const getNotifIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'meeting':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'project':
        return <Briefcase className="w-4 h-4 text-cyan-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-cyan-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-cyan-500 text-black text-[10px] font-mono font-extrabold shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-[#0a0a0c]/95 backdrop-blur-2xl border border-cyan-500/30 shadow-2xl z-50 p-4 space-y-3 font-mono text-xs text-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-sm font-display">Notification Center</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
                  {unreadCount} Unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={fetchNotifications}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                title="Refresh Notifications"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-bold cursor-pointer transition-all"
                  title="Mark All as Read"
                >
                  Mark All Read
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & Type Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-[11px] placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-1.5 px-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-[11px] focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="meeting">Meetings</option>
              <option value="payment">Payments</option>
              <option value="project">Projects</option>
              <option value="system">System</option>
              <option value="warning">Warnings</option>
            </select>
          </div>

          {/* Notifications List (Max Height Scroll) */}
          <div className="max-h-80 overflow-y-auto space-y-4 pr-1">
            {filteredNotifs.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-slate-500">
                <Bell className="w-8 h-8 mx-auto opacity-30" />
                <div>No notifications found</div>
              </div>
            ) : (
              <>
                {/* TODAY GROUP */}
                {todayNotifs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Today
                    </div>
                    {todayNotifs.map((n) => renderNotifItem(n, getNotifIcon, handleMarkRead, handleDelete))}
                  </div>
                )}

                {/* YESTERDAY GROUP */}
                {yestNotifs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Yesterday
                    </div>
                    {yestNotifs.map((n) => renderNotifItem(n, getNotifIcon, handleMarkRead, handleDelete))}
                  </div>
                )}

                {/* OLDER GROUP */}
                {olderNotifs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Earlier
                    </div>
                    {olderNotifs.map((n) => renderNotifItem(n, getNotifIcon, handleMarkRead, handleDelete))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const renderNotifItem = (
  n: NotificationItem,
  getNotifIcon: (t: string) => React.ReactNode,
  onMarkRead: (id: string) => void,
  onDelete: (id: string) => void
) => {
  return (
    <div
      key={n.id}
      className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
        n.is_read
          ? 'bg-white/[0.02] border-white/5 opacity-75'
          : 'bg-cyan-500/10 border-cyan-500/30 shadow-md'
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className="p-1.5 rounded-xl bg-white/5 shrink-0 mt-0.5">
          {getNotifIcon(n.type)}
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-white text-xs truncate">{n.title}</span>
            <span className="text-[9px] text-slate-400 shrink-0 font-mono">
              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">{n.message}</p>

          <div className="text-[9px] text-slate-500 font-mono">
            From: <span className="text-slate-400">{n.created_by}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!n.is_read && (
          <button
            onClick={() => onMarkRead(n.id)}
            className="p-1 rounded-lg hover:bg-cyan-500/20 text-cyan-400 cursor-pointer"
            title="Mark as Read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(n.id)}
          className="p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 cursor-pointer"
          title="Delete Notification"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
