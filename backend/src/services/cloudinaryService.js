import { cloudinary } from '../config/cloudinary.js';

export const cloudinaryService = {
  // Upload stream helper
  uploadStream(fileBuffer, folder = 'zenemoo/team') {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            asset_id: result.asset_id || result.public_id,
            width: result.width || 0,
            height: result.height || 0,
            format: result.format || 'jpg',
            bytes: result.bytes || 0,
          });
        }
      );
      stream.end(fileBuffer);
    });
  },

  // Delete helper
  async deleteMedia(publicId) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
  },
};
