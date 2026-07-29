/**
 * Zenemoo Cloudinary Image SEO & Optimization Helper
 * Ensures all Cloudinary & platform images generate descriptive alt tags, titles, captions, 
 * canonical HTTPS URLs, and ImageObject JSON-LD structured data for Google Image Search discovery.
 */

export interface CloudinarySeoMetadata {
  url: string;
  canonicalUrl: string;
  alt: string;
  title: string;
  caption: string;
  imageObjectSchema: Record<string, any>;
}

/**
 * Format a raw string into a clean SEO-friendly slug
 * Example: "Zenemoo AI Team Member" -> "zenemoo-ai-team-member"
 */
export const formatSeoFilename = (text: string): string => {
  if (!text) return 'zenemoo-ai-data-solutions';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Ensures a Cloudinary URL uses HTTPS and applies automatic format & quality optimization (f_auto, q_auto)
 */
export const getCanonicalCloudinaryUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return 'https://www.zenemoo.in/assets/logo.png';
  }

  let cleanUrl = url.trim();
  if (cleanUrl.startsWith('http://')) {
    cleanUrl = cleanUrl.replace('http://', 'https://');
  }

  // If Cloudinary URL, inject f_auto,q_auto for optimal WebP/AVIF delivery
  if (cleanUrl.includes('res.cloudinary.com') && cleanUrl.includes('/upload/')) {
    if (!cleanUrl.includes('f_auto') && !cleanUrl.includes('q_auto')) {
      cleanUrl = cleanUrl.replace('/upload/', '/upload/f_auto,q_auto/');
    }
  }

  return cleanUrl;
};

/**
 * Generate full SEO metadata & ImageObject JSON-LD schema for any image URL
 */
export const generateImageSeoMetadata = (
  rawUrl: string,
  defaultTitle: string = 'Zenemoo Enterprise AI Solution',
  defaultCategory: string = 'AI Data Services'
): CloudinarySeoMetadata => {
  const canonicalUrl = getCanonicalCloudinaryUrl(rawUrl);
  const cleanTitle = defaultTitle.trim();
  
  const alt = `${cleanTitle} — Zenemoo ${defaultCategory}`;
  const caption = `${cleanTitle} provided by Zenemoo (Formerly known as QuantumCoders Data Solution).`;

  const imageObjectSchema = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    'url': canonicalUrl,
    'contentUrl': canonicalUrl,
    'name': cleanTitle,
    'description': caption,
    'caption': caption,
    'creditText': 'Zenemoo Data Solutions',
    'copyrightNotice': '© Zenemoo',
    'license': 'https://www.zenemoo.in/#terms',
    'acquireLicensePage': 'https://www.zenemoo.in/#contact',
  };

  return {
    url: canonicalUrl,
    canonicalUrl,
    alt,
    title: `${cleanTitle} | Zenemoo`,
    caption,
    imageObjectSchema,
  };
};
