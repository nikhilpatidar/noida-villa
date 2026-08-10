/**
 * Regression tests for the Phase E public-property cache.
 *
 * What this pins (and prevents regressing silently):
 *
 *   1. loadPublicProperty and getDefaultPropertySlug are wrapped in
 *      `unstable_cache`, share a single cache tag, and have a 5-minute
 *      time-to-live as defence-in-depth.
 *
 *   2. The CMS actions (updateWebsiteContentAction, updateSeoAction)
 *      call revalidateTag(PUBLIC_PROPERTY_TAG), so a CMS edit actually
 *      invalidates the cached public-property data.
 *
 *   3. Public pages do NOT contain a direct prisma.property.findFirst()
 *      call — they go through the cached helpers. This prevents a
 *      future edit from re-introducing the per-request uncached DB hit
 *      that was the Phase E root cause.
 *
 * Source-level (not behavioural) because the project's existing style
 * prefers file-content invariants for these refactor-prone patterns.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const WEBSITE_SVC = path.resolve(
  __dirname,
  '../src/lib/services/website.ts',
);
const WEBSITE_ACTIONS = path.resolve(
  __dirname,
  '../src/app/(admin)/admin/(protected)/website/actions.ts',
);

const websiteSrc = readFileSync(WEBSITE_SVC, 'utf8');
const actionsSrc = readFileSync(WEBSITE_ACTIONS, 'utf8');

describe('public-property cache — service layer', () => {
  it('exports PUBLIC_PROPERTY_TAG with a stable string value', () => {
    // The CMS actions import this exact symbol; changing the string
    // silently would break tag invalidation.
    expect(websiteSrc).toMatch(
      /export\s+const\s+PUBLIC_PROPERTY_TAG\s*=\s*['"]public-property['"]/,
    );
  });

  it('loadPublicProperty is wrapped in unstable_cache', () => {
    expect(websiteSrc).toMatch(
      /export\s+const\s+loadPublicProperty\s*=\s*unstable_cache\s*\(/,
    );
    // And it is tagged with the same PUBLIC_PROPERTY_TAG.
    expect(websiteSrc).toMatch(/loadPublicProperty[\s\S]*?tags:\s*\[\s*PUBLIC_PROPERTY_TAG\s*\]/);
  });

  it('getDefaultPropertySlug is wrapped in unstable_cache', () => {
    expect(websiteSrc).toMatch(
      /export\s+const\s+getDefaultPropertySlug\s*=\s*unstable_cache\s*\(/,
    );
    // And it is tagged with the same PUBLIC_PROPERTY_TAG so a CMS edit
    // invalidates both caches atomically.
    expect(websiteSrc).toMatch(/getDefaultPropertySlug[\s\S]*?tags:\s*\[\s*PUBLIC_PROPERTY_TAG\s*\]/);
  });

  it('both cache wrappers have a short revalidate window', () => {
    // Defence-in-depth: even if a CMS edit forgets to invalidate,
    // stale data is bounded to 5 minutes.
    const matches = websiteSrc.match(/revalidate:\s*\d+/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    for (const m of matches) {
      const value = Number(m.match(/\d+/)?.[0]);
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(300);
    }
  });

  it('the raw (uncached) loaders are kept module-private', () => {
    // Callers must always go through the cached wrappers.
    expect(websiteSrc).not.toMatch(/export\s+(async\s+)?function\s+_loadPublicProperty/);
    expect(websiteSrc).not.toMatch(/export\s+(async\s+)?function\s+_getDefaultPropertySlug/);
  });

  it('cache keys include the function argument (slug) so multiple slugs do not collide', () => {
    // unstable_cache keys must embed the argument parts so different
    // properties never share a cache slot.
    const keyBlock = websiteSrc.match(/\[(['"])public-property-by-slug\1\]/);
    expect(keyBlock).not.toBeNull();
    const slugBlock = websiteSrc.match(/\[(['"])public-default-slug\1\]/);
    expect(slugBlock).not.toBeNull();
  });
});

describe('public-property cache — CMS invalidation', () => {
  it('imports revalidateTag and PUBLIC_PROPERTY_TAG in the actions file', () => {
    expect(actionsSrc).toMatch(/import\s*\{[^}]*revalidateTag[^}]*\}\s*from\s*['"]next\/cache['"]/);
    expect(actionsSrc).toMatch(
      /import\s*\{[^}]*PUBLIC_PROPERTY_TAG[^}]*\}\s*from\s*['"]@\/lib\/services\/website['"]/,
    );
  });

  it('updateWebsiteContentAction invalidates the public-property cache', () => {
    // The action body must call revalidateTag(PUBLIC_PROPERTY_TAG).
    const block = actionsSrc.match(
      /export\s+async\s+function\s+updateWebsiteContentAction[\s\S]*?\n\}/,
    );
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/revalidateTag\(\s*PUBLIC_PROPERTY_TAG\s*\)/);
  });

  it('updateSeoAction invalidates the public-property cache', () => {
    const block = actionsSrc.match(
      /export\s+async\s+function\s+updateSeoAction[\s\S]*?\n\}/,
    );
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/revalidateTag\(\s*PUBLIC_PROPERTY_TAG\s*\)/);
  });
});

describe('public-property cache — pages go through the cached helpers', () => {
  const PAGES = [
    'src/app/(public)/page.tsx',
    'src/app/(public)/stay/page.tsx',
    'src/app/(public)/amenities/page.tsx',
    'src/app/(public)/contact/page.tsx',
    'src/app/(public)/faq/page.tsx',
    'src/app/(public)/gallery/page.tsx',
    'src/app/(public)/location/page.tsx',
    'src/app/(public)/privacy/page.tsx',
    'src/app/(public)/terms/page.tsx',
    'src/app/(public)/guide/page.tsx',
    'src/app/(public)/guide/[slug]/page.tsx',
  ];

  for (const rel of PAGES) {
    const abs = path.resolve(__dirname, '..', rel);
    const src = readFileSync(abs, 'utf8');

    it(`${rel} does not call prisma.property.findFirst() directly`, () => {
      // The page must go through the cached helpers, not the raw DB.
      expect(src).not.toMatch(/prisma\.property\.findFirst\s*\(/);
    });

    it(`${rel} imports at least one cached helper from the website service`, () => {
      // loadPublicProperty / getDefaultPropertySlug are the cache
      // boundaries; pages must consume at least one of them.
      const importsCached =
        /import\s*\{[^}]*\bloadPublicProperty\b[^}]*\}\s*from\s*['"]@\/lib\/services\/website['"]/.test(
          src,
        ) ||
        /import\s*\{[^}]*\bgetDefaultPropertySlug\b[^}]*\}\s*from\s*['"]@\/lib\/services\/website['"]/.test(
          src,
        );
      expect(importsCached).toBe(true);
    });
  }
});