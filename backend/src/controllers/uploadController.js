import { cloudinaryService } from '../services/cloudinaryService.js';

export const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const folder = req.body.folder || 'zenemoo/team';
    const result = await cloudinaryService.uploadStream(req.file.buffer, folder);

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully to Cloudinary',
      data: {
        url: result.url,
        public_id: result.public_id,
        folder,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteMedia = async (req, res, next) => {
  try {
    const publicId = decodeURIComponent(req.params.id);
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'Public ID is required' });
    }

    const result = await cloudinaryService.deleteMedia(publicId);
    res.json({ success: true, message: 'Media deleted from Cloudinary', result });
  } catch (err) {
    next(err);
  }
};
