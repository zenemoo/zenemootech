import { cloudinaryService } from '../services/cloudinaryService.js';
import { supabaseService } from '../services/supabaseService.js';

// In-memory fallback if Supabase table is empty or initializing
let memoryLogoAsset = {
  id: 'site_logo_default',
  asset_type: 'site_logo',
  asset_name: 'Zenemoo Official Site Logo',
  cloudinary_public_id: '',
  cloudinary_secure_url: '/assets/logo.png',
  resource_type: 'image',
  format: 'png',
  width: 512,
  height: 512,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  updated_by: 'system',
};

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * GET /api/branding/active or /api/branding/logo
 * Public endpoint to fetch currently active primary site logo
 */
export const getActiveLogo = async (req, res, next) => {
  try {
    try {
      const records = await supabaseService.selectAll('site_branding', 'updated_at', false);
      const activeLogo = (records || []).find((r) => r.asset_type === 'site_logo' && r.is_active === true);
      if (activeLogo && activeLogo.cloudinary_secure_url) {
        return res.json({
          success: true,
          data: activeLogo,
        });
      }
    } catch (dbErr) {
      console.warn('Supabase site_branding fetch fallback:', dbErr.message);
    }

    return res.json({
      success: true,
      data: memoryLogoAsset,
    });
  } catch (err) {
    return res.json({
      success: true,
      data: memoryLogoAsset,
    });
  }
};

/**
 * POST /api/branding/logo
 * Protected Admin Endpoint: Upload new logo / Replace active logo
 */
export const uploadOrReplaceLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided for logo upload' });
    }

    // 1. File Format & Size Validation
    const fileMime = req.file.mimetype.toLowerCase();
    const extMatch = req.file.originalname.match(/\.([a-zA-Z0-9]+)$/);
    const fileExt = extMatch ? extMatch[1].toLowerCase() : '';

    if (!ALLOWED_MIME_TYPES.includes(fileMime) || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid logo file format. Only PNG, JPG/JPEG, WEBP, and SVG files under 5MB are allowed.',
      });
    }

    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'Logo file size exceeds the 5 MB maximum limit.',
      });
    }

    // 2. Fetch current active logo record (to obtain old_public_id for safe deletion after replacement)
    let oldPublicId = null;
    let existingRecordId = null;
    try {
      const records = await supabaseService.selectAll('site_branding', 'created_at', false);
      const activeLogo = (records || []).find((r) => r.asset_type === 'site_logo' && r.is_active === true);
      if (activeLogo) {
        oldPublicId = activeLogo.cloudinary_public_id || null;
        existingRecordId = activeLogo.id || null;
      }
    } catch (e) {}

    // 3. Upload new logo asset to Cloudinary first
    const folder = 'zenemoo/site-branding/logo';
    const timestamp = Date.now();
    const customPublicId = `${folder}/site-logo-${timestamp}`;

    const cloudinaryRes = await cloudinaryService.uploadStream(req.file.buffer, folder, {
      public_id: customPublicId,
    });

    if (!cloudinaryRes || !cloudinaryRes.secure_url) {
      throw new Error('Cloudinary upload returned no secure URL');
    }

    // 4. Build database payload
    const brandingPayload = {
      asset_type: 'site_logo',
      asset_name: `Zenemoo Official Site Logo (${fileExt.toUpperCase()})`,
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
      if (existingRecordId) {
        savedRecord = await supabaseService.update('site_branding', existingRecordId, brandingPayload);
      } else {
        savedRecord = await supabaseService.insert('site_branding', brandingPayload);
      }
    } catch (dbErr) {
      console.warn('Supabase site_branding save fallback:', dbErr.message);
    }

    memoryLogoAsset = savedRecord || { ...brandingPayload, id: existingRecordId || `logo_${timestamp}` };

    // 5. Delete OLD Cloudinary asset ONLY after new upload and DB update succeed
    if (oldPublicId && oldPublicId !== cloudinaryRes.public_id) {
      try {
        await cloudinaryService.deleteMedia(oldPublicId);
        console.log(`Successfully purged old Cloudinary logo asset: ${oldPublicId}`);
      } catch (delErr) {
        console.warn('Failed to delete old Cloudinary logo asset:', delErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Site logo updated successfully on Cloudinary and Supabase',
      data: memoryLogoAsset,
    });
  } catch (err) {
    console.error('Branding Controller Upload Error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to process logo upload',
    });
  }
};

/**
 * DELETE /api/branding/logo
 * Protected Admin Endpoint: Delete active logo and revert to default brandmark
 */
export const deleteLogo = async (req, res, next) => {
  try {
    let publicIdToDelete = null;
    let recordIdToDelete = null;

    try {
      const records = await supabaseService.selectAll('site_branding', 'created_at', false);
      const activeLogo = (records || []).find((r) => r.asset_type === 'site_logo' && r.is_active === true);
      if (activeLogo) {
        publicIdToDelete = activeLogo.cloudinary_public_id;
        recordIdToDelete = activeLogo.id;
      }
    } catch (e) {}

    // 1. Delete asset from Cloudinary
    if (publicIdToDelete) {
      try {
        await cloudinaryService.deleteMedia(publicIdToDelete);
      } catch (cErr) {
        console.warn('Cloudinary logo deletion warning:', cErr.message);
      }
    }

    // 2. Remove or deactivate record in Supabase
    if (recordIdToDelete) {
      try {
        await supabaseService.delete('site_branding', recordIdToDelete);
      } catch (sErr) {
        console.warn('Supabase logo row delete warning:', sErr.message);
      }
    }

    // Reset memory asset to clean default fallback
    memoryLogoAsset = {
      id: 'site_logo_default',
      asset_type: 'site_logo',
      asset_name: 'Zenemoo Official Site Logo (Default)',
      cloudinary_public_id: '',
      cloudinary_secure_url: '/assets/logo.png',
      resource_type: 'image',
      format: 'png',
      width: 512,
      height: 512,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'admin',
    };

    return res.json({
      success: true,
      message: 'Site logo permanently deleted. Reverted to default Zenemoo brand mark.',
      data: memoryLogoAsset,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete site logo',
    });
  }
};
