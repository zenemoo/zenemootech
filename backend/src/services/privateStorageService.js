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
 * Allowed private vault extensions and their MIME types
 */
export const ALLOWED_VAULT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
];

/**
 * Determine MIME type from filename extension
 */
export function getMimeType(filename = '', defaultMime = 'application/octet-stream') {
  const ext = path.extname(filename || '').toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.csv':
      return 'text/csv';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return defaultMime;
  }
}

/**
 * Validate that a buffer is a supported vault document (PDF, Word, Excel/Sheets, Images)
 * and verify cryptographic/magic byte binary signatures for safety.
 */
export function validateVaultFileBuffer(buffer, originalFilename = 'document.pdf') {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 4) {
    return {
      isValid: false,
      error: 'Invalid file data. Expected non-empty binary buffer.',
    };
  }

  // 1. Max size enforcement (25 MB)
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 25 MB.`,
    };
  }

  const ext = path.extname(originalFilename || '').toLowerCase() || '.pdf';
  if (!ALLOWED_VAULT_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      error: `Unsupported file type "${ext}". Supported formats: PDF (.pdf), Word (.doc, .docx), Excel/Sheets (.xls, .xlsx, .csv), and Images (.png, .jpg, .jpeg, .webp).`,
    };
  }

  // 2. Binary signature / Magic Byte validation
  if (ext === '.pdf') {
    if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return {
        isValid: false,
        error: 'File signature verification failed: Uploaded file is not a valid PDF document (magic bytes missing).',
      };
    }
  } else if (ext === '.png') {
    const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const isPng = buffer.length >= 8 && pngHeader.every((b, i) => buffer[i] === b);
    if (!isPng) {
      return {
        isValid: false,
        error: 'File signature verification failed: Uploaded file does not contain a valid PNG image header.',
      };
    }
  } else if (ext === '.jpg' || ext === '.jpeg') {
    const isJpg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!isJpg) {
      return {
        isValid: false,
        error: 'File signature verification failed: Uploaded file does not contain a valid JPEG image header.',
      };
    }
  } else if (ext === '.webp') {
    const isWebp =
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!isWebp) {
      return {
        isValid: false,
        error: 'File signature verification failed: Uploaded file does not contain a valid WEBP image header.',
      };
    }
  } else if (ext === '.docx' || ext === '.xlsx') {
    // Office Open XML (PKZip container)
    const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    if (!isZip) {
      return {
        isValid: false,
        error: `File signature verification failed: Uploaded file does not contain a valid ${ext.toUpperCase().slice(1)} OpenXML archive header.`,
      };
    }
  } else if (ext === '.doc' || ext === '.xls') {
    // Legacy Microsoft Compound File Binary (OLE2)
    const oleHeader = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    const isOle = buffer.length >= 8 && oleHeader.every((b, i) => buffer[i] === b);
    if (!isOle) {
      return {
        isValid: false,
        error: `File signature verification failed: Uploaded file does not contain a valid legacy ${ext.toUpperCase().slice(1)} binary signature.`,
      };
    }
  } else if (ext === '.csv') {
    // Plain text / CSV check (no null bytes in first 1024 bytes)
    const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
    if (sample.includes(0x00)) {
      return {
        isValid: false,
        error: 'File signature verification failed: CSV files must be text-encoded and cannot contain null binary bytes.',
      };
    }
  }

  const detectedMime = getMimeType(originalFilename);
  return { isValid: true, detectedMime, extension: ext };
}

/**
 * Backward compatibility alias for validateVaultFileBuffer with PDF
 */
export function validatePdfBuffer(buffer) {
  return validateVaultFileBuffer(buffer, 'document.pdf');
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
 * Generate standardized server-side filename with preserved extension:
 * e.g. ZEN-NDA-2026-0012_Acme-Technologies_2026-10-23.pdf
 * or   ZEN-DOC-2026-0014_Acme-Labs_2026-10-23.docx
 */
export function generatePrivateDocumentFilename({
  documentReference,
  companyName,
  dateIso = new Date().toISOString().split('T')[0],
  version = 1,
  originalFilename = '',
}) {
  const cleanRef = sanitizeFilenamePart(documentReference, 30);
  const cleanCompany = sanitizeFilenamePart(companyName, 40);
  const vSuffix = version > 1 ? `_v${version}` : '';
  const rawExt = originalFilename ? path.extname(originalFilename).toLowerCase() : '.pdf';
  const ext = ALLOWED_VAULT_EXTENSIONS.includes(rawExt) ? rawExt : '.pdf';
  return `${cleanRef}_${cleanCompany}_${dateIso}${vSuffix}${ext}`;
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
    mimeType,
  }) => {
    const category = getPrivateFolderCategory(documentType);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    let targetFolderHierarchy = `Zenemoo Private Documents/${category}/${year}/${String(currentMonth).padStart(2, '0')}`;
    const base64Data = buffer.toString('base64');
    const fileSize = buffer.length;
    const checksum = computeSha256(buffer);
    const effectiveMime = mimeType || getMimeType(storedFilename, 'application/pdf');

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
          mimeType: effectiveMime,
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
