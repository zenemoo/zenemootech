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

/**
 * GET /api/branding/active, /branding/active, /api/branding/logo, /branding/logo, /api/branding, /branding
 * MUST NEVER RETURN 404! Returns HTTP 200 with active logo payload or data: null.
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

      return res.status(200).json({
        success: true,
        data: {
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
        },
      });
    }

    // If no custom logo is configured, return HTTP 200 with data: null or default payload
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
 * Protected Admin Route: Upload or replace primary site logo
 */
export const uploadOrReplaceLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PNG, JPG, WEBP or supported SVG image under 5 MB.',
      });
    }

    // 1. Strict Validation
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

    // 2. Fetch existing active logo record to preserve old_public_id for safe post-replacement cleanup
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

    // 3. Upload new image asset to Cloudinary FIRST
    const folder = 'zenemoo/site-branding/logo';
    const timestamp = Date.now();
    const customPublicId = `${folder}/site-logo-${timestamp}`;

    const cloudinaryRes = await cloudinaryService.uploadStream(req.file.buffer, folder, {
      public_id: customPublicId,
    });

    if (!cloudinaryRes || !cloudinaryRes.secure_url) {
      throw new Error('Cloudinary upload did not return a valid secure URL');
    }

    // 4. Construct Image SEO & Branding metadata
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

    // 5. Save database record in Supabase
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

    // 6. SAFE REPLACEMENT CLEANUP: ONLY AFTER SUCCESS purge old Cloudinary asset
    if (oldPublicId && oldPublicId !== cloudinaryRes.public_id) {
      try {
        await cloudinaryService.deleteMedia(oldPublicId);
        console.log(`Successfully purged previous Cloudinary logo asset: ${oldPublicId}`);
      } catch (delErr) {
        console.warn('Old logo deletion warning:', delErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Logo uploaded and activated successfully.',
      data: responseData,
    });
  } catch (err) {
    console.error('uploadOrReplaceLogo Server Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Logo could not be uploaded. Please check the file and try again.',
    });
  }
};

/**
 * DELETE /api/branding/logo
 * Protected Admin Route: Remove custom logo and restore default Zenemoo brandmark
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

    // 1. Delete asset from Cloudinary
    if (publicIdToDelete) {
      try {
        await cloudinaryService.deleteMedia(publicIdToDelete);
      } catch (cErr) {
        console.warn('Cloudinary logo destruction warning:', cErr.message);
      }
    }

    // 2. Remove database record from Supabase
    if (recordIdToDelete) {
      try {
        await supabaseService.delete('site_branding', recordIdToDelete);
      } catch (sErr) {
        console.warn('Supabase site_branding record delete warning:', sErr.message);
      }
    }

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
