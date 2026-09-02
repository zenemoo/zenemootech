import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Globe,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Building,
  User,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CalendarPlus,
  Lock,
  X,
  Check,
  RefreshCw,
  Info,
} from 'lucide-react';
import { SeoImage } from '../seo/components/SeoImage';
import { TurnstileWidget } from './TurnstileWidget';
import { ZenemooAiDrawer } from './ZenemooAiDrawer';
import { bookingApi } from '../services/api';
import {
  fetchSunriseSunset,
  getTodayDateInTimezone,
  formatSunTimeFromIso,
  SunriseSunsetData,
} from '../services/sunriseSunsetService';

interface ZenemooBookingPageProps {
  onBackToHome: () => void;
  onOpenAiDrawer?: () => void;
}

interface AvailableSlot {
  iso: string;
  label: string;
  available: boolean;
  reason?: string;
}

/**
 * Get current date string (YYYY-MM-DD) in specified timezone (default: Asia/Kolkata)
 */
export const getTodayDateString = (tz: string = 'Asia/Kolkata'): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch (_) {
    const now = new Date();
    const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return local.toISOString().split('T')[0];
  }
};

/**
 * Get date string (YYYY-MM-DD) for a Date object in specified timezone
 */
export const getDateStringInTimezone = (date: Date, tz: string = 'Asia/Kolkata'): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch (_) {
    return date.toISOString().split('T')[0];
  }
};

/**
 * Format live clock time with seconds according to 12H/24H format and target timezone
 */
export const formatLiveClock = (dateObj: Date, format: '12H' | '24H', tz: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: format === '12H',
    }).format(dateObj);
  } catch (_) {
    return dateObj.toLocaleTimeString();
  }
};

/**
 * Format digital time into main HH:MM:SS and period AM/PM parts
 */
export const formatDigitalTimeParts = (dateObj: Date, format: '12H' | '24H', tz: string) => {
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: format === '12H',
    }).format(dateObj);

    if (format === '12H') {
      const parts = formatted.split(' ');
      return {
        timeMain: parts[0] || formatted,
        timePeriod: parts[1] || '',
      };
    }
    return {
      timeMain: formatted,
      timePeriod: '',
    };
  } catch (_) {
    return { timeMain: dateObj.toLocaleTimeString(), timePeriod: '' };
  }
};

/**
 * Extract timezone metadata (abbreviation, formatted date, UTC offset, hours/minutes/seconds)
 */
export const getTimezoneMetadata = (dateObj: Date, tz: string) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(dateObj);
    const abbrPart = parts.find((p) => p.type === 'timeZoneName');
    const abbr = abbrPart ? abbrPart.value : tz.split('/')[1] || tz;

    const dateStr = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(dateObj);

    const tzDateStr = dateObj.toLocaleString('en-US', { timeZone: tz });
    const utcDateStr = dateObj.toLocaleString('en-US', { timeZone: 'UTC' });
    const diffMs = new Date(tzDateStr).getTime() - new Date(utcDateStr).getTime();
    const totalMins = Math.round(diffMs / 60000);
    const sign = totalMins >= 0 ? '+' : '-';
    const absMins = Math.abs(totalMins);
    const offsetHours = String(Math.floor(absMins / 60)).padStart(2, '0');
    const offsetMins = String(absMins % 60).padStart(2, '0');
    const utcOffset = `UTC ${sign}${offsetHours}:${offsetMins}`;

    const localTimeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    }).formatToParts(dateObj);

    const h = parseInt(localTimeParts.find((p) => p.type === 'hour')?.value || '0', 10);
    const m = parseInt(localTimeParts.find((p) => p.type === 'minute')?.value || '0', 10);
    const s = parseInt(localTimeParts.find((p) => p.type === 'second')?.value || '0', 10);

    return { abbr, dateStr, utcOffset, h, m, s };
  } catch (_) {
    return { abbr: 'TZ', dateStr: '', utcOffset: 'UTC +00:00', h: 0, m: 0, s: 0 };
  }
};

/**
 * Format sunrise / sunset times for 12H vs 24H mode
 */
export const formatSunTime = (time12: string, format: '12H' | '24H') => {
  if (format === '12H') return time12;
  const [time, period] = time12.split(' ');
  if (!time || !period) return time12;
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${mStr}`;
};

/**
 * Animated Dot Analog Clock SVG Accent
 */
export const AnalogDotClock: React.FC<{ h: number; m: number; s: number; sizeClass?: string }> = ({
  h,
  m,
  s,
  sizeClass = 'w-10 h-10 sm:w-11 sm:h-11',
}) => {
  const hourAngle = ((h % 12) + m / 60) * 30;
  const minuteAngle = (m + s / 60) * 6;
  const secondAngle = s * 6;

  const dots = Array.from({ length: 12 }).map((_, i) => {
    const angleRad = (i * 30 * Math.PI) / 180;
    const cx = 24 + 18 * Math.sin(angleRad);
    const cy = 24 - 18 * Math.cos(angleRad);
    return { cx, cy, isMajor: i % 3 === 0 };
  });

  return (
    <svg viewBox="0 0 48 48" className={`${sizeClass} shrink-0 select-none`}>
      {dots.map((dot, idx) => (
        <circle
          key={idx}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.isMajor ? 1.5 : 0.8}
          className={dot.isMajor ? 'fill-cyan-400' : 'fill-slate-600'}
        />
      ))}
      <line
        x1="24"
        y1="24"
        x2="24"
        y2="13"
        stroke="#06b6d4"
        strokeWidth="2"
        strokeLinecap="round"
        transform={`rotate(${hourAngle} 24 24)`}
      />
      <line
        x1="24"
        y1="24"
        x2="24"
        y2="9"
        stroke="#38bdf8"
        strokeWidth="1.5"
        strokeLinecap="round"
        transform={`rotate(${minuteAngle} 24 24)`}
      />
      <line
        x1="24"
        y1="24"
        x2="24"
        y2="7"
        stroke="#f43f5e"
        strokeWidth="0.75"
        strokeLinecap="round"
        transform={`rotate(${secondAngle} 24 24)`}
      />
      <circle cx="24" cy="24" r="1.5" className="fill-white" />
    </svg>
  );
};

export interface WorldClockCity {
  name: string;
  timezone: string;
  lat: number;
  lng: number;
  flagUrl: string;
  defaultAbbr: string;
}

export const WORLD_CLOCK_CITIES: WorldClockCity[] = [
  {
    name: 'India',
    timezone: 'Asia/Kolkata',
    lat: 28.6139,
    lng: 77.2090,
    flagUrl: 'https://flagcdn.com/w80/in.png',
    defaultAbbr: 'IST',
  },
  {
    name: 'London',
    timezone: 'Europe/London',
    lat: 51.5074,
    lng: -0.1278,
    flagUrl: 'https://flagcdn.com/w80/gb.png',
    defaultAbbr: 'BST',
  },
  {
    name: 'New York',
    timezone: 'America/New_York',
    lat: 40.7128,
    lng: -74.0060,
    flagUrl: 'https://flagcdn.com/w80/us.png',
    defaultAbbr: 'EDT',
  },
  {
    name: 'Dubai',
    timezone: 'Asia/Dubai',
    lat: 25.2048,
    lng: 55.2708,
    flagUrl: 'https://flagcdn.com/w80/ae.png',
    defaultAbbr: 'GST',
  },
];

/**
 * Reusable World Clock Section Component - Dynamic Astronomical Data
 */
export const WorldClockSection: React.FC<{
  now: Date;
  timeFormat: '12H' | '24H';
}> = ({ now, timeFormat }) => {
  const [sunDataMap, setSunDataMap] = useState<Record<string, SunriseSunsetData | null>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Compute today's date (YYYY-MM-DD) per location's timezone.
  // Re-evaluates automatically when date/hour advances.
  const cityDates = useMemo(() => {
    const dates: Record<string, string> = {};
    WORLD_CLOCK_CITIES.forEach((city) => {
      dates[city.timezone] = getTodayDateInTimezone(city.timezone, now);
    });
    return dates;
  }, [now.getDate(), now.getHours()]);

  useEffect(() => {
    let isMounted = true;

    WORLD_CLOCK_CITIES.forEach((city) => {
      const targetDate = cityDates[city.timezone];
      if (!targetDate) return;

      // Don't refetch if already loaded for current date
      if (sunDataMap[city.timezone]?.dateStr === targetDate) {
        return;
      }

      setLoadingMap((prev) => ({ ...prev, [city.timezone]: true }));

      fetchSunriseSunset(city.lat, city.lng, targetDate, city.timezone)
        .then((data) => {
          if (isMounted) {
            setSunDataMap((prev) => ({ ...prev, [city.timezone]: data }));
            setLoadingMap((prev) => ({ ...prev, [city.timezone]: false }));
          }
        })
        .catch(() => {
          if (isMounted) {
            setLoadingMap((prev) => ({ ...prev, [city.timezone]: false }));
          }
        });
    });

    return () => {
      isMounted = false;
    };
  }, [cityDates]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {WORLD_CLOCK_CITIES.map((city) => {
          const meta = getTimezoneMetadata(now, city.timezone);
          const { timeMain, timePeriod } = formatDigitalTimeParts(now, timeFormat, city.timezone);
          const sunData = sunDataMap[city.timezone];
          const isLoadingSun = loadingMap[city.timezone];

          const formattedSunrise = isLoadingSun
            ? '--:--'
            : formatSunTimeFromIso(sunData?.sunriseIso, timeFormat, city.timezone);
          const formattedSunset = isLoadingSun
            ? '--:--'
            : formatSunTimeFromIso(sunData?.sunsetIso, timeFormat, city.timezone);

          return (
            <div
              key={city.timezone}
              className="bg-[#070a11]/95 border border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-4 sm:p-5 font-mono shadow-xl shadow-cyan-500/5 space-y-3 transition-all"
            >
              {/* Top Row: Flag Image + City Name + IANA Timezone ID & LIVE Pill Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={city.flagUrl}
                    alt={`${city.name} Flag`}
                    className="w-7 h-5 rounded-md object-cover shrink-0 shadow-md border border-white/10"
                    loading="lazy"
                  />
                  <div>
                    <h4 className="text-base sm:text-lg font-extrabold text-white font-display leading-tight">
                      {city.name}
                    </h4>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {city.timezone}
                    </div>
                  </div>
                </div>

                {/* LIVE Pill Badge */}
                <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LIVE</span>
                </div>
              </div>

              {/* Main Digital Time & SVG Analog Clock Row */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono tracking-tight">
                    {timeMain}
                  </span>
                  {timePeriod && (
                    <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                      {timePeriod}
                    </span>
                  )}
                </div>

                {/* Dynamic SVG Analog Dot Clock */}
                <AnalogDotClock h={meta.h} m={meta.m} s={meta.s} sizeClass="w-11 h-11 sm:w-12 sm:h-12" />
              </div>

              {/* Divider Line */}
              <div className="border-t border-white/10 my-2" />

              {/* Info Row 1: Date, Dynamic Sunrise & Sunset */}
              <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono gap-1 flex-wrap">
                <div className="flex items-center gap-1 text-slate-300">
                  <CalendarIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{meta.dateStr}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 flex items-center gap-1">
                    🌅 {formattedSunrise}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-orange-400 flex items-center gap-1">
                    🌇 {formattedSunset}
                  </span>
                </div>
              </div>

              {/* Info Row 2: Timezone Abbr Pill & UTC Offset */}
              <div className="flex items-center gap-2.5 pt-1 text-xs font-mono">
                <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold uppercase text-[11px]">
                  {meta.abbr || city.defaultAbbr}
                </span>
                <span className="text-slate-400 font-semibold">{meta.utcOffset}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* API Attribution Note */}
      <div className="text-[10px] text-slate-500 font-mono text-center pt-1">
        Sunrise &amp; sunset data &middot;{' '}
        <a
          href="https://sunrise-sunset.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-400 underline"
        >
          Sunrise-Sunset.org
        </a>
      </div>
    </div>
  );
};

/**
 * Format slot time according to 12H or 24H mode in target timezone
 */
export const formatSlotLabel = (isoString: string, format: '12H' | '24H', tz: string): string => {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: format === '12H',
    }).format(d);
  } catch (_) {
    return isoString;
  }
};

export const ZenemooBookingPage: React.FC<ZenemooBookingPageProps> = ({ onBackToHome, onOpenAiDrawer }) => {
  // AI Drawer & Timezone state
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [timezone, setTimezone] = useState<string>('Asia/Kolkata');
  const [timeFormat, setTimeFormat] = useState<'12H' | '24H'>('12H');
  const [now, setNow] = useState<Date>(() => new Date());
  const [autoDateNotice, setAutoDateNotice] = useState<string>('');
  const [activeClockCityIndex, setActiveClockCityIndex] = useState<number>(0);

  // 1-second live clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Today's YYYY-MM-DD in the active timezone
  const todayStr = useMemo(() => {
    return getTodayDateString(timezone);
  }, [timezone]);

  // Date & Slot state initialized to current local date in Asia/Kolkata
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString('Asia/Kolkata'));
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotFetchError, setSlotFetchError] = useState<string>('');

  // Filter available slots to genuinely bookable slots only (available, not past, and not within 2-hour buffer)
  const bookableSlots = useMemo(() => {
    const nowMs = now.getTime();
    const thresholdMs = nowMs + 2 * 60 * 60 * 1000;

    return availableSlots.filter((slotItem) => {
      const slotTimeMs = new Date(slotItem.iso).getTime();
      const isPast = slotTimeMs < nowMs;
      const isTooSoon = !isPast && slotTimeMs < thresholdMs;
      return slotItem.available && !isPast && !isTooSoon;
    });
  }, [availableSlots, now]);

  // Form Fields
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // UI / Modal States
  const [showTurnstileModal, setShowTurnstileModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Validate URL slot parameter strictly
  const validateSlotParam = useCallback((slotParam: string | null, activeTz: string): string | null => {
    if (!slotParam) return null;

    try {
      const slotDate = new Date(slotParam);
      if (isNaN(slotDate.getTime())) return null;

      const nowMs = Date.now();
      // 1. Must be in the future (at least now - 5 mins tolerance)
      if (slotDate.getTime() < nowMs - 5 * 60 * 1000) {
        console.warn('[BOOKING URL] Rejecting slot: timestamp is in the past:', slotParam);
        return null;
      }

      // 2. Date in timezone must be >= today
      const currentToday = getTodayDateString(activeTz);
      const slotDateStr = getDateStringInTimezone(slotDate, activeTz);
      if (slotDateStr < currentToday) {
        console.warn('[BOOKING URL] Rejecting slot: date is in the past:', slotDateStr, '<', currentToday);
        return null;
      }

      // 3. Hour must be within 10:00 AM (10) and 10:00 PM (22)
      const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: activeTz,
        hour: 'numeric',
        hour12: false,
      }).format(slotDate);
      const hour = parseInt(hourStr, 10);

      if (hour < 10 || hour > 22) {
        console.warn('[BOOKING URL] Rejecting slot: hour outside booking window:', hour);
        return null;
      }

      return slotParam;
    } catch (_) {
      return null;
    }
  }, []);

  // Parse and validate URL parameter on initial load or browser back/forward navigation
  const syncAndValidateUrlState = useCallback(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const rawSlotParam = searchParams.get('slot');
    const validSlot = validateSlotParam(rawSlotParam, timezone);

    const currentToday = getTodayDateString(timezone);

    if (validSlot) {
      const d = new Date(validSlot);
      const slotDateStr = getDateStringInTimezone(d, timezone);
      setSelectedSlotIso(validSlot);
      setSelectedDate(slotDateStr);
    } else {
      // Invalid or past slot: purge slot state, set date to today, clean URL
      setSelectedSlotIso(null);
      setSelectedDate((prev) => (prev < currentToday ? currentToday : prev));
      if (rawSlotParam) {
        console.warn('[BOOKING URL] Purging invalid or past slot parameter from URL');
        window.history.replaceState(null, '', '/30min');
      }
    }
  }, [timezone, validateSlotParam]);

  useEffect(() => {
    syncAndValidateUrlState();
    window.addEventListener('popstate', syncAndValidateUrlState);
    return () => window.removeEventListener('popstate', syncAndValidateUrlState);
  }, [syncAndValidateUrlState]);

  // Helper to find the next date with at least 1 valid bookable slot (resource available + 2h buffer)
  const findNextAvailableDate = useCallback(async (startDate: string, activeTz: string) => {
    const parts = startDate.split('-').map(Number);
    const startDateObj = new Date(parts[0], parts[1] - 1, parts[2]);

    for (let offset = 1; offset <= 30; offset++) {
      const checkD = new Date(startDateObj);
      checkD.setDate(checkD.getDate() + offset);
      const nextDateStr = getDateStringInTimezone(checkD, activeTz);

      try {
        const res = await bookingApi.getAvailability(nextDateStr, activeTz);
        if (res.data?.success && Array.isArray(res.data.availableSlots)) {
          const thresholdMs = Date.now() + 2 * 60 * 60 * 1000;
          const validSlots = res.data.availableSlots.filter((slot: AvailableSlot) => {
            const slotMs = new Date(slot.iso).getTime();
            return slot.available && slotMs >= thresholdMs;
          });

          if (validSlots.length > 0) {
            setSelectedDate(nextDateStr);
            setCurrentMonthDate(new Date(checkD.getFullYear(), checkD.getMonth(), 1));
            setAutoDateNotice('No more bookable times today — showing the next available date.');
            return;
          }
        }
      } catch (_) {
        // Continue checking next day
      }
    }
  }, []);

  // Fetch available slots from backend with diagnostic logging and auto-advance logic
  const fetchSlots = useCallback((date: string, tz: string) => {
    const currentToday = getTodayDateString(tz);

    // Prevent fetching slots for past dates
    if (!date || date < currentToday) {
      setAvailableSlots([]);
      setLoadingSlots(false);
      return;
    }

    setLoadingSlots(true);
    setSlotFetchError('');

    console.log('[BOOKING] Availability request initiated for date:', date, 'timezone:', tz);

    bookingApi
      .getAvailability(date, tz)
      .then((res) => {
        if (res.data?.success) {
          const slots: AvailableSlot[] = res.data.availableSlots || [];
          setAvailableSlots(slots);

          // Check if today has zero valid bookable slots (resource available + 2h lead buffer)
          if (date === currentToday) {
            const thresholdMs = Date.now() + 2 * 60 * 60 * 1000;
            const validCount = slots.filter((s) => {
              const slotTime = new Date(s.iso).getTime();
              return s.available && slotTime >= thresholdMs;
            }).length;

            if (validCount === 0) {
              findNextAvailableDate(date, tz);
            }
          }
        } else {
          setSlotFetchError('Unable to load available times. Please check your connection and try again.');
        }
      })
      .catch((err: any) => {
        console.error('[BOOKING] Availability Error:', err.message);
        setSlotFetchError('Unable to load available times. Please check your connection and try again.');
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [findNextAvailableDate]);

  useEffect(() => {
    fetchSlots(selectedDate, timezone);
  }, [selectedDate, timezone, fetchSlots]);


  // Sync URL when a valid slot is selected
  const handleSelectSlot = (slotIso: string) => {
    const validSlot = validateSlotParam(slotIso, timezone);
    if (!validSlot) {
      setErrorMessage('This time slot is in the past or invalid.');
      return;
    }

    setSelectedSlotIso(slotIso);
    setErrorMessage('');
    const newUrl = `/30min?layout=month_view&slot=${encodeURIComponent(slotIso)}`;
    window.history.pushState(null, '', newUrl);
  };

  const handleClearSlot = () => {
    setSelectedSlotIso(null);
    setErrorMessage('');
    window.history.pushState(null, '', '/30min');
  };

  // Calendar Month Navigation
  const prevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calendar Days Calculation
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNum: number; dateStr: string; isPast: boolean; isToday: boolean; isSelected: boolean }> = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: 0, dateStr: '', isPast: true, isToday: false, isSelected: false });
    }

    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;

      days.push({ dayNum: d, dateStr, isPast, isToday, isSelected });
    }

    return days;
  }, [currentMonthDate, todayStr, selectedDate]);

  // Form Submit handler -> Opens Turnstile Verification Modal
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !email.trim() || !companyName.trim() || !phone.trim()) {
      setErrorMessage('Please fill in all required fields marked with *');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid business email address.');
      return;
    }

    if (!selectedSlotIso || !validateSlotParam(selectedSlotIso, timezone)) {
      setErrorMessage('Please select a valid future meeting time slot.');
      return;
    }

    setShowTurnstileModal(true);
  };

  // Turnstile Verified Callback
  const handleTurnstileVerify = async (token: string) => {
    setShowTurnstileModal(false);
    setSubmitting(true);
    setErrorMessage('');

    try {
      const response = await bookingApi.createBooking({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        companyName: companyName.trim(),
        notes: notes.trim(),
        slot: selectedSlotIso!,
        turnstileToken: token,
      });

      if (response.data?.success && response.data?.booking) {
        setConfirmedBooking(response.data.booking);
      } else {
        setErrorMessage(response.data?.message || 'Failed to complete booking. Please try again.');
      }
    } catch (err: any) {
      console.error('[BOOKING] Submission error:', err);
      const msg = err.response?.data?.message || 'This time slot has just been booked or is unavailable. Please select another time.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Download ICS File for Calendar
  const downloadIcsCalendar = () => {
    if (!confirmedBooking) return;
    const { booking_id, full_name, company_name, start_time, end_time } = confirmedBooking;

    const startDateStr = new Date(start_time).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endDateStr = new Date(end_time).toISOString().replace(/-|:|\.\d\d\d/g, '');

    const csContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Zenemoo Data Solutions//Book a Call//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking_id}@zenemoo.in
DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d\d\d/g, '')}
DTSTART:${startDateStr}
DTEND:${endDateStr}
SUMMARY:Zenemoo 30 Minute Meeting (${booking_id})
DESCRIPTION:30-minute discovery call between Zenemoo Data Solutions and ${full_name} (${company_name}).
LOCATION:Google Meet / Zenemoo Conference
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([csContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${booking_id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formatted Slot Date/Time strings for rendering
  const formattedSelectedSlot = useMemo(() => {
    if (!selectedSlotIso) return null;
    const d = new Date(selectedSlotIso);
    if (isNaN(d.getTime())) return null;

    const dateStr = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: timezone,
    });
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === '12H',
      timeZone: timezone,
    });

    return { dateStr, timeStr };
  }, [selectedSlotIso, timezone, timeFormat]);

  // World clock cities definition
  const worldClockCities = useMemo(
    () => [
      { name: 'India', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
      { name: 'London', timezone: 'Europe/London', flag: '🇬🇧' },
      { name: 'New York', timezone: 'America/New_York', flag: '🇺🇸' },
      { name: 'Dubai', timezone: 'Asia/Dubai', flag: '🇦🇪' },
    ],
    []
  );

  const handleOpenAi = () => {
    if (onOpenAiDrawer) {
      onOpenAiDrawer();
    } else {
      setIsAiDrawerOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#030406] text-slate-200 font-sans relative overflow-x-hidden w-full max-w-full selection:bg-cyan-500 selection:text-black flex flex-col justify-between">
      {/* Ambient Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-cyan-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* STATIC FIXED BOOKING NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-white/10 bg-[#070a11]/95 backdrop-blur-xl shadow-lg shadow-black/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-2">
          {/* LEFT: ZENEMOO BRANDING */}
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer shrink-0" onClick={onBackToHome}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/20 overflow-hidden shrink-0">
              <SeoImage
                src="/assets/logo.png"
                alt="Zenemoo Data Solutions Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover rounded-full bg-white p-0.5"
              />
            </div>
            <div>
              <div className="text-base sm:text-xl font-extrabold tracking-wider font-display text-white leading-tight">
                ZENEMOO
              </div>
              <div className="text-[9px] sm:text-[10px] tracking-widest uppercase text-cyan-400 font-mono font-semibold -mt-0.5">
                Enterprise AI Scheduling
              </div>
            </div>
          </div>

          {/* RIGHT: AI BUTTON & BACK BUTTON */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Zenemoo AI Button */}
            <button
              onClick={handleOpenAi}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-blue-500/20 border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono font-semibold text-cyan-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02]"
              title="Open Zenemoo AI Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">Zenemoo AI</span>
              <span className="sm:hidden text-[11px]">AI</span>
            </button>

            {/* Back to Zenemoo Button */}
            <button
              onClick={onBackToHome}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/10 text-xs font-mono font-semibold text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Back to Zenemoo</span>
              <span className="md:hidden text-[11px]">Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER WITH TOP NAVBAR OFFSET */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-4 sm:pb-6 w-full flex-1">
        {/* SUCCESS CONFIRMATION STATE */}
        {confirmedBooking ? (
          <div className="max-w-2xl mx-auto my-6 sm:my-10 animate-fade-in">
            <div className="glass-panel p-6 sm:p-12 rounded-3xl border border-cyan-500/40 text-center space-y-6 shadow-2xl shadow-cyan-500/10 bg-[#0b0f19]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20 animate-bounce">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" /> CONFIRMED
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">Booking Confirmed</h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  Your 30-minute call has been successfully scheduled with Zenemoo Data Solutions.
                </p>
              </div>

              {/* Booking Reference Card */}
              <div className="bg-[#070a11] border border-white/10 rounded-2xl p-5 sm:p-6 text-left space-y-4 font-mono text-xs shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-slate-400">Booking Reference:</span>
                  <span className="text-base sm:text-lg font-bold text-cyan-400">{confirmedBooking.booking_id}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Meeting:</span>
                    <span className="font-semibold text-white">Zenemoo 30 Minute Meeting</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Company / Agency:</span>
                    <span className="font-semibold text-white">{confirmedBooking.company_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Date:</span>
                    <span className="font-semibold text-white">
                      {new Date(confirmedBooking.start_time).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: confirmedBooking.timezone || timezone,
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Time &amp; Timezone:</span>
                    <span className="font-semibold text-white">
                      {new Date(confirmedBooking.start_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: confirmedBooking.timezone || timezone,
                      })}{' '}
                      ({confirmedBooking.timezone || timezone})
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 text-emerald-400 flex items-center gap-2 text-[11px]">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>A confirmation email has been sent to {confirmedBooking.email}.</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
                <button
                  onClick={downloadIcsCalendar}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" /> Add to Calendar (.ics)
                </button>
                <button
                  onClick={onBackToHome}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/10 text-white font-bold font-mono text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Back to Zenemoo
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MAIN TWO-COLUMN / CAL.COM INSPIRED SCHEDULER VIEW */
          <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-[#0b0f19]/90 backdrop-blur-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
              {/* LEFT COLUMN: Meeting Type & Info */}
              <div className="lg:col-span-4 p-5 sm:p-8 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#070a11]/60 flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  {/* Zenemoo Brand Badge */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                        Zenemoo Data Solutions
                      </span>
                      <h2 className="text-lg sm:text-xl font-bold font-display text-white">30 Minute Meeting</h2>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Book a call for business inquiries, partnerships, projects, services, or organizational discussions.
                  </p>

                  <div className="space-y-2.5 font-mono text-xs text-slate-300 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>30 minutes</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{timezone}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>No account / login required</span>
                    </div>
                  </div>

                  {/* Selected Slot Summary (If picked) */}
                  {formattedSelectedSlot && (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 space-y-2 font-mono text-xs animate-fade-in">
                      <div className="text-[11px] text-cyan-400 uppercase font-bold tracking-wider flex items-center justify-between">
                        <span>Selected Slot</span>
                        <button
                          onClick={handleClearSlot}
                          className="text-slate-400 hover:text-white text-[10px] underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white">{formattedSelectedSlot.dateStr}</div>
                      <div className="text-xs font-semibold text-cyan-300">{formattedSelectedSlot.timeStr}</div>
                    </div>
                  )}
                </div>

                {/* Footnote */}
                <div className="text-[10px] font-mono text-slate-500 space-y-1 pt-3 border-t border-white/5 hidden lg:block">
                  <div>Zenemoo Data Solutions</div>
                  <div>Enterprise AI Language &amp; Data Services</div>
                </div>
              </div>

              {/* RIGHT COLUMN: Calendar / Slot Picker OR Booking Details Form */}
              <div className="lg:col-span-8 p-5 sm:p-8">
                {!selectedSlotIso ? (
                  /* STEP 1: CALENDAR & SLOTS SELECTOR */
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
                    {/* CENTER COLUMN: CALENDAR & TIMEZONE (DESKTOP: TOP LEFT/CENTER, MOBILE: FIRST) */}
                    <div className="md:col-span-7 space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-bold font-mono text-white flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-cyan-400" /> Select a Date
                        </h3>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={prevMonth}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-[11px] sm:text-xs font-mono font-bold text-white min-w-[95px] sm:min-w-[110px] text-center">
                            {currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <button
                            onClick={nextMonth}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Day of Week Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase pb-1 border-b border-white/5">
                        <span>Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                        {calendarDays.map((cell, idx) => {
                          if (cell.dayNum === 0) {
                            return <div key={`empty_${idx}`} className="h-9 sm:h-10" />;
                          }

                          return (
                            <button
                              key={cell.dateStr}
                              disabled={cell.isPast}
                              onClick={() => {
                                if (!cell.isPast) {
                                  setSelectedDate(cell.dateStr);
                                  setAutoDateNotice('');
                                }
                              }}
                              className={`h-9 sm:h-10 rounded-xl font-mono text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                                cell.isPast
                                  ? 'text-slate-700 bg-white/[0.01] cursor-not-allowed line-through opacity-40 select-none'
                                  : cell.isSelected
                                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 scale-105 z-10 cursor-pointer'
                                  : cell.isToday
                                  ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 cursor-pointer'
                                  : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border border-white/5 cursor-pointer'
                              }`}
                            >
                              <span>{cell.dayNum}</span>
                              {cell.isToday && !cell.isSelected && (
                                <span className="w-1 h-1 rounded-full bg-cyan-400 absolute bottom-1" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Timezone Selector & Live Current Time */}
                      <div className="pt-3 border-t border-white/5 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-cyan-400" /> Timezone:
                          </span>
                          <select
                            value={timezone}
                            onChange={(e) => {
                              setTimezone(e.target.value);
                              setAutoDateNotice('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200 text-[11px] focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
                          >
                            <option value="Asia/Kolkata" className="bg-[#0b0f19] text-white">
                              Asia/Kolkata (IST +5:30)
                            </option>
                            <option value="UTC" className="bg-[#0b0f19] text-white">
                              UTC (GMT +0:00)
                            </option>
                            <option value="America/New_York" className="bg-[#0b0f19] text-white">
                              America/New_York (EST)
                            </option>
                            <option value="Europe/London" className="bg-[#0b0f19] text-white">
                              Europe/London (BST)
                            </option>
                          </select>
                        </div>

                        {/* Live Current Time Indicator */}
                        <div className="flex items-center justify-between text-[11px] font-mono bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Current Time ({timezone}):
                          </span>
                          <span className="font-bold text-cyan-300 tracking-wider">
                            {formatLiveClock(now, timeFormat, timezone)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: AVAILABLE SLOTS */}
                    <div className="md:col-span-5 space-y-4">
                      {/* Header with Date and 12H / 24H Toggle */}
                      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold font-mono text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-cyan-400" /> Available Slots
                          </h3>
                          <span className="text-[11px] font-mono text-slate-400 font-semibold block sm:inline">
                            {selectedDate
                              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : ''}
                          </span>
                        </div>

                        {/* 12H / 24H Segmented Control Toggle */}
                        <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-[10px] font-mono font-bold shrink-0">
                          <button
                            type="button"
                            onClick={() => setTimeFormat('12H')}
                            className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                              timeFormat === '12H'
                                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-extrabold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            12H
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimeFormat('24H')}
                            className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                              timeFormat === '24H'
                                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-extrabold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            24H
                          </button>
                        </div>
                      </div>

                      {/* Auto Date Advance Informational Notice */}
                      {autoDateNotice && (
                        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] flex items-start sm:items-center gap-2 animate-fade-in">
                          <Info className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5 sm:mt-0" />
                          <span>{autoDateNotice}</span>
                        </div>
                      )}

                      {loadingSlots ? (
                        <div className="h-64 flex items-center justify-center text-slate-400 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            <span>Checking slot availability...</span>
                          </div>
                        </div>
                      ) : slotFetchError ? (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs space-y-3 text-center">
                          <div className="flex items-center justify-center gap-2 font-bold text-amber-200">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Unable to load available times.</span>
                          </div>
                          <p className="text-slate-400 text-[11px]">
                            Please check your connection and try again.
                          </p>
                          <button
                            type="button"
                            onClick={() => fetchSlots(selectedDate, timezone)}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-md"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Retry
                          </button>
                        </div>
                      ) : bookableSlots.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 font-mono text-xs">
                          No available slots on this date.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                          {bookableSlots.map((slotItem) => {
                            const formattedTimeLabel = formatSlotLabel(slotItem.iso, timeFormat, timezone);

                            return (
                              <button
                                key={slotItem.iso}
                                onClick={() => handleSelectSlot(slotItem.iso)}
                                title={`Book slot for ${formattedTimeLabel}`}
                                className="w-full py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-between bg-white/[0.04] border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-300 cursor-pointer shadow-sm"
                              >
                                <span>{formattedTimeLabel}</span>
                                <span className="text-[10px] uppercase font-semibold">
                                  Book
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* STEP 2: BOOKING DETAILS FORM */
                  <div className="space-y-5 animate-fade-in max-w-xl mx-auto">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold font-display text-white">Enter Meeting Details</h3>
                        <p className="text-xs font-mono text-slate-400">
                          Provide your contact and organizational details to finalize the booking.
                        </p>
                      </div>
                      <button
                        onClick={handleClearSlot}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 transition-colors cursor-pointer shrink-0"
                      >
                        Change Time
                      </button>
                    </div>

                    {errorMessage && (
                      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-4 font-sans text-xs">
                      {/* FULL NAME */}
                      <div className="space-y-1.5">
                        <label className="block font-mono uppercase text-[11px] font-bold text-slate-300">
                          FULL NAME *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                          <input
                            type="text"
                            required
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* EMAIL ADDRESS */}
                      <div className="space-y-1.5">
                        <label className="block font-mono uppercase text-[11px] font-bold text-slate-300">
                          Business Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                          <input
                            type="email"
                            required
                            placeholder="john@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* COMPANY / AGENCY NAME (REQUIRED) */}
                      <div className="space-y-1.5">
                        <label className="block font-mono uppercase text-[11px] font-bold text-slate-300">
                          Company / Agency Name *
                        </label>
                        <div className="relative">
                          <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                          <input
                            type="text"
                            required
                            placeholder="Acme AI Solutions Corp"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* PHONE / WHATSAPP */}
                      <div className="space-y-1.5">
                        <label className="block font-mono uppercase text-[11px] font-bold text-slate-300">
                          Phone / WhatsApp *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                          <input
                            type="tel"
                            required
                            placeholder="+1 (555) 000-0000 / +91 9876543210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* ADDITIONAL NOTES */}
                      <div className="space-y-1.5">
                        <label className="block font-mono uppercase text-[11px] font-bold text-slate-300">
                          Additional Notes / Meeting Objective (Optional)
                        </label>
                        <div className="relative">
                          <MessageSquare className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                          <textarea
                            rows={3}
                            placeholder="Brief description of your project scope, languages required, or discussion topics..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* Security note */}
                      <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-[11px] font-mono text-slate-400 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>Cloudflare Turnstile anti-bot verification required at final confirmation step.</span>
                      </div>

                      {/* SUBMIT BUTTON */}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <span>Confirming Booking...</span>
                          </div>
                        ) : (
                          <span>Confirm Booking</span>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* LIVE WORLD CLOCK SECTION (OUTSIDE MAIN BOX — DIRECTLY ABOVE FOOTER) */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 my-2">
        <WorldClockSection now={now} timeFormat={timeFormat} />
      </div>

      {/* SUBTLE BOOKING FOOTER */}
      <footer className="relative z-10 py-5 border-t border-white/5 bg-[#030406] text-center font-mono text-[11px] text-slate-500">
        <div>Copyright &copy; 2026 Zenemoo. All Rights Reserved.</div>
      </footer>

      {/* CLOUDFLARE TURNSTILE VERIFICATION MODAL */}
      {showTurnstileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/40 max-w-md w-full relative space-y-6 text-center shadow-2xl shadow-cyan-500/20 bg-[#0b0f19]">
            <button
              onClick={() => setShowTurnstileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/10">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold font-display text-white">Security Verification</h3>
              <p className="text-xs font-mono text-slate-400">
                Please complete the Cloudflare anti-bot verification to confirm your call booking.
              </p>
            </div>

            <TurnstileWidget
              onVerify={(token) => {
                handleTurnstileVerify(token);
              }}
              onError={(err) => {
                console.warn('[BOOKING] Turnstile error:', err);
                setErrorMessage('Anti-bot security check failed. Please try again.');
                setShowTurnstileModal(false);
              }}
            />

            <button
              onClick={() => setShowTurnstileModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ZENEMOO AI ASSISTANT DRAWER */}
      <ZenemooAiDrawer isOpen={isAiDrawerOpen} onClose={() => setIsAiDrawerOpen(false)} />
    </div>
  );
};
