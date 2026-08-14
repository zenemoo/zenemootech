import { supabase } from './supabaseClient';

export interface HeroEvent {
  id: string;
  title: string;
  shortTitle: string;
  date: string; // YYYY-MM-DD
  icon: string;
  priority: number;
  link?: string;
  source: 'api' | 'supabase' | 'default';
}

const getEventEmoji = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('independence') || n.includes('republic') || n.includes('gandhi')) return '🇮🇳';
  if (
    n.includes('ganesh') ||
    n.includes('chaturthi') ||
    n.includes('diwali') ||
    n.includes('dussehra') ||
    n.includes('durga') ||
    n.includes('shivratri') ||
    n.includes('janmashtami') ||
    n.includes('rath')
  ) return '🕉️';
  if (n.includes('christmas') || n.includes('good friday')) return '🎄';
  if (n.includes('eid') || n.includes('ramadan') || n.includes('muharram')) return '🌙';
  if (n.includes('holi')) return '🎨';
  if (n.includes('new year')) return '🎉';
  if (n.includes('zenemoo') || n.includes('anniversary') || n.includes('launch')) return '✨';
  return '✨';
};

const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const fetchTodayHeroEvents = async (): Promise<HeroEvent[]> => {
  const todayStr = getTodayString();
  const year = new Date().getFullYear();

  let apiEvents: HeroEvent[] = [];
  let supabaseEvents: HeroEvent[] = [];

  // 1. Fetch Public Holidays from Nager.Date API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        apiEvents = data
          .filter((h: any) => h.date === todayStr)
          .map((h: any) => {
            const rawTitle = h.localName || h.name || 'Public Holiday';
            const upper = rawTitle.toUpperCase();
            const formattedTitle = upper.startsWith('HAPPY') ? upper : `HAPPY ${upper}`;
            return {
              id: `api_${h.date}_${h.name}`,
              title: formattedTitle,
              shortTitle: formattedTitle,
              date: h.date,
              icon: getEventEmoji(rawTitle),
              priority: 10,
              source: 'api',
            };
          });
      }
    }
  } catch (err) {
    console.warn('Nager.Date API fetch fallback:', err);
  }

  // 2. Fetch Custom Events from Supabase
  try {
    const { data, error } = await supabase
      .from('custom_events')
      .select('*')
      .eq('date', todayStr)
      .eq('is_active', true);

    if (!error && Array.isArray(data) && data.length > 0) {
      supabaseEvents = data.map((item: any) => {
        const titleUpper = (item.title || 'SPECIAL EVENT').toUpperCase();
        return {
          id: `sb_${item.id || item.title}`,
          title: titleUpper.startsWith('HAPPY') ? titleUpper : `HAPPY ${titleUpper}`,
          shortTitle: titleUpper,
          date: item.date || todayStr,
          icon: item.icon || getEventEmoji(item.title || ''),
          priority: item.priority || 20,
          link: item.link || item.url || undefined,
          source: 'supabase',
        };
      });
    }
  } catch (sbErr) {
    console.warn('Supabase custom_events select fallback:', sbErr);
  }

  // 3. Deduplicate events (by normalized title & date), preferring Supabase custom events
  const map = new Map<string, HeroEvent>();

  // Add API events first
  apiEvents.forEach((ev) => {
    const key = `${ev.date}_${ev.shortTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    map.set(key, ev);
  });

  // Supabase custom events override API events if same event exists
  supabaseEvents.forEach((ev) => {
    const key = `${ev.date}_${ev.shortTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    map.set(key, ev);
  });

  const combined = Array.from(map.values());

  // Sort by priority descending
  combined.sort((a, b) => b.priority - a.priority);

  return combined;
};
