import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { notificationApi } from './api';

const INSTALLATION_KEY = 'zenemoo_installation_id';
const PROMPT_STATUS_KEY = 'zenemoo_notif_prompt_status'; // 'granted' | 'denied'
const DENIED_AT_KEY = 'zenemoo_notif_denied_at'; // timestamp ms
const RETRY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Get or create a stable client installation identifier (UUID)
 */
export const getInstallationId = (): string => {
  let id = localStorage.getItem(INSTALLATION_KEY);
  if (!id) {
    id = 'inst_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    localStorage.setItem(INSTALLATION_KEY, id);
  }
  return id;
};

/**
 * Check if the custom notification prompt should be displayed
 */
export const checkPromptEligibility = (): 'can_prompt' | 'granted' | 'permanently_denied' | 'in_cooling_period' => {
  if (typeof window === 'undefined') return 'in_cooling_period';

  // Check browser Notification API state
  if ('Notification' in window && Notification.permission === 'granted') {
    return 'granted';
  }
  if ('Notification' in window && Notification.permission === 'denied') {
    return 'permanently_denied';
  }

  // Check local prompt status & 7-day retry rule
  const status = localStorage.getItem(PROMPT_STATUS_KEY);
  const deniedAtStr = localStorage.getItem(DENIED_AT_KEY);

  if (status === 'denied' && deniedAtStr) {
    const deniedAt = parseInt(deniedAtStr, 10);
    const now = Date.now();
    if (now - deniedAt < RETRY_INTERVAL_MS) {
      return 'in_cooling_period'; // Within 7 days
    }
  }

  return 'can_prompt';
};

/**
 * Record user decision: 'allow', 'not_now', or 'close'
 */
export const recordPromptDecision = async (decision: 'allow' | 'not_now' | 'close') => {
  if (decision === 'not_now') {
    localStorage.setItem(PROMPT_STATUS_KEY, 'denied');
    localStorage.setItem(DENIED_AT_KEY, Date.now().toString());
  } else if (decision === 'allow') {
    localStorage.setItem(PROMPT_STATUS_KEY, 'granted');
    localStorage.removeItem(DENIED_AT_KEY);
  }
};

/**
 * Helper to convert VAPID Key string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register Web Push subscription with Service Worker and backend
 */
export const registerWebPushSubscription = async (user_id?: string, user_role?: string): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[WebPush]: Web push not supported in this browser.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[WebPush]: Permission not granted:', permission);
      return false;
    }

    recordPromptDecision('allow');

    // Get VAPID Key from backend
    let vapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-m9GYvDwWDupBDwA61_D2A_hZ2d-209-Zq0b_629g9122_92931Z0Z';
    try {
      const res = await notificationApi.getVapidKey();
      if (res.data?.publicKey) {
        vapidKey = res.data.publicKey;
      }
    } catch (e) {}

    // Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Subscribe to Web Push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const installation_id = getInstallationId();

    // Send subscription payload to backend
    await notificationApi.subscribe({
      platform: 'web',
      app_type: 'website',
      installation_id,
      subscription: subscription.toJSON(),
      token: subscription.endpoint,
      user_id,
      user_role,
      permission_status: 'granted',
    });

    console.log('[WebPush]: Web push subscription registered successfully.');
    return true;
  } catch (err) {
    console.error('[WebPush Registration Error]:', err);
    return false;
  }
};

/**
 * Register Android FCM Push Subscription (For Capacitor native apps)
 */
export const registerAndroidPushSubscription = async (
  token: string,
  app_type: 'zenemoo' | 'zenemoo_admin' = 'zenemoo',
  user_id?: string,
  user_role?: string
) => {
  try {
    const installation_id = getInstallationId();
    await notificationApi.subscribe({
      platform: 'android',
      app_type,
      installation_id,
      token,
      user_id,
      user_role,
      permission_status: 'granted',
    });
    recordPromptDecision('allow');
    console.log('[AndroidPush]: FCM Android notification token registered successfully.');
  } catch (err) {
    console.error('[AndroidPush Registration Error]:', err);
  }
};

/**
 * Initialize Capacitor Push Notifications for Native Android Builds
 */
export const initCapacitorPushNotifications = async (
  app_type: 'zenemoo' | 'zenemoo_admin' = 'zenemoo',
  user_id?: string,
  user_role?: string
) => {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive === 'granted') {
      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        if (token && token.value) {
          registerAndroidPushSubscription(token.value, app_type, user_id, user_role);
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.warn('[Capacitor Push Error]:', err.error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Capacitor Push Received]:', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        const url = notification.notification.data?.url || notification.notification.data?.click_action;
        if (url && typeof window !== 'undefined') {
          window.location.href = url;
        }
      });
    }
  } catch (err) {
    console.warn('[Capacitor Push Init Warn]:', err);
  }
};
