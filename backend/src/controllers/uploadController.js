import { cloudinaryService } from '../services/cloudinaryService.js';
import { supabaseService } from '../services/supabaseService.js';

const ALLOWED_FOLDERS = [
  'zenemoo/team',
  'zenemoo/services',
  'zenemoo/gallery',
  'zenemoo/portfolio',
  'zenemoo/blog',
  'zenemoo/testimonials',
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

    const title = req.body.title || req.file.originalname;

    // 1. Upload file buffer to Cloudinary SDK via stream
    const cloudinaryRes = await cloudinaryService.uploadStream(req.file.buffer, folder);

    // 2. Insert image metadata record into Supabase PostgreSQL media table
    const mediaPayload = {
      title,
      folder,
      public_id: cloudinaryRes.public_id,
      image_url: cloudinaryRes.secure_url,
      asset_id: cloudinaryRes.asset_id,
      width: cloudinaryRes.width,
      height: cloudinaryRes.height,
      format: cloudinaryRes.format,
      bytes: cloudinaryRes.bytes,
      created_at: new Date().toISOString(),
    };

    const dbRecord = await supabaseService.insert('media', mediaPayload);

    // 3. Return Database Record JSON
    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully to Cloudinary & Supabase',
      media: dbRecord || mediaPayload,
      data: dbRecord || mediaPayload,
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
    const existingMedia = await supabaseService.selectById('media', id);
    if (!existingMedia) {
      return res.status(404).json({ success: false, message: 'Media record not found in Supabase' });
    }

    let updatedPayload = { ...existingMedia };

    if (req.file) {
      // 2. Delete old image from Cloudinary if public_id exists
      if (existingMedia.public_id) {
        try {
          await cloudinaryService.deleteMedia(existingMedia.public_id);
        } catch (e) {
          console.warn('Failed to delete old Cloudinary image:', e.message);
        }
      }

      // 3. Upload new image to Cloudinary
      let folder = req.body.folder || existingMedia.folder || 'zenemoo/team';
      if (!ALLOWED_FOLDERS.includes(folder)) {
        folder = 'zenemoo/team';
      }

      const cloudinaryRes = await cloudinaryService.uploadStream(req.file.buffer, folder);

      updatedPayload = {
        ...updatedPayload,
        title: req.body.title || req.file.originalname,
        folder,
        public_id: cloudinaryRes.public_id,
        image_url: cloudinaryRes.secure_url,
        asset_id: cloudinaryRes.asset_id,
        width: cloudinaryRes.width,
        height: cloudinaryRes.height,
        format: cloudinaryRes.format,
        bytes: cloudinaryRes.bytes,
      };
    } else if (req.body.title) {
      updatedPayload.title = req.body.title;
    }

    // 4. Update Supabase record
    const updatedRecord = await supabaseService.update('media', id, updatedPayload);

    res.json({
      success: true,
      message: 'Media record updated successfully',
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
      if (existingMedia && existingMedia.public_id) {
        public_id = existingMedia.public_id;
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
