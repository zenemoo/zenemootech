/**
 * Zenemoo Image SEO Loader & Accessibility Helper
 * Generates descriptive, non-generic alt text, loading strategies, and fallback paths.
 */

import { getOptimizedCloudinaryUrl } from './cloudinary';

export interface ImageSeoProps {
  src: string;
  alt: string;
  title?: string;
  category?: 'team' | 'services' | 'projects' | 'logo' | 'office';
  isPriority?: boolean;
}

/**
 * Ensures alt text is highly descriptive and never generic ("image", "photo", "team member")
 */
export const sanitizeAltText = (rawAlt: string, defaultRole: string = 'Zenemoo AI Data Solution'): string => {
  if (!rawAlt || rawAlt.trim().length === 0) {
    return `${defaultRole} — Enterprise Language Technology`;
  }

  let cleanAlt = rawAlt.trim();
  
  // Reject generic single words
  const genericWords = ['image', 'photo', 'picture', 'team member', 'avatar', 'logo'];
  if (genericWords.includes(cleanAlt.toLowerCase())) {
    cleanAlt = `${defaultRole} — Zenemoo Enterprise AI Solutions`;
  }

  // Ensure Zenemoo brand context exists
  if (!cleanAlt.toLowerCase().includes('zenemoo')) {
    cleanAlt = `${cleanAlt} — Zenemoo`;
  }

  return cleanAlt;
};

/**
 * Determines loading strategy (eager for priority/hero images, lazy for others)
 */
export const getImageLoadingStrategy = (isPriority?: boolean) => {
  return {
    loading: isPriority ? ('eager' as const) : ('lazy' as const),
    fetchPriority: isPriority ? ('high' as const) : ('auto' as const),
    decoding: 'async' as const,
  };
};

/**
 * Returns a reliable fallback logo image if an image fails to load
 */
export const DEFAULT_FALLBACK_IMAGE = 'https://www.zenemoo.in/assets/logo.png';
