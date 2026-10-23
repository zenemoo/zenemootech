import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../config/supabase.js';
import { adminEventService } from './adminEventService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_STORE_DIR = path.resolve(__dirname, '../database');
const LOCAL_STORE_FILE = path.resolve(LOCAL_STORE_DIR, 'booking_availability_store.json');

/**
 * Standard Default Configuration: 10:00 AM – 10:00 PM, 7 days a week in Asia/Kolkata
 * Preserves 100% backward compatibility if no custom rules exist yet.
 */
export const DEFAULT_WEEKLY_HOURS = {
  0: { day: 'Sunday', active: true, ranges: [{ start: '10:00', end: '22:30' }] },
  1: { day: 'Monday', active: true, ranges: [{ start: '10:00', end: '22:30' }] },
  2: { day: 'Tuesday', active: true, ranges: [{ start: '10:00', end: '22:30' }] },
  3: { day: 'Wednesday', active: true, ranges: [{ start: '10:00', end: '22:30' }] },
  4: { day: 'Thursday', active: true, ranges: [{ start: '10:00', end: '22:30' }] },
  5: { day: 'Friday', active: true, ranges: [{ start: '10:00', end: '22:30' }] },
  6: { day: 'Saturday', active: true, ranges: [{ start: '10:00', end: '22:30' }] },
};

export const DEFAULT_AVAILABILITY_CONFIG = {
  schedule_name: 'Default Working Hours',
  timezone: 'Asia/Kolkata',
  slot_duration: 30,
  lead_buffer_minutes: 120,
  weekly_hours: DEFAULT_WEEKLY_HOURS,
  date_overrides: [],
  is_active: true,
};

// In-Memory Cache (Short 60s TTL or purged immediately upon admin save)
let memoryConfigCache = null;
let memoryCacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Helper: Parse "HH:mm", "H:mm", or "h:mm AM/PM" string into total minutes from midnight
 */
export const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return -1;
  const clean = timeStr.trim();

  // 12-hour format: e.g. "3:00 PM", "07:30 PM", "12:00 AM", "12:00 PM"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (h < 1 || h > 12 || m < 0 || m > 59) return -1;
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  // 24-hour format: "HH:mm" or "H:mm" (00:00 to 24:00)
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    if (h < 0 || h > 24 || m < 0 || m > 59) return -1;
    if (h === 24 && m > 0) return -1;
    return h * 60 + m;
  }

  return -1;
};

/**
 * Helper: Convert total minutes into normalized "HH:mm" string
 */
export const minutesToTimeStr = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Helper: Normalize any valid time string to canonical "HH:mm"
 */
export const normalizeTimeStr = (timeStr) => {
  const mins = timeToMinutes(timeStr);
  if (mins < 0) return timeStr;
  return minutesToTimeStr(mins);
};

/**
 * Helper: Sort time ranges by start time ascending and normalize to "HH:mm"
 */
export const sortAndNormalizeRanges = (ranges) => {
  if (!Array.isArray(ranges)) return [];
  return [...ranges]
    .map((r) => ({
      start: normalizeTimeStr(r.start),
      end: normalizeTimeStr(r.end),
    }))
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
};

/**
 * Helper: Get current date in target timezone as YYYY-MM-DD
 */
export const getTodayInTz = (tz = 'Asia/Kolkata') => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
};

/**
 * Helper: Add days to a YYYY-MM-DD date string safely using UTC
 */
export const addDaysToDateStr = (dateStr, days) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper: Generate array of YYYY-MM-DD dates in range [start, end] inclusive
 */
export const getDatesInRange = (startDateStr, endDateStr, maxDays = 365) => {
  if (!startDateStr || !endDateStr || startDateStr > endDateStr) return [];
  const dates = [];
  let cur = startDateStr;
  let count = 0;
  while (cur <= endDateStr && count < maxDays) {
    dates.push(cur);
    cur = addDaysToDateStr(cur, 1);
    count++;
  }
  return dates;
};

/**
 * Validate an array of time ranges:
 * - Must be array
 * - Each range must have valid start and end (HH:mm or h:mm A)
 * - start < end (strictly positive duration)
 * - duration >= 30 mins
 * - aligned to 30-minute intervals
 * - Sort ranges by start time before overlap validation
 * - Two ranges overlap ONLY when next.start < previous.end
 * - Adjacent ranges (next.start >= previous.end) are allowed
 */
export const validateTimeRanges = (ranges) => {
  if (!Array.isArray(ranges)) {
    return { valid: false, error: 'Ranges must be an array.' };
  }

  const parsed = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (!r || typeof r !== 'object') {
      return { valid: false, error: `Invalid range format at index ${i + 1}.` };
    }
    const startMins = timeToMinutes(r.start);
    const endMins = timeToMinutes(r.end);

    if (startMins < 0 || endMins < 0) {
      return { valid: false, error: `Invalid time format in range [${r.start || ''} - ${r.end || ''}]. Use HH:mm format.` };
    }

    if (startMins >= endMins) {
      return { valid: false, error: `End time (${r.end}) must be after start time (${r.start}).` };
    }

    if (endMins - startMins < 30) {
      return { valid: false, error: `Time range [${r.start} - ${r.end}] must be at least 30 minutes.` };
    }

    // Check alignment to 30-minute intervals
    if (startMins % 30 !== 0 || endMins % 30 !== 0) {
      return { valid: false, error: `Time range [${r.start} - ${r.end}] must align with 30-minute intervals (e.g. :00 or :30).` };
    }

    parsed.push({
      startMins,
      endMins,
      normStart: minutesToTimeStr(startMins),
      normEnd: minutesToTimeStr(endMins),
      origStart: r.start,
      origEnd: r.end,
    });
  }

  // Sort ranges by start time ascending before overlap validation
  const sorted = [...parsed].sort((a, b) => a.startMins - b.startMins);

  // Two ranges overlap only when next.start < previous.end
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (curr.startMins < prev.endMins) {
      return {
        valid: false,
        error: `Time ranges [${prev.normStart}-${prev.normEnd}] and [${curr.normStart}-${curr.normEnd}] overlap.`,
      };
    }
  }

  return { valid: true };
};

/**
 * Validate weekly hours payload (Sunday 0 to Saturday 6)
 */
export const validateWeeklyHours = (weeklyHours) => {
  if (!weeklyHours || typeof weeklyHours !== 'object') {
    return { valid: false, error: 'weekly_hours must be an object with days 0 through 6.' };
  }

  for (let day = 0; day <= 6; day++) {
    const dayConfig = weeklyHours[day] || weeklyHours[String(day)];
    if (!dayConfig || typeof dayConfig !== 'object') {
      return { valid: false, error: `Missing configuration for day ${day}.` };
    }

    if (dayConfig.active) {
      if (!Array.isArray(dayConfig.ranges) || dayConfig.ranges.length === 0) {
        return { valid: false, error: `Active day ${dayConfig.day || day} must have at least one time range.` };
      }

      const rangeValidation = validateTimeRanges(dayConfig.ranges);
      if (!rangeValidation.valid) {
        return { valid: false, error: `${dayConfig.day || `Day ${day}`}: ${rangeValidation.error}` };
      }
    }
  }

  return { valid: true };
};

/**
 * Validate date overrides payload
 */
export const validateDateOverrides = (overrides) => {
  if (!Array.isArray(overrides)) {
    return { valid: false, error: 'date_overrides must be an array.' };
  }

  const seenDates = new Set();

  for (let i = 0; i < overrides.length; i++) {
    const ovr = overrides[i];
    if (!ovr || typeof ovr !== 'object') {
      return { valid: false, error: `Override at index ${i} is invalid.` };
    }

    if (!ovr.date || !/^\d{4}-\d{2}-\d{2}$/.test(ovr.date)) {
      return { valid: false, error: `Override at index ${i} has invalid date format. Expected YYYY-MM-DD.` };
    }

    const type = ovr.type || (ovr.is_available === false ? 'unavailable' : 'custom_hours');
    if (!['unavailable', 'custom_hours', 'blocked_range'].includes(type)) {
      return { valid: false, error: `Override type must be 'unavailable', 'custom_hours', or 'blocked_range'.` };
    }

    if (type === 'custom_hours' || type === 'blocked_range') {
      if (!Array.isArray(ovr.ranges) || ovr.ranges.length === 0) {
        return { valid: false, error: `Override on ${ovr.date} (${type}) requires at least one time range.` };
      }
      const rangeVal = validateTimeRanges(ovr.ranges);
      if (!rangeVal.valid) {
        return { valid: false, error: `Override on ${ovr.date}: ${rangeVal.error}` };
      }
    }

    // Only allow one full-day closure or custom-hours per date
    if (type === 'unavailable' || type === 'custom_hours') {
      if (seenDates.has(ovr.date)) {
        return { valid: false, error: `Multiple overrides found for date ${ovr.date}. Combine them or use a single override per date.` };
      }
      seenDates.add(ovr.date);
    }
  }

  return { valid: true };
};

/**
 * Ensure local backup directory and store file exist
 */
const ensureLocalStorage = () => {
  try {
    if (!fs.existsSync(LOCAL_STORE_DIR)) {
      fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_STORE_FILE)) {
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(DEFAULT_AVAILABILITY_CONFIG, null, 2), 'utf8');
    }
  } catch (e) {
    console.warn('[Availability Store] Local storage init note:', e.message);
  }
};

/**
 * Read backup config from local JSON file
 */
const loadFromLocalStore = () => {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.weekly_hours) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Availability Store] Local store read note:', e.message);
  }
  return DEFAULT_AVAILABILITY_CONFIG;
};

/**
 * Write backup config to local JSON file
 */
const saveToLocalStore = (config) => {
  try {
    ensureLocalStorage();
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Availability Store] Local store write note:', e.message);
  }
};

export class BookingAvailabilityService {
  constructor() {
    ensureLocalStorage();
  }

  /**
   * Clear in-memory cache immediately upon admin updates
   */
  invalidateCache() {
    memoryConfigCache = null;
    memoryCacheExpiry = 0;
  }

  /**
   * Load active availability configuration:
   * 1. In-memory cache (if valid)
   * 2. Supabase `booking_availability_settings` table
   * 3. Local disk fallback (`booking_availability_store.json`)
   * 4. Hardcoded default 10:00 AM - 10:00 PM 7-day schedule
   */
  async getConfig() {
    const now = Date.now();
    if (memoryConfigCache && now < memoryCacheExpiry) {
      return memoryConfigCache;
    }

    // Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('booking_availability_settings')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data && data.weekly_hours) {
          const config = {
            id: data.id,
            schedule_name: data.schedule_name || 'Default Working Hours',
            timezone: data.timezone || 'Asia/Kolkata',
            slot_duration: data.slot_duration || 30,
            lead_buffer_minutes: data.lead_buffer_minutes || 120,
            weekly_hours: data.weekly_hours,
            date_overrides: Array.isArray(data.date_overrides) ? data.date_overrides : [],
            updated_at: data.updated_at,
            updated_by: data.updated_by,
          };

          memoryConfigCache = config;
          memoryCacheExpiry = now + CACHE_TTL_MS;
          // Synchronize local store for offline resilience
          saveToLocalStore(config);
          return config;
        }
      } catch (err) {
        console.warn('[Booking Availability Service] Supabase read fallback note:', err.message);
      }
    }

    // Fallback to local store or default
    const local = loadFromLocalStore();
    memoryConfigCache = local;
    memoryCacheExpiry = now + CACHE_TTL_MS;
    return local;
  }

  /**
   * Save availability configuration (Admin protected)
   */
  async saveConfig(payload, adminUser = 'admin') {
    const { weekly_hours, date_overrides, timezone = 'Asia/Kolkata', slot_duration = 30, lead_buffer_minutes = 120, schedule_name = 'Default Working Hours' } = payload;

    const weeklyVal = validateWeeklyHours(weekly_hours);
    if (!weeklyVal.valid) {
      throw new Error(weeklyVal.error);
    }

    const overrideVal = validateDateOverrides(date_overrides || []);
    if (!overrideVal.valid) {
      throw new Error(overrideVal.error);
    }

    // Past-date protection: prevent adding or modifying overrides on past dates
    const tz = timezone.trim() || 'Asia/Kolkata';
    const todayInTz = getTodayInTz(tz);
    const existingConfig = await this.getConfig();
    const existingMap = new Map((existingConfig.date_overrides || []).map((o) => [o.id || o.date, o]));

    for (const ovr of (date_overrides || [])) {
      if (ovr.date < todayInTz) {
        const existingOvr = existingMap.get(ovr.id) || existingConfig.date_overrides?.find((o) => o.date === ovr.date);
        if (!existingOvr) {
          throw new Error(`Cannot create date override for past date (${ovr.date}). Past dates before ${todayInTz} in ${tz} are read-only.`);
        }
        if (
          JSON.stringify(sortAndNormalizeRanges(existingOvr.ranges)) !== JSON.stringify(sortAndNormalizeRanges(ovr.ranges)) ||
          existingOvr.type !== ovr.type ||
          existingOvr.is_available !== ovr.is_available
        ) {
          throw new Error(`Cannot modify date override on past date (${ovr.date}). Historical records are read-only.`);
        }
      }
    }

    // Canonical sorting and normalization for weekly hours and overrides
    const cleanWeeklyHours = {};
    for (let day = 0; day <= 6; day++) {
      const dayConfig = weekly_hours[day] || weekly_hours[String(day)];
      if (dayConfig) {
        cleanWeeklyHours[day] = {
          ...dayConfig,
          ranges: dayConfig.active ? sortAndNormalizeRanges(dayConfig.ranges) : [],
        };
      }
    }

    const cleanOverrides = (date_overrides || []).map((ovr) => ({
      ...ovr,
      ranges: sortAndNormalizeRanges(ovr.ranges || []),
    }));

    const cleanConfig = {
      schedule_name: schedule_name.trim() || 'Default Working Hours',
      timezone: tz,
      slot_duration: parseInt(slot_duration, 10) || 30,
      lead_buffer_minutes: parseInt(lead_buffer_minutes, 10) || 120,
      weekly_hours: cleanWeeklyHours,
      date_overrides: cleanOverrides,
      is_active: true,
      updated_at: new Date().toISOString(),
      updated_by: typeof adminUser === 'string' ? adminUser : adminUser?.email || 'admin',
    };

    // Save to Supabase if available
    let savedRow = null;
    if (supabase) {
      try {
        const { data: existing } = await supabase
          .from('booking_availability_settings')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          const { data, error } = await supabase
            .from('booking_availability_settings')
            .update(cleanConfig)
            .eq('id', existing.id)
            .select()
            .single();

          if (!error && data) savedRow = data;
        } else {
          const { data, error } = await supabase
            .from('booking_availability_settings')
            .insert([cleanConfig])
            .select()
            .single();

          if (!error && data) savedRow = data;
        }
      } catch (err) {
        console.warn('[Booking Availability Service] Supabase save note:', err.message);
      }
    }

    // Always persist to local store and invalidate cache
    saveToLocalStore(cleanConfig);
    this.invalidateCache();

    return savedRow || cleanConfig;
  }

  /**
   * Helper: Convert local date and time into UTC ISO string based on timezone
   */
  getUtcIsoFromLocal(dateStr, hour, min, tz = 'Asia/Kolkata') {
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetTimeMs = Date.UTC(year, month - 1, day, hour, min, 0, 0);

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(new Date(targetTimeMs));
    const p = {};
    parts.forEach(({ type, value }) => { p[type] = value; });

    const tzHour = parseInt(p.hour, 10) % 24;
    const tzMin = parseInt(p.minute, 10);
    const tzDay = parseInt(p.day, 10);

    let dayDiff = tzDay - day;
    if (dayDiff > 1) dayDiff = -1;
    if (dayDiff < -1) dayDiff = 1;

    const tzMinutesTotal = (dayDiff * 24 + tzHour) * 60 + tzMin;
    const utcMinutesTotal = hour * 60 + min;
    const offsetMinutes = tzMinutesTotal - utcMinutesTotal;

    const realUtcMs = targetTimeMs - (offsetMinutes * 60 * 1000);
    return new Date(realUtcMs).toISOString();
  }

  /**
   * Helper: Format local HH:mm into user-friendly 12H display string (e.g. 10:00 AM)
   */
  formatTimeLabel(hour, min) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const displayMin = String(min).padStart(2, '0');
    return `${displayHour}:${displayMin} ${period}`;
  }

  /**
   * Resolve day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   * for a given YYYY-MM-DD date string in the target timezone
   */
  getDayOfWeekInTz(dateStr, tz = 'Asia/Kolkata') {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create UTC midday timestamp to avoid edge-of-day offsets
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
    const shortDay = dayFormatter.format(d).toLowerCase();
    const map = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    return map[shortDay] !== undefined ? map[shortDay] : new Date(dateStr).getDay();
  }

  /**
   * Calculate affected dates based on scope
   * Scopes:
   * 1. 'this_date' -> [baseDate]
   * 2. 'every_weekday' -> [] (affects recurring weekly schedule)
   * 3. 'selected_dates' -> [targetDates...]
   * 4. 'next_30_days_weekday' -> all matching weekdays within 30 days of baseDate
   * 5. 'custom_range' -> all dates in [rangeStart, rangeEnd] filtered by optional weekdaysFilter
   */
  calculateAffectedDates(params) {
    const {
      scope,
      baseDate,
      targetDates = [],
      rangeStart,
      rangeEnd,
      weekdaysFilter = [],
      timezone = 'Asia/Kolkata',
    } = params || {};

    if (!scope) throw new Error('Scope is required.');

    const todayInTz = getTodayInTz(timezone);

    switch (scope) {
      case 'this_date': {
        if (!baseDate || !/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
          throw new Error('Valid baseDate (YYYY-MM-DD) is required for this_date scope.');
        }
        if (baseDate < todayInTz) {
          throw new Error(`Cannot edit availability for past date (${baseDate}). Dates before ${todayInTz} in ${timezone} are read-only.`);
        }
        return [baseDate];
      }

      case 'every_weekday': {
        // Recurring schedule applies to all future occurrences of that weekday
        return [];
      }

      case 'selected_dates': {
        if (!Array.isArray(targetDates) || targetDates.length === 0) {
          throw new Error('At least one target date must be selected.');
        }
        const validDates = targetDates
          .filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort();
        const futureDates = validDates.filter((d) => d >= todayInTz);
        if (futureDates.length === 0) {
          throw new Error(`All selected dates are in the past (before ${todayInTz}). No future dates to update.`);
        }
        return Array.from(new Set(futureDates));
      }

      case 'next_30_days_weekday': {
        if (!baseDate || !/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
          throw new Error('Valid baseDate (YYYY-MM-DD) is required.');
        }
        const targetDow = this.getDayOfWeekInTz(baseDate, timezone);
        const dates = [];
        const startDate = baseDate < todayInTz ? todayInTz : baseDate;
        for (let i = 0; i < 30; i++) {
          const dStr = addDaysToDateStr(startDate, i);
          if (dStr >= todayInTz && this.getDayOfWeekInTz(dStr, timezone) === targetDow) {
            dates.push(dStr);
          }
        }
        return dates;
      }

      case 'custom_range': {
        if (!rangeStart || !rangeEnd) {
          throw new Error('Both rangeStart and rangeEnd (YYYY-MM-DD) are required.');
        }
        if (rangeStart > rangeEnd) {
          throw new Error('rangeStart cannot be after rangeEnd.');
        }
        if (rangeEnd < todayInTz) {
          throw new Error(`Date range ${rangeStart} to ${rangeEnd} is completely in the past (before ${todayInTz}). No future dates to update.`);
        }
        const effectiveStart = rangeStart < todayInTz ? todayInTz : rangeStart;
        const allDays = getDatesInRange(effectiveStart, rangeEnd, 365);
        if (Array.isArray(weekdaysFilter) && weekdaysFilter.length > 0) {
          const filterSet = new Set(weekdaysFilter.map(Number));
          return allDays.filter((d) => filterSet.has(this.getDayOfWeekInTz(d, timezone)));
        }
        return allDays;
      }

      default:
        throw new Error(`Unsupported scope: ${scope}. Supported scopes: this_date, every_weekday, selected_dates, next_30_days_weekday, custom_range.`);
    }
  }

  /**
   * Determine effective schedule for a date using authoritative configuration
   */
  async getEffectiveScheduleForDate(dateStr, tz = 'Asia/Kolkata') {
    const config = await this.getConfig();
    return this.getDateEffectiveAvailability(dateStr, config);
  }

  /**
   * Helper: Determine effective availability for a calendar date
   * Status can be: 'closed' | 'custom' | 'blocked' | 'normal' | 'inactive'
   */
  getDateEffectiveAvailability(dateStr, config) {
    if (!config) return { status: 'normal', isWorking: true, ranges: [] };
    const tz = config.timezone || 'Asia/Kolkata';
    const overrides = (config.date_overrides || []).filter((o) => o.date === dateStr);
    
    // 1. Full day closure check
    const fullClosure = overrides.find((o) => o.type === 'unavailable' || o.is_available === false);
    if (fullClosure) {
      return {
        status: 'closed',
        isWorking: false,
        reason: fullClosure.reason || 'Closed',
        ranges: [],
        blockedRanges: [],
        overrides,
      };
    }

    // 2. Custom hours check
    const customHours = overrides.find((o) => o.type === 'custom_hours' && Array.isArray(o.ranges));
    const blockedOverrides = overrides.filter((o) => o.type === 'blocked_range' && Array.isArray(o.ranges));
    const blockedRanges = [];
    blockedOverrides.forEach((bo) => {
      blockedRanges.push(...bo.ranges);
    });

    if (customHours) {
      return {
        status: blockedRanges.length > 0 ? 'blocked' : 'custom',
        isWorking: true,
        reason: customHours.reason || (blockedRanges.length > 0 ? blockedOverrides[0]?.reason : 'Custom Hours'),
        ranges: customHours.ranges,
        blockedRanges,
        overrides,
      };
    }

    // 3. Weekly schedule check
    const dow = this.getDayOfWeekInTz(dateStr, tz);
    const weeklyDay = (config.weekly_hours || {})[dow] || (config.weekly_hours || {})[String(dow)];
    
    if (!weeklyDay || !weeklyDay.active || !Array.isArray(weeklyDay.ranges) || weeklyDay.ranges.length === 0) {
      return {
        status: 'inactive',
        isWorking: false,
        reason: 'Weekly Non-working Day',
        ranges: [],
        blockedRanges: [],
        overrides,
      };
    }

    if (blockedRanges.length > 0) {
      return {
        status: 'blocked',
        isWorking: true,
        reason: blockedOverrides[0]?.reason || 'Partially Blocked',
        ranges: weeklyDay.ranges,
        blockedRanges,
        overrides,
      };
    }

    return {
      status: 'normal',
      isWorking: true,
      reason: 'Normal Working Hours',
      ranges: weeklyDay.ranges,
      blockedRanges: [],
      overrides: [],
    };
  }

  /**
   * Apply availability rule with explicit scope selection
   */
  async applyRuleScope(params, adminUser = 'admin') {
    const {
      operation, // 'change_hours' | 'close_day' | 'block_range' | 'restore_weekly'
      scope,     // 'this_date' | 'every_weekday' | 'selected_dates' | 'next_30_days_weekday' | 'custom_range'
      baseDate,  // 'YYYY-MM-DD'
      targetDates = [],
      rangeStart,
      rangeEnd,
      weekdaysFilter = [],
      ranges = [],
      reason = '',
    } = params || {};

    if (!operation) throw new Error('Operation is required.');
    if (!scope) throw new Error('Scope is required.');

    const currentConfig = await this.getConfig();
    const newConfig = JSON.parse(JSON.stringify(currentConfig));
    const tz = newConfig.timezone || 'Asia/Kolkata';
    const todayInTz = getTodayInTz(tz);

    // 1. Recurring weekly update
    if (scope === 'every_weekday') {
      if (!baseDate || !/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
        throw new Error('Valid baseDate is required to determine the weekday.');
      }
      const dow = this.getDayOfWeekInTz(baseDate, tz);
      const dayName = (newConfig.weekly_hours[dow] && newConfig.weekly_hours[dow].day) || `Day ${dow}`;

      if (operation === 'block_range') {
        throw new Error('Partial-day blocking cannot be applied as a recurring weekly schedule. Please apply to specific dates or date ranges.');
      }

      if (operation === 'close_day') {
        newConfig.weekly_hours[dow].active = false;
      } else if (operation === 'change_hours') {
        const val = validateTimeRanges(ranges);
        if (!val.valid) throw new Error(val.error);
        newConfig.weekly_hours[dow].active = true;
        newConfig.weekly_hours[dow].ranges = sortAndNormalizeRanges(ranges);
      } else if (operation === 'restore_weekly') {
        newConfig.weekly_hours[dow].active = true;
        newConfig.weekly_hours[dow].ranges = DEFAULT_WEEKLY_HOURS[dow].ranges;
      }

      const saved = await this.saveConfig(newConfig, adminUser);
      return {
        success: true,
        affectedScope: 'every_weekday',
        dayOfWeek: dow,
        dayName,
        affectedDates: [],
        affectedCount: 'all_future',
        skippedPastCount: 0,
        config: saved,
      };
    }

    // 2. Finite date overrides scope
    const affectedDates = this.calculateAffectedDates({
      scope,
      baseDate,
      targetDates,
      rangeStart,
      rangeEnd,
      weekdaysFilter,
      timezone: tz,
    });

    if (affectedDates.length === 0) {
      throw new Error('No valid future dates found to apply this rule.');
    }

    // Compute how many past dates were requested and skipped
    let skippedPastCount = 0;
    if (scope === 'selected_dates' && Array.isArray(targetDates)) {
      skippedPastCount = targetDates.filter((d) => typeof d === 'string' && d < todayInTz).length;
    } else if (scope === 'custom_range' && rangeStart < todayInTz) {
      const allRawDays = getDatesInRange(rangeStart, rangeEnd, 365);
      const pastDays = allRawDays.filter((d) => d < todayInTz);
      if (Array.isArray(weekdaysFilter) && weekdaysFilter.length > 0) {
        const filterSet = new Set(weekdaysFilter.map(Number));
        skippedPastCount = pastDays.filter((d) => filterSet.has(this.getDayOfWeekInTz(d, tz))).length;
      } else {
        skippedPastCount = pastDays.length;
      }
    }

    if (operation === 'change_hours' || operation === 'block_range') {
      const val = validateTimeRanges(ranges);
      if (!val.valid) throw new Error(val.error);
    }

    const cleanRanges = sortAndNormalizeRanges(ranges);

    // Apply changes across all affected dates
    for (const d of affectedDates) {
      if (operation === 'restore_weekly') {
        // Remove all overrides for this date
        newConfig.date_overrides = newConfig.date_overrides.filter((o) => o.date !== d);
      } else if (operation === 'close_day') {
        // Remove any existing unavailable or custom_hours
        newConfig.date_overrides = newConfig.date_overrides.filter(
          (o) => o.date !== d || o.type === 'blocked_range'
        );
        newConfig.date_overrides.push({
          id: `ovr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          date: d,
          type: 'unavailable',
          is_available: false,
          ranges: [],
          reason: reason.trim() || 'Holiday — Office Closed',
          created_at: new Date().toISOString(),
        });
      } else if (operation === 'change_hours') {
        // Remove any existing unavailable or custom_hours
        newConfig.date_overrides = newConfig.date_overrides.filter(
          (o) => o.date !== d || o.type === 'blocked_range'
        );
        newConfig.date_overrides.push({
          id: `ovr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          date: d,
          type: 'custom_hours',
          is_available: true,
          ranges: cleanRanges,
          reason: reason.trim() || 'Custom Hours',
          created_at: new Date().toISOString(),
        });
      } else if (operation === 'block_range') {
        // Check if date is currently fully closed
        const isClosed = newConfig.date_overrides.some(
          (o) => o.date === d && (o.type === 'unavailable' || o.is_available === false)
        );
        if (isClosed) {
          throw new Error(`Cannot add time block on ${d} because the date is marked fully closed. Reopen the date or set custom hours instead.`);
        }
        newConfig.date_overrides.push({
          id: `ovr_blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          date: d,
          type: 'blocked_range',
          is_available: true,
          ranges: cleanRanges,
          reason: reason.trim() || 'Blocked Time Window',
          created_at: new Date().toISOString(),
        });
      }
    }

    const saved = await this.saveConfig(newConfig, adminUser);
    return {
      success: true,
      affectedScope: scope,
      affectedDates,
      affectedCount: affectedDates.length,
      skippedPastCount,
      config: saved,
    };
  }

  /**
   * Public Availability Calculator
   * Generates permitted 30-minute slots filtered by:
   * 1. Date overrides (full-day unavailable / custom hours / blocked intervals)
   * 2. Weekly working hours
   * 3. Current time (past slots)
   * 4. Already booked slots in call_bookings (confirmed or pending)
   */
  async getAvailableSlots(selectedDate, clientTimezone = 'Asia/Kolkata') {
    if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      throw new Error('Valid date (YYYY-MM-DD) is required.');
    }

    const config = await this.getConfig();
    const availabilityTz = config.timezone || 'Asia/Kolkata';

    // 1. Check Date Overrides for selectedDate
    const overrides = (config.date_overrides || []).filter((o) => o.date === selectedDate);
    
    // Check if full day is marked unavailable
    const fullDayClosure = overrides.find((o) => o.type === 'unavailable' || o.is_available === false);
    if (fullDayClosure) {
      return {
        success: true,
        date: selectedDate,
        timezone: clientTimezone,
        availableSlots: [],
        isClosed: true,
        closureReason: fullDayClosure.reason?.trim() || 'Unavailable',
      };
    }

    // 2. Determine base working ranges for this date
    let baseRanges = [];
    const customHoursOverride = overrides.find((o) => o.type === 'custom_hours' && Array.isArray(o.ranges) && o.ranges.length > 0);

    if (customHoursOverride) {
      baseRanges = customHoursOverride.ranges;
    } else {
      // Determine day of week in availability timezone
      const dayOfWeek = this.getDayOfWeekInTz(selectedDate, availabilityTz);
      const weeklyDay = (config.weekly_hours || {})[dayOfWeek] || (config.weekly_hours || {})[String(dayOfWeek)];

      if (!weeklyDay || !weeklyDay.active || !Array.isArray(weeklyDay.ranges) || weeklyDay.ranges.length === 0) {
        return {
          success: true,
          date: selectedDate,
          timezone: clientTimezone,
          availableSlots: [],
          isClosed: true,
          closureReason: 'Non-working day',
        };
      }

      baseRanges = weeklyDay.ranges;
    }

    // 3. Extract any blocked intervals for this date
    const blockedOverrides = overrides.filter((o) => o.type === 'blocked_range' && Array.isArray(o.ranges));
    const blockedIntervals = [];
    blockedOverrides.forEach((bo) => {
      bo.ranges.forEach((r) => {
        const startM = timeToMinutes(r.start);
        const endM = timeToMinutes(r.end);
        if (startM >= 0 && endM > startM) {
          blockedIntervals.push({ startM, endM, reason: bo.reason || 'Blocked time range' });
        }
      });
    });

    // 4. Generate 30-minute slots within permitted ranges
    const rawSlots = [];
    for (const range of baseRanges) {
      const startMins = timeToMinutes(range.start);
      const endMins = timeToMinutes(range.end);
      if (startMins < 0 || endMins <= startMins) continue;

      for (let cur = startMins; cur + 30 <= endMins; cur += 30) {
        const hour = Math.floor(cur / 60);
        const min = cur % 60;

        // Check if slot falls in any blocked interval
        const isBlocked = blockedIntervals.some((b) => cur < b.endM && cur + 30 > b.startM);
        if (isBlocked) {
          continue; // Slot excluded by partial-day blocking
        }

        const isoString = this.getUtcIsoFromLocal(selectedDate, hour, min, clientTimezone);
        const label = this.formatTimeLabel(hour, min);

        rawSlots.push({
          iso: isoString,
          label,
          hour,
          min,
        });
      }
    }

    // 5. Query active reservations on this date (Both Call Bookings & Admin Events)
    const activeIntervals = [];

    // A. Query Supabase for existing confirmed or pending call_bookings
    if (supabase) {
      try {
        const { data: existingBookings, error } = await supabase
          .from('call_bookings')
          .select('start_time, end_time')
          .eq('booking_date', selectedDate)
          .in('status', ['confirmed', 'pending']);

        if (!error && Array.isArray(existingBookings)) {
          existingBookings.forEach((b) => {
            if (b.start_time) {
              const startMs = new Date(b.start_time).getTime();
              const endMs = b.end_time ? new Date(b.end_time).getTime() : startMs + 30 * 60 * 1000;
              activeIntervals.push({ startMs, endMs, reason: 'Already booked' });
            }
          });
        }
      } catch (dbErr) {
        console.warn('[Availability Calculator DB Note]:', dbErr.message);
      }
    }

    // B. Query Admin Events / Client Meetings (status = 'scheduled') on this date
    try {
      const activeAdminEvents = await adminEventService.getActiveEventsOnDate(selectedDate);
      if (Array.isArray(activeAdminEvents)) {
        activeAdminEvents.forEach((e) => {
          if (e.start_time && e.end_time) {
            const startMs = new Date(e.start_time).getTime();
            const endMs = new Date(e.end_time).getTime();
            activeIntervals.push({
              startMs,
              endMs,
              reason: e.event_type === 'client_meeting' ? 'Reserved (Client Meeting)' : 'Reserved (Internal Event)',
            });
          }
        });
      }
    } catch (eventErr) {
      console.warn('[Availability Calculator Admin Events Note]:', eventErr.message);
    }

    // 6. Map slots and apply past filter and shared interval overlap filter
    const nowMs = Date.now();
    const availableSlots = rawSlots.map((slot) => {
      const slotMs = new Date(slot.iso).getTime();
      const slotEndMs = slotMs + 30 * 60 * 1000;

      // Rule 1: Cannot book a slot in the past (tolerance: now - 5 mins)
      if (slotMs < nowMs - 5 * 60 * 1000) {
        return { ...slot, available: false, reason: 'Past time slot' };
      }

      // Rule 2: Cannot book an overlapping time slot (Formula: slotStart < resEnd && slotEnd > resStart)
      const conflict = activeIntervals.find((res) => slotMs < res.endMs && slotEndMs > res.startMs);
      if (conflict) {
        return { ...slot, available: false, reason: conflict.reason || 'Already booked' };
      }

      return { ...slot, available: true };
    });

    return {
      success: true,
      date: selectedDate,
      timezone: clientTimezone,
      availableSlots,
      isClosed: false,
    };
  }

  /**
   * Month Availability Status
   * Returns a calendar month map for public booking UI (disabled dates, holiday reasons)
   */
  async getMonthAvailability(monthStr, clientTimezone = 'Asia/Kolkata') {
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      throw new Error('Valid month (YYYY-MM) is required.');
    }

    const config = await this.getConfig();
    const availabilityTz = config.timezone || 'Asia/Kolkata';
    const todayInTz = getTodayInTz(availabilityTz);

    const [year, month] = monthStr.split('-').map(Number);
    // Number of days in the requested month
    const totalDays = new Date(year, month, 0).getDate();

    const days = {};
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${monthStr}-${dayStr}`;
      const isPast = dateStr < todayInTz;

      const overrides = (config.date_overrides || []).filter((o) => o.date === dateStr);
      const fullDayClosure = overrides.find((o) => o.type === 'unavailable' || o.is_available === false);
      const customHoursOverride = overrides.find((o) => o.type === 'custom_hours' && Array.isArray(o.ranges) && o.ranges.length > 0);
      const blockedOverrides = overrides.filter((o) => o.type === 'blocked_range' && Array.isArray(o.ranges) && o.ranges.length > 0);

      const dow = this.getDayOfWeekInTz(dateStr, availabilityTz);
      const weeklyDay = (config.weekly_hours || {})[dow] || (config.weekly_hours || {})[String(dow)];

      let isClosed = false;
      let closureReason = '';

      if (fullDayClosure) {
        isClosed = true;
        closureReason = fullDayClosure.reason?.trim() || 'Unavailable';
      } else if (!customHoursOverride && (!weeklyDay || !weeklyDay.active || !Array.isArray(weeklyDay.ranges) || weeklyDay.ranges.length === 0)) {
        isClosed = true;
        closureReason = 'Unavailable';
      }

      days[dateStr] = {
        dateStr,
        isPast,
        isClosed,
        closureReason: isClosed ? closureReason : undefined,
        hasCustomHours: Boolean(customHoursOverride),
        hasBlockedRanges: blockedOverrides.length > 0,
      };
    }

    return {
      success: true,
      month: monthStr,
      timezone: clientTimezone,
      days,
    };
  }

  /**
   * Pre-Booking Slot Verification (Server-side defense before database insert)
   * Validates that requested slot is within currently configured availability rules.
   */
  async isSlotAvailable(slotIso, clientTimezone = 'Asia/Kolkata') {
    const slotDate = new Date(slotIso);
    if (isNaN(slotDate.getTime())) {
      return { allowed: false, reason: 'Invalid slot timestamp format.' };
    }

    if (slotDate.getTime() < Date.now() - 5 * 60 * 1000) {
      return { allowed: false, reason: 'Cannot book a slot in the past.' };
    }

    const config = await this.getConfig();
    const availabilityTz = config.timezone || 'Asia/Kolkata';

    // Format local date and time in availability timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: availabilityTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(slotDate);
    const p = {};
    parts.forEach(({ type, value }) => { p[type] = value; });

    const localDateStr = `${p.year}-${p.month}-${p.day}`;
    const localHour = parseInt(p.hour, 10) % 24;
    const localMin = parseInt(p.minute, 10);
    const slotMins = localHour * 60 + localMin;

    // Check date overrides
    const overrides = (config.date_overrides || []).filter((o) => o.date === localDateStr);
    const fullDayClosure = overrides.find((o) => o.type === 'unavailable' || o.is_available === false);
    if (fullDayClosure) {
      return { allowed: false, reason: `Date ${localDateStr} is marked unavailable (${fullDayClosure.reason || 'Closed'}).` };
    }

    // Determine allowed ranges
    let allowedRanges = [];
    const customHours = overrides.find((o) => o.type === 'custom_hours' && Array.isArray(o.ranges) && o.ranges.length > 0);
    if (customHours) {
      allowedRanges = customHours.ranges;
    } else {
      const dayOfWeek = this.getDayOfWeekInTz(localDateStr, availabilityTz);
      const weeklyDay = (config.weekly_hours || {})[dayOfWeek] || (config.weekly_hours || {})[String(dayOfWeek)];
      if (!weeklyDay || !weeklyDay.active || !Array.isArray(weeklyDay.ranges) || weeklyDay.ranges.length === 0) {
        return { allowed: false, reason: `Bookings are not accepted on ${weeklyDay?.day || 'this day'}.` };
      }
      allowedRanges = weeklyDay.ranges;
    }

    // Check if slot starts within one of the allowed ranges
    const isWithinRange = allowedRanges.some((r) => {
      const startM = timeToMinutes(r.start);
      const endM = timeToMinutes(r.end);
      return slotMins >= startM && slotMins + 30 <= endM;
    });

    if (!isWithinRange) {
      return { allowed: false, reason: `Requested slot (${localHour}:${String(localMin).padStart(2, '0')}) is outside allowed working hours.` };
    }

    // Check if slot falls in any blocked range
    const blockedOverrides = overrides.filter((o) => o.type === 'blocked_range' && Array.isArray(o.ranges));
    for (const bo of blockedOverrides) {
      for (const r of bo.ranges) {
        const startM = timeToMinutes(r.start);
        const endM = timeToMinutes(r.end);
        if (slotMins < endM && slotMins + 30 > startM) {
          return { allowed: false, reason: `Requested time slot is blocked (${bo.reason || 'Blocked by admin'}).` };
        }
      }
    }

    // Check if slot overlaps with any active admin event on this date
    try {
      const activeAdminEvents = await adminEventService.getActiveEventsOnDate(localDateStr);
      const slotStartMs = slotDate.getTime();
      const slotEndMs = slotStartMs + 30 * 60 * 1000;
      const eventConflict = (activeAdminEvents || []).find((e) => {
        const eStart = new Date(e.start_time).getTime();
        const eEnd = new Date(e.end_time).getTime();
        return slotStartMs < eEnd && slotEndMs > eStart;
      });

      if (eventConflict) {
        return {
          allowed: false,
          reason: `Requested time slot overlaps with a scheduled event (${eventConflict.title || 'Reserved by admin'}).`,
        };
      }
    } catch (_) {}

    return { allowed: true };
  }
}

export const bookingAvailabilityService = new BookingAvailabilityService();
export default bookingAvailabilityService;
