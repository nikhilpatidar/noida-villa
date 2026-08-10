/**
 * Regression tests for the Phase H admin property-name cache.
 *
 * The pre-fix `getActivePropertyName()` ran `prisma.property.findUnique`
 * directly on every admin navigation. This test pins the architectural
 * invariant that the helper now goes through a cached, tagged lookup
 * that is shared across admins and invalidated by the existing CMS
 * invalidation hook.
 *
 * The cache is intentionally narrow:
 *   - keyed by `propertyId` (not userId), so multiple admins on the
 *     same property share one cached entry;
 *   - tagged with PUBLIC_PROPERTY_TAG, so the existing
 *     `revalidateTag(PUBLIC_PROPERTY_TAG)` calls in the CMS actions
 *     also bust this cache when an admin edits the property;
 *   - bounded to 5 minutes via the revalidate window, so a missed
 *     invalidation call still self-heals.
 *
 * Authorization still happens upstream in `getActivePropertyName` via
 * `getActivePropertyId`, which uses the JWT (or DB fallback) to ensure
 * the caller has access to the requested property. The cached lookup
 * itself never grants access — it only returns the name of a property
 * whose id the caller has already been authorized to see.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PROPERTY_SVC = path.resolve(
  __dirname,
  '../src/lib/services/property.ts',
);
const AUTHZ = path.resolve(
  __dirname,
  '../src/lib/authorization.ts',
);
const LAYOUT = path.resolve(
  __dirname,
  '../src/app/(admin)/admin/(protected)/layout.tsx',
);

const propertySrc = readFileSync(PROPERTY_SVC, 'utf8');
const authzSrc = readFileSync(AUTHZ, 'utf8');
const layoutSrc = readFileSync(LAYOUT, 'utf8');

describe('admin property-name cache', () => {
  it('exports a cached getPropertyNameById helper from src/lib/services/property.ts', () => {
    expect(propertySrc).toMatch(
      /export\s+const\s+getPropertyNameById\s*=\s*unstable_cache\s*\(/,
    );
  });

  it('the cache is tagged with PUBLIC_PROPERTY_TAG (so CMS invalidation also busts it)', () => {
    // The helper must tag with PUBLIC_PROPERTY_TAG, so the existing
    // CMS revalidateTag(PUBLIC_PROPERTY_TAG) calls also invalidate this.
    expect(propertySrc).toMatch(/tags:\s*\[\s*PUBLIC_PROPERTY_TAG\s*\]/);
  });

  it('the cache has a bounded revalidate window (defence-in-depth)', () => {
    const match = propertySrc.match(/revalidate:\s*(\d+)/);
    expect(match).not.toBeNull();
    const value = Number(match![1]);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThanOrEqual(300);
  });

  it('the cached helper selects ONLY the property name column', () => {
    // The cache must narrow the SELECT — never pull the entire property
    // row across the Vercel iad1 ↔ Supabase Mumbai link.
    const inner = propertySrc.match(
      /async\s+function\s+_getPropertyNameById[\s\S]*?\n\}/,
    );
    expect(inner).not.toBeNull();
    expect(inner![0]).toMatch(/select:\s*\{\s*name:\s*true\s*\}/);
  });
});

describe('getActivePropertyName uses the cached helper', () => {
  it('delegates the actual name lookup to getPropertyNameById', () => {
    // The helper must NOT issue a direct prisma.property.findUnique call.
    expect(authzSrc).not.toMatch(/prisma\.property\.findUnique\s*\(/);
    // And must call the cached helper from the property service.
    const helperBlock = authzSrc.match(
      /export\s+async\s+function\s+getActivePropertyName[\s\S]*?\n\}/,
    );
    expect(helperBlock).not.toBeNull();
    expect(helperBlock![0]).toMatch(/getPropertyNameById\s*\(/);
  });

  it('still calls getActivePropertyId (authorization gate) before the cached lookup', () => {
    // Authorization is unchanged: the helper still derives the propertyId
    // from the JWT before fetching its name.
    const helperBlock = authzSrc.match(
      /export\s+async\s+function\s+getActivePropertyName[\s\S]*?\n\}/,
    );
    expect(helperBlock![0]).toMatch(/await\s+getActivePropertyId\s*\(/);
  });
});

describe('admin layout still uses getActivePropertyName (unchanged contract)', () => {
  it('still imports and calls getActivePropertyName', () => {
    expect(layoutSrc).toMatch(
      /import\s*\{[^}]*\bgetActivePropertyName\b[^}]*\}\s*from\s*['"]@\/lib\/authorization['"]/,
    );
    expect(layoutSrc).toMatch(/await\s+getActivePropertyName\s*\(/);
  });
});

describe('admin segment has a loading boundary', () => {
  // UX improvement: navigation no longer appears frozen while the
  // server work is in flight. The boundary is a real loading state,
  // not a fix for actual latency.
  it('declares a loading.tsx in the protected admin segment', () => {
    const loadingPath = path.resolve(
      __dirname,
      '../src/app/(admin)/admin/(protected)/loading.tsx',
    );
    const fs = require('node:fs');
    expect(fs.existsSync(loadingPath)).toBe(true);
  });
});