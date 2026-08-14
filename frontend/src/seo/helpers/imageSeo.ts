/**
 * Zenemoo Smart Contextual Alt Text Generator
 * Creates rich, non-generic alt text for team members, logos, partners, opportunities, and credentials.
 */

export interface AltContextOptions {
  name?: string;
  role?: string;
  category?: 'team' | 'partner' | 'logo' | 'credential' | 'service' | 'hero' | 'opportunity';
  company?: string;
  language?: string;
}

const INVALID_ALT_PATTERNS = [
  /^image\d*$/i,
  /^img[_-]?\d+/i,
  /^screenshot/i,
  /^file\d*/i,
  /^\d+$/i,
  /\[object\s+object\]/i,
  /^undefined$/i,
  /^null$/i,
];

export const sanitizeAltInput = (rawName?: string): string => {
  if (!rawName || typeof rawName !== 'string') return '';
  const trimmed = rawName.trim();
  if (!trimmed) return '';
  if (INVALID_ALT_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return '';
  }
  return trimmed;
};

export const generateContextualAlt = (options: AltContextOptions): string => {
  const cleanName = sanitizeAltInput(options.name);

  switch (options.category) {
    case 'team':
      return cleanName && options.role
        ? `${cleanName}, ${options.role} at Zenemoo`
        : cleanName
        ? `${cleanName} — Zenemoo Data Specialist`
        : `Zenemoo Specialized Language Data Team Member`;

    case 'partner':
      return cleanName
        ? `${cleanName} Official Partner Logo — Zenemoo`
        : `DesiCrew Solutions Enterprise Partner Logo — Zenemoo`;

    case 'logo':
      return `Zenemoo Official Logo — Enterprise AI Language & Data Solutions`;

    case 'opportunity':
      return cleanName
        ? `Zenemoo ${cleanName} Opportunity Poster`
        : `Zenemoo AI Data Collection Project Opportunity`;

    case 'credential':
      return cleanName || `Government of India MSME (Udyam) Registration Certificate QR Code — Zenemoo`;

    case 'service':
      return cleanName
        ? `${cleanName} Service — Zenemoo AI Data Solutions`
        : `Multilingual Speech Annotation & Data Services — Zenemoo`;

    case 'hero':
    default:
      return cleanName || `Zenemoo Professional Language & AI Data Services`;
  }
};

