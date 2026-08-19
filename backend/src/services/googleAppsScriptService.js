import dotenv from 'dotenv';

dotenv.config();

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEB_APP_URL || '';
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET_TOKEN || 'ZENEMOO_DRIVE_SECRET_2026_PORTFOLIO';

async function postToAppsScript(payload) {
  if (typeof fetch !== 'undefined') {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: APPS_SCRIPT_SECRET, ...payload }),
    });
    return await res.json();
  } else {
    const axios = (await import('axios')).default;
    const res = await axios.post(APPS_SCRIPT_URL, { secret: APPS_SCRIPT_SECRET, ...payload });
    return res.data;
  }
}

export const googleAppsScriptService = {
  isConfigured: () => Boolean(APPS_SCRIPT_URL),

  createDataset: async (datasetName) => {
    if (!APPS_SCRIPT_URL) {
      console.warn('⚠️ APPS_SCRIPT_WEB_APP_URL not set in backend .env. Operating in fallback mock mode for Drive creation.');
      const mockDriveFolderId = `mock_drive_folder_${Date.now()}`;
      return {
        success: true,
        dataset: {
          name: datasetName,
          driveFolderId: mockDriveFolderId,
          driveUrl: `https://drive.google.com/drive/folders/${mockDriveFolderId}`,
          categoryFolders: {
            AUDIO: `mock_audio_${Date.now()}`,
            VIDEO: `mock_video_${Date.now()}`,
            IMAGE: `mock_image_${Date.now()}`,
            JSON: `mock_json_${Date.now()}`,
            CSV: `mock_csv_${Date.now()}`,
            PDF: `mock_pdf_${Date.now()}`,
          },
        },
      };
    }

    return await postToAppsScript({
      action: 'createDataset',
      datasetName,
    });
  },

  createFolder: async (folderName, parentFolderId) => {
    if (!APPS_SCRIPT_URL) {
      const mockFolderId = `mock_custom_folder_${Date.now()}`;
      return {
        success: true,
        folder: {
          id: mockFolderId,
          name: folderName,
          parentFolderId,
          url: `https://drive.google.com/drive/folders/${mockFolderId}`,
        },
      };
    }

    return await postToAppsScript({
      action: 'createFolder',
      folderName,
      parentFolderId,
    });
  },

  uploadFile: async ({ targetFolderId, fileName, mimeType, base64Data }) => {
    if (!APPS_SCRIPT_URL) {
      const mockFileId = `mock_drive_file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        success: true,
        file: {
          id: mockFileId,
          name: fileName,
          mimeType: mimeType || 'application/octet-stream',
          size: Math.round(base64Data.length * 0.75),
          folderId: targetFolderId,
          url: `https://drive.google.com/file/d/${mockFileId}/view`,
          thumbnailUrl: mimeType?.startsWith('image/') ? `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200` : null,
        },
      };
    }

    return await postToAppsScript({
      action: 'uploadFile',
      targetFolderId,
      fileName,
      mimeType,
      base64Data,
    });
  },

  deleteFile: async (driveFileId) => {
    if (!APPS_SCRIPT_URL) {
      return { success: true, fileId: driveFileId, message: 'Mock Drive file trashed' };
    }

    return await postToAppsScript({
      action: 'deleteFile',
      fileId: driveFileId,
    });
  },

  healthCheck: async () => {
    if (!APPS_SCRIPT_URL) {
      return { success: false, message: 'APPS_SCRIPT_WEB_APP_URL is not configured' };
    }
    return await postToAppsScript({
      action: 'healthCheck',
    });
  },
};
