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
      console.log('[Capacitor checkPermissions status]:', permStatus.receive);
      if (permStatus.receive === 'granted') {
        localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        localStorage.setItem(PROMPT_STATUS_KEY, 'granted');
        localStorage.removeItem(DENIED_AT_KEY);
        return 'granted';
      }
      // On Android 13+ (API 33+), checkPermissions() returns 'denied' or 'prompt' before requestPermissions() is invoked.
      // Return 'can_prompt' so the custom UI shows the "Allow Notifications" action button, which triggers native OS dialog.
      return 'can_prompt';
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
 * Helper to open Android native App Info / Notification settings when permission is denied or requires system settings.
 */
export const openAndroidNotificationSettings = async () => {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return;
  }
  try {
    const win = window as any;
    if (win.AndroidBridge && typeof win.AndroidBridge.openAppSettings === 'function') {
      win.AndroidBridge.openAppSettings();
    } else if (win.Capacitor && win.Capacitor.Plugins && win.Capacitor.Plugins.App && typeof win.Capacitor.Plugins.App.openAppSettings === 'function') {
      await win.Capacitor.Plugins.App.openAppSettings();
    } else {
      window.location.href = 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:in.zenemoo.team;end;';
    }
  } catch (e) {
    console.warn('[openAndroidNotificationSettings warn]:', e);
  }
};

/**
 * Helper to determine default app_type scope cleanly
 */
export const getTargetAppType = (requestedAppType?: string): string => {
  if (requestedAppType === 'team_hr' || requestedAppType === 'team_portal' || requestedAppType === 'hr_portal') {
    return 'team_hr';
  }
  if (requestedAppType === 'zenemoo' || requestedAppType === 'zenemoo_admin' || requestedAppType === 'website') {
    return requestedAppType;
  }
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/team') || path.includes('/hr')) {
      return 'team_hr';
    }
  }
  return requestedAppType || 'team_hr';
};

/**
 * Register Android FCM Push Subscription (For Capacitor native apps)
 */
export const registerAndroidPushSubscription = async (
  token: string,
  app_type: string = 'team_hr',
  user_id?: string,
  user_role?: string
) => {
  const targetAppType = getTargetAppType(app_type);
  const installation_id = getInstallationId();
  const app_version = await getAppVersion();
  const maskedToken = token ? `${token.substring(0, 6)}...${token.substring(token.length - 4)}` : 'NULL';
  const subKey = `android_${targetAppType}_${installation_id}_${token}_${app_version}`;

  console.log(`[TEAM-HR-NOTIFICATION] registerAndroidPushSubscription invoked: app_type=${targetAppType}, token=${maskedToken}, inst_id=${installation_id}`);

  if (lastRegisteredSubKey === subKey) {
    console.log('[TEAM-HR-NOTIFICATION] Token already registered in current session, skipping duplicate API call.');
    return; // Already registered in current session
  }

  try {
    lastRegisteredSubKey = subKey;
    const response = await notificationApi.subscribe({
      platform: 'android',
      app_type: targetAppType,
      installation_id,
      token,
      user_id,
      user_role,
      app_version,
      permission_status: 'granted',
    });
    console.log(`[TEAM-HR-NOTIFICATION] ✅ FCM Android token successfully saved to Supabase: status=${response.status}, app_type=${targetAppType}`);
  } catch (err: any) {
    lastRegisteredSubKey = '';
    console.error('[TEAM-HR-NOTIFICATION] ❌ FCM Android registration API error:', err?.message || err);
  }
};

/**
 * Low-level register FCM push listeners and trigger PushNotifications.register()
 */
const registerCapacitorPushListenersAndToken = async (
  app_type: string = 'team_hr',
  user_id?: string,
  user_role?: string
) => {
  const targetAppType = getTargetAppType(app_type);
  console.log(`[TEAM-HR-NOTIFICATION] Initializing Capacitor FCM push listeners for app_type=${targetAppType}...`);

  try {
    await PushNotifications.removeAllListeners();

    PushNotifications.addListener('registration', (token: Token) => {
      if (token && token.value) {
        const masked = `${token.value.substring(0, 6)}...${token.value.substring(token.value.length - 4)}`;
        console.log(`[TEAM-HR-NOTIFICATION] 🔑 FCM Token Event Fired! Token: ${masked}`);
        registerAndroidPushSubscription(token.value, targetAppType, user_id, user_role);
      }
    });

    PushNotifications.addListener('registrationError', (err: RegistrationError) => {
      console.warn('[TEAM-HR-NOTIFICATION] ⚠️ PushNotifications registration error event:', err.error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[TEAM-HR-NOTIFICATION] 📩 Push Notification Received in Foreground:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      const data = notification.notification?.data || {};
      const targetUrl = data.url || (data.click_action !== 'FCM_PLUGIN_NOTIFICATION_CLICK' ? data.click_action : null) || data.link || data.path;
      console.log('[TEAM-HR-NOTIFICATION] 👆 Push Notification Tap Action:', notification.actionId, 'Target URL:', targetUrl);
      handleNotificationClick(targetUrl);
    });

    console.log('[TEAM-HR-NOTIFICATION] Calling PushNotifications.register()...');
    await PushNotifications.register();
  } catch (err) {
    console.warn('[TEAM-HR-NOTIFICATION] ❌ Capacitor Push Registration Error:', err);
  }
};

/**
 * INDEPENDENT FCM Startup Initialization:
 * Runs on App startup. If Android OS permission is ALREADY granted, initializes FCM listeners & token silently in background.
 */
export const initFCMIfGranted = async (
  app_type: string = 'team_hr',
  user_id?: string,
  user_role?: string
) => {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return;
  }

  const targetAppType = getTargetAppType(app_type);
  try {
    const permStatus = await PushNotifications.checkPermissions();
    console.log(`[TEAM-HR-NOTIFICATION] initFCMIfGranted checkPermissions status: ${permStatus.receive}`);
    if (permStatus.receive === 'granted') {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      localStorage.setItem(PROMPT_STATUS_KEY, 'granted');
      localStorage.removeItem(DENIED_AT_KEY);

      await registerCapacitorPushListenersAndToken(targetAppType, user_id, user_role);
    }
  } catch (err) {
    console.warn('[TEAM-HR-NOTIFICATION] initFCMIfGranted warn:', err);
  }
};

let isLifecycleListenerAttached = false;

/**
 * Setup App Resume (App State Change) Listener:
 * When user returns to app from Android Settings, re-checks native permissions and automatically registers FCM token.
 */
export const setupAppLifecycleNotificationListener = (
  app_type: string = 'team_hr',
  user_id?: string,
  user_role?: string
) => {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform() || isLifecycleListenerAttached) {
    return;
  }
  isLifecycleListenerAttached = true;

  const targetAppType = getTargetAppType(app_type);

  try {
    App.addListener('appStateChange', async (state) => {
      if (state.isActive) {
        console.log(`[TEAM-HR-NOTIFICATION] 🔄 App resumed (appStateChange isActive=true). Re-checking native permissions for app_type=${targetAppType}...`);
        try {
          const permStatus = await PushNotifications.checkPermissions();
          console.log('[TEAM-HR-NOTIFICATION] Resumed native permission status:', permStatus.receive);
          if (permStatus.receive === 'granted') {
            localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
            localStorage.setItem(PROMPT_STATUS_KEY, 'granted');
            localStorage.removeItem(DENIED_AT_KEY);

            console.log(`[TEAM-HR-NOTIFICATION] Permission GRANTED on resume! Registering FCM token for app_type=${targetAppType}...`);
            await registerCapacitorPushListenersAndToken(targetAppType, user_id, user_role);
          }
        } catch (e) {
          console.warn('[TEAM-HR-NOTIFICATION] AppLifecycle Notification Check warn:', e);
        }
      }
    });
    console.log('[TEAM-HR-NOTIFICATION] App lifecycle notification resume listener attached successfully.');
  } catch (err) {
    console.warn('[setupAppLifecycleNotificationListener Error]:', err);
  }
};

/**
 * EXPLICIT PROMPT ACTION:
 * Called when user taps "Allow Notifications" in custom prompt.
 * Triggers REAL native Android 13+ PushNotifications.requestPermissions(), initializes FCM registration, and returns result status.
 */
export const requestAndRegisterCapacitorPush = async (
  app_type: string = 'team_hr',
  user_id?: string,
  user_role?: string
): Promise<{ status: 'granted' | 'denied' | 'permanently_denied'; registered: boolean }> => {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return { status: 'denied', registered: false };
  }

  const targetAppType = getTargetAppType(app_type);
  console.log(`[TEAM-HR-NOTIFICATION] requestAndRegisterCapacitorPush requested for app_type=${targetAppType}...`);

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive !== 'granted') {
      console.log('[TEAM-HR-NOTIFICATION] Requesting native Android POST_NOTIFICATIONS permission via PushNotifications.requestPermissions()...');
      permStatus = await PushNotifications.requestPermissions();
    }

    console.log('[TEAM-HR-NOTIFICATION] Native PushNotifications.requestPermissions result:', permStatus.receive);

    if (permStatus.receive === 'granted') {
      recordPromptDecision('allow');
      await registerCapacitorPushListenersAndToken(targetAppType, user_id, user_role);
      return { status: 'granted', registered: true };
    } else if (permStatus.receive === 'denied') {
      recordPromptDecision('not_now');
      return { status: 'denied', registered: false };
    }
  } catch (err) {
    console.warn('[TEAM-HR-NOTIFICATION] requestAndRegisterCapacitorPush warn:', err);
    recordPromptDecision('not_now');
  }
  return { status: 'denied', registered: false };
};
