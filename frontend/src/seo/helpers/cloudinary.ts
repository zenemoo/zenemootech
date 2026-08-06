/**
 * Zenemoo Enterprise Cloudinary Helper
 * Centralized utility for dynamic URL transformations, responsive srcset generation,
 * and SEO public ID naming strategy (Free Plan Compliant).
 */

export interface CloudinaryOptions {
  width?: number;
  height?: number;
  quality?: string | number; // default 'auto'
  format?: string; // default 'auto'
  crop?: 'limit' | 'fill' | 'fit' | 'scale' | 'thumb' | 'crop';
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
  dpr?: string | number; // default 'auto'
}

/**
 * Responsive image width breakpoints for srcset generation
 */
export const SEO_IMAGE_BREAKPOINTS = [320, 480, 640, 768, 1024, 1440, 1920];

/**
 * Folder structure standards for Zenemoo Cloudinary assets
 */
export const CLOUDINARY_FOLDER_PREFIXES = {
  team: 'zenemoo/team',
  services: 'zenemoo/services',
  projects: 'zenemoo/projects',
  logo: 'zenemoo/logo',
  office: 'zenemoo/office',
} as const;

/**
 * Converts a text title into a clean, SEO-friendly filename slug
 * Example: "Prem Prasad Pradhan Founder" -> "prem-prasad-pradhan-founder"
 */
export const formatSeoFilenameSlug = (text: string): string => {
  if (!text) return 'zenemoo-ai-data-solutions';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Formats a raw image URL with native Cloudinary transformations (f_auto, q_auto, dpr_auto, w_auto, c_limit)
 * Never duplicates transformation parameters.
 */
export const getOptimizedCloudinaryUrl = (
  rawUrl: string,
  options: CloudinaryOptions = {}
): string => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return 'https://www.zenemoo.in/assets/logo.png';
  }

  let cleanUrl = rawUrl.trim();

  // Force HTTPS
  if (cleanUrl.startsWith('http://')) {
    cleanUrl = cleanUrl.replace('http://', 'https://');
  }

  // Only apply Cloudinary transformations to res.cloudinary.com URLs
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

    const transformParts: string[] = [
      `f_${format}`,
      `q_${quality}`,
      `dpr_${dpr}`,
    ];

    if (crop) transformParts.push(`c_${crop}`);
    if (width) transformParts.push(`w_${width}`);
    if (height) transformParts.push(`h_${height}`);
    if (gravity) transformParts.push(`g_${gravity}`);

    const transformString = transformParts.join(',');

    // Prevent duplicate transformations if f_auto or q_auto already exist
    if (!cleanUrl.includes('/upload/f_auto') && !cleanUrl.includes('/upload/q_auto')) {
      cleanUrl = cleanUrl.replace('/upload/', `/upload/${transformString}/`);
    } else if (width) {
      // Inject width into existing transformation string
      cleanUrl = cleanUrl.replace('/upload/', `/upload/w_${width},`);
    }
  }

  return cleanUrl;
};

/**
 * Builds a responsive `srcset` attribute string using Cloudinary width transformations
 */
export const buildCloudinarySrcSet = (
  rawUrl: string,
  options: Omit<CloudinaryOptions, 'width'> = {}
): string => {
  if (!rawUrl || !rawUrl.includes('res.cloudinary.com')) return '';

  return SEO_IMAGE_BREAKPOINTS.map((w) => {
    const url = getOptimizedCloudinaryUrl(rawUrl, { ...options, width: w });
    return `${url} ${w}w`;
  }).join(', ');
};
