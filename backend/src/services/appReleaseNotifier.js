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
    version: '2.0.5',
    versionCode: 5,
    packageName: 'in.zenemoo.app',
    downloadUrl: 'https://www.zenemoo.in/downloads/zenemoo-latest.apk',
    releaseDate: '2026-08-21',
    fileSize: '65.8 MB',
    releaseNotes: [
      'High-Volume Language Data Output Telemetry & Production Targets (500+ Mins Daily)',
      'Super QC multi-tier verification accuracy standards (99.9%+)',
    ],
  };
};

/**
 * Retrieve the last notified version from Supabase DB or persistent JSON checkpoint
 */
const getLastNotifiedVersion = async () => {
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
 * Save the checkpoint after successful notification dispatch
 */
const saveReleaseCheckpoint = async (version, releaseDate) => {
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
  const currentVersion = manifest.version || '2.0.5';
  const releaseDate = manifest.releaseDate || new Date().toISOString().split('T')[0];

  console.log(`[App Release] Current published version: ${currentVersion}`);

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

  console.log(`[App Release] New release detected: ${currentVersion}`);
  console.log('[App Release] Creating release notification');

  // Format Title & Release Notes
  const title = `🎉 Zenemoo v${currentVersion} is now available!`;

  let notesBulletList = '';
  if (Array.isArray(manifest.releaseNotes) && manifest.releaseNotes.length > 0) {
    notesBulletList = manifest.releaseNotes.map((note) => `• ${note}`).join('\n');
  } else if (typeof manifest.releaseNotes === 'string' && manifest.releaseNotes.trim()) {
    notesBulletList = manifest.releaseNotes.trim();
  } else {
    notesBulletList = '• Improved AI performance\n• Better notification reliability\n• Faster app startup\n• Bug fixes and stability improvements';
  }

  const message = `A new version of the Zenemoo Android app has been released.

What's new:
${notesBulletList}

Update now to get the latest Zenemoo experience.`;

  console.log('[App Release] Dispatching through existing notification engine');

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
        release_date: releaseDate,
        apk_size: manifest.fileSize || manifest.apkSize || '17.5 MB',
        release_type: 'android_app_update',
      },
    });

    if (dispatchResult && dispatchResult.notification) {
      console.log('[App Release] Release notification dispatched successfully');
      await saveReleaseCheckpoint(currentVersion, releaseDate);
      return {
        triggered: true,
        success: true,
        version: currentVersion,
        notification: dispatchResult.notification,
      };
    } else {
      console.warn('[App Release] Notification engine returned empty response');
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
