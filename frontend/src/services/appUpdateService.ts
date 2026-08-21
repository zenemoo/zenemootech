import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { notificationApi } from './api';

const LAST_UPDATE_CHECK_KEY = 'zenemoo_last_app_update_check_time';
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AppUpdateInfo {
  hasUpdate: boolean;
  installedVersion: string;
  latestVersion: string;
  releaseNotes: string;
  updateUrl: string;
  forceUpdate: boolean;
}

/**
 * Compare two semver version strings (e.g. '2.0.3' vs '2.0.4')
 * Returns: -1 if v1 < v2 (newer version exists), 0 if equal, 1 if v1 > v2
 */
export const compareSemver = (v1: string, v2: string): number => {
  const cleanV1 = v1.replace(/^v/, '').trim();
  const cleanV2 = v2.replace(/^v/, '').trim();

  const parts1 = cleanV1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = cleanV2.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
};

/**
 * Check if a newer version of the Zenemoo Android app is available.
 * ONLY runs on native Android Capacitor platform.
 */
export const checkForAppUpdate = async (forceCheck = false): Promise<AppUpdateInfo | null> => {
  // Requirement #19: Do NOT run on standard browser/website. ONLY native Android.
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return null;
  }

  // Requirement #15: Throttle checks to once every 24 hours unless forced
  const lastCheckStr = localStorage.getItem(LAST_UPDATE_CHECK_KEY);
  const now = Date.now();
  if (!forceCheck && lastCheckStr) {
    const lastCheck = parseInt(lastCheckStr, 10);
    if (now - lastCheck < UPDATE_CHECK_INTERVAL_MS) {
      return null;
    }
  }

  try {
    // Dynamic installed version using @capacitor/app
    let installedVersion = '2.0.5';
    try {
      const info = await App.getInfo();
      if (info && info.version) {
        installedVersion = info.version;
      }
    } catch (e) {
      console.warn('[App.getInfo Warn]:', e);
    }

    // Fetch latest release metadata from backend
    const res = await notificationApi.getAppVersion({
      platform: 'android',
      app_type: 'zenemoo',
    });

    localStorage.setItem(LAST_UPDATE_CHECK_KEY, now.toString());

    if (res.data && res.data.success && res.data.data) {
      const remote = res.data.data;
      const latestVersion = remote.latest_version || '2.0.4';
      const minVersion = remote.min_version || '2.0.0';
      const updateUrl = remote.update_url || 'https://www.zenemoo.in/';
      const releaseNotes =
        remote.release_notes || 'A new update for Zenemoo is available with performance and stability improvements.';

      // Check if installed version is older than latest
      const isOutdated = compareSemver(installedVersion, latestVersion) < 0;
      const isMandatory = remote.force_update || compareSemver(installedVersion, minVersion) < 0;

      if (isOutdated) {
        return {
          hasUpdate: true,
          installedVersion,
          latestVersion,
          releaseNotes,
          updateUrl,
          forceUpdate: isMandatory,
        };
      }
    }
  } catch (err) {
    console.warn('[checkForAppUpdate Warn]:', err);
  }

  return null;
};
