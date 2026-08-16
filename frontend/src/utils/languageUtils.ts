/**
 * Canonical Language Normalization Utility for Frontend
 * Ensures consistent language casing, key normalization, and fuzzy searching.
 */

export const normalizeLanguageKey = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

export const formatLanguageDisplayName = (name: string): string => {
  if (!name || typeof name !== 'string') return 'Other / Unspecified';
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.toLowerCase() === 'other' || trimmed.toLowerCase() === 'unspecified') {
    return 'Other / Unspecified';
  }

  return trimmed
    .split(' ')
    .map((word) => {
      if (word.length <= 3 && word.toUpperCase() === word) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export const isSameLanguage = (langA: string, langB: string): boolean => {
  return normalizeLanguageKey(langA) === normalizeLanguageKey(langB);
};
