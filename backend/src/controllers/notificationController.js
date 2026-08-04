import { supabaseService } from '../services/supabaseService.js';
import { supabase } from '../config/supabase.js';

// In-memory notifications store fallback
const memoryNotifications = [
  {
    id: 'notif_welcome_1',
    title: 'Welcome to Zenemoo Enterprise Platform',
    message: 'Your portal account is active. Explore your dashboard, update your profile skills, and manage your tasks.',
    type: 'info',
    target_type: 'broadcast',
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif_meeting_2',
    title: 'Weekly All-Hands Data Operations Meeting',
    message: 'Join our weekly project briefing today at 4:00 PM IST via Google Meet.',
    type: 'meeting',
    target_type: 'broadcast',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

const memoryUserNotifications = new Map(); // key: userId, value: set of read notification IDs
const memoryUserDeletedNotifications = new Map(); // key: userId, value: set of deleted notification IDs

/**
 * 1. GET /api/notifications
 * Fetch notifications for logged-in user with unread count
 */
export const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.id || 'temp_user';
    const userRole = (req.user?.role || 'team_member').toLowerCase();

    let allNotifications = [];
    try {
      allNotifications = await supabaseService.selectAll('notifications', 'created_at', false);
    } catch (e) {
      allNotifications = memoryNotifications;
    }
    if (!Array.isArray(allNotifications) || allNotifications.length === 0) {
      allNotifications = memoryNotifications;
    }

    // Check read & deleted status for this user from user_notifications table or memory store
    let readNotifIds = new Set();
    let deletedNotifIds = new Set();
    let notifReadCounts = new Map();

    if (supabase && userId !== 'temp_user') {
      try {
        const { data } = await supabase
          .from('user_notifications')
          .select('notification_id, is_read, is_deleted, deleted_at')
          .eq('user_id', userId);
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item.is_read) readNotifIds.add(item.notification_id);
            if (item.is_deleted || item.deleted_at) deletedNotifIds.add(item.notification_id);
          });
        }

        if (userRole === 'admin') {
          const { data: readStats } = await supabase
            .from('user_notifications')
            .select('notification_id')
            .eq('is_read', true);
          if (Array.isArray(readStats)) {
            readStats.forEach((item) => {
              const c = notifReadCounts.get(item.notification_id) || 0;
              notifReadCounts.set(item.notification_id, c + 1);
            });
          }
        }
      } catch (e) {}
    } else {
      readNotifIds = memoryUserNotifications.get(userId) || new Set();
      deletedNotifIds = memoryUserDeletedNotifications.get(userId) || new Set();
    }

    // Filter relevant notifications (broadcast, role match, or individual match) AND exclude per-user deleted ones
    const userRelevant = allNotifications.filter((n) => {
      if (userRole === 'admin') return true; // Administrators retrieve ALL database records for total overview
      if (deletedNotifIds.has(n.id)) return false;
      const targetType = (n.target_type || 'broadcast').toLowerCase();
      if (targetType === 'broadcast') return true;
      if (targetType === 'role' && n.target_role?.toLowerCase() === userRole) return true;
      if (targetType === 'individual' && n.target_user_id === userId) return true;
      return false;
    });

    const formatted = userRelevant.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type || 'info',
      target_type: n.target_type || 'broadcast',
      target_role: n.target_role || null,
      target_user_id: n.target_user_id || null,
      sender_email: n.sender_email || 'contact@zenemoo.in',
      created_at: n.created_at || new Date().toISOString(),
      is_read: readNotifIds.has(n.id),
      read_count: notifReadCounts.get(n.id) || 0,
      delivery_status: 'Dispatched',
    }));

    const unreadCount = formatted.filter((n) => !n.is_read).length;

    res.json({
      success: true,
      count: formatted.length,
      unread_count: unreadCount,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. PUT /api/notifications/:id/read
 * Mark notification as read
 */
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'temp_user';

    if (supabase && userId !== 'temp_user') {
      try {
        const { data: existing } = await supabase
          .from('user_notifications')
          .select('id')
          .eq('notification_id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase.from('user_notifications').insert([
            {
              notification_id: id,
              user_id: userId,
              is_read: true,
              read_at: new Date().toISOString(),
            },
          ]);
        }
      } catch (e) {}
    }

    const userReads = memoryUserNotifications.get(userId) || new Set();
    userReads.add(id);
    memoryUserNotifications.set(userId, userReads);

    res.json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. PUT /api/notifications/read-all
 * Mark all notifications as read for logged in user
 */
export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user?.id || 'temp_user';

    let allNotifs = [];
    try {
      allNotifs = await supabaseService.selectAll('notifications');
    } catch (e) {
      allNotifs = memoryNotifications;
    }
    if (!Array.isArray(allNotifs)) allNotifs = memoryNotifications;

    const userReads = memoryUserNotifications.get(userId) || new Set();

    for (const n of allNotifs) {
      userReads.add(n.id);
      if (supabase && userId !== 'temp_user') {
        try {
          await supabase.from('user_notifications').upsert([
            {
              notification_id: n.id,
              user_id: userId,
              is_read: true,
              read_at: new Date().toISOString(),
            },
          ], { onConflict: 'notification_id,user_id' });
        } catch (e) {}
      }
    }

    memoryUserNotifications.set(userId, userReads);

    res.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. DELETE /api/notifications/:id
 * Delete / hide notification for logged-in user only
 */
export const deleteUserNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'temp_user';

    if (supabase && userId !== 'temp_user') {
      try {
        const { data: existing } = await supabase
          .from('user_notifications')
          .select('id')
          .eq('notification_id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_notifications')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase.from('user_notifications').insert([
            {
              notification_id: id,
              user_id: userId,
              is_read: true,
              is_deleted: true,
              deleted_at: new Date().toISOString(),
            },
          ]);
        }
      } catch (e) {}
    }

    const userDeleted = memoryUserDeletedNotifications.get(userId) || new Set();
    userDeleted.add(id);
    memoryUserDeletedNotifications.set(userId, userDeleted);

    res.json({
      success: true,
      message: 'Notification deleted for your account.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. POST /api/notifications
 * Admin dispatch individual or broadcast notification
 */
export const createAdminNotification = async (req, res, next) => {
  try {
    const {
      title,
      message,
      type = 'info', // info, success, warning, error, payment, meeting, project, system
      target_type = 'broadcast', // broadcast, individual, role
      target_user_id,
      target_role,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Notification title and message body are required.',
      });
    }

    const payload = {
      title,
      message,
      type: type.toLowerCase(),
      target_type: target_type.toLowerCase(),
      target_user_id: target_user_id || null,
      target_role: target_role ? target_role.toLowerCase() : null,
      sender_id: req.user?.id || null,
      sender_email: req.user?.email || 'contact@zenemoo.in',
      created_at: new Date().toISOString(),
    };

    let createdRecord = null;
    try {
      createdRecord = await supabaseService.insert('notifications', payload);
    } catch (e) {
      payload.id = `notif_${Date.now()}`;
      memoryNotifications.unshift(payload);
      createdRecord = payload;
    }

    res.status(201).json({
      success: true,
      message: `Notification '${title}' dispatched successfully (${target_type.toUpperCase()}).`,
      notification: createdRecord || payload,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. DELETE /api/notifications/admin/:id
 * Admin delete global notification entry
 */
export const deleteAdminNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      await supabaseService.delete('notifications', id);
    } catch (e) {
      const idx = memoryNotifications.findIndex((n) => n.id === id);
      if (idx !== -1) memoryNotifications.splice(idx, 1);
    }

    res.json({
      success: true,
      message: 'Global notification deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
