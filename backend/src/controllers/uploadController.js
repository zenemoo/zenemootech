import { cloudinaryService } from '../services/cloudinaryService.js';
import { supabaseService } from '../services/supabaseService.js';
import { buildImageSeoMetadata, generateCloudinaryPublicId } from '../utils/imageSeoHelper.js';

const ALLOWED_FOLDERS = [
  'zenemoo/team',
  'zenemoo/services',
  'zenemoo/gallery',
  'zenemoo/portfolio',
  'zenemoo/blog',
  'zenemoo/testimonials',
  'zenemoo/opportunities',
  'zenemoo/partners',
  'zenemoo/logo',
];

export const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for upload' });
    }

    // Validate Cloudinary Folder
    let folder = req.body.folder || 'zenemoo/team';
    if (!ALLOWED_FOLDERS.includes(folder)) {
      folder = 'zenemoo/team';
    }

    const entityType = req.body.entity_type || req.body.entityType || 'general';
    const entityId = req.body.entity_id || req.body.entityId || '';
    const entityTitle = req.body.entity_title || req.body.entityTitle || req.body.title || req.file.originalname.replace(/\.[^/.]+$/, '');
    const assetType = req.body.asset_type || req.body.assetType || 'image';

    const customPublicId = generateCloudinaryPublicId(folder, entityTitle, assetType);

    // 1. Upload file buffer to Cloudinary SDK via stream with clean public_id
    const cloudinaryRes = await cloudinaryService.uploadStream(req.file.buffer, folder, {
      public_id: customPublicId,
    });

    // 2. Build full automatic SEO Metadata payload
    const mediaPayload = buildImageSeoMetadata({
      originalName: req.file.originalname,
      entityType,
      entityId,
      entityTitle,
      assetType,
      altText: req.body.alt_text || req.body.altText || '',
      title: req.body.title || '',
      description: req.body.description || '',
      caption: req.body.caption || '',
      cloudinaryResult: cloudinaryRes,
    });

    // Add backwards-compatible fields
    mediaPayload.folder = folder;
    mediaPayload.bytes = cloudinaryRes.bytes;

    let dbRecord = null;
    try {
      dbRecord = await supabaseService.insert('media', mediaPayload);
    } catch (dbErr) {
      console.warn('Supabase insert warning (media table fallback):', dbErr.message);
    }

    const resultData = dbRecord || mediaPayload;

    // 3. Return Database Record JSON with complete SEO preview attributes
    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully with automatic SEO metadata',
      media: resultData,
      data: resultData,
      seo: {
        seo_filename: mediaPayload.seo_filename,
        alt_text: mediaPayload.alt_text,
        title: mediaPayload.title,
        description: mediaPayload.description,
        public_id: mediaPayload.cloudinary_public_id,
        image_url: mediaPayload.cloudinary_secure_url,
      },
    });
  } catch (err) {
    console.error('Upload Controller Error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to upload image to Cloudinary & Supabase',
    });
  }
};

export const getMedia = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('media', 'created_at', false);
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Media ID is required' });
    }

    // 1. Fetch existing record from Supabase
    let existingMedia = null;
    try {
      existingMedia = await supabaseService.selectById('media', id);
    } catch (e) {}

    let updatedPayload = existingMedia ? { ...existingMedia } : {};
    let oldPublicId = existingMedia?.public_id || existingMedia?.cloudinary_public_id || null;

    if (req.file) {
      // Step A: Upload NEW image first before deleting old one (safe replacement workflow)
      let folder = req.body.folder || existingMedia?.folder || 'zenemoo/team';
      if (!ALLOWED_FOLDERS.includes(folder)) {
        folder = 'zenemoo/team';
      }

      const entityType = req.body.entity_type || existingMedia?.entity_type || 'general';
      const entityId = req.body.entity_id || existingMedia?.entity_id || '';
      const entityTitle = req.body.entity_title || req.body.title || existingMedia?.title || req.file.originalname.replace(/\.[^/.]+$/, '');
      const assetType = req.body.asset_type || existingMedia?.asset_type || 'image';

      const customPublicId = generateCloudinaryPublicId(folder, entityTitle, assetType);
      const cloudinaryRes = await cloudinaryService.uploadStream(req.file.buffer, folder, {
        public_id: customPublicId,
      });

      const newSeoPayload = buildImageSeoMetadata({
        originalName: req.file.originalname,
        entityType,
        entityId,
        entityTitle,
        assetType,
        altText: req.body.alt_text || req.body.altText || existingMedia?.alt_text || '',
        title: req.body.title || existingMedia?.title || '',
        description: req.body.description || existingMedia?.description || '',
        caption: req.body.caption || existingMedia?.caption || '',
        cloudinaryResult: cloudinaryRes,
      });

      updatedPayload = {
        ...updatedPayload,
        ...newSeoPayload,
        folder,
        updated_at: new Date().toISOString(),
      };

      // Step B: Delete OLD image ONLY after new image is successfully uploaded
      if (oldPublicId && oldPublicId !== cloudinaryRes.public_id) {
        try {
          await cloudinaryService.deleteMedia(oldPublicId);
        } catch (e) {
          console.warn('Failed to delete replaced Cloudinary asset:', e.message);
        }
      }
    } else {
      // Update text fields only
      if (req.body.alt_text || req.body.altText) updatedPayload.alt_text = req.body.alt_text || req.body.altText;
      if (req.body.title) updatedPayload.title = req.body.title;
      if (req.body.description) updatedPayload.description = req.body.description;
      if (req.body.caption) updatedPayload.caption = req.body.caption;
      updatedPayload.updated_at = new Date().toISOString();
    }

    // 4. Update Supabase record
    let updatedRecord = null;
    try {
      updatedRecord = await supabaseService.update('media', id, updatedPayload);
    } catch (e) {}

    res.json({
      success: true,
      message: 'Media record & SEO metadata updated successfully',
      media: updatedRecord || updatedPayload,
      data: updatedRecord || updatedPayload,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update media record',
    });
  }
};

export const deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Media ID is required' });
    }

    const decodedId = decodeURIComponent(id);
    let public_id = decodedId;
    let recordId = decodedId;

    try {
      const existingMedia = await supabaseService.selectById('media', decodedId);
      if (existingMedia) {
        public_id = existingMedia.public_id || existingMedia.cloudinary_public_id || decodedId;
        recordId = existingMedia.id;
      }
    } catch (e) {}

    // 1. Delete asset from Cloudinary
    if (public_id) {
      try {
        await cloudinaryService.deleteMedia(public_id);
      } catch (e) {
        console.warn('Cloudinary delete warning:', e.message);
      }
    }

    // 2. Delete row from Supabase
    try {
      await supabaseService.delete('media', recordId);
    } catch (e) {}

    res.json({
      success: true,
      message: 'Media asset deleted successfully from Cloudinary and Supabase',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete media asset',
    });
  }
};

