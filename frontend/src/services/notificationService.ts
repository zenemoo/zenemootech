import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import {
  PushNotifications,
  Token,
  RegistrationError,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { notificationApi } from './api';

const INSTALLATION_KEY = 'zenemoo_installation_id';
const PROMPT_STATUS_KEY = 'zenemoo_notif_prompt_status'; // 'granted' | 'denied'
const ONBOARDING_COMPLETED_KEY = 'zenemoo_notification_onboarding_completed';
const DENIED_AT_KEY = 'zenemoo_notif_denied_at'; // timestamp ms
const RETRY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Idempotency session caches
let lastRegisteredSubKey = '';
let isCapacitorPushInitialized = false;

/**
 * Dynamically retrieves installed native application version or fallback website version
 */
export const getAppVersion = async (): Promise<string> => {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo();
      if (info && info.version) {
        return info.version;
      }
    } catch (e) {
      console.warn('[App.getInfo Error]:', e);
    }
  }
  return '2.0.6';
};

/**
 * Safely validates and returns trusted Zenemoo notification target URLs
 */
export const sanitizeZenemooUrl = (rawUrl?: string | null): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }
  const trimmed = rawUrl.trim();
  if (trimmed === '') {
    return null;
  }
  
  // Reject dangerous schemes
  if (/^(javascript|data|file|intent|about|vbscript):/i.test(trimmed)) {
    return null;
  }

  if (trimmed.startsWith('/')) {
    return `https://www.zenemoo.in${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'www.zenemoo.in' || hostname === 'zenemoo.in') {
      return parsed.href;
    }
  } catch (e) {}

  return null;
};

/**
 * Validates user input for Zenemoo notification URLs.
 * Returns true if empty (since link is optional) or if URL is a valid Zenemoo domain/relative path.
 */
export const isValidZenemooUrlInput = (rawUrl?: string | null): boolean => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return true; // Optional field
  }
  return sanitizeZenemooUrl(rawUrl) !== null;
};

/**
 * Handle notification tap action safely inside WebView
 */
export const handleNotificationClick = (rawUrl?: string | null) => {
  const targetUrl = sanitizeZenemooUrl(rawUrl);
  if (targetUrl && typeof window !== 'undefined') {
    console.log('[Notification Click]: Navigating to trusted target:', targetUrl);
    window.location.href = targetUrl;
  }
};

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
 * Asynchronously checks whether the custom notification prompt should be displayed.
 * Decoupled from native FCM initialization.
 */
export const checkPromptEligibility = async (): Promise<'can_prompt' | 'granted' | 'permanently_denied' | 'in_cooling_period'> => {
  if (typeof window === 'undefined') return 'in_cooling_period';

  // 1. Check local onboarding completion flag
  const onboardingCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
  if (onboardingCompleted === 'true') {
    return 'granted';
  }

  // 2. Check local 7-day cooling period for 'Not Now'
  const promptStatus = localStorage.getItem(PROMPT_STATUS_KEY);
  const deniedAtStr = localStorage.getItem(DENIED_AT_KEY);
  if (promptStatus === 'denied' && deniedAtStr) {
    const deniedAt = parseInt(deniedAtStr, 10);
    const now = Date.now();
    if (now - deniedAt < RETRY_INTERVAL_MS) {
      return 'in_cooling_period'; // Within 7 days
    }
  }

  // 3. Check native Android permission if native platform
  if (Capacitor.isNativePlatform()) {
    try {
      const permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'denied') {
        return 'permanently_denied';
      }
    } catch (err) {
      console.warn('[Capacitor checkPermissions warn]:', err);
    }
  }

  // 4. Check browser Web Notification API state if web platform
  if ('Notification' in window && !Capacitor.isNativePlatform()) {
    if (Notification.permission === 'granted') {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      localStorage.setItem(PROMPT_STATUS_KEY, 'granted');
      localStorage.removeItem(DENIED_AT_KEY);
      return 'granted';
    }
    if (Notification.permission === 'denied') {
      return 'permanently_denied';
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
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
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
    let vapidKey = 'BH0dqalpC9xFj_3g1vYx15dUaxAPCVKLQlRpuTAftHt1UPOgFN7jk-6Q1k642-NIZ_Gj6b4rbnXG12SSuuGTgZo';
    try {
      const res = await notificationApi.getVapidKey();
      if (res.data?.publicKey) {
        vapidKey = res.data.publicKey;
      }
      console.log('[WebPush Diag]: VAPID public key fetched from backend.');
    } catch (e) {
      console.warn('[WebPush Diag]: Could not fetch VAPID key from backend, using bundled fallback.');
    }

    // Register Service Worker
    console.log('[WebPush Diag]: Registering service worker...');
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    console.log('[WebPush Diag]: Service worker ready. Scope:', registration.scope);

    // Check for an existing valid subscription first — avoid creating a duplicate
    // or hitting DOMException on browsers that block repeated subscribe() calls.
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Validate that the existing subscription uses the current VAPID key
      const targetKeyBytes = urlBase64ToUint8Array(vapidKey);
      const subKeyBuffer = subscription.options?.applicationServerKey;
      let keyMismatch = false;

      if (subKeyBuffer) {
        const subKeyBytes = new Uint8Array(subKeyBuffer);
        if (subKeyBytes.length !== targetKeyBytes.length) {
          keyMismatch = true;
        } else {
          for (let i = 0; i < subKeyBytes.length; i++) {
            if (subKeyBytes[i] !== targetKeyBytes[i]) {
              keyMismatch = true;
              break;
            }
          }
        }
      }

      if (keyMismatch) {
        console.warn('[WebPush Diag]: Stale subscription detected — VAPID key mismatch. Unsubscribing old subscription and re-subscribing...');
        try {
          await subscription.unsubscribe();
        } catch (unsubErr) {
          console.warn('[WebPush Unsubscribe Warn]:', unsubErr);
        }
        subscription = null;
      } else {
        console.log('[WebPush Diag]: Existing valid subscription found. Endpoint host:', new URL(subscription.endpoint).hostname);
      }
    }

    if (!subscription) {
      console.log('[WebPush Diag]: Subscribing to PushManager...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      console.log('[WebPush Diag]: PushManager subscription created. Endpoint host:', new URL(subscription.endpoint).hostname);
    }

    const installation_id = getInstallationId();
    const app_version = await getAppVersion();
    const subKey = `web_website_${installation_id}_${subscription.endpoint}_${app_version}`;

    if (lastRegisteredSubKey === subKey) {
      console.log('[WebPush Diag]: Already registered in current session — skipping backend call.');
      return true;
    }

    lastRegisteredSubKey = subKey;

    // Send subscription payload to backend
    console.log('[WebPush Diag]: Sending subscription to backend /api/notifications/subscribe...');
    const subResponse = await notificationApi.subscribe({
      platform: 'web',
      app_type: 'website',
      installation_id,
      subscription: subscription.toJSON(),
      token: subscription.endpoint,
      user_id,
      user_role,
      app_version,
      permission_status: 'granted',
    });
    console.log('[WebPush Diag]: Backend subscribe response status:', subResponse.status);

    console.log('[WebPush]: Web push subscription registered successfully with app_version:', app_version);
    return true;
  } catch (err) {
    lastRegisteredSubKey = '';
    console.error('[WebPush Registration Error]:', err);
    return false;
  }
};

/**
 * INDEPENDENT Web Push Startup Initialization:
 * Runs on website startup. If browser Notification.permission is ALREADY granted,
 * initializes Service Worker & registers Web Push subscription silently in background.
 */
export const initWebPushIfGranted = async (user_id?: string, user_role?: string) => {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) {
    return;
  }

  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('[WebPush Diag]: Permission already granted — silently re-registering web push subscription...');
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      localStorage.setItem(PROMPT_STATUS_KEY, 'granted');
      localStorage.removeItem(DENIED_AT_KEY);

      await registerWebPushSubscription(user_id, user_role);
    } else {
      console.log('[WebPush Diag]: Startup check — Notification.permission is:', 'Notification' in window ? Notification.permission : 'not supported');
    }
  } catch (err) {
    console.warn('[initWebPushIfGranted Warn]:', err);
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
  const installation_id = getInstallationId();
  const app_version = await getAppVersion();
  const subKey = `android_${app_type}_${installation_id}_${token}_${app_version}`;

  if (lastRegisteredSubKey === subKey) {
    return; // Already registered in current session
  }

  try {
    lastRegisteredSubKey = subKey;
    await notificationApi.subscribe({
      platform: 'android',
      app_type,
      installation_id,
      token,
      user_id,
      user_role,
      app_version,
      permission_status: 'granted',
    });
    console.log('[AndroidPush]: FCM Android notification token registered successfully with app_version:', app_version);
  } catch (err) {
    lastRegisteredSubKey = '';
    console.error('[AndroidPush Registration Error]:', err);
  }
};

/**
 * Low-level register FCM push listeners and trigger PushNotifications.register()
 */
const registerCapacitorPushListenersAndToken = async (
  app_type: 'zenemoo' | 'zenemoo_admin' = 'zenemoo',
  user_id?: string,
  user_role?: string
) => {
  if (isCapacitorPushInitialized) return;
  isCapacitorPushInitialized = true;

  try {
    await PushNotifications.removeAllListeners();

    PushNotifications.addListener('registration', (token: Token) => {
      if (token && token.value) {
        registerAndroidPushSubscription(token.value, app_type, user_id, user_role);
      }
    });

    PushNotifications.addListener('registrationError', (err: RegistrationError) => {
      console.warn('[Capacitor Push Error]:', err.error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[Capacitor Push Received]:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      const data = notification.notification?.data || {};
      const targetUrl = data.url || (data.click_action !== 'FCM_PLUGIN_NOTIFICATION_CLICK' ? data.click_action : null) || data.link || data.path;
      console.log('[Capacitor Push Tap Action Received]:', notification.actionId, 'Target URL:', targetUrl);
      handleNotificationClick(targetUrl);
    });

    await PushNotifications.register();
  } catch (err) {
    isCapacitorPushInitialized = false;
    console.warn('[Register Capacitor Push Error]:', err);
  }
};

/**
 * INDEPENDENT FCM Startup Initialization:
 * Runs on App startup. If Android OS permission is ALREADY granted, initializes FCM listeners & token silently in background.
 */
export const initFCMIfGranted = async (
  app_type: 'zenemoo' | 'zenemoo_admin' = 'zenemoo',
  user_id?: string,
  user_role?: string
) => {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'granted') {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      localStorage.setItem(PROMPT_STATUS_KEY, 'granted');
      localStorage.removeItem(DENIED_AT_KEY);

      await registerCapacitorPushListenersAndToken(app_type, user_id, user_role);
    }
  } catch (err) {
    console.warn('[initFCMIfGranted Warn]:', err);
  }
};

/**
 * EXPLICIT PROMPT ACTION:
 * Called when user taps "Allow Notifications" in custom prompt.
 * Requests OS permission, initializes FCM registration, and marks onboarding completed.
 */
export const requestAndRegisterCapacitorPush = async (
  app_type: 'zenemoo' | 'zenemoo_admin' = 'zenemoo',
  user_id?: string,
  user_role?: string
): Promise<boolean> => {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive !== 'granted') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive === 'granted') {
      recordPromptDecision('allow');
      await registerCapacitorPushListenersAndToken(app_type, user_id, user_role);
      return true;
    }
  } catch (err) {
    console.warn('[requestAndRegisterCapacitorPush Warn]:', err);
  }
  return false;
};
