/**
 * Canonical Language Normalization Utility
 * Ensures consistent handling of language names across search, filters, database, and analytics.
 */

export const normalizeLanguageKey = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

export const formatLanguageDisplayName = (name) => {
  if (!name || typeof name !== 'string') return 'Other / Unspecified';
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.toLowerCase() === 'other' || trimmed.toLowerCase() === 'unspecified') {
    return 'Other / Unspecified';
  }

  // Preserve standard title casing for standard languages
  return trimmed
    .split(' ')
    .map((word) => {
      if (word.length <= 3 && word.toUpperCase() === word) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export const isSameLanguage = (langA, langB) => {
  return normalizeLanguageKey(langA) === normalizeLanguageKey(langB);
};
