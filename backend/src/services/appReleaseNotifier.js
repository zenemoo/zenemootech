import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase.js';
import { sendZenemooNotification } from './pushNotificationEngine.js';

const CHECKPOINT_FILE = path.resolve(process.cwd(), 'app-release-checkpoint.json');

/**
 * Read the current published app manifest metadata
 */
export const getPublishedAppManifest = () => {
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), '../frontend/public/app/android-release.json'),
      path.resolve(process.cwd(), 'frontend/public/app/android-release.json'),
      path.resolve(process.cwd(), 'public/app/android-release.json'),
      path.resolve('frontend/public/app/android-release.json'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn('[App Release] Error reading android-release.json manifest:', e.message);
  }

  return {
    appName: 'Zenemoo',
    version: '2.0.6',
    versionCode: 6,
    packageName: 'in.zenemoo.app',
    apkUrl: '/downloads/zenemoo-latest.apk',
    releaseDate: new Date().toISOString().split('T')[0],
    apkSize: '8.3 MB',
  };
};

/**
 * Retrieve the last notified version from Supabase DB or persistent JSON checkpoint
 */
export const getLastNotifiedVersion = async () => {
  // 1. Try Supabase DB
  if (supabase) {
    try {
      const { data } = await supabase
        .from('zenemoo_notifications')
        .select('app_version')
        .eq('record_type', 'release_checkpoint')
        .eq('platform', 'android')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].app_version) {
        return data[0].app_version;
      }
    } catch (dbErr) {
      // Fallback to local checkpoint file
    }
  }

  // 2. Fallback to Local Checkpoint File
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const raw = fs.readFileSync(CHECKPOINT_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed.lastNotifiedVersion || null;
    }
  } catch (fileErr) {}

  return null;
};

/**
 * Save the checkpoint ONLY after confirmed successful notification dispatch
 */
export const saveReleaseCheckpoint = async (version, releaseDate) => {
  // 1. Save to Supabase DB
  if (supabase) {
    try {
      await supabase.from('zenemoo_notifications').insert([
        {
          record_type: 'release_checkpoint',
          platform: 'android',
          app_version: version,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {}
  }

  // 2. Save to Local Checkpoint File
  try {
    const payload = {
      lastNotifiedVersion: version,
      releaseDate,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {
    console.warn('[App Release] Could not write local checkpoint file:', e.message);
  }
};

/**
 * Main Automatic Detection and Dispatch Routine
 */
export const checkAndNotifyAppRelease = async (forceCheck = false) => {
  const manifest = getPublishedAppManifest();
  const currentVersion = manifest.version || '2.0.6';
  const releaseDate = manifest.releaseDate || new Date().toISOString().split('T')[0];

  console.log(`[App Release] Published version: ${currentVersion}`);

  const lastNotified = await getLastNotifiedVersion();
  console.log(`[App Release] Last notified version: ${lastNotified || 'None'}`);

  if (!forceCheck && lastNotified === currentVersion) {
    console.log('[App Release] No new release notification required');
    return {
      triggered: false,
      reason: 'version_already_notified',
      currentVersion,
      lastNotified,
    };
  }

  console.log(`[App Release] New release detected: v${currentVersion}`);
  console.log('[App Release] Preparing release notification');

  // Format Title & Message exactly as specified
  const title = `🎉 Zenemoo v${currentVersion} is now available!`;
  const message = 'A new version of the Zenemoo app is now available with the latest improvements, performance updates and fixes. Update now to get the latest experience.';

  console.log('[App Release] Dispatching notification');

  try {
    const dispatchResult = await sendZenemooNotification({
      title,
      message,
      notification_type: 'app_update',
      target_type: 'broadcast',
      url: 'https://www.zenemoo.in/app/android',
      sender_email: 'system@zenemoo.in',
      metadata: {
        version: currentVersion,
        version_code: manifest.versionCode || 5,
        release_date: releaseDate,
        apk_size: manifest.apkSize || manifest.fileSize || '8.3 MB',
        release_type: 'android_app_update',
      },
    });

    if (dispatchResult && dispatchResult.notification) {
      console.log('[App Release] Notification dispatch successful');
      await saveReleaseCheckpoint(currentVersion, releaseDate);
      console.log(`[App Release] Checkpoint updated: ${currentVersion}`);
      return {
        triggered: true,
        success: true,
        version: currentVersion,
        notification: dispatchResult.notification,
        stats: {
          androidCount: dispatchResult.androidCount || 0,
          webCount: dispatchResult.webCount || 0,
          totalDestinations: dispatchResult.totalDestinations || 0,
        },
      };
    } else {
      console.warn('[App Release] Notification engine returned empty response — checkpoint NOT updated');
      return { triggered: true, success: false, reason: 'empty_dispatch_response' };
    }
  } catch (dispatchError) {
    console.error('[App Release] Notification dispatch failed:', dispatchError.message);
    return {
      triggered: true,
      success: false,
      error: dispatchError.message,
    };
  }
};
