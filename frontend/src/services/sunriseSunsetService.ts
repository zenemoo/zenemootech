/**
 * Sunrise & Sunset Data Service — Sunrise-Sunset.org API Integration
 *
 * Features:
 * - Fetches ISO 8601 UTC timestamps using formatted=0
 * - In-memory and localStorage caching per location and date (sunrise-sunset:{timezone}:{YYYY-MM-DD})
 * - In-flight request deduplication to prevent duplicate concurrent calls
 * - Timezone-aware date calculation per location
 * - Timezone-aware formatting in 12H or 24H mode via Intl.DateTimeFormat
 */

export interface SunriseSunsetData {
  sunriseIso: string;
  sunsetIso: string;
  dateStr: string;
  timezone: string;
}

// Memory cache map
const memoryCache = new Map<string, SunriseSunsetData>();

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<SunriseSunsetData | null>>();

const LOCAL_STORAGE_PREFIX = 'zenemoo_sun_cache:';

/**
 * Get date string (YYYY-MM-DD) for a specific IANA timezone
 */
export const getTodayDateInTimezone = (tz: string, now: Date = new Date()): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now); // Returns YYYY-MM-DD
  } catch (_) {
    return now.toISOString().split('T')[0];
  }
};

/**
 * Fetch sunrise and sunset data from Sunrise-Sunset.org for lat/lng/date/timezone
 */
export const fetchSunriseSunset = async (
  lat: number,
  lng: number,
  dateStr: string,
  timezone: string
): Promise<SunriseSunsetData | null> => {
  const cacheKey = `sunrise-sunset:${timezone}:${dateStr}`;

  // 1. Check memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Check localStorage cache
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_PREFIX + cacheKey);
    if (stored) {
      const parsed: SunriseSunsetData = JSON.parse(stored);
      if (parsed && parsed.sunriseIso && parsed.sunsetIso) {
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch (_) {
    // Ignore localStorage read errors
  }

  // 3. Check in-flight request cache
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  // 4. Create new fetch request
  const fetchPromise = (async (): Promise<SunriseSunsetData | null> => {
    try {
      const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateStr}&formatted=0`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      if (data && data.status === 'OK' && data.results) {
        const result: SunriseSunsetData = {
          sunriseIso: data.results.sunrise,
          sunsetIso: data.results.sunset,
          dateStr,
          timezone,
        };

        // Cache in memory and localStorage
        memoryCache.set(cacheKey, result);
        try {
          localStorage.setItem(LOCAL_STORAGE_PREFIX + cacheKey, JSON.stringify(result));
        } catch (_) {}

        return result;
      }
      return null;
    } catch (err) {
      console.warn(`[SunriseSunsetService] Failed to fetch data for ${timezone} (${dateStr}):`, err);
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
};

/**
 * Format an ISO timestamp string (e.g., "2026-08-26T23:44:12+00:00") into target timezone & 12H/24H format
 */
export const formatSunTimeFromIso = (
  isoString: string | null | undefined,
  timeFormat: '12H' | '24H',
  timezone: string
): string => {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';

    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === '12H',
    }).format(d);
  } catch (_) {
    return '--:--';
  }
};
