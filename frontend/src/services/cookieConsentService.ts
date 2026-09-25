/**
 * ==============================================================================
 * ZENEMOO PROFESSIONAL COOKIE CONSENT & PRIVACY SERVICE
 * ==============================================================================
 * Compliant with:
 * - India Digital Personal Data Protection Act (DPDP Act 2023 & Rules 2025)
 * - General Data Protection Regulation (GDPR) standards
 * - ePrivacy Directive & Strict Zero-Egress Browser Local Persistence
 * ==============================================================================
 */

export const CONSENT_STORAGE_KEY = 'zenemoo_cookie_consent';
export const CONSENT_COLLAPSED_KEY = 'zenemoo_cookie_consent_collapsed';
export const CONSENT_VERSION = 1;

export type ConsentStatus = 'undecided' | 'accepted' | 'rejected' | 'custom';

export interface CookieCategories {
  necessary: boolean; // Always true (Security, Auth, CSRF, Anti-Bot Turnstile, Consent state)
  analytics: boolean; // Usage telemetry, performance metrics, site optimization
  marketing: boolean; // Campaign attribution, newsletter tracking
}

export interface ConsentRecord {
  version: number;
  status: ConsentStatus;
  categories: CookieCategories;
  timestamp: string; // ISO 8601 string
}

export const DEFAULT_CATEGORIES: CookieCategories = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const ACCEPTED_ALL_CATEGORIES: CookieCategories = {
  necessary: true,
  analytics: true,
  marketing: true,
};

export const REJECTED_ALL_CATEGORIES: CookieCategories = {
  necessary: true,
  analytics: false,
  marketing: false,
};

// Event dispatched across the browser window on consent updates
export const CONSENT_CHANGE_EVENT = 'zenemoo_consent_changed';

/**
 * Reads the current stored consent record from localStorage.
 * Validates schema and version matching. Returns null if invalid or not set.
 */
export function getStoredConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Check version validity
    if (parsed.version !== CONSENT_VERSION) {
      // Outdated consent schema; prompt user again
      return null;
    }

    if (!parsed.status || !parsed.categories || typeof parsed.categories.necessary !== 'boolean') {
      return null;
    }

    return {
      version: parsed.version,
      status: parsed.status,
      categories: {
        necessary: true, // Always enforce necessary
        analytics: Boolean(parsed.categories.analytics),
        marketing: Boolean(parsed.categories.marketing),
      },
      timestamp: parsed.timestamp || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[CookieConsent] Failed to read stored consent:', err);
    return null;
  }
}

/**
 * Checks if the user has formally made an accept/reject/custom consent choice.
 */
export function hasUserDecidedConsent(): boolean {
  const record = getStoredConsent();
  return record !== null && record.status !== 'undecided';
}

/**
 * Checks if the user temporarily collapsed/minimized the banner without deciding.
 */
export function isBannerTemporarilyCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(CONSENT_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets the temporary collapsed state in sessionStorage.
 */
export function setBannerTemporarilyCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (collapsed) {
      sessionStorage.setItem(CONSENT_COLLAPSED_KEY, 'true');
    } else {
      sessionStorage.removeItem(CONSENT_COLLAPSED_KEY);
    }
  } catch {
    // Ignore storage quota or access errors
  }
}

/**
 * Checks if a specific category of cookies/storage is permitted under current consent.
 */
export function isCategoryAllowed(category: keyof CookieCategories): boolean {
  if (category === 'necessary') return true;
  const record = getStoredConsent();
  if (!record || record.status === 'undecided') return false;
  return Boolean(record.categories[category]);
}

/**
 * Saves a user consent choice to browser storage.
 */
export function saveConsent(
  decision: 'accept_all' | 'reject_all' | 'custom',
  customCategories?: Partial<CookieCategories>
): ConsentRecord {
  let status: ConsentStatus;
  let categories: CookieCategories;

  if (decision === 'accept_all') {
    status = 'accepted';
    categories = { ...ACCEPTED_ALL_CATEGORIES };
  } else if (decision === 'reject_all') {
    status = 'rejected';
    categories = { ...REJECTED_ALL_CATEGORIES };
  } else {
    status = 'custom';
    categories = {
      necessary: true,
      analytics: Boolean(customCategories?.analytics),
      marketing: Boolean(customCategories?.marketing),
    };
  }

  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    status,
    categories,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
      // Remove temporary collapse flag upon explicit decision
      sessionStorage.removeItem(CONSENT_COLLAPSED_KEY);
    } catch (err) {
      console.warn('[CookieConsent] Failed to save consent:', err);
    }

    // Set first-party consent cookie with security flags
    try {
      const maxAgeSeconds = 365 * 24 * 60 * 60; // 1 year
      const isHttps = window.location.protocol === 'https:';
      const cookieVal = encodeURIComponent(JSON.stringify({ status: record.status, version: record.version }));
      document.cookie = `zenemoo_consent=${cookieVal}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${isHttps ? '; Secure' : ''}`;
    } catch {
      // Document cookie access fallback
    }

    // Apply category lifecycle hooks
    applyConsentLifecycle(record.categories);

    // Notify listeners
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: record }));
  }

  return record;
}

/**
 * Withdraws user consent, clears optional tracking state, and reloads the page.
 */
export function withdrawConsent(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Remove consent record and collapse flags
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    sessionStorage.removeItem(CONSENT_COLLAPSED_KEY);

    // 2. Clear consent cookie
    document.cookie = 'zenemoo_consent=; path=/; max-age=0; SameSite=Lax';

    // 3. Clear any optional third-party/analytics cookies if present
    clearOptionalCookies();

    // 4. Notify listeners before reload
    window.dispatchEvent(
      new CustomEvent(CONSENT_CHANGE_EVENT, {
        detail: {
          version: CONSENT_VERSION,
          status: 'undecided',
          categories: DEFAULT_CATEGORIES,
          timestamp: new Date().toISOString(),
        },
      })
    );
  } catch (err) {
    console.warn('[CookieConsent] Error during consent withdrawal:', err);
  }

  // 5. Clean page reload to ensure scripts unmount cleanly
  window.location.reload();
}

/**
 * Clears optional tracking/analytics cookies while strictly preserving necessary auth/session tokens.
 */
function clearOptionalCookies(): void {
  if (typeof document === 'undefined') return;

  const optionalCookiePrefixes = ['_ga', '_gid', '_gat', '_gcl', '_fbp', 'mp_', 'ajs_', '__utm'];
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const eqPos = trimmed.indexOf('=');
    const name = eqPos > -1 ? trimmed.substr(0, eqPos) : trimmed;

    // Check if cookie matches optional analytics/marketing patterns
    const isOptional = optionalCookiePrefixes.some((prefix) => name.startsWith(prefix));
    if (isOptional) {
      document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/; domain=${window.location.hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

/**
 * Executes category-specific initializers/cleaners.
 */
export function applyConsentLifecycle(categories: CookieCategories): void {
  if (typeof window === 'undefined') return;

  // Analytics Category Gate
  if (categories.analytics) {
    // Optional Analytics enabled: initialize any active telemetry listener
    (window as any).__ZENEMOO_ANALYTICS_ENABLED__ = true;
  } else {
    (window as any).__ZENEMOO_ANALYTICS_ENABLED__ = false;
  }

  // Marketing Category Gate
  if (categories.marketing) {
    (window as any).__ZENEMOO_MARKETING_ENABLED__ = true;
  } else {
    (window as any).__ZENEMOO_MARKETING_ENABLED__ = false;
  }
}

/**
 * React hook or helper to listen for consent changes.
 */
export function onConsentChange(callback: (record: ConsentRecord) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<ConsentRecord>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  window.addEventListener(CONSENT_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
  };
}
