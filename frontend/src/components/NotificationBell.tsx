import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Search,
  Calendar,
  CreditCard,
  Video,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  Info,
  ShieldAlert,
  Server,
  X,
} from 'lucide-react';
import { notificationApi } from '../services/api';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'payment' | 'meeting' | 'project' | 'system';
  target_type: 'broadcast' | 'individual' | 'role';
  sender_email?: string;
  created_at: string;
  is_read: boolean;
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getAll();
      if (res.data && res.data.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {}
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'meeting':
        return <Video className="w-4 h-4 text-purple-400" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'project':
        return <Briefcase className="w-4 h-4 text-cyan-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'system':
        return <Server className="w-4 h-4 text-slate-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  // Group notifications by Date (Today, Yesterday, Last Week)
  const groupNotificationsByDate = (items: NotificationItem[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    const groups: { [key: string]: NotificationItem[] } = {
      Today: [],
      Yesterday: [],
      'Earlier Notifications': [],
    };

    items.forEach((item) => {
      const itemTime = new Date(item.created_at).getTime();
      if (itemTime >= today) {
        groups['Today'].push(item);
      } else if (itemTime >= yesterday) {
        groups['Yesterday'].push(item);
      } else {
        groups['Earlier Notifications'].push(item);
      }
    });

    return groups;
  };

  const filteredNotifs = notifications.filter((n) => {
    const matchesTab = filterTab === 'all' || (filterTab === 'unread' && !n.is_read);
    const matchesSearch =
      !searchQuery ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const grouped = groupNotificationsByDate(filteredNotifs);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
        title="Notification Center"
      >
        <Bell className="w-5 h-5 text-cyan-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[20px] h-[20px] rounded-full bg-cyan-500 text-black text-[10px] font-mono font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Modal */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:fixed sm:inset-x-auto sm:right-6 sm:top-16 w-auto sm:w-96 rounded-3xl bg-[#090d16]/95 backdrop-blur-2xl border border-white/15 shadow-2xl z-50 overflow-hidden text-xs font-sans">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <span className="font-display font-bold text-sm text-white">Notification Center</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Read All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs & Search */}
          <div className="p-3 bg-white/[0.02] border-b border-white/5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/5 font-mono text-[11px]">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filterTab === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setFilterTab('unread')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filterTab === 'unread' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Unread ({unreadCount})
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 font-mono text-[11px] focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Notification List Container */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5 font-sans">
            {filteredNotifs.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-400 font-mono text-xs">No notifications found.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([groupTitle, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={groupTitle} className="space-y-1">
                    <div className="px-4 py-1.5 bg-white/[0.02] text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-cyan-400" /> {groupTitle} ({items.length})
                    </div>

                    {items.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 transition-all flex items-start gap-3 relative group ${
                          n.is_read
                            ? 'bg-transparent text-slate-300'
                            : 'bg-cyan-500/[0.04] text-white border-l-2 border-cyan-400'
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                          {getNotificationIcon(n.type)}
                        </div>

                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs truncate text-white">{n.title}</span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2">{n.message}</p>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-mono text-slate-400">
                              From: {n.sender_email || 'Zenemoo System'}
                            </span>

                            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                              {!n.is_read && (
                                <button
                                  onClick={(e) => handleMarkAsRead(n.id, e)}
                                  className="p-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 cursor-pointer"
                                  title="Mark as Read"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => handleDelete(n.id, e)}
                                className="p-1 rounded bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
