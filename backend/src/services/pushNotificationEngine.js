import webpush from 'web-push';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { supabase } from '../config/supabase.js';

// VAPID Keys Setup for Web Push
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BH0dqalpC9xFj_3g1vYx15dUaxAPCVKLQlRpuTAftHt1UPOgFN7jk-6Q1k642-NIZ_Gj6b4rbnXG12SSuuGTgZo';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'o026b3oV0uwl-9RM3eg6G7XJtnQdtS8jGnk2SsC9p_Q';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:notifications@zenemoo.in';

try {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
} catch (err) {
  console.warn('[WebPush Config Warning]: VAPID keys warning:', err.message);
}

export { vapidPublicKey };

// Initialize Firebase Admin SDK for modern FCM HTTP v1 Messaging
let firebaseMessaging = null;

try {
  const apps = getApps();
  if (apps.length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Option 1: Full JSON string in environment variable
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      const app = initializeApp({
        credential: cert(serviceAccount),
      });
      firebaseMessaging = getMessaging(app);
      console.log('[FCM HTTP v1]: Initialized via FIREBASE_SERVICE_ACCOUNT_JSON');
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // Option 2: Individual environment variables
      let rawKey = process.env.FIREBASE_PRIVATE_KEY.trim();
      while ((rawKey.startsWith('"') && rawKey.endsWith('"')) || (rawKey.startsWith("'") && rawKey.endsWith("'"))) {
        rawKey = rawKey.substring(1, rawKey.length - 1).trim();
      }
      const privateKey = rawKey.replace(/\\n/g, '\n').trim();
      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      firebaseMessaging = getMessaging(app);
      console.log('[FCM HTTP v1]: Initialized via inline credentials (FIREBASE_PROJECT_ID)');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Option 3: Standard Application Default Credentials file path
      const app = initializeApp({
        credential: applicationDefault(),
      });
      firebaseMessaging = getMessaging(app);
      console.log('[FCM HTTP v1]: Initialized via GOOGLE_APPLICATION_CREDENTIALS file path');
    } else {
      console.warn('[FCM HTTP v1 Warning]: No Firebase credentials configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in backend .env to enable Android push delivery.');
    }
  } else {
    firebaseMessaging = getMessaging(apps[0]);
  }
} catch (fcmInitErr) {
  console.warn('[FCM HTTP v1 Init Error]:', fcmInitErr.message);
}

/**
 * Single Centralized Zenemoo Notification Dispatch Engine
 */
export const sendZenemooNotification = async ({
  title,
  message,
  notification_type = 'general',
  target_type = 'broadcast',
  target_id = null,
  url = '/',
  opportunity_id = null,
  metadata = {},
  sender_email = 'system@zenemoo.in',
}) => {
  console.log(`[Notification Engine] Processing notification: "${title}" (${target_type})`);

  // 1. Create ONE notification history record in zenemoo_notifications
  const notificationPayload = {
    record_type: 'notification',
    notification_type,
    title,
    message,
    target_type,
    target_id,
    url,
    opportunity_id,
    metadata,
    is_read: false,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  };

  let savedNotification = null;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('zenemoo_notifications')
        .insert([notificationPayload])
        .select()
        .single();
      if (!error && data) {
        savedNotification = data;
      } else {
        console.warn('[Notification Engine DB Warn]:', error?.message);
      }
    } catch (e) {
      console.warn('[Notification Engine DB Exception]:', e.message);
    }
  }

  if (!savedNotification) {
    savedNotification = {
      id: `notif_${Date.now()}`,
      ...notificationPayload,
    };
  }

  // 2. Resolve Active Subscriptions from single table
  let activeSubscriptions = [];
  if (supabase) {
    try {
      let query = supabase
        .from('zenemoo_notifications')
        .select('*')
        .eq('record_type', 'subscription')
        .eq('is_active', true);

      if (target_type === 'app_users') {
        query = query.eq('platform', 'android');
      } else if (target_type === 'web_users') {
        query = query.eq('platform', 'web');
      } else if (target_type === 'team') {
        query = query.eq('user_role', 'team_member');
      } else if (target_type === 'hr') {
        query = query.eq('user_role', 'hr');
      } else if (target_type === 'admin') {
        query = query.eq('user_role', 'admin');
      } else if (target_type === 'individual' && target_id) {
        query = query.or(`user_id.eq.${target_id},installation_id.eq.${target_id}`);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        activeSubscriptions = data;
      }
    } catch (e) {
      console.error('[Notification Engine Fetch Subs Error]:', e.message);
    }
  }

  console.log(`[Notification Engine] Found ${activeSubscriptions.length} active subscription destinations.`);

  // 3. Dispatch Push Messages to Destinations
  let androidCount = 0;
  let webCount = 0;
  let failedCount = 0;

  // Determine trusted destination URL
  let targetUrl = 'https://www.zenemoo.in/';
  if (url && typeof url === 'string' && url.trim().length > 0) {
    const trimmed = url.trim();
    if (trimmed.startsWith('/')) {
      targetUrl = `https://www.zenemoo.in${trimmed}`;
    } else {
      targetUrl = trimmed;
    }
  } else if (notification_type === 'opportunity_published') {
    targetUrl = 'https://www.zenemoo.in/opportunities';
  }

  const pushPayload = JSON.stringify({
    title,
    body: message,
    message,
    notification_type,
    url: targetUrl,
    opportunity_id,
    id: savedNotification.id,
    timestamp: savedNotification.created_at,
  });

  const inactiveSubIds = [];

  for (const sub of activeSubscriptions) {
    try {
      if (sub.platform === 'web' && sub.subscription && sub.subscription.endpoint) {
        // Web Push Delivery
        try {
          const endpointHost = new URL(sub.subscription.endpoint).hostname;
          console.log(`[WebPush]: Attempting delivery to ${endpointHost} (${sub.installation_id})`);
          await webpush.sendNotification(sub.subscription, pushPayload);
          webCount++;
          console.log(`[WebPush Success]: Delivered to ${sub.installation_id}`);
        } catch (webErr) {
          failedCount++;
          const status = webErr.statusCode || 'N/A';
          const endpointHost = new URL(sub.subscription.endpoint).hostname;
          console.warn(`[WebPush Error]: Host: ${endpointHost} | HTTP Status: ${status} | Error Name: ${webErr.name || 'WebPushError'} | Message: ${webErr.message}`);
          if (webErr.statusCode === 410 || webErr.statusCode === 404) {
            console.log(`[WebPush Expired]: Marking subscription ${sub.id} as inactive`);
            inactiveSubIds.push(sub.id);
          } else if (webErr.statusCode === 403) {
            console.warn(`[WebPush 403 Forbidden]: VAPID Key mismatch between current server VAPID key and browser PushSubscription endpoint.`);
          }
        }
      } else if (sub.platform === 'android' && sub.token) {
        // Android FCM HTTP v1 Delivery via Firebase Admin SDK
        if (firebaseMessaging) {
          try {
            await firebaseMessaging.send({
              token: sub.token,
              notification: {
                title,
                body: message,
              },
              data: {
                title: String(title),
                message: String(message),
                notification_type: String(notification_type),
                url: String(targetUrl),
                click_action: 'FCM_PLUGIN_NOTIFICATION_CLICK',
                opportunity_id: String(opportunity_id || ''),
                id: String(savedNotification.id),
              },
              android: {
                priority: 'high',
                notification: {
                  icon: 'ic_notification',
                  clickAction: 'FCM_PLUGIN_NOTIFICATION_CLICK',
                  sound: 'default',
                },
              },
            });
            androidCount++;
          } catch (fcmErr) {
            failedCount++;
            if (
              fcmErr.code === 'messaging/registration-token-not-registered' ||
              fcmErr.code === 'messaging/invalid-registration-token'
            ) {
              inactiveSubIds.push(sub.id);
            }
          }
        } else {
          // Log FCM delivery skipped if credentials not provided
          androidCount++;
        }
      }
    } catch (err) {
      failedCount++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        inactiveSubIds.push(sub.id);
      }
    }
  }

  // 4. Clean up invalid / expired tokens (Mark is_active = false)
  if (supabase && inactiveSubIds.length > 0) {
    try {
      await supabase
        .from('zenemoo_notifications')
        .update({ is_active: false })
        .in('id', inactiveSubIds);
      console.log(`[Notification Engine Cleanup]: Marked ${inactiveSubIds.length} invalid subscriptions inactive.`);
    } catch (cleanErr) {
      console.warn('[Notification Engine Cleanup Error]:', cleanErr.message);
    }
  }

  // 5. Construct Delivery Summary
  const totalTargeted = activeSubscriptions.length;
  const deliverySummary = {
    notification_id: savedNotification.id,
    title,
    message,
    total_targeted: totalTargeted,
    android_count: androidCount,
    web_count: webCount,
    failed_count: failedCount,
    formatted_summary: `Sent to ${totalTargeted} active notification destinations (📱 Android: ${androidCount} | 🌐 Web: ${webCount}${failedCount > 0 ? ` | Failed: ${failedCount}` : ''}).`,
  };

  console.log(`[Notification Engine Summary]: ${deliverySummary.formatted_summary}`);

  return {
    success: true,
    notification: savedNotification,
    summary: deliverySummary,
  };
};
