import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { googleAppsScriptService } from './googleAppsScriptService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local private vault directory for isolated fallback storage
const LOCAL_VAULT_DIR = path.resolve(__dirname, '../../storage/private_vault');
if (!fs.existsSync(LOCAL_VAULT_DIR)) {
  try {
    fs.mkdirSync(LOCAL_VAULT_DIR, { recursive: true });
  } catch (_) {}
}

// In-memory cache for fast, secure streaming when using local/mock storage
const privateBufferCache = new Map();

/**
 * Validate that a buffer is a genuine PDF file using magic bytes (%PDF-)
 * Magic header: 0x25 0x50 0x44 0x46 0x2D ('%PDF-')
 */
export function validatePdfBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 5) {
    return {
      isValid: false,
      error: 'Invalid file data. Expected non-empty binary buffer.',
    };
  }

  const magicHeader = buffer.subarray(0, 5).toString('ascii');
  if (magicHeader !== '%PDF-') {
    return {
      isValid: false,
      error: 'File signature verification failed: Uploaded file is not a valid PDF document (magic bytes missing).',
    };
  }

  // Check for max allowed size (25MB)
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 25 MB.`,
    };
  }

  return { isValid: true };
}

/**
 * Compute SHA-256 checksum of a buffer
 */
export function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Sanitize text for filenames (alphanumeric, hyphens, underscores only)
 */
export function sanitizeFilenamePart(text = '', maxLength = 40) {
  const sanitized = String(text)
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return (sanitized.substring(0, maxLength) || 'document').replace(/(^-|-$)/g, '');
}

/**
 * Generate standardized server-side filename:
 * e.g. ZEN-NDA-2026-0012_Acme-Technologies_2026-10-23.pdf
 */
export function generatePrivateDocumentFilename({
  documentReference,
  companyName,
  dateIso = new Date().toISOString().split('T')[0],
  version = 1,
}) {
  const cleanRef = sanitizeFilenamePart(documentReference, 30);
  const cleanCompany = sanitizeFilenamePart(companyName, 40);
  const vSuffix = version > 1 ? `_v${version}` : '';
  return `${cleanRef}_${cleanCompany}_${dateIso}${vSuffix}.pdf`;
}

/**
 * Determine private folder category based on document type
 */
export function getPrivateFolderCategory(documentType) {
  const dt = String(documentType || '').toLowerCase();
  if (dt === 'nda') return 'NDAs';
  if (['master_services_agreement', 'statement_of_work', 'service_contract', 'vendor_agreement', 'partnership_agreement'].includes(dt)) {
    return 'Contracts';
  }
  return 'Other Documents';
}

export const privateStorageService = {
  /**
   * Upload PDF to private Google Drive storage or secure local vault
   */
  uploadPrivatePdf: async ({
    buffer,
    storedFilename,
    documentType,
    documentReference,
    year = new Date().getFullYear(),
  }) => {
    const category = getPrivateFolderCategory(documentType);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    let targetFolderHierarchy = `Zenemoo Private Documents/${category}/${year}/${String(currentMonth).padStart(2, '0')}`;
    const base64Data = buffer.toString('base64');
    const fileSize = buffer.length;
    const checksum = computeSha256(buffer);

    // Save to local private vault cache first for reliable streaming
    const fileId = `pvt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const localFilePath = path.join(LOCAL_VAULT_DIR, `${fileId}_${storedFilename}`);
    
    try {
      fs.writeFileSync(localFilePath, buffer);
    } catch (fsErr) {
      console.warn('[Private Vault FS Note]: Could not write to local disk fallback:', fsErr.message);
    }
    privateBufferCache.set(fileId, buffer);

    let driveFileId = fileId;
    let driveFolderId = `pvt_folder_${category.toLowerCase()}_${year}_${currentMonth}`;
    let isExternalDriveStored = false;

    // Attempt Google Apps Script automatic Year/Month upload if configured
    const isConfigured = typeof googleAppsScriptService.isPrivateVaultConfigured === 'function'
      ? googleAppsScriptService.isPrivateVaultConfigured()
      : googleAppsScriptService.isConfigured();

    if (isConfigured) {
      try {
        const driveRes = await googleAppsScriptService.uploadPrivateVaultFile({
          category,
          fileName: storedFilename,
          mimeType: 'application/pdf',
          base64Data,
          year,
          month: currentMonth,
        });

        if (driveRes?.file?.id) {
          driveFileId = driveRes.file.id;
          if (driveRes.file.folderId) driveFolderId = driveRes.file.folderId;
          if (driveRes.file.folderHierarchy) targetFolderHierarchy = driveRes.file.folderHierarchy;
          isExternalDriveStored = true;
          // Store mapping from real driveFileId to buffer in cache for instant local serving
          privateBufferCache.set(driveFileId, buffer);
        }
      } catch (driveErr) {
        console.warn('⚠️ Google Apps Script private upload warning; kept in secure local vault:', driveErr?.message || driveErr);
      }
    }

    return {
      success: true,
      fileId,
      driveFileId,
      driveFolderId,
      storedFilename,
      fileSize,
      checksumSha256: checksum,
      storagePath: targetFolderHierarchy,
      isExternalDriveStored,
    };
  },

  /**
   * Authorize and retrieve PDF buffer for streaming or preview
   */
  getPrivatePdfBuffer: async (driveFileId, storedFilename = '') => {
    // 1. Check in-memory buffer cache
    if (privateBufferCache.has(driveFileId)) {
      return privateBufferCache.get(driveFileId);
    }

    // 2. Check local vault directory
    try {
      const files = fs.readdirSync(LOCAL_VAULT_DIR);
      const match = files.find((f) => f.startsWith(driveFileId) || (storedFilename && f.includes(storedFilename)));
      if (match) {
        const buf = fs.readFileSync(path.join(LOCAL_VAULT_DIR, match));
        privateBufferCache.set(driveFileId, buf);
        return buf;
      }
    } catch (_) {}

    // 3. If external Drive file ID, fetch directly from Google Drive export (backend-mediated only)
    if (driveFileId && !driveFileId.startsWith('pvt_') && !driveFileId.startsWith('mock_')) {
      try {
        const driveUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
        const res = await fetch(driveUrl);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          privateBufferCache.set(driveFileId, buf);
          return buf;
        }
      } catch (gErr) {
        console.warn('[Private Vault Drive Fetch Note]:', gErr.message);
      }
    }

    return null;
  },

  /**
   * Delete private file from storage
   */
  deletePrivatePdf: async (driveFileId, storedFilename = '') => {
    privateBufferCache.delete(driveFileId);

    try {
      const files = fs.readdirSync(LOCAL_VAULT_DIR);
      for (const f of files) {
        if (f.startsWith(driveFileId) || (storedFilename && f.includes(storedFilename))) {
          fs.unlinkSync(path.join(LOCAL_VAULT_DIR, f));
        }
      }
    } catch (_) {}

    if (driveFileId && !driveFileId.startsWith('pvt_') && !driveFileId.startsWith('mock_')) {
      try {
        await googleAppsScriptService.deleteFile(driveFileId);
      } catch (_) {}
    }

    return { success: true };
  },
};
