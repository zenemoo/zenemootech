/**
 * Canonical Language Normalization Utility for Frontend
 * Ensures consistent language casing, key normalization, and fuzzy searching.
 */

export const normalizeLanguageKey = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[\(\)\/\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const formatLanguageDisplayName = (name: string): string => {
  if (!name || typeof name !== 'string') return 'Other / Unspecified';
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.toLowerCase() === 'other' || trimmed.toLowerCase() === 'unspecified') {
    return 'Other / Unspecified';
  }

  // Split into tokens preserving words, parentheses, slashes, dashes
  return trimmed
    .split(/(\s+|\/|\(|\)|-)/)
    .map((token) => {
      if (!token || /^\s+$/.test(token) || token === '/' || token === '(' || token === ')' || token === '-') {
        return token;
      }
      if (token.length <= 3 && token.toUpperCase() === token && /^[A-Z]+$/.test(token)) {
        return token.toUpperCase();
      }
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join('');
};

export const isSameLanguage = (langA: string, langB: string): boolean => {
  return normalizeLanguageKey(langA) === normalizeLanguageKey(langB);
};

