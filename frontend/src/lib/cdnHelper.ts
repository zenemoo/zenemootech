/**
 * Zenemoo Branded CDN URL Helper (Frontend)
 * Converts raw Cloudinary URLs to https://www.zenemoo.in/cdn/...
 * and vice-versa, ensuring zero image breaking and full backwards-compatibility.
 */

const CLOUDINARY_REGEX = /\/image\/upload\/(?:(?:(?:[a-z]{1,3}_[a-z0-9_]+|f_auto|q_auto)(?:,[a-z0-9_,]+)*)\/)?(?:v\d+\/)?([^?#]+)/i;

/**
 * Converts any raw Cloudinary URL to https://www.zenemoo.in/cdn/...
 */
export function toBrandedCdnUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Already branded CDN URL
  if (
    trimmed.startsWith('https://www.zenemoo.in/cdn/') ||
    trimmed.startsWith('https://zenemoo.in/cdn/') ||
    trimmed.startsWith('/cdn/')
  ) {
    return trimmed;
  }

  // Check if it's a Cloudinary URL
  if (trimmed.includes('cloudinary.com')) {
    const match = trimmed.match(CLOUDINARY_REGEX);
    if (match && match[1]) {
      const cleanPath = match[1].replace(/^\/+/, '');
      return `https://www.zenemoo.in/cdn/${cleanPath}`;
    }
  }

  return trimmed;
}

/**
 * Converts a branded CDN URL back to direct Cloudinary source URL
 * Useful for image onerror fallback so images never fail to load
 */
export function toCloudinaryDirectUrl(cdnOrRawUrl?: string | null): string {
  if (!cdnOrRawUrl || typeof cdnOrRawUrl !== 'string') return '';
  const trimmed = cdnOrRawUrl.trim();

  if (trimmed.includes('cloudinary.com')) {
    return trimmed;
  }

  let path = '';
  if (trimmed.startsWith('https://www.zenemoo.in/cdn/')) {
    path = trimmed.replace('https://www.zenemoo.in/cdn/', '');
  } else if (trimmed.startsWith('https://zenemoo.in/cdn/')) {
    path = trimmed.replace('https://zenemoo.in/cdn/', '');
  } else if (trimmed.startsWith('/cdn/')) {
    path = trimmed.replace('/cdn/', '');
  }

  if (path) {
    const cleanPath = path.replace(/^\/+/, '');
    return `https://res.cloudinary.com/rwoe0mm9/image/upload/f_auto,q_auto/${cleanPath}`;
  }

  return trimmed;
}

/**
 * Checks if a string is a Cloudinary or Branded CDN URL
 */
export function isCloudinaryOrCdnUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('cloudinary.com') ||
    url.includes('zenemoo.in/cdn/') ||
    url.startsWith('/cdn/')
  );
}
