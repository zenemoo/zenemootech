import { supabase } from './supabaseClient';
import { holidaysApi } from '../services/api';

export interface NormalizedHeroEvent {
  id: string;
  title: string;
  shortTitle: string;
  date: string; // YYYY-MM-DD or MM-DD
  endDate?: string;
  icon?: string;
  priority: number; // 1 = Zenemoo Custom, 2 = Major National/Religious, 3 = Observance
  link?: string;
  source: 'calendarific' | 'supabase' | 'preconfigured' | 'default';
}

const HOLIDAY_CACHE_KEY_PREFIX = 'calendarific_india_holidays_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Pre-configured Known Major Indian & Zenemoo Holidays (Failsafe Instant Recognition)
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
 * Determine current date in Indian Standard Time (Asia/Kolkata)
 */
export const getIndianLocalDate = (): { todayStr: string; monthDayStr: string; year: number } => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = formatter.format(now); // "YYYY-MM-DD"
    const parts = todayStr.split('-');
    const year = parseInt(parts[0], 10);
    const monthDayStr = `${parts[1]}-${parts[2]}`;
    return { todayStr, monthDayStr, year };
  } catch (e) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return { todayStr: `${y}-${m}-${d}`, monthDayStr: `${m}-${d}`, year: y };
  }
};

/**
 * Source 1: Fetch normalized Calendarific holidays via secure backend proxy
 */
export const fetchCalendarificHolidays = async (year: number): Promise<NormalizedHeroEvent[]> => {
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
    const res = await holidaysApi.getHolidays(year);
    if (res?.data?.success && Array.isArray(res.data.data)) {
      const data = res.data.data;
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
      } catch (e) {}
      return data;
    }
  } catch (err: any) {
    console.warn('Calendarific proxy request handled safely:', err.message);
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
  calendarificEvents: NormalizedHeroEvent[],
  supabaseEvents: NormalizedHeroEvent[]
): NormalizedHeroEvent[] => {
  const map = new Map<string, NormalizedHeroEvent>();

  // 1. Add Calendarific API events
  calendarificEvents.forEach((ev) => {
    const key = `${ev.date}_${ev.title.toLowerCase().trim()}`;
    map.set(key, ev);
  });

  // 2. Add Supabase custom events (overwrites Calendarific for exact same date/name)
  supabaseEvents.forEach((ev) => {
    const key = `${ev.date}_${ev.title.toLowerCase().trim()}`;
    map.set(key, ev);
  });

  return Array.from(map.values());
};

/**
 * Get active events matching today's date in Asia/Kolkata timezone
 */
export const getActiveEventsForToday = (
  allEvents: NormalizedHeroEvent[]
): NormalizedHeroEvent[] => {
  const { todayStr, monthDayStr, year } = getIndianLocalDate();
  const active: NormalizedHeroEvent[] = [];

  // 1. Match API and Supabase events
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
      const fullDateStr = `${year}-${known.date}`;
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

  // Sort by priority ascending (1 = Custom Zenemoo, 2 = Major National/Religious, 3 = Observance)
  return active.sort((a, b) => a.priority - b.priority);
};
