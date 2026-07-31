import { supabase } from '../config/supabase.js';
import { memoryNotifications } from './rbacController.js';

/**
 * 1. GET /api/admin/notifications - Fetch All Notifications Created by Admin
 */
export const getAllNotificationsAdmin = async (req, res, next) => {
  try {
    let notifs = [...memoryNotifications];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          notifs = data;
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      count: notifs.length,
      notifications: notifs,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. POST /api/admin/notifications - Create Broadcast or Individual Notification
 */
export const createNotificationAdmin = async (req, res, next) => {
  try {
    const { title, message, type = 'info', target_type = 'broadcast', target_user_id } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Notification Title and Message are required.' });
    }

    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      message: message.trim(),
      type: (type || 'info').toLowerCase(), // 'info', 'success', 'warning', 'error', 'payment', 'meeting', 'project', 'system'
      target_type: (target_type || 'broadcast').toLowerCase(),
      target_user_id: target_type === 'individual' ? target_user_id : null,
      created_by: req.user?.name || 'System Administrator',
      created_at: new Date().toISOString(),
    };

    memoryNotifications.unshift(newNotif);

    if (supabase) {
      try {
        await supabase.from('notifications').insert([newNotif]);
      } catch (e) {
        console.warn('Supabase notifications insert note:', e.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Notification '${newNotif.title}' ${target_type === 'broadcast' ? 'broadcasted to all members' : 'dispatched to target user'} successfully!`,
      notification: newNotif,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. DELETE /api/admin/notifications/:id - Delete Notification
 */
export const deleteNotificationAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const idx = memoryNotifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      memoryNotifications.splice(idx, 1);
    }

    if (supabase) {
      try {
        await supabase.from('notifications').delete().eq('id', id);
      } catch (e) {}
    }

    res.json({
      success: true,
      message: 'Notification removed successfully.',
    });
  } catch (err) {
    next(err);
  }
};
