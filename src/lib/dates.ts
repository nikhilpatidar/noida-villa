/**
 * Date helpers — all date-only fields (no clock time) use UTC noon so the
 * calendar date is stable across server timezones.
 *
 * Background: `new Date("2025-01-15T00:00:00")` (no Z) is parsed in the
 * SERVER's local timezone. On a UTC server that becomes
 * `2025-01-14T18:30:00Z`, and rendering via `.toISOString().slice(0, 10)`
 * then shows "2025-01-14" to a user who entered "2025-01-15". Picking
 * noon UTC for date-only fields guarantees the ISO date slice matches the
 * user's input regardless of where the server runs.
 */

/**
 * Parse a YYYY-MM-DD string into a Date representing UTC noon on that day.
 * Returns null if the input does not match the expected format.
 */
export function parseCalendarDate(input: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const d = new Date(`${input}T12:00:00Z`);
  // Defensive: confirm the round-trip preserves the calendar date.
  // This catches impossible dates like "2025-02-30" which JS silently
  // rolls over to "2025-03-02".
  if (
    Number.isNaN(d.getTime()) ||
    d.toISOString().slice(0, 10) !== input
  ) {
    return null;
  }
  return d;
}

/** Format a Date as a YYYY-MM-DD string in UTC. */
export function formatCalendarDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Start of the calendar day (UTC midnight) for the given UTC date. */
export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
