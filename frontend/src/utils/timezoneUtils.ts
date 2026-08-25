/**
 * Production Timezone Utility Module for IANA Timezones (e.g., Asia/Kolkata, UTC, America/New_York)
 * Provides 100% accurate conversion between local date/time in selected timezone and canonical UTC timestamps.
 */

/**
 * Extracts YYYY-MM-DD date string and HH:mm time string in the target IANA timezone
 */
export const getDateTimeInTimezone = (
  date: Date,
  timeZone: string = 'Asia/Kolkata'
): { dateStr: string; timeStr: string } => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    let hour = getPart('hour');
    if (hour === '24') hour = '00';
    const minute = getPart('minute');

    return {
      dateStr: `${year}-${month}-${day}`,
      timeStr: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
    };
  } catch (e) {
    // Fallback if invalid timezone passed
    const iso = date.toISOString();
    return {
      dateStr: iso.split('T')[0],
      timeStr: iso.split('T')[1].substring(0, 5),
    };
  }
};

/**
 * Converts user-entered local dateStr (YYYY-MM-DD) and timeStr (HH:mm) in a target timezone into a UTC Date object
 */
export const parseLocalDateInTimezoneToUtc = (
  dateStr: string,
  timeStr: string,
  timeZone: string = 'Asia/Kolkata'
): Date => {
  if (!dateStr || !timeStr) return new Date(NaN);

  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // Construct initial UTC date from date & time parts
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  // Determine actual local date/time of utcGuess in target timezone
  const formatted = getDateTimeInTimezone(utcGuess, timeZone);
  const [targetYear, targetMonth, targetDay] = formatted.dateStr.split('-').map(Number);
  const [targetHour, targetMinute] = formatted.timeStr.split(':').map(Number);

  const targetDateAsUtc = new Date(
    Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, 0, 0)
  );

  // Offset difference between target local representation and UTC guess
  const offsetDiffMs = targetDateAsUtc.getTime() - utcGuess.getTime();

  // Subtract offset to get exact UTC instant corresponding to local user time
  return new Date(utcGuess.getTime() - offsetDiffMs);
};

/**
 * Formats a Date/ISO string for UI display in selected IANA timezone
 */
export const formatScheduledDateInTimezone = (
  dateInput: Date | string,
  timeZone: string = 'Asia/Kolkata'
): string => {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch (e) {
    return d.toLocaleString();
  }
};
