/**
 * Regression tests for the /admin/reports React Server Component boundary
 * fix.
 *
 * The bug: the reports page was a Server Component containing a
 * <select onChange={...}> element. React Server Components cannot ship
 * event handlers as props, so any unauthenticated or authenticated visit
 * crashed with: "Event handlers cannot be passed to Client Component
 * props."
 *
 * The fix extracts the year picker into `reports/YearPicker.tsx`, a tiny
 * Client Component ('use client'), and the reports page now imports it.
 *
 * These tests are source-level: the bug class cannot recur if a future
 * edit puts an event handler back into a Server Component.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPORTS_PAGE = path.resolve(
  __dirname,
  '../src/app/(admin)/admin/(protected)/reports/page.tsx',
);
const YEAR_PICKER = path.resolve(
  __dirname,
  '../src/app/(admin)/admin/(protected)/reports/YearPicker.tsx',
);

const pageSrc = readFileSync(REPORTS_PAGE, 'utf8');
const pickerSrc = readFileSync(YEAR_PICKER, 'utf8');

describe('reports — Server/Client Component boundary', () => {
  it('the reports page is a Server Component (no "use client" directive)', () => {
    // The page must remain a Server Component so server-side data
    // fetching (auth + Prisma transactions) keeps working. Only the
    // interactive year picker is a Client Component.
    expect(pageSrc.startsWith("'use client'")).toBe(false);
    expect(pageSrc.startsWith('"use client"')).toBe(false);
  });

  it('the reports page does NOT contain any inline event handler', () => {
    // The exact pattern from the original bug: <select ... onChange={...}>
    // No JSX onChange / onClick / onSubmit attribute may appear in the
    // Server Component, because React forbids shipping event handlers
    // from server to client.
    expect(pageSrc).not.toMatch(/\s(onChange|onClick|onSubmit|onInput|onFocus|onBlur)\s*=\s*\{/);
  });

  it('the reports page does not import a Client Component selector wrapper itself', () => {
    // It must delegate interactivity to the YearPicker Client Component.
    expect(pageSrc).toMatch(/import\s*\{\s*YearPicker\s*\}\s*from\s*['"]\.\/YearPicker['"]/);
  });

  it('the YearPicker is a Client Component ("use client")', () => {
    expect(pickerSrc.trimStart().startsWith("'use client'")).toBe(true);
  });

  it('the YearPicker owns the onChange handler', () => {
    // It is allowed to attach onChange because it is a Client Component.
    expect(pickerSrc).toMatch(/onChange\s*=\s*\{/);
    // And the submit-on-change behaviour is preserved.
    expect(pickerSrc).toMatch(/\.form/);
    expect(pickerSrc).toMatch(/\.submit\(\)/);
  });
});