/**
 * Date formatting helpers that always render in UTC so the calendar date
 * shown to the user matches the calendar date they entered, regardless of
 * the server's local timezone.
 *
 * Application date-only fields are stored as UTC noon (see parseCalendarDate
 * in src/lib/dates.ts). We render them in UTC so the YYYY-MM-DD slice the
 * user submitted is what they see back.
 */
import { format } from 'date-fns';

/**
 * Shift the Date so its "local" components equal its UTC components. Then
 * `format(d, 'dd MMM yyyy')` from date-fns reads the UTC components. This
 * avoids pulling in a tz database for the common case.
 */
function asUtc(d: Date): Date {
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
}

export function formatDate(iso: string | Date, pattern = 'dd MMM yyyy'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return format(asUtc(d), pattern);
}

export function formatDateTime(iso: string | Date, pattern = 'dd MMM yyyy · HH:mm'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return format(asUtc(d), pattern);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
