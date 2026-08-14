import { cloudinary } from '../config/cloudinary.js';

export const cloudinaryService = {
  /**
   * Production-grade Cloudinary Upload Stream with timeout race protection
   */
  uploadStream(fileBuffer, folder = 'zenemoo/site-branding/logo', options = {}) {
    return new Promise((resolve, reject) => {
      // 25-second timeout guard to prevent socket hanging
      const timeoutTimer = setTimeout(() => {
        reject(new Error('Cloudinary upload connection timed out. Please try again.'));
      }, 25000);

      const uploadParams = {
        resource_type: 'auto',
      };

      if (options.public_id) {
        // If public_id already includes folder structure, do not duplicate folder
        uploadParams.public_id = options.public_id;
        uploadParams.overwrite = true;
        uploadParams.invalidate = true;
      } else {
        uploadParams.folder = folder;
      }

      const stream = cloudinary.uploader.upload_stream(
        uploadParams,
        (error, result) => {
          clearTimeout(timeoutTimer);
          if (error) {
            console.error('Cloudinary Upload Stream Error:', error);
            return reject(new Error(error.message || 'Cloudinary upload stream failed'));
          }
          if (!result || !result.secure_url) {
            return reject(new Error('Cloudinary response did not return a valid secure_url'));
          }
          resolve({
            url: result.secure_url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            asset_id: result.asset_id || result.public_id,
            width: result.width || 0,
            height: result.height || 0,
            format: result.format || 'png',
            bytes: result.bytes || 0,
          });
        }
      );

      stream.end(fileBuffer);
    });
  },

  /**
   * Permanently delete asset from Cloudinary by public_id
   */
  async deleteMedia(publicId) {
    if (!publicId) return null;
    return new Promise((resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        resolve({ result: 'timeout_fallback' });
      }, 10000);

      cloudinary.uploader.destroy(publicId, { invalidate: true }, (error, result) => {
        clearTimeout(timeoutTimer);
        if (error) {
          console.warn('Cloudinary Delete Warning:', error.message);
          return resolve({ result: 'error_ignored', message: error.message });
        }
        resolve(result);
      });
    });
  },
};
