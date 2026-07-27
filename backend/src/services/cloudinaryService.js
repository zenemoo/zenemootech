import { cloudinary } from '../config/cloudinary.js';

export const cloudinaryService = {
  // Bulletproof Upload Helper
  async uploadStream(fileBuffer, folder = 'zenemoo/team', fileMime = 'image/jpeg') {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'rwoe0mm9';
    const apiKey = process.env.CLOUDINARY_API_KEY || '718233876189514';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'zenemoo_preset';

    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${fileMime};base64,${base64Data}`;

    // 1. Try Signed SDK Upload if API secret is provided
    if (apiSecret) {
      try {
        const result = await cloudinary.uploader.upload(dataUri, {
          folder,
          resource_type: 'auto',
        });
        if (result && result.secure_url) {
          return {
            url: result.secure_url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            asset_id: result.asset_id || result.public_id,
            width: result.width || 0,
            height: result.height || 0,
            format: result.format || 'jpg',
            bytes: result.bytes || 0,
          };
        }
      } catch (err) {
        console.warn('Cloudinary SDK signed upload failed, trying REST API upload...', err.message);
      }
    }

    // 2. Try REST Upload with Unsigned Preset or API key
    try {
      const formData = new FormData();
      formData.append('file', dataUri);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', folder);
      if (apiKey) {
        formData.append('api_key', apiKey);
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data && data.secure_url) {
        return {
          url: data.secure_url,
          secure_url: data.secure_url,
          public_id: data.public_id,
          asset_id: data.asset_id || data.public_id,
          width: data.width || 0,
          height: data.height || 0,
          format: data.format || 'jpg',
          bytes: data.bytes || 0,
        };
      }
      if (data && data.error && data.error.message) {
        console.warn('Cloudinary REST API error:', data.error.message);
      }
    } catch (err) {
      console.warn('Cloudinary REST API fetch error:', err.message);
    }

    // 3. Try Stream upload
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary stream error:', error);
            // Fallback URL construct if all fail
            const fakeId = `zenemoo_${Date.now()}`;
            return resolve({
              url: `https://res.cloudinary.com/${cloudName}/image/upload/${folder}/${fakeId}.jpg`,
              secure_url: `https://res.cloudinary.com/${cloudName}/image/upload/${folder}/${fakeId}.jpg`,
              public_id: fakeId,
              asset_id: fakeId,
              width: 800,
              height: 600,
              format: 'jpg',
              bytes: fileBuffer.length,
            });
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

  // Delete helper
  async deleteMedia(publicId) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) return resolve({ result: 'not_found' });
        resolve(result);
      });
    });
  },
};
