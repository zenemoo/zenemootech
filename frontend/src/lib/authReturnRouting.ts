/**
 * Zenemoo Authentication Return & Intent Boundary Manager
 * Safely manages post-authentication routing destinations for:
 * - Talent Hub (/talent-hub, /talent-hub/dashboard)
 * - Talent Pools (/pool, /pool/history, /pool/:publicId)
 * Prevents open redirects and ensures strict allowlisted navigation.
 */

const STORAGE_KEY_RETURN = 'zenemoo_auth_return_to';
const STORAGE_KEY_INTENT = 'zenemoo_auth_intent';

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

  // Normalize path
  const cleanPath = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

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
    return cleanPath;
  }

  // Allow specific pool public ID route: /pool/:publicId
  if (cleanPath.startsWith('/pool/')) {
    const publicId = cleanPath.replace('/pool/', '').trim();
    if (/^[A-Za-z0-9_-]{3,64}$/.test(publicId)) {
      return `/pool/${publicId}`;
    }
  }

  return null;
}

export function setAuthReturnDestination(path: string, intent: 'pool' | 'pool-history' | 'talent-hub' | 'generic' = 'generic') {
  if (typeof window === 'undefined') return;
  const safePath = sanitizeAuthReturnPath(path);
  if (safePath) {
    try {
      sessionStorage.setItem(STORAGE_KEY_RETURN, safePath);
      sessionStorage.setItem(STORAGE_KEY_INTENT, intent);
    } catch (_) {}
  }
}

export function getAuthReturnDestination(): { path: string; intent: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawPath = sessionStorage.getItem(STORAGE_KEY_RETURN);
    const rawIntent = sessionStorage.getItem(STORAGE_KEY_INTENT) || 'generic';
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
  } catch (_) {}
}
