import { cloudinary } from '../config/cloudinary.js';

export const cloudinaryService = {
  // Production-grade Cloudinary Upload Stream
  uploadStream(fileBuffer, folder = 'zenemoo/team') {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            return reject(new Error(error.message || 'Cloudinary upload failed'));
          }
          if (!result || !result.secure_url) {
            return reject(new Error('Cloudinary response did not contain a secure_url'));
          }
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

  // Delete asset from Cloudinary
  async deleteMedia(publicId) {
    if (!publicId) return null;
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          console.error('Cloudinary Delete Error:', error);
          return reject(new Error(error.message || 'Cloudinary delete failed'));
        }
        resolve(result);
      });
    });
  },
};
