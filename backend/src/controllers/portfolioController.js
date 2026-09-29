import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { r2Service } from '../services/r2Service.js';
import { d1Service } from '../services/d1Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERSISTENT_FILE_PATH = path.join(__dirname, '../database/active_portfolio.json');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf',
];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

// In-Memory Public Cache (15-Minute TTL for zero database egress on repeated visits)
let portfolioCache = {
  data: undefined,
  timestamp: 0,
};
const PORTFOLIO_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export const invalidatePortfolioCache = () => {
  portfolioCache = { data: undefined, timestamp: 0 };
};

// Disk persistence helpers for resilience across server restarts
const loadDiskActivePortfolio = () => {
  try {
    if (fs.existsSync(PERSISTENT_FILE_PATH)) {
      const data = fs.readFileSync(PERSISTENT_FILE_PATH, 'utf-8');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && (parsed.public_url || parsed.url)) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('[Portfolio] Error reading active_portfolio.json persistent file:', e.message);
  }
  return null;
};

const saveDiskActivePortfolio = (payload) => {
  try {
    const dir = path.dirname(PERSISTENT_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (payload && (payload.public_url || payload.url)) {
      fs.writeFileSync(PERSISTENT_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    } else {
      fs.writeFileSync(
        PERSISTENT_FILE_PATH,
        JSON.stringify({ is_published: false, status: 'deleted', public_url: null, filename: null }, null, 2),
        'utf-8'
      );
    }
  } catch (e) {
    console.warn('[Portfolio] Error writing active_portfolio.json persistent file:', e.message);
  }
};

let inMemoryActivePortfolio = loadDiskActivePortfolio();

/**
 * Format bytes to readable size string
 */
const formatBytes = (bytes) => {
  if (!bytes || isNaN(bytes)) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
};

/**
 * Transforms D1 row to canonical API response payload
 */
const formatPortfolioRecord = (record) => {
  if (!record || record.status === 'deleted') return null;

  const fileSize = Number(record.file_size_bytes) || 0;
  const isPublished = record.status === 'active';

  return {
    id: record.id || 'company_portfolio_main',
    title: 'Zenemoo Official Company Portfolio',
    filename: record.filename || 'zenemoo-company-portfolio.pdf',
    original_filename: record.filename || 'zenemoo-company-portfolio.pdf',
    file_size_bytes: fileSize,
    file_size_formatted: formatBytes(fileSize),
    public_url: record.public_url,
    r2_key: record.r2_key,
    storage_provider: 'cloudflare_r2',
    is_published: isPublished,
    status: record.status || 'active',
    page_count: Number(record.page_count) || 0,
    last_action: record.last_action || 'uploaded',
    created_at: record.created_at || new Date().toISOString(),
    updated_at: record.updated_at || new Date().toISOString(),
    deleted_at: record.deleted_at || null,
    deleted_by: record.deleted_by || null,
  };
};

/**
 * GET /api/portfolio
 * Public endpoint to fetch currently active company portfolio metadata.
 * Streams metadata only (< 1KB). Public visitor streams PDF directly from Cloudflare R2/CDN.
 * NEVER proxies the PDF file itself. NEVER returns 404.
 */
export const getPortfolio = async (req, res) => {
  try {
    const now = Date.now();
    // 1. Return in-memory cache if valid (0 D1 / 0 R2 egress)
    if (portfolioCache.data !== undefined && now - portfolioCache.timestamp < PORTFOLIO_CACHE_TTL) {
      return res.status(200).json({
        success: true,
        data: portfolioCache.data,
        cached: true,
      });
    }

    let activeRecord = null;
    let d1Attempted = false;

    // 2. Query Cloudflare D1
    if (d1Service.isConfigured()) {
      try {
        d1Attempted = true;
        const d1Row = await d1Service.getActivePortfolio();
        if (d1Row && d1Row.status === 'active' && d1Row.public_url) {
          activeRecord = formatPortfolioRecord(d1Row);
        }
      } catch (d1Err) {
        console.warn('[Portfolio] D1 select notice:', d1Err.message);
      }
    }

    // 3. If active record found in D1
    if (activeRecord) {
      inMemoryActivePortfolio = activeRecord;
      saveDiskActivePortfolio(activeRecord);
      portfolioCache = { data: activeRecord, timestamp: Date.now() };
      return res.status(200).json({ success: true, data: activeRecord });
    }

    // 4. If D1 succeeded and confirmed no active record exists
    if (d1Attempted && !activeRecord) {
      inMemoryActivePortfolio = null;
      saveDiskActivePortfolio(null);
      portfolioCache = { data: null, timestamp: Date.now() };
      return res.status(200).json({ success: true, data: null });
    }

    // 5. Fallback to local snapshot if D1 is temporarily unconfigured or unreachable
    const diskFallback = inMemoryActivePortfolio || loadDiskActivePortfolio();
    if (diskFallback && (diskFallback.is_published || diskFallback.status === 'active') && diskFallback.public_url) {
      portfolioCache = { data: diskFallback, timestamp: Date.now() };
      return res.status(200).json({ success: true, data: diskFallback });
    }

    portfolioCache = { data: null, timestamp: Date.now() };
    return res.status(200).json({ success: true, data: null });
  } catch (err) {
    console.error('[Portfolio] getPortfolio Server Error:', err.message);
    return res.status(200).json({ success: true, data: null });
  }
};

/**
 * GET /api/portfolio/admin
 * Admin endpoint to fetch current portfolio regardless of published/deleted state.
 */
export const getAdminPortfolio = async (req, res) => {
  try {
    let currentRecord = null;

    if (d1Service.isConfigured()) {
      try {
        const d1Row = await d1Service.getAdminPortfolio();
        if (d1Row) {
          currentRecord = {
            id: d1Row.id || 'company_portfolio_main',
            title: 'Zenemoo Official Company Portfolio',
            filename: d1Row.filename,
            original_filename: d1Row.filename,
            file_size_bytes: Number(d1Row.file_size_bytes) || 0,
            file_size_formatted: formatBytes(d1Row.file_size_bytes),
            public_url: d1Row.public_url,
            r2_key: d1Row.r2_key,
            storage_provider: 'cloudflare_r2',
            is_published: d1Row.status === 'active',
            status: d1Row.status,
            page_count: Number(d1Row.page_count) || 0,
            last_action: d1Row.last_action,
            created_at: d1Row.created_at,
            updated_at: d1Row.updated_at,
            deleted_at: d1Row.deleted_at,
            deleted_by: d1Row.deleted_by,
          };
        }
      } catch (d1Err) {
        console.warn('[Portfolio] D1 getAdminPortfolio warning:', d1Err.message);
      }
    }

    if (currentRecord) {
      return res.status(200).json({ success: true, data: currentRecord });
    }

    const diskFallback = inMemoryActivePortfolio || loadDiskActivePortfolio();
    return res.status(200).json({ success: true, data: diskFallback || null });
  } catch (err) {
    console.error('[Portfolio] getAdminPortfolio Server Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin portfolio metadata.' });
  }
};

/**
 * POST /api/portfolio/upload (also handles PUT /api/portfolio)
 * Safe Atomic Upload / Replace Flow:
 * 1. Validate MIME type (application/pdf) & size <= 15MB
 * 2. Generate unique R2 key: company/portfolio/zenemoo-company-portfolio-${timestamp}.pdf
 * 3. Upload buffer to Cloudflare R2 bucket
 * 4. Verify new R2 object exists & byte length matches
 * 5. Query existing D1 row to capture old r2_key
 * 6. Update single D1 row (status = 'active', last_action = 'uploaded' / 'replaced')
 * 7. ONLY after successful D1 update: delete old R2 object
 * 8. Invalidate in-memory cache and update disk snapshot
 */
export const uploadOrReplacePortfolio = async (req, res) => {
  let uploadedR2Key = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a PDF file to upload (maximum 15 MB).',
      });
    }

    const fileMime = (req.file.mimetype || '').toLowerCase();
    const extMatch = req.file.originalname.match(/\.([a-zA-Z0-9]+)$/);
    const fileExt = extMatch ? extMatch[1].toLowerCase() : '';

    if (fileExt !== 'pdf' && !ALLOWED_MIME_TYPES.includes(fileMime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Only PDF files (.pdf) are accepted.',
      });
    }

    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'File exceeds maximum limit of 15 MB.',
      });
    }

    // Step 1: Check existing D1 row to know if this is a fresh upload or a replacement
    let oldR2Key = null;
    let isReplacement = false;

    if (d1Service.isConfigured()) {
      try {
        const existing = await d1Service.getAdminPortfolio();
        if (existing && existing.r2_key && existing.status === 'active') {
          oldR2Key = existing.r2_key;
          isReplacement = true;
        }
      } catch (e) {
        console.warn('[Portfolio] Existing D1 check note:', e.message);
      }
    }

    // Step 2: Generate unique server-side R2 key
    const timestamp = Date.now();
    const r2Key = `company/portfolio/zenemoo-company-portfolio-${timestamp}.pdf`;
    uploadedR2Key = r2Key;

    // Step 3: Upload buffer to Cloudflare R2
    const r2UploadRes = await r2Service.uploadObject({
      buffer: req.file.buffer,
      key: r2Key,
      contentType: 'application/pdf',
    });

    if (!r2UploadRes || !r2UploadRes.publicUrl) {
      throw new Error('Cloudflare R2 upload did not return a valid public URL.');
    }

    // Step 4: Verify uploaded R2 object exists and byte size matches
    const verification = await r2Service.verifyObjectExists(r2Key);
    if (!verification.exists || verification.contentLength !== req.file.size) {
      throw new Error('Cloudflare R2 object verification failed after upload.');
    }

    const filename = req.file.originalname || `zenemoo-company-portfolio-${timestamp}.pdf`;
    const lastAction = isReplacement ? 'replaced' : 'uploaded';
    const pageCount = req.body?.page_count ? parseInt(req.body.page_count, 10) : 0;

    // Step 5: Upsert D1 record in single-row architecture
    let savedRow = null;
    if (d1Service.isConfigured()) {
      try {
        savedRow = await d1Service.upsertPortfolio({
          filename,
          r2Key,
          publicUrl: r2UploadRes.publicUrl,
          fileSizeBytes: req.file.size,
          pageCount,
          lastAction,
        });
      } catch (d1Err) {
        console.error('[Portfolio] D1 upsert error, rolling back newly uploaded R2 object:', d1Err.message);
        // Clean up newly uploaded object to prevent orphaned storage
        await r2Service.deleteObject(r2Key);
        throw new Error(`Failed to update portfolio metadata in D1: ${d1Err.message}`);
      }
    }

    const responsePayload = formatPortfolioRecord(savedRow) || {
      id: 'company_portfolio_main',
      title: 'Zenemoo Official Company Portfolio',
      filename,
      original_filename: filename,
      file_size_bytes: req.file.size,
      file_size_formatted: formatBytes(req.file.size),
      public_url: r2UploadRes.publicUrl,
      r2_key: r2Key,
      storage_provider: 'cloudflare_r2',
      is_published: true,
      status: 'active',
      page_count: pageCount,
      last_action: lastAction,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      deleted_by: null,
    };

    // Step 6: Update cache and disk snapshot
    inMemoryActivePortfolio = responsePayload;
    saveDiskActivePortfolio(responsePayload);
    invalidatePortfolioCache();

    // Step 7: Safely delete previous R2 object only AFTER new upload and D1 update succeeded
    if (oldR2Key && oldR2Key !== r2Key) {
      try {
        await r2Service.deleteObject(oldR2Key);
      } catch (delErr) {
        console.warn('[Portfolio] Previous R2 object cleanup note (non-critical):', delErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Company portfolio PDF ${isReplacement ? 'replaced' : 'uploaded'} and published successfully.`,
      data: responsePayload,
    });
  } catch (err) {
    console.error('[Portfolio] uploadOrReplacePortfolio Server Error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to upload and activate company portfolio PDF in Cloudflare R2.',
    });
  }
};

/**
 * DELETE /api/portfolio
 * Soft-deletes portfolio in D1 (retains record with status='deleted') and destroys R2 PDF binary.
 */
export const deletePortfolio = async (req, res) => {
  try {
    let r2KeyToDelete = null;

    if (d1Service.isConfigured()) {
      try {
        const current = await d1Service.getAdminPortfolio();
        if (current && current.r2_key) {
          r2KeyToDelete = current.r2_key;
        }

        const adminEmail = req.user?.email || 'admin@zenemoo.in';
        await d1Service.markDeleted({ adminEmail });
      } catch (d1Err) {
        console.warn('[Portfolio] D1 delete record note:', d1Err.message);
      }
    }

    // Step 2: Delete actual PDF binary from Cloudflare R2
    if (r2KeyToDelete) {
      try {
        await r2Service.deleteObject(r2KeyToDelete);
      } catch (r2Err) {
        console.warn('[Portfolio] R2 object deletion warning:', r2Err.message);
      }
    }

    inMemoryActivePortfolio = null;
    saveDiskActivePortfolio(null);
    invalidatePortfolioCache();

    return res.status(200).json({
      success: true,
      message: 'Company portfolio removed successfully from public website.',
      data: null,
    });
  } catch (err) {
    console.error('[Portfolio] deletePortfolio Server Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to delete company portfolio. Please try again.',
    });
  }
};

/**
 * PATCH /api/portfolio/status
 * Toggle publish / unpublish status in D1
 */
export const togglePortfolioStatus = async (req, res) => {
  try {
    const isPublished = Boolean(req.body?.is_published ?? req.body?.isPublished);
    const nextStatus = isPublished ? 'active' : 'deleted';

    if (d1Service.isConfigured()) {
      try {
        await d1Service.updateStatus(nextStatus);
      } catch (d1Err) {
        console.warn('[Portfolio] D1 toggle status warning:', d1Err.message);
      }
    }

    if (inMemoryActivePortfolio) {
      inMemoryActivePortfolio.is_published = isPublished;
      inMemoryActivePortfolio.status = nextStatus;
      saveDiskActivePortfolio(inMemoryActivePortfolio);
    }

    invalidatePortfolioCache();

    return res.status(200).json({
      success: true,
      message: `Portfolio is now ${isPublished ? 'Published' : 'Unpublished'}.`,
      is_published: isPublished,
      status: nextStatus,
    });
  } catch (err) {
    console.error('[Portfolio] togglePortfolioStatus Server Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update portfolio publication status.',
    });
  }
};
