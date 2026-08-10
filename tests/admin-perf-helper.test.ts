/**
 * Regression test for /admin/expenses and the getActivePropertyId helper.
 *
 * The bug: /admin/expenses returned 404 because no page.tsx existed
 * at that path, even though the sidebar linked to it. The fix adds
 * `expenses/page.tsx` mirroring the `income/page.tsx` create-form
 * pattern, so the URL renders the New expense form.
 *
 * This test pins that:
 *   - /admin/expenses resolves to a page (a page.tsx exists)
 *   - the page is auth-gated via getActivePropertyId (no redundant
 *     `prisma.property.findFirst` lookup in the file)
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const EXPENSES_PAGE = path.resolve(
  __dirname,
  '../src/app/(admin)/admin/(protected)/expenses/page.tsx',
);
const AUTH = path.resolve(__dirname, '../src/lib/authorization.ts');

describe('/admin/expenses — create-form page exists', () => {
  it('a page.tsx exists at the /admin/expenses route', () => {
    expect(existsSync(EXPENSES_PAGE)).toBe(true);
  });

  it('the page is a Server Component (no "use client" directive)', () => {
    const src = readFileSync(EXPENSES_PAGE, 'utf8');
    expect(src.startsWith("'use client'")).toBe(false);
    expect(src.startsWith('"use client"')).toBe(false);
  });

  it('the page renders the New expense form (mirrors the income page pattern)', () => {
    const src = readFileSync(EXPENSES_PAGE, 'utf8');
    expect(src).toMatch(/<ExpenseForm\b/);
    // Heading matches the income page convention.
    expect(src).toMatch(/New expense/);
  });
});

describe('getActivePropertyId — JWT-aware property lookup helper', () => {
  it('is exported from src/lib/authorization.ts', () => {
    const authSrc = readFileSync(AUTH, 'utf8');
    expect(authSrc).toMatch(/export\s+async\s+function\s+getActivePropertyId\s*\(/);
  });

  it('reads membershipPropertyIds from the session before hitting the DB', () => {
    const authSrc = readFileSync(AUTH, 'utf8');
    // The fast path must read the JWT-supplied property id.
    expect(authSrc).toMatch(/session\?\.user\?\.membershipPropertyIds/);
    // Only falls back to a DB lookup if the JWT lacks it.
    expect(authSrc).toMatch(/prisma\.propertyMembership\.findFirst/);
  });
});