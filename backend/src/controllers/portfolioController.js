import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cloudinaryService } from '../services/cloudinaryService.js';
import { supabase } from '../config/supabase.js';

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

const EXPLICIT_COLUMNS =
  'id, title, filename, original_filename, file_size_bytes, file_size_formatted, public_url, storage_public_id, storage_provider, version, is_published, page_count, uploaded_by, created_at, updated_at';

// In-Memory Public Cache (15-Minute TTL for zero database egress on repeated visits)
let portfolioCache = {
  data: undefined,
  timestamp: 0,
};
const PORTFOLIO_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export const invalidatePortfolioCache = () => {
  portfolioCache = { data: undefined, timestamp: 0 };
};

// Disk persistence helpers to survive server restarts/idle cold boots on Render
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
    console.warn('Error reading active_portfolio.json persistent file:', e.message);
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
        JSON.stringify({ is_published: false, public_url: null, filename: null }, null, 2),
        'utf-8'
      );
    }
  } catch (e) {
    console.warn('Error writing active_portfolio.json persistent file:', e.message);
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
 * GET /api/portfolio
 * Public endpoint to fetch currently active and published company portfolio metadata.
 * NEVER proxies the PDF file itself. NEVER returns 404.
 */
export const getPortfolio = async (req, res) => {
  try {
    const now = Date.now();
    // 1. Return in-memory cache if valid (0 Supabase egress)
    if (portfolioCache.data !== undefined && now - portfolioCache.timestamp < PORTFOLIO_CACHE_TTL) {
      return res.status(200).json({
        success: true,
        data: portfolioCache.data,
        cached: true,
      });
    }

    let activeRecord = null;
    let dbSuccess = false;

    // 2. Query Supabase using strictly explicit columns (NO SELECT *)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('company_portfolio')
          .select(EXPLICIT_COLUMNS)
          .eq('is_published', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error) {
          dbSuccess = true;
          activeRecord = data;
        } else {
          // If table does not exist yet, fallback to site_branding table check
          const { data: brandData, error: brandErr } = await supabase
            .from('site_branding')
            .select('id, asset_type, asset_name, cloudinary_public_id, cloudinary_secure_url, bytes, is_active, created_at, updated_at')
            .eq('asset_type', 'company_portfolio')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (!brandErr && brandData) {
            dbSuccess = true;
            activeRecord = {
              id: brandData.id,
              title: brandData.asset_name || 'Zenemoo Company Portfolio',
              filename: 'zenemoo-company-portfolio.pdf',
              original_filename: 'zenemoo-company-portfolio.pdf',
              file_size_bytes: brandData.bytes || 0,
              file_size_formatted: formatBytes(brandData.bytes),
              public_url: brandData.cloudinary_secure_url,
              storage_public_id: brandData.cloudinary_public_id,
              storage_provider: 'cloudinary',
              version: 'v1',
              is_published: true,
              page_count: 0,
              uploaded_by: 'admin',
              created_at: brandData.created_at,
              updated_at: brandData.updated_at,
            };
          }
        }
      } catch (dbErr) {
        console.warn('Supabase portfolio select warning:', dbErr.message);
      }
    }

    // 3. If database returned active published record
    if (activeRecord && activeRecord.public_url) {
      const payload = {
        id: activeRecord.id,
        title: activeRecord.title || 'Zenemoo Official Company Portfolio',
        filename: activeRecord.filename || 'zenemoo-company-portfolio.pdf',
        original_filename: activeRecord.original_filename || 'zenemoo-company-portfolio.pdf',
        file_size_bytes: activeRecord.file_size_bytes || 0,
        file_size_formatted: activeRecord.file_size_formatted || formatBytes(activeRecord.file_size_bytes),
        public_url: activeRecord.public_url,
        storage_public_id: activeRecord.storage_public_id,
        storage_provider: activeRecord.storage_provider || 'cloudinary',
        version: activeRecord.version || 'v1',
        is_published: true,
        page_count: activeRecord.page_count || 0,
        uploaded_by: activeRecord.uploaded_by || 'admin',
        created_at: activeRecord.created_at || new Date().toISOString(),
        updated_at: activeRecord.updated_at || new Date().toISOString(),
      };

      inMemoryActivePortfolio = payload;
      saveDiskActivePortfolio(payload);
      portfolioCache = { data: payload, timestamp: Date.now() };
      return res.status(200).json({ success: true, data: payload });
    }

    // 4. If database query succeeded and NO published record exists, it means portfolio is unpublished or deleted
    if (dbSuccess && !activeRecord) {
      inMemoryActivePortfolio = null;
      saveDiskActivePortfolio(null);
      portfolioCache = { data: null, timestamp: Date.now() };
      return res.status(200).json({ success: true, data: null });
    }

    // 5. Fallback to disk snapshot if DB is temporarily unreachable
    const diskFallback = inMemoryActivePortfolio || loadDiskActivePortfolio();
    if (diskFallback && diskFallback.is_published && diskFallback.public_url) {
      portfolioCache = { data: diskFallback, timestamp: Date.now() };
      return res.status(200).json({ success: true, data: diskFallback });
    }

    portfolioCache = { data: null, timestamp: Date.now() };
    return res.status(200).json({ success: true, data: null });
  } catch (err) {
    console.error('getPortfolio Server Error:', err.message);
    return res.status(200).json({ success: true, data: null });
  }
};

/**
 * GET /api/portfolio/admin
 * Admin endpoint to fetch current portfolio regardless of published state.
 */
export const getAdminPortfolio = async (req, res) => {
  try {
    let activeRecord = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('company_portfolio')
          .select(EXPLICIT_COLUMNS)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          activeRecord = data;
        } else {
          const { data: brandData } = await supabase
            .from('site_branding')
            .select('id, asset_type, asset_name, cloudinary_public_id, cloudinary_secure_url, bytes, is_active, created_at, updated_at')
            .eq('asset_type', 'company_portfolio')
            .limit(1)
            .maybeSingle();

          if (brandData) {
            activeRecord = {
              id: brandData.id,
              title: brandData.asset_name || 'Zenemoo Company Portfolio',
              filename: 'zenemoo-company-portfolio.pdf',
              original_filename: 'zenemoo-company-portfolio.pdf',
              file_size_bytes: brandData.bytes || 0,
              file_size_formatted: formatBytes(brandData.bytes),
              public_url: brandData.cloudinary_secure_url,
              storage_public_id: brandData.cloudinary_public_id,
              storage_provider: 'cloudinary',
              version: 'v1',
              is_published: brandData.is_active === true,
              page_count: 0,
              uploaded_by: 'admin',
              created_at: brandData.created_at,
              updated_at: brandData.updated_at,
            };
          }
        }
      } catch (dbErr) {
        console.warn('Supabase getAdminPortfolio select warning:', dbErr.message);
      }
    }

    if (activeRecord) {
      return res.status(200).json({ success: true, data: activeRecord });
    }

    const diskFallback = inMemoryActivePortfolio || loadDiskActivePortfolio();
    return res.status(200).json({ success: true, data: diskFallback || null });
  } catch (err) {
    console.error('getAdminPortfolio Server Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin portfolio metadata.' });
  }
};

/**
 * POST /api/portfolio/upload (also handles PUT /api/portfolio)
 * Safe upload/replace flow:
 * 1. Upload new PDF to Cloudinary under folder zenemoo/company/portfolio
 * 2. Verify Cloudinary returns valid secure URL & bytes
 * 3. Update Supabase metadata record
 * 4. Invalidate cache
 * 5. Safely delete previous Cloudinary raw asset
 */
export const uploadOrReplacePortfolio = async (req, res) => {
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

    // Step 1: Check and remember existing active storage_public_id for safe cleanup later
    let oldStoragePublicId = null;
    if (supabase) {
      try {
        const { data: current } = await supabase
          .from('company_portfolio')
          .select('storage_public_id')
          .limit(1)
          .maybeSingle();

        if (current && current.storage_public_id) {
          oldStoragePublicId = current.storage_public_id;
        } else {
          const { data: brandCurrent } = await supabase
            .from('site_branding')
            .select('cloudinary_public_id')
            .eq('asset_type', 'company_portfolio')
            .limit(1)
            .maybeSingle();
          if (brandCurrent) oldStoragePublicId = brandCurrent.cloudinary_public_id;
        }
      } catch (e) {}
    }

    // Step 2: Upload new PDF to Cloudinary as RAW asset
    const timestamp = Date.now();
    const folder = 'zenemoo/company/portfolio';
    const customPublicId = `${folder}/zenemoo-company-portfolio-${timestamp}`;

    const cloudinaryRes = await cloudinaryService.uploadStream(req.file.buffer, folder, {
      public_id: customPublicId,
      resource_type: 'raw',
    });

    if (!cloudinaryRes || !cloudinaryRes.secure_url) {
      throw new Error('Cloudinary upload did not return a valid secure URL.');
    }

    const title = req.body?.title || 'Zenemoo Official Company Portfolio';
    const originalFilename = req.file.originalname || 'zenemoo-company-portfolio.pdf';
    const filename = `zenemoo-company-portfolio-${timestamp}.pdf`;
    const fileSizeFormatted = formatBytes(cloudinaryRes.bytes || req.file.size);

    const metadataPayload = {
      title,
      filename,
      original_filename: originalFilename,
      file_size_bytes: cloudinaryRes.bytes || req.file.size,
      file_size_formatted: fileSizeFormatted,
      public_url: cloudinaryRes.secure_url,
      storage_public_id: cloudinaryRes.public_id,
      storage_provider: 'cloudinary',
      version: String(timestamp),
      is_published: true,
      page_count: req.body?.page_count ? parseInt(req.body.page_count, 10) : 0,
      uploaded_by: req.user?.email || 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Step 3: Insert / Update Database Record
    let savedRecord = null;
    if (supabase) {
      try {
        // Deactivate older portfolio records
        await supabase
          .from('company_portfolio')
          .update({ is_published: false, updated_at: new Date().toISOString() })
          .neq('id', '00000000-0000-0000-0000-000000000000');

        const { data, error } = await supabase
          .from('company_portfolio')
          .insert([metadataPayload])
          .select(EXPLICIT_COLUMNS)
          .maybeSingle();

        if (!error && data) {
          savedRecord = data;
        } else {
          // Fallback to site_branding table
          await supabase
            .from('site_branding')
            .update({ is_active: false })
            .eq('asset_type', 'company_portfolio');

          await supabase.from('site_branding').insert([
            {
              asset_type: 'company_portfolio',
              asset_name: title,
              cloudinary_public_id: cloudinaryRes.public_id,
              cloudinary_secure_url: cloudinaryRes.secure_url,
              resource_type: 'raw',
              format: 'pdf',
              bytes: cloudinaryRes.bytes || req.file.size,
              version: String(timestamp),
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              updated_by: req.user?.email || 'admin',
            },
          ]);
        }
      } catch (dbErr) {
        console.warn('Supabase company_portfolio save warning:', dbErr.message);
      }
    }

    const responseData = savedRecord || {
      id: `portfolio_${timestamp}`,
      ...metadataPayload,
    };

    // Step 4: Update in-memory cache and disk persistence snapshot
    inMemoryActivePortfolio = responseData;
    saveDiskActivePortfolio(responseData);
    invalidatePortfolioCache();

    // Step 5: Safe post-cleanup: delete previous Cloudinary asset ONLY after success
    if (oldStoragePublicId && oldStoragePublicId !== cloudinaryRes.public_id) {
      try {
        await cloudinaryService.deleteMedia(oldStoragePublicId, { resource_type: 'raw' });
      } catch (delErr) {
        console.warn('Cloudinary previous asset cleanup note:', delErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Company portfolio PDF uploaded and published successfully.',
      data: responseData,
    });
  } catch (err) {
    console.error('uploadOrReplacePortfolio Server Error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to upload and activate company portfolio PDF.',
    });
  }
};

/**
 * DELETE /api/portfolio
 * Removes active portfolio from publication and cleans up Cloudinary asset.
 */
export const deletePortfolio = async (req, res) => {
  try {
    let storagePublicIdToDelete = null;

    if (supabase) {
      try {
        const { data } = await supabase
          .from('company_portfolio')
          .select('id, storage_public_id')
          .limit(1)
          .maybeSingle();

        if (data) {
          storagePublicIdToDelete = data.storage_public_id;
          await supabase.from('company_portfolio').delete().eq('id', data.id);
        } else {
          const { data: brandData } = await supabase
            .from('site_branding')
            .select('id, cloudinary_public_id')
            .eq('asset_type', 'company_portfolio');

          if (Array.isArray(brandData)) {
            for (const r of brandData) {
              if (r.cloudinary_public_id) storagePublicIdToDelete = r.cloudinary_public_id;
              await supabase.from('site_branding').delete().eq('id', r.id);
            }
          }
        }
      } catch (dbErr) {
        console.warn('Supabase portfolio delete warning:', dbErr.message);
      }
    }

    // Safely destroy Cloudinary raw asset
    if (storagePublicIdToDelete) {
      try {
        await cloudinaryService.deleteMedia(storagePublicIdToDelete, { resource_type: 'raw' });
      } catch (cErr) {
        console.warn('Cloudinary raw asset delete note:', cErr.message);
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
    console.error('deletePortfolio Server Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to delete company portfolio. Please try again.',
    });
  }
};

/**
 * PATCH /api/portfolio/status
 * Toggle is_published status
 */
export const togglePortfolioStatus = async (req, res) => {
  try {
    const isPublished = Boolean(req.body?.is_published ?? req.body?.isPublished);

    if (supabase) {
      try {
        await supabase
          .from('company_portfolio')
          .update({ is_published: isPublished, updated_at: new Date().toISOString() })
          .neq('id', '00000000-0000-0000-0000-000000000000');

        await supabase
          .from('site_branding')
          .update({ is_active: isPublished, updated_at: new Date().toISOString() })
          .eq('asset_type', 'company_portfolio');
      } catch (dbErr) {
        console.warn('Supabase togglePortfolioStatus warning:', dbErr.message);
      }
    }

    if (inMemoryActivePortfolio) {
      inMemoryActivePortfolio.is_published = isPublished;
      saveDiskActivePortfolio(inMemoryActivePortfolio);
    }

    invalidatePortfolioCache();

    return res.status(200).json({
      success: true,
      message: `Portfolio is now ${isPublished ? 'Published' : 'Unpublished'}.`,
      is_published: isPublished,
    });
  } catch (err) {
    console.error('togglePortfolioStatus Server Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update portfolio publication status.',
    });
  }
};
