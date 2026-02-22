import type { FoodEntry } from '@/types';

/**
 * Reconstruct an absolute Date from a FoodEntry's date, time, and utc_offset fields.
 *
 * Accepts time in 12-hour ("1:30 PM") or 24-hour ("13:30") format.
 * If offset is missing, assumes local timezone.
 * Returns null if the fields can't be parsed into a valid date.
 */
export function parseEntryTimestamp(entry: FoodEntry): Date | null {
  const { date, time, utc_offset } = entry;
  if (!date || !time) return null;

  // Parse time: support "1:30 PM", "12:00 AM", "13:30"
  const match12 = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let hours: number;
  let minutes: number;

  if (match12) {
    hours = parseInt(match12[1], 10);
    minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;
  } else {
    const match24 = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match24) return null;
    hours = parseInt(match24[1], 10);
    minutes = parseInt(match24[2], 10);
  }

  if (utc_offset) {
    // Build an ISO string with the explicit offset: "2026-02-22T13:30:00-08:00"
    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const iso = `${date}T${h}:${m}:00${utc_offset}`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  // No offset — treat as local time
  const d = new Date(
    parseInt(date.slice(0, 4), 10),
    parseInt(date.slice(5, 7), 10) - 1,
    parseInt(date.slice(8, 10), 10),
    hours,
    minutes,
  );
  return isNaN(d.getTime()) ? null : d;
}

/** Format a Date as local "h:mm AM/PM" */
export function formatLocalTime(d: Date): string {
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${minutes} ${period}`;
}

/** Format a Date as local "YYYY-MM-DD" */
export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
