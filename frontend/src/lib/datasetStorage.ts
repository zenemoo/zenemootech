/**
 * ZENEMOO AI Data Portfolio - Storage Abstraction Interface
 * 
 * Provides clean storage API boundary to abstract actual storage provider (Google Drive, Cloudinary, etc.)
 * 
 * IMPORTANT ARCHITECTURE RULES:
 * 1. Supabase stores ONLY metadata (no raw binary file uploads to Supabase DB).
 * 2. Google Drive API integration handles binary storage via backend Express server endpoints on Google Cloud Run.
 * 3. Never expose Google credentials inside React frontend bundle.
 */

export interface StorageUploadResult {
  success: boolean;
  message: string;
  storageProvider?: string;
  storageFileId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
}

const getApiBaseUrl = (): string => {
  // Option 1: Explicit VITE_CLOUD_RUN_API_URL environment variable
  const cloudRunUrl = (import.meta as any).env?.VITE_CLOUD_RUN_API_URL;
  if (cloudRunUrl && typeof cloudRunUrl === 'string' && cloudRunUrl.trim() !== '') {
    return cloudRunUrl.trim().replace(/\/$/, '');
  }

  // Option 2: General VITE_API_URL environment variable (ignore legacy Render URL for Google Drive storage)
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && !envUrl.includes('onrender.com')) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // Option 3: Production Cloud Run backend fallback for Google Drive API operations
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://zenemoo-api-1032144750022.asia-south1.run.app';
  }

  // Option 4: Local development fallback
  return 'http://localhost:5000';
};

/**
 * Health Check: Query Google Drive API ADC status on Cloud Run
 */
export const checkDriveHealthStatus = async (): Promise<{ success: boolean; message: string; folderName?: string; folderId?: string }> => {
  const baseUrl = getApiBaseUrl();
  const targetUrl = `${baseUrl}/api/portfolio/drive-health`;
  try {
    const res = await fetch(targetUrl);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: `Failed to connect to Cloud Run Drive health endpoint: ${err.message}` };
  }
};

/**
 * Upload Dataset File to Google Drive via Cloud Run Backend API
 */
export const uploadDatasetFile = async (
  file: File,
  category = 'Audio',
  onProgress?: (percent: number) => void
): Promise<StorageUploadResult> => {
  if (!file) {
    return { success: false, message: 'No file selected for upload.' };
  }

  // Validate File Size (Limit: 100MB)
  const MAX_SIZE_BYTES = 100 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    return {
      success: false,
      message: `File size exceeds the 100MB limit. Selected file size: ${(file.size / (1024 * 1024)).toFixed(2)} MB.`,
    };
  }

  const baseUrl = getApiBaseUrl();
  const targetUrl = `${baseUrl}/api/portfolio/upload-drive`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('zenemoo_jwt_token') : null;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    xhr.open('POST', targetUrl, true);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && response.success) {
          resolve({
            success: true,
            message: response.message || 'File uploaded successfully to Google Drive.',
            storageProvider: response.storageProvider || 'google_drive',
            storageFileId: response.fileId,
            fileUrl: response.fileUrl,
            fileName: response.fileName || file.name,
            fileSize: response.fileSize,
          });
        } else {
          resolve({
            success: false,
            message: response.message || `Upload failed with status code ${xhr.status}.`,
          });
        }
      } catch (err: any) {
        resolve({
          success: false,
          message: `Failed to parse upload response from server: ${err.message}`,
        });
      }
    };

    xhr.onerror = () => {
      resolve({
        success: false,
        message: 'Network error occurred while connecting to Google Drive API upload server.',
      });
    };

    xhr.ontimeout = () => {
      resolve({
        success: false,
        message: 'Upload request timed out. Please check your connection and try again.',
      });
    };

    xhr.send(formData);
  });
};

/**
 * Delete Dataset File from Google Drive via Cloud Run Backend API
 */
export const deleteDatasetFile = async (storageFileId?: string): Promise<{ success: boolean; message: string }> => {
  if (!storageFileId || storageFileId.trim() === '') {
    return { success: true, message: 'No remote storage file ID associated.' };
  }

  const baseUrl = getApiBaseUrl();
  const targetUrl = `${baseUrl}/api/portfolio/delete-drive/${encodeURIComponent(storageFileId.trim())}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('zenemoo_jwt_token') : null;

  try {
    const res = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message || 'Google Drive file deleted.' };
    }
    return { success: false, message: data.message || `Failed to delete Drive file (Status ${res.status}).` };
  } catch (err: any) {
    return { success: false, message: `Network error during Drive file deletion: ${err.message}` };
  }
};

/**
 * Storage Abstraction: Resolve Dataset File URL
 * Formats Google Drive shareable URLs for embedding/streaming
 */
export const getDatasetFileUrl = (fileUrl?: string): string | null => {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const trimmed = fileUrl.trim();
  if (!trimmed || trimmed === '#' || trimmed === 'null' || trimmed === 'undefined') return null;

  // Convert Google Drive view URLs to direct embed preview format if needed
  if (trimmed.includes('drive.google.com/file/d/')) {
    const match = trimmed.match(/\/file\/d\/([^\/]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }

  return trimmed;
};
