const CALENDARIFIC_API_KEY = process.env.CALENDARIFIC_API_KEY || 'JFoRbYfjD9uPq3m3u8sIEdrsBTF1tfmh';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours in-memory backend cache

// In-memory backend cache keyed by year (e.g., IN_2026)
const memoryCache = new Map();

/**
 * GET /api/holidays
 * Server-side proxy for Calendarific API v2 to keep API key 100% hidden from frontend
 */
export const getIndianHolidays = async (req, res) => {
  try {
    const year = parseInt(req.query.year || req.params.year || new Date().getFullYear(), 10);
    const country = (req.query.country || req.params.country || 'IN').toUpperCase();
    const cacheKey = `${country}_${year}`;

    // 1. Check server-side memory cache
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
      return res.status(200).json({
        success: true,
        source: 'server_cache',
        data: cached.data,
      });
    }

    // 2. Fetch from Calendarific API v2 server-side
    const apiUrl = `https://calendarific.com/api/v2/holidays?api_key=${encodeURIComponent(CALENDARIFIC_API_KEY)}&country=${encodeURIComponent(country)}&year=${year}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.warn(`Calendarific API HTTP error: ${response.status}`);
      if (cached) {
        return res.status(200).json({ success: true, source: 'server_cache_fallback', data: cached.data });
      }
      return res.status(200).json({ success: true, source: 'fallback', data: [] });
    }

    const json = await response.json();
    const rawHolidays = json?.response?.holidays;

    if (Array.isArray(rawHolidays)) {
      const normalizedHolidays = rawHolidays.map((h) => ({
        name: h.name,
        description: h.description || '',
        date: typeof h.date === 'string' ? h.date : h.date?.iso || '', // YYYY-MM-DD
        type: h.type || [],
        primary_type: h.primary_type || 'Public Holiday',
      }));

      // Update in-memory backend cache
      memoryCache.set(cacheKey, {
        timestamp: Date.now(),
        data: normalizedHolidays,
      });

      return res.status(200).json({
        success: true,
        source: 'calendarific_v2',
        data: normalizedHolidays,
      });
    }

    return res.status(200).json({
      success: true,
      source: 'calendarific_v2_empty',
      data: [],
    });
  } catch (err) {
    console.error('getIndianHolidays Server Error:', err.message);
    return res.status(200).json({
      success: true,
      source: 'server_error_fallback',
      data: [],
    });
  }
};
