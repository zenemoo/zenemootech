/**
 * Zenemoo Smart Contextual Alt Text Generator
 * Creates rich, non-generic alt text for team members, logos, partners, and credentials.
 */

export interface AltContextOptions {
  name?: string;
  role?: string;
  category?: 'team' | 'partner' | 'logo' | 'credential' | 'service' | 'hero';
  company?: string;
  language?: string;
}

export const generateContextualAlt = (options: AltContextOptions): string => {
  const brand = 'Zenemoo Enterprise AI Solutions';

  switch (options.category) {
    case 'team':
      return options.name && options.role
        ? `${options.name}, ${options.role} at Zenemoo`
        : options.name
        ? `${options.name} — Zenemoo Data Specialist`
        : `Zenemoo Specialized Language Data Team Member`;

    case 'partner':
      return options.name
        ? `${options.name} Official Partner Logo — Zenemoo`
        : `DesiCrew Solutions Enterprise Partner Logo — Zenemoo`;

    case 'logo':
      return `Zenemoo Official Logo — Enterprise AI Language & Data Solutions`;

    case 'credential':
      return options.name || `Government of India MSME (Udyam) Registration Certificate QR Code — Zenemoo`;

    case 'service':
      return options.name
        ? `${options.name} Service — Zenemoo AI Data Solutions`
        : `Multilingual Speech Annotation & Data Services — Zenemoo`;

    case 'hero':
    default:
      return options.name || `Zenemoo Professional Language & AI Data Services`;
  }
};
