import { notificationApi } from './api';

export interface ZenemooNotificationItem {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'payment' | 'meeting' | 'project' | 'system' | 'role_update' | 'security_alert' | 'release';
  notification_type?: string;
  target_type?: 'broadcast' | 'individual' | 'role' | 'app_users' | 'web_users' | 'public';
  sender_email?: string;
  created_at: string;
  is_read: boolean;
  url?: string;
  metadata?: any;
}

type NotificationListener = (state: {
  notifications: ZenemooNotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  hasError: boolean;
}) => void;

class NotificationCoordinator {
  private notifications: ZenemooNotificationItem[] = [];
  private unreadCount: number = 0;
  private isLoading: boolean = false;
  private hasError: boolean = false;
  private lastFetched: number = 0;
  private inFlightFetch: Promise<void> | null = null;
  private listeners: Set<NotificationListener> = new Set();
  private pollIntervalHandle: any = null;
  private isListeningLifecycle: boolean = false;
  private readonly CACHE_TTL_MS = 60 * 1000; // 60s in-memory freshness window

  constructor() {
    this.initLifecycleListeners();
  }

  private initLifecycleListeners() {
    if (typeof window === 'undefined' || this.isListeningLifecycle) return;
    this.isListeningLifecycle = true;

    // Refresh on custom refresh events
    window.addEventListener('zenemoo:refresh-notifications', () => {
      this.fetchNotifications(true);
    });

    // When tab visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLast = Date.now() - this.lastFetched;
        if (timeSinceLast > this.CACHE_TTL_MS) {
          this.fetchNotifications(false);
        }
        this.startBackgroundTimer();
      } else {
        this.stopBackgroundTimer();
      }
    });

    // Start timer on initialization if visible
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.startBackgroundTimer();
    }
  }

  private startBackgroundTimer() {
    this.stopBackgroundTimer();
    // Unified 2-minute (120s) background refresh when tab is active
    this.pollIntervalHandle = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.fetchNotifications(false);
      }
    }, 120000);
  }

  private stopBackgroundTimer() {
    if (this.pollIntervalHandle) {
      clearInterval(this.pollIntervalHandle);
      this.pollIntervalHandle = null;
    }
  }

  private notifyListeners() {
    const state = {
      notifications: this.notifications,
      unreadCount: this.unreadCount,
      isLoading: this.isLoading,
      hasError: this.hasError,
    };
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.warn('[NotificationCoordinator Listener Warning]:', err);
      }
    });
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state
    listener({
      notifications: this.notifications,
      unreadCount: this.unreadCount,
      isLoading: this.isLoading,
      hasError: this.hasError,
    });

    // If cache is stale or empty, trigger initial fetch
    const now = Date.now();
    if (this.notifications.length === 0 || now - this.lastFetched > this.CACHE_TTL_MS) {
      this.fetchNotifications(false);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  public async fetchNotifications(force = false): Promise<void> {
    const now = Date.now();

    // If cache is fresh and not forced, reuse immediately
    if (!force && this.notifications.length > 0 && now - this.lastFetched < this.CACHE_TTL_MS) {
      return;
    }

    // In-flight deduplication: reuse ongoing request
    if (this.inFlightFetch) {
      return this.inFlightFetch;
    }

    this.isLoading = true;
    this.hasError = false;
    this.notifyListeners();

    this.inFlightFetch = (async () => {
      try {
        let installationId = '';
        if (typeof window !== 'undefined') {
          installationId = localStorage.getItem('zenemoo_installation_id') || '';
        }

        const res = await notificationApi.getAll({
          installation_id: installationId || undefined,
          days: 7,
        });

        if (res.data && res.data.success) {
          const rawList: ZenemooNotificationItem[] = res.data.data || [];
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          
          const filtered = rawList.filter((item) => {
            const itemTime = new Date(item.created_at).getTime();
            return isNaN(itemTime) || itemTime >= sevenDaysAgo;
          });

          this.notifications = filtered;
          this.unreadCount = filtered.filter((n) => !n.is_read).length;
          this.lastFetched = Date.now();
          this.hasError = false;

          // Check if there is a brand new notification to trigger a live toast
          if (filtered.length > 0 && typeof window !== 'undefined') {
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
        console.warn('[NotificationCoordinator Fetch Error]:', err);
        this.hasError = true;
      } finally {
        this.isLoading = false;
        this.inFlightFetch = null;
        this.notifyListeners();
      }
    })();

    return this.inFlightFetch;
  }

  public async markAsRead(id: string, installationId?: string): Promise<void> {
    // Optimistic UI update
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    );
    this.unreadCount = Math.max(0, this.notifications.filter((n) => !n.is_read).length);
    this.notifyListeners();

    try {
      await notificationApi.markRead(id, installationId);
    } catch (err) {
      console.warn('[NotificationCoordinator MarkRead Warning]:', err);
    }
  }

  public async markAllRead(installationId?: string): Promise<void> {
    // Optimistic UI update
    this.notifications = this.notifications.map((n) => ({ ...n, is_read: true }));
    this.unreadCount = 0;
    this.notifyListeners();

    try {
      await notificationApi.markAllRead(installationId);
    } catch (err) {
      console.warn('[NotificationCoordinator MarkAllRead Warning]:', err);
    }
  }

  public async deleteNotification(id: string): Promise<void> {
    // Optimistic UI update
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.unreadCount = Math.max(0, this.notifications.filter((n) => !n.is_read).length);
    this.notifyListeners();

    try {
      await notificationApi.deleteNotification(id);
    } catch (err) {
      console.warn('[NotificationCoordinator Delete Warning]:', err);
    }
  }

  public getState() {
    return {
      notifications: this.notifications,
      unreadCount: this.unreadCount,
      isLoading: this.isLoading,
      hasError: this.hasError,
    };
  }
}

export const notificationCoordinator = new NotificationCoordinator();
