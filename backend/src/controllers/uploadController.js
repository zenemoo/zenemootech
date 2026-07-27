import { cloudinaryService } from '../services/cloudinaryService.js';
import { supabaseService } from '../services/supabaseService.js';

let inMemoryMediaList = [];

export const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const folder = req.body.folder || 'zenemoo/team';
    const title = req.body.title || req.file.originalname;

    // 1. Upload to Cloudinary
    const cloudinaryRes = await cloudinaryService.uploadStream(req.file.buffer, folder);

    // 2. Prepare Supabase Media Record
    const mediaPayload = {
      id: Date.now().toString(),
      title,
      folder,
      public_id: cloudinaryRes.public_id,
      image_url: cloudinaryRes.secure_url,
      asset_id: cloudinaryRes.asset_id,
      width: cloudinaryRes.width,
      height: cloudinaryRes.height,
      format: cloudinaryRes.format,
      bytes: cloudinaryRes.bytes,
      uploaded_by: 'admin',
      created_at: new Date().toISOString(),
    };

    // 3. Save to Supabase Database
    let savedMedia = mediaPayload;
    try {
      const dbResult = await supabaseService.insert('media', mediaPayload);
      if (dbResult) {
        savedMedia = dbResult;
      }
    } catch (e) {
      console.warn('Supabase media insert warning:', e);
    }

    inMemoryMediaList.unshift(savedMedia);

    // 4. Return database record JSON
    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      media: savedMedia,
    });
  } catch (err) {
    next(err);
  }
};

export const getMedia = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('media');
    if (data && data.length > 0) {
      return res.json({ success: true, count: data.length, data });
    }
    res.json({ success: true, count: inMemoryMediaList.length, data: inMemoryMediaList });
  } catch (err) {
    res.json({ success: true, count: inMemoryMediaList.length, data: inMemoryMediaList });
  }
};

export const updateMedia = async (req, res, next) => {
  try {
    const { id } = req.params;

    let existingMedia = null;
    try {
      existingMedia = await supabaseService.selectById('media', id);
    } catch (e) {}

    if (!existingMedia) {
      existingMedia = inMemoryMediaList.find((m) => m.id === id);
    }

    if (existingMedia && existingMedia.public_id && req.file) {
      try {
        await cloudinaryService.deleteMedia(existingMedia.public_id);
      } catch (e) {}
    }

    let updatedPayload = { ...existingMedia };
    if (req.file) {
      const folder = req.body.folder || existingMedia?.folder || 'zenemoo/team';
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
    }

    try {
      const updated = await supabaseService.update('media', id, updatedPayload);
      if (updated) {
        return res.json({ success: true, message: 'Image updated successfully', media: updated });
      }
    } catch (e) {}

    inMemoryMediaList = inMemoryMediaList.map((m) => (m.id === id ? { ...m, ...updatedPayload } : m));
    res.json({ success: true, message: 'Image updated successfully', media: updatedPayload });
  } catch (err) {
    next(err);
  }
};

export const deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;

    let existingMedia = null;
    try {
      existingMedia = await supabaseService.selectById('media', id);
    } catch (e) {}

    if (!existingMedia) {
      existingMedia = inMemoryMediaList.find((m) => m.id === id || m.public_id === id);
    }

    const publicId = existingMedia ? existingMedia.public_id : decodeURIComponent(id);

    // 1. Delete from Cloudinary
    if (publicId) {
      try {
        await cloudinaryService.deleteMedia(publicId);
      } catch (e) {}
    }

    // 2. Delete from Supabase
    try {
      await supabaseService.delete('media', id);
    } catch (e) {}

    inMemoryMediaList = inMemoryMediaList.filter((m) => m.id !== id && m.public_id !== publicId);

    res.json({ success: true, message: 'Image deleted from Cloudinary and Supabase' });
  } catch (err) {
    next(err);
  }
};
