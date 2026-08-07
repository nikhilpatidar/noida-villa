/**
 * Timezone / calendar-date regression tests.
 *
 * The previous `occurredOn: new Date(data.occurredOn + 'T00:00:00')` pattern
 * parsed the date string in the server's local timezone. On a UTC server,
 * that turned "2025-01-15" into `2025-01-14T18:30:00Z`, which then displayed
 * as "2025-01-14" via `.toISOString().slice(0, 10)` — an off-by-one-day
 * bug. The fix uses `parseCalendarDate`, which anchors at UTC noon, so the
 * ISO date slice matches the user's input on every server timezone.
 *
 * The `formatDate` helper is also pinned to UTC components so a transaction
 * stored as "2025-01-15T12:00:00Z" renders as "15 Jan 2025" even on a
 * server west of IST.
 */
import { describe, it, expect } from 'vitest';
import { parseCalendarDate, formatCalendarDate, startOfUtcDay } from '../src/lib/dates';
import { formatDate, formatDateTime } from '../src/lib/format';

describe('parseCalendarDate', () => {
  it('returns a Date at UTC noon', () => {
    const d = parseCalendarDate('2025-01-15');
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe('2025-01-15T12:00:00.000Z');
  });

  it('round-trips a YYYY-MM-DD string identically', () => {
    for (const s of ['2025-01-01', '2025-06-30', '2024-02-29', '2025-12-31', '2000-02-29']) {
      const d = parseCalendarDate(s);
      expect(d).not.toBeNull();
      expect(formatCalendarDate(d!)).toBe(s);
    }
  });

  it('rejects impossible dates (e.g. Feb 30) that JS would otherwise roll over', () => {
    // JS would silently turn "2025-02-30" into "2025-03-02" — we must reject.
    expect(parseCalendarDate('2025-02-30')).toBeNull();
    expect(parseCalendarDate('2025-13-01')).toBeNull();
    expect(parseCalendarDate('2025-00-15')).toBeNull();
  });

  it('rejects non-ISO input', () => {
    expect(parseCalendarDate('15-01-2025')).toBeNull();
    expect(parseCalendarDate('2025/01/15')).toBeNull();
    expect(parseCalendarDate('not a date')).toBeNull();
    expect(parseCalendarDate('')).toBeNull();
  });

  it('does not depend on the server local timezone', () => {
    // If the helper were timezone-naive, this would round-trip to a
    // different date on a server west of UTC. With UTC noon, the ISO
    // date slice always matches the input, regardless of TZ.
    const d = parseCalendarDate('2025-01-15')!;
    expect(d.toISOString().slice(0, 10)).toBe('2025-01-15');
  });
});

describe('formatDate (UTC-pinned)', () => {
  it('renders a UTC noon date as the same calendar day', () => {
    // 2025-01-15T12:00:00Z stored in the DB.
    const stored = new Date('2025-01-15T12:00:00.000Z');
    expect(formatDate(stored)).toBe('15 Jan 2025');
  });

  it('keeps the calendar day stable for any UTC time on that day', () => {
    for (const hour of [0, 1, 6, 12, 18, 23]) {
      const d = new Date(Date.UTC(2025, 5, 30, hour, 0, 0));
      expect(formatDate(d)).toBe('30 Jun 2025');
    }
  });

  it('accepts a YYYY-MM-DD string the same way it accepts a Date', () => {
    expect(formatDate('2025-01-15T12:00:00.000Z')).toBe('15 Jan 2025');
  });

  it('formatDateTime includes the UTC time', () => {
    const d = new Date('2025-01-15T12:34:00.000Z');
    // The exact format string has 'HH:mm' so we expect 12:34.
    expect(formatDateTime(d)).toBe('15 Jan 2025 · 12:34');
  });
});

describe('startOfUtcDay', () => {
  it('returns UTC midnight for the given date', () => {
    const d = new Date('2025-01-15T12:34:56.000Z');
    const s = startOfUtcDay(d);
    expect(s.toISOString()).toBe('2025-01-15T00:00:00.000Z');
  });
});