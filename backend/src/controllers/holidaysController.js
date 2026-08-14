const CALENDARIFIC_API_KEY = process.env.CALENDARIFIC_API_KEY || 'JFoRbYfjD9uPq3m3u8sIEdrsBTF1tfmh';
const SERVER_CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory server-side cache by year
const serverHolidayCache = new Map();

/**
 * Helper to generate normalized short titles and icons for Indian holidays
 */
const normalizeHolidayTitleAndIcon = (name) => {
  const lower = (name || '').toLowerCase();
  let icon = '✨';

  if (lower.includes('independence')) icon = '🇮🇳';
  else if (lower.includes('republic')) icon = '🎉';
  else if (lower.includes('diwali') || lower.includes('deepavali')) icon = '🪔';
  else if (lower.includes('ganesh') || lower.includes('vinayaka')) icon = '🕉️';
  else if (lower.includes('holi')) icon = '🎨';
  else if (lower.includes('gandhi')) icon = '🕊️';
  else if (lower.includes('christmas')) icon = '🎄';
  else if (lower.includes('new year')) icon = '🎆';
  else if (lower.includes('good friday') || lower.includes('easter')) icon = '✝️';
  else if (lower.includes('eid') || lower.includes('ramzan') || lower.includes('ramadan')) icon = '🌙';
  else if (lower.includes('dussehra') || lower.includes('dasara') || lower.includes('durga')) icon = '🪔';

  const cleanName = (name || '')
    .replace(/day/gi, 'DAY')
    .toUpperCase()
    .trim();

  const shortTitle = `${icon} HAPPY ${cleanName} →`;
  return { shortTitle, icon };
};

/**
 * GET /api/holidays
 * Server-side proxy for Calendarific API v2 (Keeps API key 100% secret)
 */
export const getHolidays = async (req, res) => {
  try {
    const requestedYear = parseInt(req.query.year, 10) || new Date().getFullYear();
    const cacheKey = `calendarific_india_holidays_${requestedYear}`;

    // 1. Check server-side in-memory cache
    if (serverHolidayCache.has(cacheKey)) {
      const cached = serverHolidayCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < SERVER_CACHE_EXPIRY_MS) {
        return res.status(200).json({
          success: true,
          data: cached.data,
          source: 'server_cache',
        });
      }
    }

    // 2. Fetch from Calendarific API v2
    const url = `https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_API_KEY}&country=IN&year=${requestedYear}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Calendarific API request failed: HTTP ${response.status}`);
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Calendarific API unavailable',
      });
    }

    const json = await response.json();
    const rawHolidays = json?.response?.holidays;

    if (!Array.isArray(rawHolidays)) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Calendarific API returned no holidays array',
      });
    }

    // 3. Normalize into clean frontend structure
    const normalizedList = rawHolidays.map((item, idx) => {
      const holidayName = item.name || 'Public Holiday';
      const { shortTitle, icon } = normalizeHolidayTitleAndIcon(holidayName);
      const isoDate = item.date?.iso || (item.date?.datetime ? `${item.date.datetime.year}-${String(item.date.datetime.month).padStart(2, '0')}-${String(item.date.datetime.day).padStart(2, '0')}` : '');

      return {
        id: `cal_${requestedYear}_${idx}`,
        title: holidayName,
        shortTitle,
        date: isoDate, // YYYY-MM-DD
        icon,
        priority: 2,
        link: null,
        source: 'calendarific',
      };
    });

    // 4. Save to server cache
    serverHolidayCache.set(cacheKey, {
      timestamp: Date.now(),
      data: normalizedList,
    });

    return res.status(200).json({
      success: true,
      data: normalizedList,
      source: 'calendarific_api',
    });
  } catch (err) {
    console.error('getHolidays Server Error:', err.message);
    return res.status(200).json({
      success: true,
      data: [],
      error: 'Calendarific fetch error handled safely',
    });
  }
};
