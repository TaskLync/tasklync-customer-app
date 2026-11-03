/**
 * timezone.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single Source of Truth for Timezone & Date/Time Operations in Tasklync.
 * Target Region: Pakistan Standard Time (PKT, Asia/Karachi, UTC+5).
 * 
 * Scalability Architecture:
 * - All backend API payloads and database storage use canonical ISO-8601 UTC (ending with 'Z').
 * - Client UI formatting and slot conversions consistently convert between UTC and Asia/Karachi.
 */

export const PAKISTAN_TIMEZONE = 'Asia/Karachi';
export const PAKISTAN_OFFSET_HOURS = 5; // UTC+5

/**
 * Normalizes any date representation (YYYY-MM-DD, ISO-8601 UTC, or Javascript Date string)
 * into a strict canonical YYYY-MM-DD format.
 *
 * Example inputs:
 * - "2026-11-13" -> "2026-11-13"
 * - "2026-11-13T00:00:00.000Z" -> "2026-11-13"
 * - "Fri Nov 13 2026 00:00:00 GMT+0000 (Coordinated Universal Time)" -> "2026-11-13"
 * - new Date(...) -> "2026-11-13"
 */
export function normalizeDateToYYYYMMDD(dateInput?: string | Date | null): string | null {
  if (!dateInput) return null;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;

    // Fast path: Exact YYYY-MM-DD pattern
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // Fast path: ISO string starting with YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (isoMatch) {
      return isoMatch[1];
    }

    // Parseable Date string (e.g. "Fri Nov 13 2026 00:00:00 GMT+0000...")
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const day = String(parsed.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const year = dateInput.getUTCFullYear();
    const month = String(dateInput.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Returns current date in Pakistan Time formatted as YYYY-MM-DD.
 * Prevents midnight-boundary bugs on devices in other timezones.
 */
export function getPKTTodayDateString(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: PAKISTAN_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  } catch (_err) {
    // Fallback if Intl timeZone is unavailable
    const offsetMs = PAKISTAN_OFFSET_HOURS * 60 * 60 * 1000;
    const pktDate = new Date(date.getTime() + offsetMs);
    const y = pktDate.getUTCFullYear();
    const m = String(pktDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(pktDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Parses time strings in multiple formats:
 * - 12-hour: "02:30 PM", "10:00 AM", "2:30 pm"
 * - 24-hour: "14:30", "09:00", "14:30:00"
 * Returns { hour24: number, minute: number }
 */
export function parseTimeSlot(timeStr: string): { hour24: number; minute: number } {
  const trimmed = timeStr.trim();
  const is12Hour = /am|pm/i.test(trimmed);

  if (is12Hour) {
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const period = match[3].toUpperCase();

      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;

      return { hour24: h, minute: m };
    }
  }

  // Fallback / 24-hour
  const [hStr, mStr] = trimmed.split(':');
  const h = parseInt(hStr || '10', 10);
  const m = parseInt(mStr || '0', 10);
  return { hour24: isNaN(h) ? 10 : h, minute: isNaN(m) ? 0 : m };
}

/**
 * Converts a selected calendar date string ("YYYY-MM-DD") and slot time string ("10:00 AM" / "14:30")
 * in Pakistan Time (Asia/Karachi, UTC+5) into an exact ISO-8601 UTC timestamp string.
 *
 * Example:
 *   Date: "2026-08-15", Time: "02:30 PM" (14:30 PKT)
 *   Result: "2026-08-15T09:30:00.000Z" (UTC = PKT - 5 hours)
 */
export function slotToUTCISO(
  dateStr: string,
  timeStr: string,
  _timezone: string = PAKISTAN_TIMEZONE
): string {
  if (!dateStr) {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString();
  }

  const [yStr, mStr, dStr] = dateStr.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1; // 0-indexed
  const day = parseInt(dStr, 10);

  const { hour24, minute } = parseTimeSlot(timeStr || '10:00 AM');

  // Construct UTC timestamp by subtracting Pakistan offset (+5h)
  const utcDate = new Date(Date.UTC(year, month, day, hour24 - PAKISTAN_OFFSET_HOURS, minute, 0, 0));
  return utcDate.toISOString();
}

/**
 * Formats an ISO-8601 UTC timestamp string or Date object into Pakistan Standard Time formatted date.
 * Example: "Aug 15, 2026"
 */
export function formatPKTDate(
  isoDate: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoDate) return '';
  const dateObj = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  if (isNaN(dateObj.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: PAKISTAN_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
}

/**
 * Formats an ISO-8601 UTC timestamp string or Date object into Pakistan Standard Time formatted time.
 * Example: "2:30 PM"
 */
export function formatPKTTime(
  isoDate: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoDate) return '';
  const dateObj = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  if (isNaN(dateObj.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: PAKISTAN_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
}

/**
 * Formats an ISO-8601 UTC timestamp string or Date object into a combined date and time in PKT.
 * Example: "Aug 15, 2026 • 2:30 PM"
 */
export function formatPKTDateTime(
  isoDate: string | Date | undefined | null,
  separator: string = ' • '
): string {
  if (!isoDate) return '';
  const dateStr = formatPKTDate(isoDate);
  const timeStr = formatPKTTime(isoDate);
  if (!dateStr && !timeStr) return '';
  if (!dateStr) return timeStr;
  if (!timeStr) return dateStr;
  return `${dateStr}${separator}${timeStr}`;
}

/**
 * Human-friendly relative schedule formatter in Pakistan Time.
 * Example: "Today at 2:30 PM", "Tomorrow at 10:00 AM", "Aug 20 at 3:00 PM"
 */
export function formatPKTRelativeSchedule(isoDate: string | Date | undefined | null): string {
  if (!isoDate) return 'Scheduled';
  const dateObj = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  if (isNaN(dateObj.getTime())) return 'Scheduled';

  const todayStr = getPKTTodayDateString();
  const tomorrowDate = new Date(Date.now() + 86400000);
  const tomorrowStr = getPKTTodayDateString(tomorrowDate);

  const eventDateStr = getPKTTodayDateString(dateObj);
  const timeStr = formatPKTTime(dateObj);

  if (eventDateStr === todayStr) {
    return `Today at ${timeStr}`;
  }
  if (eventDateStr === tomorrowStr) {
    return `Tomorrow at ${timeStr}`;
  }

  const dateFormatted = formatPKTDate(dateObj, { month: 'short', day: 'numeric' });
  return `${dateFormatted} at ${timeStr}`;
}
