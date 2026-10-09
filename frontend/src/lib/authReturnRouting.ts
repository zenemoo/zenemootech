/**
 * Zenemoo Authentication Return & Intent Boundary Manager
 * Safely manages post-authentication routing destinations for:
 * - Talent Hub (/talent-hub, /talent-hub/dashboard)
 * - Talent Pools (/pool, /pool/history, /pool/:publicId)
 * Prevents open redirects and ensures strict allowlisted navigation.
 * Uses dual-storage persistence (localStorage + sessionStorage) to survive mobile browser tab suspensions.
 */

const STORAGE_KEY_RETURN = 'zenemoo_auth_return_to';
const STORAGE_KEY_INTENT = 'zenemoo_auth_intent';
const STORAGE_KEY_TIMESTAMP = 'zenemoo_auth_return_ts';

// Strict allowlist validation for internal redirect paths
export function sanitizeAuthReturnPath(rawPath?: string | null): string | null {
  if (!rawPath || typeof rawPath !== 'string') return null;
  const path = rawPath.trim();

  // Reject external URLs, protocols, protocol-relative slashes, or malicious characters
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//') ||
    path.includes('\\') ||
    path.includes('\0') ||
    path.startsWith('javascript:') ||
    path.startsWith('data:')
  ) {
    return null;
  }

  // Split path from query parameters
  const [pathOnly, queryPart] = path.split('?');
  const cleanPath = pathOnly.split('#')[0].replace(/\/+$/, '') || '/';

  // Sanitize query parameter to only allow safe option ID
  let sanitizedQuery = '';
  if (queryPart) {
    try {
      const searchParams = new URLSearchParams(queryPart.split('#')[0]);
      const optionParam = searchParams.get('option');
      if (optionParam && /^[A-Za-z0-9_-]{1,128}$/.test(optionParam)) {
        sanitizedQuery = `?option=${encodeURIComponent(optionParam)}`;
      }
    } catch (_) {}
  }

  // Check approved allowlisted paths
  if (
    cleanPath === '/pool' ||
    cleanPath === '/pool/history' ||
    cleanPath === '/talent-hub' ||
    cleanPath === '/talent-hub/dashboard' ||
    cleanPath === '/talent-hub/profile' ||
    cleanPath === '/talent-hub/opportunities' ||
    cleanPath === '/talent-hub/applications' ||
    cleanPath === '/talent-hub/referrals' ||
    cleanPath === '/talent-hub/team' ||
    cleanPath === '/talent-hub/payments' ||
    cleanPath === '/talent-hub/pools' ||
    cleanPath === '/talent-hub/support' ||
    cleanPath === '/talent-hub/support-history'
  ) {
    return `${cleanPath}${sanitizedQuery}`;
  }

  // Allow specific pool public ID route: /pool/:publicId
  if (cleanPath.startsWith('/pool/')) {
    const publicId = cleanPath.replace('/pool/', '').trim();
    if (/^[A-Za-z0-9_-]{3,64}$/.test(publicId)) {
      return `/pool/${publicId}${sanitizedQuery}`;
    }
  }

  return null;
}

export function setAuthReturnDestination(
  path: string,
  intent: 'pool' | 'pool-history' | 'talent-hub' | 'generic' = 'generic'
) {
  if (typeof window === 'undefined') return;
  const safePath = sanitizeAuthReturnPath(path);
  if (safePath) {
    try {
      const now = Date.now().toString();
      sessionStorage.setItem(STORAGE_KEY_RETURN, safePath);
      sessionStorage.setItem(STORAGE_KEY_INTENT, intent);
      sessionStorage.setItem(STORAGE_KEY_TIMESTAMP, now);

      localStorage.setItem(STORAGE_KEY_RETURN, safePath);
      localStorage.setItem(STORAGE_KEY_INTENT, intent);
      localStorage.setItem(STORAGE_KEY_TIMESTAMP, now);
    } catch (_) {}
  }
}

export function getAuthReturnDestination(): { path: string; intent: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    let rawPath = sessionStorage.getItem(STORAGE_KEY_RETURN);
    let rawIntent = sessionStorage.getItem(STORAGE_KEY_INTENT) || 'generic';

    if (!rawPath) {
      rawPath = localStorage.getItem(STORAGE_KEY_RETURN);
      rawIntent = localStorage.getItem(STORAGE_KEY_INTENT) || 'generic';
      const ts = localStorage.getItem(STORAGE_KEY_TIMESTAMP);
      // Discard stored intents older than 1 hour
      if (ts && Date.now() - parseInt(ts, 10) > 3600000) {
        rawPath = null;
      }
    }

    const safePath = sanitizeAuthReturnPath(rawPath);
    if (safePath) {
      return { path: safePath, intent: rawIntent };
    }
  } catch (_) {}
  return null;
}

export function clearAuthReturnDestination() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY_RETURN);
    sessionStorage.removeItem(STORAGE_KEY_INTENT);
    sessionStorage.removeItem(STORAGE_KEY_TIMESTAMP);

    localStorage.removeItem(STORAGE_KEY_RETURN);
    localStorage.removeItem(STORAGE_KEY_INTENT);
    localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
  } catch (_) {}
}
