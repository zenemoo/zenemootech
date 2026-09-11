import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cloudinaryService } from '../services/cloudinaryService.js';
import { supabaseService } from '../services/supabaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERSISTENT_FILE_PATH = path.join(__dirname, '../database/active_logo.json');

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const DEFAULT_LOGO_PAYLOAD = {
  id: 'default_brandmark',
  url: '/assets/logo.png',
  secure_url: '/assets/logo.png',
  publicId: '',
  cloudinary_public_id: '',
  altText: 'Zenemoo official site logo',
  title: 'Zenemoo Official Logo',
  seo_filename: 'zenemoo-official-logo.png',
  original_filename: 'logo.png',
  format: 'png',
  width: 512,
  height: 512,
  fileSize: '15.4 KB',
  isActive: false,
  isDefault: true,
  updated_at: new Date().toISOString(),
};

// Disk persistence helpers to survive server restarts/idle reboots
const loadDiskActiveLogo = () => {
  try {
    if (fs.existsSync(PERSISTENT_FILE_PATH)) {
      const data = fs.readFileSync(PERSISTENT_FILE_PATH, 'utf-8');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.isActive === true && (parsed.url || parsed.secure_url) && !parsed.isDefault) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading active_logo.json persistent file:', e.message);
  }
  return null;
};

const saveDiskActiveLogo = (payload) => {
  try {
    const dir = path.dirname(PERSISTENT_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (payload && payload.isActive === true && (payload.url || payload.secure_url) && !payload.isDefault) {
      fs.writeFileSync(PERSISTENT_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    } else {
      fs.writeFileSync(
        PERSISTENT_FILE_PATH,
        JSON.stringify({ isActive: false, isDefault: true, url: null, secure_url: null, publicId: null }, null, 2),
        'utf-8'
      );
    }
  } catch (e) {
    console.warn('Error writing active_logo.json persistent file:', e.message);
  }
};

// In-Memory Public Cache (30-Minute TTL)
let activeLogoCache = {
  data: undefined,
  timestamp: 0,
};
const BRANDING_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const invalidateBrandingCache = () => {
  activeLogoCache = { data: undefined, timestamp: 0 };
};

// In-memory active logo state initialized from disk fallback
let inMemoryActiveLogo = loadDiskActiveLogo();

/**
 * GET /api/branding/active, /branding/active, /api/branding/logo, /branding/logo, /api/branding, /branding
 * MUST NEVER RETURN 404! Returns active logo payload or default null data.
 */
export const getActiveLogo = async (req, res) => {
  try {
    const now = Date.now();
    if (activeLogoCache.data !== undefined && now - activeLogoCache.timestamp < BRANDING_CACHE_TTL) {
      return res.status(200).json({
        success: true,
        data: activeLogoCache.data,
        defaultFallback: DEFAULT_LOGO_PAYLOAD,
        cached: true,
      });
    }

    let activeRecord = null;
    let dbSuccess = false;

    try {
      const records = await supabaseService.selectAll('site_branding', 'updated_at', false);
      dbSuccess = true;
      if (Array.isArray(records) && records.length > 0) {
        activeRecord = records.find((r) => r.asset_type === 'site_logo' && (r.is_active === true || r.is_active === 'true')) || null;
      }
    } catch (dbErr) {
      console.warn('Supabase site_branding select warning:', dbErr.message);
    }

    // 1. If active record exists in database
    if (activeRecord && (activeRecord.cloudinary_secure_url || activeRecord.url)) {
      const secureUrl = activeRecord.cloudinary_secure_url || activeRecord.url;
      const pubId = activeRecord.cloudinary_public_id || activeRecord.public_id || '';
      const formattedSize = activeRecord.bytes ? (activeRecord.bytes / 1024).toFixed(1) + ' KB' : activeRecord.fileSize || 'N/A';

      const payload = {
        id: activeRecord.id,
        url: secureUrl,
        secure_url: secureUrl,
        publicId: pubId,
        cloudinary_public_id: pubId,
        altText: activeRecord.alt_text || activeRecord.altText || 'Zenemoo official site logo',
        title: activeRecord.title || 'Zenemoo Official Logo',
        seo_filename: activeRecord.seo_filename || 'zenemoo-official-logo.png',
        original_filename: activeRecord.original_filename || 'logo.png',
        format: activeRecord.format || 'png',
        width: activeRecord.width || 0,
        height: activeRecord.height || 0,
        fileSize: formattedSize,
        isActive: true,
        isDefault: false,
        created_at: activeRecord.created_at || new Date().toISOString(),
        updated_at: activeRecord.updated_at || new Date().toISOString(),
      };

      inMemoryActiveLogo = payload;
      saveDiskActiveLogo(payload);
      activeLogoCache = { data: payload, timestamp: Date.now() };
      return res.status(200).json({ success: true, data: payload });
    }

    // 2. If database query succeeded and NO active record was found, it means logo was DELETED/REMOVED
    if (dbSuccess && !activeRecord) {
      inMemoryActiveLogo = null;
      saveDiskActiveLogo(null);
      activeLogoCache = { data: null, timestamp: Date.now() };
      return res.status(200).json({
        success: true,
        data: null,
        defaultFallback: DEFAULT_LOGO_PAYLOAD,
      });
    }

    // 3. Fall back to memory / disk file payload ONLY if DB was unreachable AND disk file is active
    const diskFallback = inMemoryActiveLogo || loadDiskActiveLogo();
    if (diskFallback && diskFallback.isActive === true && (diskFallback.url || diskFallback.secure_url)) {
      inMemoryActiveLogo = diskFallback;
      activeLogoCache = { data: diskFallback, timestamp: Date.now() };
      return res.status(200).json({ success: true, data: diskFallback });
    }

    activeLogoCache = { data: null, timestamp: Date.now() };
    return res.status(200).json({
      success: true,
      data: null,
      defaultFallback: DEFAULT_LOGO_PAYLOAD,
    });
  } catch (err) {
    console.error('getActiveLogo Server Error:', err.message);
    return res.status(200).json({
      success: true,
      data: null,
      defaultFallback: DEFAULT_LOGO_PAYLOAD,
    });
  }
};

/**
 * POST /api/branding/logo or PUT /api/branding/logo
 * Upload file OR save by Direct URL
 */
export const uploadOrReplaceLogo = async (req, res) => {
  try {
    const directUrlInput = req.body?.url || req.body?.image_url || req.body?.cloudinary_secure_url;

    // Helper to deactivate/delete previous records in Supabase
    const cleanupPreviousLogos = async () => {
      try {
        const records = await supabaseService.selectAll('site_branding', 'created_at', false);
        if (Array.isArray(records)) {
          for (const r of records) {
            if (r.asset_type === 'site_logo') {
              if (r.is_active || r.is_active === 'true') {
                await supabaseService.update('site_branding', r.id, { is_active: false, updated_at: new Date().toISOString() });
              }
            }
          }
        }
      } catch (e) {
        console.warn('Warning cleaning up previous branding records:', e.message);
      }
    };

    // Case 1: Uploading via File
    if (req.file) {
      const fileMime = (req.file.mimetype || '').toLowerCase();
      const extMatch = req.file.originalname.match(/\.([a-zA-Z0-9]+)$/);
      const fileExt = extMatch ? extMatch[1].toLowerCase() : '';

      if (!ALLOWED_MIME_TYPES.includes(fileMime) || !ALLOWED_EXTENSIONS.includes(fileExt)) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a PNG, JPG, WEBP or supported SVG image under 5 MB.',
        });
      }

      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a PNG, JPG, WEBP or supported SVG image under 5 MB.',
        });
      }

      let oldPublicId = null;
      try {
        const records = await supabaseService.selectAll('site_branding', 'created_at', false);
        const currentActive = (records || []).find((r) => r.asset_type === 'site_logo' && (r.is_active === true || r.is_active === 'true'));
        if (currentActive) {
          oldPublicId = currentActive.cloudinary_public_id || currentActive.public_id || null;
        }
      } catch (e) {}

      const folder = 'zenemoo/site-branding/logo';
      const timestamp = Date.now();
      const customPublicId = `${folder}/site-logo-${timestamp}`;

      const cloudinaryRes = await cloudinaryService.uploadStream(req.file.buffer, folder, {
        public_id: customPublicId,
      });

      if (!cloudinaryRes || !cloudinaryRes.secure_url) {
        throw new Error('Cloudinary upload did not return a valid secure URL');
      }

      const userAltText = req.body?.altText || req.body?.alt_text || 'Zenemoo official site logo';
      const userTitle = req.body?.title || 'Zenemoo Official Logo';
      const seoFilename = `zenemoo-official-logo.${fileExt === 'jpeg' ? 'jpg' : fileExt}`;
      const fileSizeFormatted = (req.file.size / 1024).toFixed(1) + ' KB';

      // Deactivate older logo records
      await cleanupPreviousLogos();

      // Database Payload (Compatible with site_branding table columns)
      const dbPayload = {
        asset_type: 'site_logo',
        asset_name: userTitle || 'Zenemoo Official Site Logo',
        cloudinary_public_id: cloudinaryRes.public_id,
        cloudinary_secure_url: cloudinaryRes.secure_url,
        resource_type: 'image',
        format: cloudinaryRes.format || fileExt,
        width: cloudinaryRes.width || 0,
        height: cloudinaryRes.height || 0,
        version: String(timestamp),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: req.user?.email || 'admin',
      };

      let savedRecord = null;
      try {
        savedRecord = await supabaseService.insert('site_branding', dbPayload);
      } catch (dbErr) {
        console.warn('Supabase site_branding insert warning:', dbErr.message);
      }

      const responseData = {
        id: savedRecord?.id || `logo_${timestamp}`,
        url: cloudinaryRes.secure_url,
        secure_url: cloudinaryRes.secure_url,
        publicId: cloudinaryRes.public_id,
        cloudinary_public_id: cloudinaryRes.public_id,
        altText: userAltText,
        title: userTitle,
        seo_filename: seoFilename,
        original_filename: req.file.originalname,
        format: cloudinaryRes.format || fileExt,
        width: cloudinaryRes.width || 0,
        height: cloudinaryRes.height || 0,
        fileSize: fileSizeFormatted,
        isActive: true,
        isDefault: false,
        updated_at: new Date().toISOString(),
      };

      inMemoryActiveLogo = responseData;
      saveDiskActiveLogo(responseData);
      invalidateBrandingCache();

      if (oldPublicId && oldPublicId !== cloudinaryRes.public_id) {
        try {
          await cloudinaryService.deleteMedia(oldPublicId);
        } catch (delErr) {}
      }

      return res.status(200).json({
        success: true,
        message: 'Logo uploaded and activated successfully.',
        data: responseData,
      });
    }

    // Case 2: Save Logo via Direct URL Input
    if (directUrlInput && typeof directUrlInput === 'string' && directUrlInput.trim().length > 0) {
      const timestamp = Date.now();
      const userAltText = req.body?.altText || req.body?.alt_text || 'Zenemoo official site logo';
      const userTitle = req.body?.title || 'Zenemoo Official Logo';
      const cleanUrl = directUrlInput.trim();

      await cleanupPreviousLogos();

      const dbPayload = {
        asset_type: 'site_logo',
        asset_name: userTitle || 'Zenemoo Official Site Logo (Direct URL)',
        cloudinary_public_id: '',
        cloudinary_secure_url: cleanUrl,
        resource_type: 'image',
        format: 'png',
        width: 512,
        height: 512,
        version: String(timestamp),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: req.user?.email || 'admin',
      };

      try {
        await supabaseService.insert('site_branding', dbPayload);
      } catch (dbErr) {
        console.warn('Supabase site_branding direct URL insert warning:', dbErr.message);
      }

      const responseData = {
        id: `logo_url_${timestamp}`,
        url: cleanUrl,
        secure_url: cleanUrl,
        publicId: '',
        cloudinary_public_id: '',
        altText: userAltText,
        title: userTitle,
        seo_filename: 'zenemoo-official-logo.png',
        original_filename: 'direct-url-logo.png',
        format: 'png',
        width: 512,
        height: 512,
        fileSize: 'URL Asset',
        isActive: true,
        isDefault: false,
        updated_at: new Date().toISOString(),
      };

      inMemoryActiveLogo = responseData;
      saveDiskActiveLogo(responseData);
      invalidateBrandingCache();

      return res.status(200).json({
        success: true,
        message: 'Direct URL logo activated successfully.',
        data: responseData,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Please select an image file or provide a valid image URL.',
    });
  } catch (err) {
    console.error('uploadOrReplaceLogo Server Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Logo could not be saved. Please check the file/URL and try again.',
    });
  }
};

/**
 * DELETE /api/branding/logo
 */
export const deleteLogo = async (req, res) => {
  try {
    // 1. Find all site_logo records in Supabase (active and inactive)
    let records = [];
    try {
      records = await supabaseService.selectAll('site_branding', 'created_at', false);
    } catch (e) {
      console.warn('Error querying site_branding for deletion:', e.message);
    }

    const logoRecords = (records || []).filter((r) => r.asset_type === 'site_logo');

    // 2. Delete media from Cloudinary and remove records from Supabase
    for (const r of logoRecords) {
      const pubId = r.cloudinary_public_id || r.public_id;
      if (pubId) {
        try {
          await cloudinaryService.deleteMedia(pubId);
        } catch (cErr) {
          console.warn('Cloudinary media deletion note:', cErr.message);
        }
      }
      if (r.id) {
        try {
          await supabaseService.delete('site_branding', r.id);
        } catch (sErr) {
          console.warn('Supabase record deletion note:', sErr.message);
        }
      }
    }

    // 3. Clear in-memory and write clean inactive persistent file
    inMemoryActiveLogo = null;
    saveDiskActiveLogo(null);
    invalidateBrandingCache();

    return res.status(200).json({
      success: true,
      message: 'Custom logo removed successfully. Default Zenemoo logo restored.',
      data: null,
      defaultFallback: DEFAULT_LOGO_PAYLOAD,
    });
  } catch (err) {
    console.error('deleteLogo Server Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to remove custom logo. Please try again.',
    });
  }
};
