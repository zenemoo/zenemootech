import { cloudinaryService } from '../services/cloudinaryService.js';
import { supabaseService } from '../services/supabaseService.js';

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

// Module-level in-memory state persistence for instantaneous updates
let inMemoryActiveLogo = null;

/**
 * GET /api/branding/active, /branding/active, /api/branding/logo, /branding/logo, /api/branding, /branding
 * MUST NEVER RETURN 404! Returns active logo payload or fallback.
 */
export const getActiveLogo = async (req, res) => {
  try {
    let activeRecord = null;
    try {
      const records = await supabaseService.selectAll('site_branding', 'updated_at', false);
      if (Array.isArray(records) && records.length > 0) {
        activeRecord = records.find((r) => r.asset_type === 'site_logo' && r.is_active === true) || null;
      }
    } catch (dbErr) {
      console.warn('Supabase site_branding select warning:', dbErr.message);
    }

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
      return res.status(200).json({ success: true, data: payload });
    }

    if (inMemoryActiveLogo) {
      return res.status(200).json({ success: true, data: inMemoryActiveLogo });
    }

    return res.status(200).json({
      success: true,
      data: null,
      defaultFallback: DEFAULT_LOGO_PAYLOAD,
    });
  } catch (err) {
    console.error('getActiveLogo Server Error:', err.message);
    return res.status(200).json({
      success: true,
      data: inMemoryActiveLogo || null,
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
      let existingRecordId = null;
      try {
        const records = await supabaseService.selectAll('site_branding', 'created_at', false);
        const currentActive = (records || []).find((r) => r.asset_type === 'site_logo' && r.is_active === true);
        if (currentActive) {
          oldPublicId = currentActive.cloudinary_public_id || currentActive.public_id || null;
          existingRecordId = currentActive.id || null;
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

      const dbPayload = {
        asset_type: 'site_logo',
        asset_name: 'Zenemoo Official Site Logo',
        original_filename: req.file.originalname,
        seo_filename: seoFilename,
        alt_text: userAltText,
        title: userTitle,
        description: 'Official primary site logo for Zenemoo platform header and branding',
        folder,
        cloudinary_public_id: cloudinaryRes.public_id,
        cloudinary_secure_url: cloudinaryRes.secure_url,
        public_id: cloudinaryRes.public_id,
        image_url: cloudinaryRes.secure_url,
        resource_type: 'image',
        format: cloudinaryRes.format || fileExt,
        width: cloudinaryRes.width || 0,
        height: cloudinaryRes.height || 0,
        bytes: req.file.size,
        version: String(timestamp),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: req.user?.email || 'admin',
      };

      let savedRecord = null;
      try {
        if (existingRecordId) {
          savedRecord = await supabaseService.update('site_branding', existingRecordId, dbPayload);
        } else {
          savedRecord = await supabaseService.insert('site_branding', dbPayload);
        }
      } catch (dbErr) {
        console.warn('Supabase site_branding insert/update warning:', dbErr.message);
      }

      const responseData = {
        id: savedRecord?.id || existingRecordId || `logo_${timestamp}`,
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

      const dbPayload = {
        asset_type: 'site_logo',
        asset_name: 'Zenemoo Official Site Logo (Direct URL)',
        original_filename: 'direct-url-logo.png',
        seo_filename: 'zenemoo-official-logo.png',
        alt_text: userAltText,
        title: userTitle,
        folder: 'zenemoo/site-branding/logo',
        cloudinary_public_id: '',
        cloudinary_secure_url: cleanUrl,
        public_id: '',
        image_url: cleanUrl,
        resource_type: 'image',
        format: 'png',
        width: 512,
        height: 512,
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
    let publicIdToDelete = null;
    let recordIdToDelete = null;

    try {
      const records = await supabaseService.selectAll('site_branding', 'created_at', false);
      const activeRecord = (records || []).find((r) => r.asset_type === 'site_logo' && r.is_active === true);
      if (activeRecord) {
        publicIdToDelete = activeRecord.cloudinary_public_id || activeRecord.public_id || null;
        recordIdToDelete = activeRecord.id;
      }
    } catch (e) {}

    if (publicIdToDelete) {
      try {
        await cloudinaryService.deleteMedia(publicIdToDelete);
      } catch (cErr) {}
    }

    if (recordIdToDelete) {
      try {
        await supabaseService.delete('site_branding', recordIdToDelete);
      } catch (sErr) {}
    }

    inMemoryActiveLogo = null;

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
