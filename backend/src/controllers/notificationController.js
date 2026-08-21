import { supabase } from '../config/supabase.js';
import { sendZenemooNotification, vapidPublicKey } from '../services/pushNotificationEngine.js';

// In-memory fallback stores
const memorySubscriptions = new Map(); // key: installation_id, value: subscription object
const memoryNotifications = [
  {
    id: 'notif_welcome_1',
    record_type: 'notification',
    notification_type: 'general',
    title: 'Welcome to Zenemoo Enterprise Platform',
    message: 'Your portal account is active. Explore your dashboard, update your profile skills, and check opportunities.',
    target_type: 'broadcast',
    url: '/',
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif_opp_sample',
    record_type: 'notification',
    notification_type: 'opportunity_published',
    title: '🎯 New Opportunity Available',
    message: 'A new opportunity "AI Speech Data Annotator" is now available. Check the opportunity details and apply now.',
    target_type: 'broadcast',
    url: '/opportunities',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

const memoryReadNotifications = new Map(); // key: userId/installationId, value: Set of read notification IDs

/**
 * 1. GET /api/notifications/vapid-key
 * Returns Web Push VAPID Public Key for browser client registration
 */
export const getVapidPublicKey = async (req, res) => {
  return res.json({
    success: true,
    publicKey: vapidPublicKey,
  });
};

/**
 * 2. POST /api/notifications/subscribe
 * Register or update push notification subscription (UPSERT logic — No duplicates!)
 */
export const registerSubscription = async (req, res, next) => {
  try {
    const {
      platform = 'web', // 'android' or 'web'
      app_type = 'zenemoo', // 'zenemoo', 'zenemoo_admin', 'website', 'team_portal', 'hr_portal'
      installation_id,
      token, // FCM Token or null
      subscription, // Web Push subscription object { endpoint, keys: { p256dh, auth } }
      user_id,
      user_role,
      app_version = '1.0.0',
      permission_status = 'granted',
    } = req.body;

    if (!installation_id) {
      return res.status(400).json({
        success: false,
        message: 'installation_id is required for notification subscription.',
      });
    }

    const subRecord = {
      record_type: 'subscription',
      platform,
      app_type,
      installation_id,
      token: token || null,
      subscription: subscription || {},
      user_id: user_id || req.user?.id || null,
      user_role: user_role || req.user?.role || null,
      app_version,
      permission_status,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    };

    let resultRecord = null;

    if (supabase) {
      try {
        // Check for existing subscription matching (platform, app_type, installation_id)
        const { data: existingRows } = await supabase
          .from('zenemoo_notifications')
          .select('id')
          .eq('record_type', 'subscription')
          .eq('platform', platform)
          .eq('app_type', app_type)
          .eq('installation_id', installation_id)
          .order('created_at', { ascending: false });

        if (existingRows && existingRows.length > 0) {
          const primaryId = existingRows[0].id;
          
          // UPDATE existing primary row — ZERO DUPLICATES!
          const { data: updated } = await supabase
            .from('zenemoo_notifications')
            .update({
              token: subRecord.token,
              subscription: subRecord.subscription,
              user_id: subRecord.user_id,
              user_role: subRecord.user_role,
              app_version: subRecord.app_version,
              permission_status: subRecord.permission_status,
              is_active: true,
              last_seen_at: subRecord.last_seen_at,
            })
            .eq('id', primaryId)
            .select()
            .single();

          resultRecord = updated;

          // Clean up any legacy redundant duplicate rows asynchronously
          if (existingRows.length > 1) {
            const redundantIds = existingRows.slice(1).map((r) => r.id);
            await supabase
              .from('zenemoo_notifications')
              .delete()
              .in('id', redundantIds);
          }
        } else {
          // INSERT new row
          const { data: inserted } = await supabase
            .from('zenemoo_notifications')
            .insert([subRecord])
            .select()
            .single();

          resultRecord = inserted;
        }
      } catch (dbErr) {
        console.warn('[Subscription Upsert Warn]:', dbErr.message);
      }
    }

    if (!resultRecord) {
      memorySubscriptions.set(`${platform}_${installation_id}`, subRecord);
      resultRecord = subRecord;
    }

    return res.status(200).json({
      success: true,
      message: 'Notification subscription saved successfully.',
      data: resultRecord,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. GET /api/notifications
 * Fetch notification history for website / app / logged in user
 */
export const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.query.installation_id || 'guest_user';
    const userRole = (req.user?.role || 'user').toLowerCase();
    const days = parseInt(req.query.days, 10) || 7;
    const sevenDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let allNotifs = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('zenemoo_notifications')
          .select('*')
          .eq('record_type', 'notification')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && Array.isArray(data)) {
          allNotifs = data;
        }
      } catch (e) {
        allNotifs = memoryNotifications.filter((n) => !n.created_at || new Date(n.created_at) >= new Date(sevenDaysAgo));
      }
    }
    if (!Array.isArray(allNotifs) || allNotifs.length === 0) {
      allNotifs = memoryNotifications.filter((n) => !n.created_at || new Date(n.created_at) >= new Date(sevenDaysAgo));
    }

    const readSet = memoryReadNotifications.get(userId) || new Set();

    // Filter notifications based on target_type
    const filtered = allNotifs.filter((n) => {
      if (userRole === 'admin') return true;
      const target = (n.target_type || 'broadcast').toLowerCase();
      if (target === 'broadcast') return true;
      if (target === 'app_users') return true;
      if (target === 'web_users') return true;
      if (target === 'team' && (userRole === 'team_member' || userRole === 'admin')) return true;
      if (target === 'hr' && (userRole === 'hr' || userRole === 'admin')) return true;
      if (target === 'individual' && n.target_id === userId) return true;
      return true;
    });

    const formatted = filtered.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.notification_type || 'general',
      notification_type: n.notification_type || 'general',
      target_type: n.target_type || 'broadcast',
      url: n.url || null,
      opportunity_id: n.opportunity_id || null,
      created_at: n.created_at || new Date().toISOString(),
      is_read: n.is_read || readSet.has(n.id),
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
 * 4. PUT /api/notifications/:id/read
 * Mark notification as read
 */
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.body.installation_id || 'guest_user';

    const userReads = memoryReadNotifications.get(userId) || new Set();
    userReads.add(id);
    memoryReadNotifications.set(userId, userReads);

    if (supabase) {
      try {
        await supabase
          .from('zenemoo_notifications')
          .update({ is_read: true })
          .eq('id', id)
          .eq('record_type', 'notification');
      } catch (e) {}
    }

    res.json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. PUT /api/notifications/read-all
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.installation_id || 'guest_user';

    let allNotifs = [];
    if (supabase) {
      try {
        const { data } = await supabase
          .from('zenemoo_notifications')
          .select('id')
          .eq('record_type', 'notification');
        if (Array.isArray(data)) allNotifs = data;
      } catch (e) {}
    }

    const userReads = memoryReadNotifications.get(userId) || new Set();
    allNotifs.forEach((n) => userReads.add(n.id));
    memoryReadNotifications.set(userId, userReads);

    res.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. DELETE /api/notifications/:id
 * Delete / hide notification for logged-in user or guest
 */
export const deleteUserNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'guest_user';

    const userReads = memoryReadNotifications.get(userId) || new Set();
    userReads.add(id);
    memoryReadNotifications.set(userId, userReads);

    res.json({
      success: true,
      message: 'Notification removed.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. POST /api/notifications/dispatch (or POST /api/notifications)
 * Central Manual Admin Dispatcher Endpoint
 */
export const createAdminNotification = async (req, res, next) => {
  try {
    const {
      title,
      message,
      notification_type,
      notificationType = 'general',
      target_type,
      targetType = 'broadcast',
      target_id,
      targetId,
      url,
      link,
      notification_url,
      opportunity_id,
    } = req.body;

    const notifTitle = title;
    const notifMsg = message;
    const notifType = notification_type || notificationType || 'general';
    const notifTargetType = target_type || targetType || 'broadcast';
    const notifTargetId = target_id || targetId || null;
    const rawUrl = url || link || notification_url || null;

    if (!notifTitle || !notifMsg) {
      return res.status(400).json({
        success: false,
        message: 'Notification title and message body are required.',
      });
    }

    let finalUrl = null;
    if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim().length > 0) {
      const trimmed = rawUrl.trim();
      // Check dangerous protocols
      if (/^(javascript|data|file|intent|about|vbscript):/i.test(trimmed)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid Zenemoo URL.',
        });
      }

      if (trimmed.startsWith('/')) {
        finalUrl = `https://www.zenemoo.in${trimmed}`;
      } else {
        try {
          const parsed = new URL(trimmed);
          const host = parsed.hostname.toLowerCase();
          if (host === 'www.zenemoo.in' || host === 'zenemoo.in') {
            finalUrl = parsed.href;
          } else {
            return res.status(400).json({
              success: false,
              message: 'Please enter a valid Zenemoo URL.',
            });
          }
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Please enter a valid Zenemoo URL.',
          });
        }
      }
    }

    const dispatchResult = await sendZenemooNotification({
      title: notifTitle,
      message: notifMsg,
      notification_type: notifType,
      target_type: notifTargetType,
      target_id: notifTargetId,
      url: finalUrl,
      opportunity_id,
      sender_email: req.user?.email || 'admin@zenemoo.in',
    });

    return res.status(201).json({
      success: true,
      message: dispatchResult.summary.formatted_summary,
      notification: dispatchResult.notification,
      summary: dispatchResult.summary,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. DELETE /api/notifications/admin/:id
 * Admin delete global notification entry
 */
export const deleteAdminNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (supabase) {
      try {
        await supabase
          .from('zenemoo_notifications')
          .delete()
          .eq('id', id);
      } catch (e) {}
    }

    const idx = memoryNotifications.findIndex((n) => n.id === id);
    if (idx !== -1) memoryNotifications.splice(idx, 1);

    res.json({
      success: true,
      message: 'Notification deleted successfully from history.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 9. GET /api/notifications/app-version
 * Dynamic App Version & Update Metadata Endpoint
 */
export const getAppVersionInfo = async (req, res, next) => {
  try {
    const platform = req.query.platform || 'android';
    const appType = req.query.app_type || 'zenemoo';

    let manifest = null;
    try {
      const fs = await import('fs');
      const path = await import('path');
      const manifestPath = path.resolve(process.cwd(), '../frontend/public/app/android-release.json');
      const directPath = path.resolve(process.cwd(), 'public/app/android-release.json');
      
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } else if (fs.existsSync(directPath)) {
        manifest = JSON.parse(fs.readFileSync(directPath, 'utf8'));
      }
    } catch (e) {}

    const latestVersion = manifest?.version || '2.0.6';
    const latestVersionCode = manifest?.versionCode || 6;
    const releaseNotes = Array.isArray(manifest?.releaseNotes) ? manifest.releaseNotes.join('\n') : (manifest?.releaseNotes || 'Includes new Zenemoo Notification Center with internal scrolling, live alerts, and performance enhancements.');
    const updateUrl = manifest?.apkUrl ? (manifest.apkUrl.startsWith('http') ? manifest.apkUrl : `https://www.zenemoo.in${manifest.apkUrl}`) : 'https://www.zenemoo.in/app/android';

    return res.json({
      success: true,
      data: {
        latest_version: latestVersion,
        latest_version_code: latestVersionCode,
        min_version: manifest?.minimumAndroid || '2.0.0',
        min_version_code: 1,
        release_notes: releaseNotes,
        update_url: updateUrl,
        sha256: manifest?.sha256 || '',
        apk_size: manifest?.apkSize || '17.2 MB',
        release_date: manifest?.releaseDate || '2026-08-21',
        force_update: manifest?.forceUpdate || false,
        platform,
        app_type: appType,
      },
    });
  } catch (err) {
    next(err);
  }
};
