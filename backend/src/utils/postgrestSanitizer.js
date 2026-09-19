/**
 * PostgREST Dynamic Filter Sanitizer
 * 
 * Protects against PostgREST filter injection where user-supplied inputs
 * are interpolated into `.or(...)` or `.and(...)` query strings.
 * 
 * In PostgREST syntax:
 * - Comma (,) separates conditions in .or() or .and()
 * - Parentheses () group conditions
 * - Colons (:) specify operators or JSON paths
 * - Quotes ("') and backslashes (\) escape syntax
 * - Wildcards (% and _) alter LIKE/ILIKE patterns
 */

/**
 * Sanitizes a search string for safe interpolation inside PostgREST .or()/.ilike() expressions.
 * Preserves standard alphanumeric characters, spaces, and safe email/domain punctuation (@, ., -).
 * Strips PostgREST control characters (, ( ) " ' \ : ; % _) and caps length.
 * 
 * @param {string} input - User-controlled search term
 * @param {number} [maxLength=100] - Maximum allowed length
 * @returns {string} Sanitized string safe for query interpolation
 */
export function sanitizePostgrestFilter(input, maxLength = 100) {
  if (input === undefined || input === null) return '';
  const str = String(input);
  if (!str.trim()) return '';

  // Limit length to prevent DoS via excessive query strings
  let sanitized = str.slice(0, maxLength);

  // Remove PostgREST control characters, condition separators, quotes, and wildcards
  sanitized = sanitized.replace(/[,()"'\\:;%_]/g, ' ');

  // Collapse consecutive whitespace to single space and trim
  return sanitized.replace(/\s+/g, ' ').trim();
}

/**
 * Sanitizes an exact identifier (UUID, code, email, ID) for safe interpolation in .or(`id.eq.${val}`)
 * Strips any character not permitted in UUIDs, emails, or alphanumeric IDs.
 * 
 * @param {string} input - User-controlled identifier
 * @param {number} [maxLength=100] - Maximum allowed length
 * @returns {string} Sanitized identifier
 */
export function sanitizePostgrestExact(input, maxLength = 100) {
  if (input === undefined || input === null) return '';
  const str = String(input);
  if (!str.trim()) return '';

  const sliced = str.slice(0, maxLength).trim();
  // Allow only alphanumeric, hyphen, underscore, period, and @ (valid for IDs, codes, UUIDs, emails)
  return sliced.replace(/[^a-zA-Z0-9_\-@.]/g, '');
}

export default {
  sanitizePostgrestFilter,
  sanitizePostgrestExact,
};
