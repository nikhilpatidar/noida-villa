/**
 * Regression tests for the Phase F admin-layout performance fix.
 *
 * What this pins:
 *
 *   1. The protected admin layout does NOT issue the historical
 *      `prisma.propertyMembership.findMany({ include: { property: true } })`
 *      on every navigation. It uses the JWT-aware helper
 *      `getActivePropertyName()` so only the property NAME column is
 *      fetched, and only after the JWT-cached membership id resolves it.
 *
 *   2. The protected admin layout still enforces authentication and
 *      membership (it does not trust the JWT id blindly — it goes
 *      through `getActivePropertyName()` which itself calls
 *      `getActivePropertyId()` which validates the JWT).
 *
 *   3. The public guide cache helpers exist and are wrapped in
 *      `unstable_cache` under PUBLIC_PROPERTY_TAG.
 *
 *   4. The /guide and /guide/[slug] pages no longer hit Prisma directly
 *      for guideArticle rows.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const LAYOUT = path.resolve(
  __dirname,
  '../src/app/(admin)/admin/(protected)/layout.tsx',
);
const AUTHZ = path.resolve(
  __dirname,
  '../src/lib/authorization.ts',
);
const WEBSITE_SVC = path.resolve(
  __dirname,
  '../src/lib/services/website.ts',
);
const GUIDE_INDEX = path.resolve(
  __dirname,
  '../src/app/(public)/guide/page.tsx',
);
const GUIDE_SLUG = path.resolve(
  __dirname,
  '../src/app/(public)/guide/[slug]/page.tsx',
);

const layoutSrc = readFileSync(LAYOUT, 'utf8');
const authzSrc = readFileSync(AUTHZ, 'utf8');
const websiteSrc = readFileSync(WEBSITE_SVC, 'utf8');
const guideIndexSrc = readFileSync(GUIDE_INDEX, 'utf8');
const guideSlugSrc = readFileSync(GUIDE_SLUG, 'utf8');

describe('admin layout — no full membership scan on every navigation', () => {
  it('does NOT call prisma.propertyMembership.findMany with the historical heavy include', () => {
    // The pre-fix query scanned every active membership AND joined every
    // property column. The layout must not contain it.
    expect(layoutSrc).not.toMatch(/propertyMembership\.findMany\s*\(/);
    // And specifically must not include the property row.
    expect(layoutSrc).not.toMatch(/include:\s*\{\s*property:\s*true\s*\}/);
  });

  it('does NOT import @/lib/db directly (no raw prisma usage in layout)', () => {
    expect(layoutSrc).not.toMatch(/import\s*\{[^}]*\bprisma\b[^}]*\}\s*from\s*['"]@\/lib\/db['"]/);
  });

  it('uses the JWT-aware getActivePropertyName helper', () => {
    // Must pull the helper from src/lib/authorization.
    expect(layoutSrc).toMatch(
      /import\s*\{[^}]*\bgetActivePropertyName\b[^}]*\}\s*from\s*['"]@\/lib\/authorization['"]/,
    );
    // And call it in the layout body.
    expect(layoutSrc).toMatch(/await\s+getActivePropertyName\s*\(/);
  });

  it('still enforces auth + membership (no JWT-only trust)', () => {
    // auth() still gates the layout.
    expect(layoutSrc).toMatch(/await\s+auth\s*\(/);
    expect(layoutSrc).toMatch(/if\s*\(\s*!session\?\.user\?\.id\s*\)/);
    // And redirects to /admin/login if no membership.
    expect(layoutSrc).toMatch(/redirect\(\s*['"]\/admin\/login/);
  });
});

describe('getActivePropertyName — JWT-aware helper', () => {
  it('is exported from src/lib/authorization.ts', () => {
    expect(authzSrc).toMatch(
      /export\s+async\s+function\s+getActivePropertyName\s*\(/,
    );
  });

  it('uses the membership id from the JWT to bound the property lookup', () => {
    // The helper must go through getActivePropertyId (which prefers the
    // JWT-cached ids) before doing any property lookup. The actual name
    // lookup is delegated to the cached helper in src/lib/services/property.
    const helperBlock = authzSrc.match(
      /export\s+async\s+function\s+getActivePropertyName[\s\S]*?\n\}/,
    );
    expect(helperBlock).not.toBeNull();
    expect(helperBlock![0]).toMatch(/await\s+getActivePropertyId\s*\(/);
    // And delegates to the cached helper rather than issuing a raw
    // prisma.property.findUnique directly from authorization.ts.
    expect(helperBlock![0]).toMatch(/getPropertyNameById\s*\(/);
    // The helper itself must NOT issue a direct prisma.property.findUnique
    // call any more (Phase H moved that to the cached property service).
    expect(authzSrc).not.toMatch(/prisma\.property\.findUnique\s*\(/);
  });
});

describe('public guide cache helpers', () => {
  it('listPublicGuideArticles is wrapped in unstable_cache', () => {
    expect(websiteSrc).toMatch(
      /export\s+const\s+listPublicGuideArticles\s*=\s*unstable_cache\s*\(/,
    );
    // And tagged with the shared PUBLIC_PROPERTY_TAG so CMS edits invalidate it.
    expect(websiteSrc).toMatch(
      /listPublicGuideArticles[\s\S]*?tags:\s*\[\s*PUBLIC_PROPERTY_TAG\s*\]/,
    );
  });

  it('getPublicGuideArticle is wrapped in unstable_cache', () => {
    expect(websiteSrc).toMatch(
      /export\s+const\s+getPublicGuideArticle\s*=\s*unstable_cache\s*\(/,
    );
    expect(websiteSrc).toMatch(
      /getPublicGuideArticle[\s\S]*?tags:\s*\[\s*PUBLIC_PROPERTY_TAG\s*\]/,
    );
  });
});

describe('public guide pages — no direct Prisma access', () => {
  it('/guide uses the cached listPublicGuideArticles helper', () => {
    expect(guideIndexSrc).not.toMatch(/prisma\.guideArticle\.findMany\s*\(/);
    expect(guideIndexSrc).toMatch(
      /import\s*\{[^}]*\blistPublicGuideArticles\b[^}]*\}\s*from\s*['"]@\/lib\/services\/website['"]/,
    );
    expect(guideIndexSrc).toMatch(/await\s+listPublicGuideArticles\s*\(/);
  });

  it('/guide/[slug] uses the cached getPublicGuideArticle helper (no duplicate findFirst)', () => {
    // The pre-fix page made TWO identical findFirst calls (one in
    // generateMetadata and one in the page render). With caching they
    // collapse to one DB hit and a single helper call site.
    const findFirstCount = (guideSlugSrc.match(/prisma\.guideArticle\.findFirst\s*\(/g) ?? []).length;
    expect(findFirstCount).toBe(0);
    expect(guideSlugSrc).toMatch(
      /import\s*\{[^}]*\bgetPublicGuideArticle\b[^}]*\}\s*from\s*['"]@\/lib\/services\/website['"]/,
    );
    expect(guideSlugSrc).toMatch(/await\s+getPublicGuideArticle\s*\(/);
  });
});