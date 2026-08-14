import { supabase } from './supabaseClient';

export interface NormalizedHeroEvent {
  id: string;
  title: string;
  shortTitle: string;
  date: string; // YYYY-MM-DD or MM-DD
  endDate?: string;
  icon?: string;
  priority: number; // 1 = Zenemoo Custom, 2 = Major National, 3 = Public
  link?: string;
  source: 'api' | 'supabase' | 'preconfigured' | 'default';
}

const HOLIDAY_CACHE_KEY_PREFIX = 'zenemoo_holiday_cache_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Pre-configured Known Major Indian & Zenemoo Holidays (Guaranteed Failsafe recognition)
const KNOWN_SPECIAL_EVENTS: Omit<NormalizedHeroEvent, 'id' | 'source'>[] = [
  {
    title: 'Republic Day',
    shortTitle: '🎉 HAPPY REPUBLIC DAY →',
    icon: '🎉',
    date: '01-26',
    priority: 2,
  },
  {
    title: 'Utkala Dibasa / Odia New Year',
    shortTitle: '🌟 HAPPY UTKALA DIBASA / ODIA NEW YEAR →',
    icon: '🌟',
    date: '04-01',
    priority: 2,
  },
  {
    title: 'Independence Day',
    shortTitle: '🇮🇳 HAPPY INDEPENDENCE DAY →',
    icon: '🇮🇳',
    date: '08-15',
    priority: 2,
  },
  {
    title: 'Zenemoo Foundation Day',
    shortTitle: '✨ ZENEMOO FOUNDATION & ANNIVERSARY DAY →',
    icon: '✨',
    date: '08-20',
    priority: 1,
  },
  {
    title: 'Ganesh Chaturthi',
    shortTitle: '🕉️ HAPPY GANESH CHATURTHI →',
    icon: '🕉️',
    date: '08-27',
    priority: 2,
  },
  {
    title: 'Gandhi Jayanti',
    shortTitle: '🕊️ HAPPY GANDHI JAYANTI →',
    icon: '🕊️',
    date: '10-02',
    priority: 2,
  },
  {
    title: 'Diwali / Deepavali',
    shortTitle: '🪔 HAPPY DIWALI →',
    icon: '🪔',
    date: '11-01',
    priority: 2,
  },
  {
    title: 'Christmas',
    shortTitle: '🎄 MERRY CHRISTMAS →',
    icon: '🎄',
    date: '12-25',
    priority: 2,
  },
  {
    title: 'New Year',
    shortTitle: '🎆 HAPPY NEW YEAR →',
    icon: '🎆',
    date: '01-01',
    priority: 2,
  },
];

/**
 * Format Date object to YYYY-MM-DD
 */
export const formatDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Format Date object to MM-DD
 */
export const formatMonthDayKey = (d: Date): string => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}-${day}`;
};

/**
 * Generate short title with emoji for Nager.Date API holidays
 */
const generateShortTitle = (name: string): { shortTitle: string; icon: string } => {
  const lower = name.toLowerCase();
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
  else if (lower.includes('eid') || lower.includes('ramzan')) icon = '🌙';

  const cleanName = name
    .replace(/day/gi, 'DAY')
    .toUpperCase()
    .trim();

  const shortTitle = `${icon} HAPPY ${cleanName} →`;
  return { shortTitle, icon };
};

/**
 * Source 1: Fetch Nager.Date Public Holidays for India with LocalStorage Caching
 */
export const fetchApiHolidays = async (year: number): Promise<NormalizedHeroEvent[]> => {
  const cacheKey = `${HOLIDAY_CACHE_KEY_PREFIX}${year}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_EXPIRY_MS && Array.isArray(parsed.data)) {
        return parsed.data;
      }
    }
  } catch (e) {}

  try {
    const response = await fetch(`https://date.nager.at/api/v4/Holidays/IN/${year}`);
    if (response.status === 204 || !response.ok) return [];

    const text = await response.text();
    if (!text || text.trim().length === 0) return [];

    const data = JSON.parse(text);

    if (Array.isArray(data)) {
      const normalized: NormalizedHeroEvent[] = data.map((item: any, idx: number) => {
        const { shortTitle, icon } = generateShortTitle(item.name || item.localName || 'Public Holiday');
        return {
          id: `api_${year}_${idx}_${item.date}`,
          title: item.name || item.localName,
          shortTitle,
          date: item.date, // YYYY-MM-DD
          icon,
          priority: 2,
          source: 'api',
        };
      });

      try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: normalized }));
      } catch (e) {}

      return normalized;
    }
  } catch (err: any) {
    console.warn('Nager.Date API fetch fallback:', err.message);
  }

  return [];
};

/**
 * Source 2: Fetch Supabase Custom Site Events
 */
export const fetchSupabaseEvents = async (): Promise<NormalizedHeroEvent[]> => {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('site_events')
      .select('*')
      .eq('is_active', true);

    if (error || !data) return [];

    return data.map((item: any) => ({
      id: item.id || `sp_${item.date}`,
      title: item.display_title || item.event_name || 'Special Event',
      shortTitle: (item.short_title || `${item.emoji || '✨'} ${item.event_name} →`).toUpperCase(),
      date: item.date,
      endDate: item.end_date || undefined,
      icon: item.emoji || '✨',
      priority: item.priority || 1,
      link: item.link || undefined,
      source: 'supabase',
    }));
  } catch (err) {
    return [];
  }
};

/**
 * Deduplicate and Sort Events by Priority
 */
export const normalizeAndDeduplicateEvents = (
  apiEvents: NormalizedHeroEvent[],
  supabaseEvents: NormalizedHeroEvent[],
  currentYear: number
): NormalizedHeroEvent[] => {
  const map = new Map<string, NormalizedHeroEvent>();

  apiEvents.forEach((ev) => {
    const key = `${ev.date}_${ev.title.toLowerCase().trim()}`;
    map.set(key, ev);
  });

  supabaseEvents.forEach((ev) => {
    const key = `${ev.date}_${ev.title.toLowerCase().trim()}`;
    map.set(key, ev);
  });

  return Array.from(map.values());
};

/**
 * Get active events matching today's date (Handles local date and UTC timezones)
 */
export const getActiveEventsForDate = (
  allEvents: NormalizedHeroEvent[],
  todayDate: Date
): NormalizedHeroEvent[] => {
  const todayStr = formatDateKey(todayDate);
  const monthDayStr = formatMonthDayKey(todayDate);
  const currentYear = todayDate.getFullYear();

  const active: NormalizedHeroEvent[] = [];

  // 1. Check API/Supabase events
  allEvents.forEach((ev) => {
    const isSingleDayMatch = ev.date === todayStr || ev.date.endsWith(monthDayStr);
    const isRangeMatch = ev.endDate && todayStr >= ev.date && todayStr <= ev.endDate;

    if (isSingleDayMatch || isRangeMatch) {
      active.push(ev);
    }
  });

  // 2. Check preconfigured failsafe calendar
  KNOWN_SPECIAL_EVENTS.forEach((known) => {
    if (known.date === monthDayStr) {
      const fullDateStr = `${currentYear}-${known.date}`;
      const exists = active.some((a) => a.date.endsWith(known.date) || a.title.toLowerCase().includes(known.title.toLowerCase()));
      if (!exists) {
        active.push({
          id: `preconfig_${fullDateStr}`,
          title: known.title,
          shortTitle: known.shortTitle,
          date: fullDateStr,
          icon: known.icon,
          priority: known.priority,
          source: 'preconfigured',
        });
      }
    }
  });

  // Sort by priority ascending (1 = Custom Zenemoo, 2 = Major National, 3 = Public)
  return active.sort((a, b) => a.priority - b.priority);
};
