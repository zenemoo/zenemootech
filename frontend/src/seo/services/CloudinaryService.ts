/**
 * Zenemoo Enterprise Cloudinary Service
 * OOP & Functional Service providing domain presets (hero, avatar, logo, card, etc.)
 * and automatic srcset / sizes calculation.
 */

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  quality?: string | number;
  format?: string;
  crop?: 'limit' | 'fill' | 'fit' | 'scale' | 'thumb' | 'crop';
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
  dpr?: string | number;
}

export type ImagePresetType = 'hero' | 'avatar' | 'card' | 'logo' | 'fullWidth' | 'thumbnail';

export const BREAKPOINTS_PX = [320, 480, 640, 768, 1024, 1440, 1920];

export class CloudinaryService {
  private static defaultBaseUrl = 'https://res.cloudinary.com';

  /**
   * Generates optimized Cloudinary image URL with transformation parameters
   */
  public static optimize(rawUrl: string, options: CloudinaryTransformOptions = {}): string {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return 'https://www.zenemoo.in/assets/logo.png';
    }

    let cleanUrl = rawUrl.trim();
    if (cleanUrl.startsWith('http://')) {
      cleanUrl = cleanUrl.replace('http://', 'https://');
    }

    if (cleanUrl.includes('res.cloudinary.com') && cleanUrl.includes('/upload/')) {
      const {
        width,
        height,
        quality = 'auto',
        format = 'auto',
        crop = 'limit',
        gravity,
        dpr = 'auto',
      } = options;

      const parts = [`f_${format}`, `q_${quality}`, `dpr_${dpr}`];
      if (crop) parts.push(`c_${crop}`);
      if (width) parts.push(`w_${width}`);
      if (height) parts.push(`h_${height}`);
      if (gravity) parts.push(`g_${gravity}`);

      const transformStr = parts.join(',');

      if (!cleanUrl.includes('/upload/f_auto') && !cleanUrl.includes('/upload/q_auto')) {
        cleanUrl = cleanUrl.replace('/upload/', `/upload/${transformStr}/`);
      } else if (width) {
        cleanUrl = cleanUrl.replace('/upload/', `/upload/w_${width},`);
      }
    }

    return cleanUrl;
  }

  /**
   * Generates dynamic srcset string across responsive breakpoints
   */
  public static srcSet(rawUrl: string, options: Omit<CloudinaryTransformOptions, 'width'> = {}): string {
    if (!rawUrl || !rawUrl.includes('res.cloudinary.com')) return '';

    return BREAKPOINTS_PX.map((w) => {
      const url = this.optimize(rawUrl, { ...options, width: w });
      return `${url} ${w}w`;
    }).join(', ');
  }

  /**
   * Automatically derives browser `sizes` attribute string based on preset type
   */
  public static autoSizes(preset?: ImagePresetType, customSizes?: string): string {
    if (customSizes) return customSizes;

    switch (preset) {
      case 'hero':
      case 'fullWidth':
        return '100vw';
      case 'avatar':
        return '(max-width: 640px) 120px, 200px';
      case 'logo':
        return '(max-width: 640px) 32px, 44px';
      case 'thumbnail':
        return '(max-width: 640px) 80px, 120px';
      case 'card':
      default:
        return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw';
    }
  }

  /* Preset Helper Methods */
  public static hero(rawUrl: string) {
    return this.optimize(rawUrl, { quality: 'auto', format: 'auto', crop: 'limit' });
  }

  public static avatar(rawUrl: string, size = 300) {
    return this.optimize(rawUrl, { width: size, height: size, crop: 'fill', gravity: 'face' });
  }

  public static logo(rawUrl: string, size = 80) {
    return this.optimize(rawUrl, { width: size, height: size, crop: 'fit' });
  }

  public static card(rawUrl: string, width = 600, height = 400) {
    return this.optimize(rawUrl, { width, height, crop: 'fill', gravity: 'auto' });
  }

  public static thumbnail(rawUrl: string, size = 150) {
    return this.optimize(rawUrl, { width: size, height: size, crop: 'thumb', gravity: 'auto' });
  }

  public static placeholder(rawUrl: string) {
    return this.optimize(rawUrl, { width: 30, quality: 30, format: 'auto' });
  }
}
