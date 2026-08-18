import { google } from 'googleapis';
import stream from 'stream';

/**
 * ZENEMOO Production Google Drive Storage Integration Service
 * 
 * Authenticates with Google Drive API server-side using:
 * 1. Workload Identity Federation (WIF) via GOOGLE_APPLICATION_CREDENTIALS_JSON
 * 2. Service Account JWT Private Key (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
 * 3. Direct Service Account Access Token (GOOGLE_SERVICE_ACCOUNT_ACCESS_TOKEN)
 * 
 * Manages folder structure: ZENEMOO_DATA_PORTFOLIO / PUBLIC_SAMPLES / [CATEGORY]
 * NEVER expose Google credentials to the frontend React bundle.
 */

// Cache for folder IDs to reduce API calls
const folderIdCache = new Map();

/**
 * Initialize Google Drive Auth Client
 */
export const getDriveClient = () => {
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive',
  ];

  // Option 1: Workload Identity Federation (WIF) via JSON string in environment variable
  const wifJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (wifJson && typeof wifJson === 'string' && wifJson.trim() !== '') {
    try {
      const parsedConfig = JSON.parse(wifJson.trim());
      const auth = google.auth.fromJSON(parsedConfig);
      auth.scopes = scopes;
      return google.drive({ version: 'v3', auth });
    } catch (wifErr) {
      console.error('[Google Drive WIF JSON Parse Error]:', wifErr.message);
    }
  }

  // Option 2: Workload Identity Federation via GOOGLE_APPLICATION_CREDENTIALS file path
  const credentialFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialFilePath && typeof credentialFilePath === 'string' && credentialFilePath.trim() !== '') {
    try {
      const auth = new google.auth.GoogleAuth({ scopes: scopes });
      return google.drive({ version: 'v3', auth });
    } catch (fileErr) {
      console.error('[Google Drive WIF File Auth Error]:', fileErr.message);
    }
  }

  // Option 3: Direct Access Token (Short-lived bearer token)
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN || process.env.GOOGLE_SERVICE_ACCOUNT_ACCESS_TOKEN;
  if (accessToken && typeof accessToken === 'string' && accessToken.trim() !== '') {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken.trim() });
      return google.drive({ version: 'v3', auth: oauth2Client });
    } catch (tokenErr) {
      console.error('[Google Drive Access Token Init Error]:', tokenErr.message);
    }
  }

  // Option 4: Service Account JWT Private Key (Fallback)
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    try {
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: scopes,
      });
      return google.drive({ version: 'v3', auth });
    } catch (err) {
      console.error('[Google Drive Service Account Init Error]:', err.message);
    }
  }

  return null;
};

/**
 * Ensure or find a folder by name inside a parent folder ID
 */
const getOrCreateSubfolder = async (drive, folderName, parentId = null) => {
  const cacheKey = `${parentId || 'root'}:${folderName}`;
  if (folderIdCache.has(cacheKey)) {
    return folderIdCache.get(cacheKey);
  }

  let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  try {
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (res.data.files && res.data.files.length > 0) {
      const folderId = res.data.files[0].id;
      folderIdCache.set(cacheKey, folderId);
      return folderId;
    }

    // Create folder if missing
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    };

    const created = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
      supportsAllDrives: true,
    });

    const folderId = created.data.id;
    folderIdCache.set(cacheKey, folderId);
    return folderId;
  } catch (err) {
    console.error(`[Google Drive Folder Error] Failed to resolve subfolder "${folderName}":`, err.message);
    throw err;
  }
};

/**
 * Map Dataset Category / File Type to target Google Drive subfolder
 */
const getCategoryFolderName = (category = '', fileMimeType = '', originalName = '') => {
  const catUpper = (category || '').toUpperCase();
  const ext = originalName.split('.').pop()?.toLowerCase() || '';

  if (catUpper === 'AUDIO' || fileMimeType.includes('audio') || ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext)) {
    return 'AUDIO';
  }
  if (catUpper === 'VIDEO' || fileMimeType.includes('video') || ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) {
    return 'VIDEO';
  }
  if (catUpper === 'IMAGE' || fileMimeType.includes('image') || ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(ext)) {
    return 'IMAGE';
  }
  if (catUpper === 'JSON' || ext === 'json' || ext === 'jsonl') {
    return 'JSON';
  }
  if (catUpper === 'CSV' || ext === 'csv' || ext === 'tsv') {
    return 'CSV';
  }
  if (ext === 'pdf' || fileMimeType.includes('pdf')) {
    return 'PDF';
  }
  return 'OTHER';
};

/**
 * Target Root Folder Setup:
 * ZENEMOO_DATA_PORTFOLIO / PUBLIC_SAMPLES / [CATEGORY]
 */
const resolveTargetFolderId = async (drive, category, fileMimeType, originalName) => {
  const rootEnvId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  let rootFolderId = rootEnvId;
  if (!rootFolderId) {
    rootFolderId = await getOrCreateSubfolder(drive, 'ZENEMOO_DATA_PORTFOLIO');
  }

  const samplesFolderId = await getOrCreateSubfolder(drive, 'PUBLIC_SAMPLES', rootFolderId);
  const categoryFolderName = getCategoryFolderName(category, fileMimeType, originalName);
  const categoryFolderId = await getOrCreateSubfolder(drive, categoryFolderName, samplesFolderId);

  return categoryFolderId;
};

/**
 * Upload file buffer/stream to Google Drive
 */
export const uploadFileToDrive = async ({ buffer, originalName, mimeType, category }) => {
  const drive = getDriveClient();
  if (!drive) {
    throw new Error('Google Drive API client is not configured on Render. Please set Google credentials in Render environment variables.');
  }

  try {
    const targetFolderId = await resolveTargetFolderId(drive, category, mimeType, originalName);

    // Readable stream from buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const fileMetadata = {
      name: originalName,
      parents: [targetFolderId],
    };

    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: bufferStream,
    };

    // Upload file
    const uploadRes = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, size',
      supportsAllDrives: true,
    });

    const fileId = uploadRes.data.id;

    // Grant public read access to the specific sample file
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      });
    } catch (permErr) {
      console.warn(`[Google Drive Permission Note] Could not set public reader permission on file ${fileId}:`, permErr.message);
    }

    // Direct preview URL
    const fileUrl = uploadRes.data.webViewLink || uploadRes.data.webContentLink || `https://drive.google.com/file/d/${fileId}/view`;

    return {
      success: true,
      fileId,
      fileUrl,
      fileName: originalName,
      fileSize: uploadRes.data.size ? `${(uploadRes.data.size / (1024 * 1024)).toFixed(2)} MB` : 'N/A',
      storageProvider: 'google_drive',
    };
  } catch (err) {
    console.error('[Google Drive Upload Service Error]:', err.message);
    throw new Error(`Google Drive Upload Failed: ${err.message}`);
  }
};

/**
 * Delete file from Google Drive (Move to Trash)
 */
export const deleteFileFromDrive = async (fileId) => {
  if (!fileId) return { success: true, message: 'No file ID provided.' };

  const drive = getDriveClient();
  if (!drive) {
    throw new Error('Google Drive API client is not configured on Render. Please set Google credentials in Render environment variables.');
  }

  try {
    // Move to Trash instead of hard delete for safety
    await drive.files.update({
      fileId: fileId,
      requestBody: {
        trashed: true,
      },
      supportsAllDrives: true,
    });

    return { success: true, message: `File ${fileId} moved to Google Drive trash.` };
  } catch (err) {
    console.error(`[Google Drive Delete Service Error] File ID ${fileId}:`, err.message);
    throw new Error(`Google Drive File Deletion Failed: ${err.message}`);
  }
};
