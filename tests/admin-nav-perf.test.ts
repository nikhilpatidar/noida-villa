/**
 * Regression tests for the Phase G admin-navigation performance fixes.
 *
 * The pre-fix pattern on form-bearing admin pages was:
 *
 *     const property = await prisma.property.findFirst({
 *       where: { memberships: { some: { userId: session.user.id, isActive: true } } },
 *       include: { participants: ..., categories: ... },
 *     });
 *
 * This query scans memberships AND pulls the entire property row, even
 * when only `propertyId` + small relation slices are needed. It is also
 * serial with respect to the page's other DB work.
 *
 * This file pins the architectural invariants that prevent regression:
 *
 *   1. Form-bearing admin pages must NOT contain the legacy
 *      `prisma.property.findFirst({ where: { memberships: { some: ... } } })`
 *      pattern. They must use the JWT-aware `getActivePropertyId()`.
 *
 *   2. The form-bearing pages (`/admin/expenses`, `/admin/expenses/new`,
 *      `/admin/income`) must run their `participants` and `categories`
 *      fetches in parallel via `Promise.all`.
 *
 *   3. The admin dashboard must parallelize `loadDashboard` with the
 *      `participant.findFirst` for the current user.
 *
 *   4. The reports page must parallelize categories with transactions
 *      (not pull categories via a `property.findFirst` include).
 *
 *   5. The settlements page must run `participant.findMany`,
 *      `computeSuggestions`, and `settlement.findMany` in parallel.
 *
 *   6. The CMS pages (`/admin/website`, `/admin/property`, `/admin/audit`,
 *      `/admin/owners`) must run `requireRole` and their content query
 *      in parallel.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'src/app/(admin)/admin/(protected)');

const LEGACY_SCAN = /property\.findFirst\s*\(\s*\{[\s\S]*?memberships:\s*\{\s*some:/;

const pagesToCheck: Array<{ rel: string; mustPromiseAll?: boolean }> = [
  { rel: 'expenses/page.tsx' },
  { rel: 'expenses/new/page.tsx' },
  { rel: 'income/page.tsx' },
  { rel: 'reports/page.tsx' },
  { rel: 'settlements/page.tsx' },
  { rel: 'website/page.tsx' },
  { rel: 'property/page.tsx' },
  { rel: 'owners/page.tsx' },
  { rel: 'audit/page.tsx' },
  { rel: 'page.tsx' }, // admin dashboard
];

describe('admin pages — no legacy membership-scan property lookup', () => {
  for (const { rel } of pagesToCheck) {
    const abs = path.join(PAGES_DIR, rel);
    const src = readFileSync(abs, 'utf8');

    it(`${rel} does not use the legacy prisma.property.findFirst({where:{memberships:{some:...}}}) pattern`, () => {
      expect(src).not.toMatch(LEGACY_SCAN);
    });

    it(`${rel} uses the JWT-aware getActivePropertyId helper`, () => {
      // The page must derive its propertyId from the JWT (zero DB hits)
      // rather than rescanning memberships.
      const usesHelper =
        /await\s+getActivePropertyId\s*\(/.test(src);
      expect(usesHelper).toBe(true);
    });
  }
});

describe('admin pages — independent queries are parallelized', () => {
  it('/admin/expenses runs participants + categories in Promise.all', () => {
    const src = readFileSync(path.join(PAGES_DIR, 'expenses/page.tsx'), 'utf8');
    // Find the Promise.all block — both queries must be inside.
    const block = src.match(/await\s+Promise\.all\s*\(\s*\[[\s\S]*?\]\s*\)/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/participant\.findMany/);
    expect(block![0]).toMatch(/category\.findMany/);
  });

  it('/admin/expenses/new runs participants + categories in Promise.all', () => {
    const src = readFileSync(path.join(PAGES_DIR, 'expenses/new/page.tsx'), 'utf8');
    const block = src.match(/await\s+Promise\.all\s*\(\s*\[[\s\S]*?\]\s*\)/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/participant\.findMany/);
    expect(block![0]).toMatch(/category\.findMany/);
  });

  it('/admin/income runs participants + categories in Promise.all', () => {
    const src = readFileSync(path.join(PAGES_DIR, 'income/page.tsx'), 'utf8');
    const block = src.match(/await\s+Promise\.all\s*\(\s*\[[\s\S]*?\]\s*\)/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/participant\.findMany/);
    expect(block![0]).toMatch(/category\.findMany/);
  });

  it('/admin/reports runs categories + transactions in Promise.all', () => {
    const src = readFileSync(path.join(PAGES_DIR, 'reports/page.tsx'), 'utf8');
    const block = src.match(/await\s+Promise\.all\s*\(\s*\[[\s\S]*?\]\s*\)/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/category\.findMany/);
    expect(block![0]).toMatch(/transaction\.findMany/);
    // And the page must NOT join categories through a property include.
    expect(src).not.toMatch(/include:\s*\{\s*categories:\s*true/);
  });

  it('/admin/settlements runs participants + computeSuggestions + settlement.findMany in Promise.all', () => {
    const src = readFileSync(path.join(PAGES_DIR, 'settlements/page.tsx'), 'utf8');
    const block = src.match(/await\s+Promise\.all\s*\(\s*\[[\s\S]*?\]\s*\)/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/participant\.findMany/);
    expect(block![0]).toMatch(/computeSuggestions/);
    expect(block![0]).toMatch(/settlement\.findMany/);
  });

  it('admin dashboard runs loadDashboard + participant.findFirst in Promise.all', () => {
    const src = readFileSync(path.join(PAGES_DIR, 'page.tsx'), 'utf8');
    const block = src.match(/await\s+Promise\.all\s*\(\s*\[[\s\S]*?\]\s*\)/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/loadDashboard/);
    expect(block![0]).toMatch(/participant\.findFirst/);
  });
});

describe('admin CMS pages — requireRole runs in parallel with content fetch', () => {
  // On these pages the role check and the data fetch are independent.
  // Doing them serially means one extra iad1↔Mumbai round-trip per
  // navigation. The tests pin that they appear in a single Promise.all.
  const cmsPages = ['website/page.tsx', 'property/page.tsx', 'audit/page.tsx', 'owners/page.tsx'];
  for (const rel of cmsPages) {
    it(`${rel} parallelizes requireRole with the page's content fetch`, () => {
      const src = readFileSync(path.join(PAGES_DIR, rel), 'utf8');
      const block = src.match(/await\s+Promise\.all\s*\(\s*\[[\s\S]*?\]\s*\)/);
      expect(block).not.toBeNull();
      expect(block![0]).toMatch(/requireRole/);
      // The block must contain at least one prisma read.
      expect(block![0]).toMatch(/prisma\./);
    });
  }
});

describe('admin people page — user fetch is narrowed to email', () => {
  // The page renders only the user email. The user fetch should narrow
  // its Prisma select to { id, email } instead of pulling every column.
  it('prisma.user.findMany uses select: { id: true, email: true }', () => {
    const src = readFileSync(path.join(PAGES_DIR, 'people/page.tsx'), 'utf8');
    expect(src).toMatch(/prisma\.user\.findMany\s*\([\s\S]*?select:\s*\{\s*id:\s*true,\s*email:\s*true\s*\}/);
  });
});

describe('admin transactions page — only renderable joins are included', () => {
  // The table renders: category.name, paidBy.displayName,
  // receivedBy.displayName, createdBy.name|email. It does NOT render
  // expenseSplits / incomeSplits at all, so loading them is wasted
  // bandwidth on every /admin/transactions navigation.
  it('does NOT include expenseSplits or incomeSplits in the findMany', () => {
    const src = readFileSync(path.join(PAGES_DIR, 'transactions/page.tsx'), 'utf8');
    expect(src).not.toMatch(/expenseSplits:\s*true/);
    expect(src).not.toMatch(/incomeSplits:\s*true/);
  });

  it('still includes the relations the table actually renders', () => {
    const src = readFileSync(path.join(PAGES_DIR, 'transactions/page.tsx'), 'utf8');
    const includeBlock = src.match(/include:\s*\{[^}]*\}/);
    expect(includeBlock).not.toBeNull();
    expect(includeBlock![0]).toMatch(/category:/);
    expect(includeBlock![0]).toMatch(/paidBy:/);
    expect(includeBlock![0]).toMatch(/receivedBy:/);
    expect(includeBlock![0]).toMatch(/createdBy:/);
  });
});

describe('updatePropertyAction invalidates PUBLIC_PROPERTY_TAG', () => {
  // The action mutates the property row (including name). The cached
  // public/admin property loaders are tagged with PUBLIC_PROPERTY_TAG,
  // so the action must invalidate that tag or the cache will serve
  // the old property name for up to the TTL window.
  it('imports revalidateTag and PUBLIC_PROPERTY_TAG', () => {
    const src = readFileSync(
      path.resolve(ROOT, 'src/app/(admin)/admin/(protected)/property/actions.ts'),
      'utf8',
    );
    expect(src).toMatch(/import\s*\{[^}]*revalidateTag[^}]*\}\s*from\s*['"]next\/cache['"]/);
    expect(src).toMatch(
      /import\s*\{[^}]*PUBLIC_PROPERTY_TAG[^}]*\}\s*from\s*['"]@\/lib\/services\/website['"]/,
    );
  });

  it('calls revalidateTag(PUBLIC_PROPERTY_TAG) inside updatePropertyAction', () => {
    const src = readFileSync(
      path.resolve(ROOT, 'src/app/(admin)/admin/(protected)/property/actions.ts'),
      'utf8',
    );
    const block = src.match(
      /export\s+async\s+function\s+updatePropertyAction[\s\S]*?\n\}/,
    );
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/revalidateTag\(\s*PUBLIC_PROPERTY_TAG\s*\)/);
  });
});