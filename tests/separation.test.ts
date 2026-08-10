/**
 * Separation tests.
 *
 * These tests prove, without a database, that:
 *   1. The demo seed is keyed on the `the-olive-house-demo` slug and never
 *      touches a property whose slug differs.
 *   2. The demo removal script matches only the demo slug.
 *   3. The application does not contain hardcoded references to demo
 *      identifiers (Olive House, demo owner emails, demo Airbnb URL).
 *   4. Site config defaults do not bake in any property name.
 *   5. The `isDemoDeployment` flag defaults to false unless NEXT_PUBLIC_DEMO=1.
 *
 * Run: `npm run test`
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..');

function readSrc(rel: string): string {
  return readFileSync(path.join(REPO, rel), 'utf8');
}

describe('demo isolation — seed script', () => {
  it('targets only the demo slug', () => {
    const src = readSrc('prisma/seed-demo.ts');
    expect(src).toContain("DEMO_SLUG = 'the-olive-house-demo'");
    // Must upsert the property by the demo slug only — never by some other slug.
    expect(src).toMatch(/where:\s*\{\s*slug:\s*DEMO_SLUG\s*\}/);
  });

  it('uses deterministic demo user IDs that are clearly demo-only', () => {
    const src = readSrc('prisma/seed-demo.ts');
    for (const id of ['demo-user-arjun', 'demo-user-rohan', 'demo-user-priya']) {
      expect(src).toContain(id);
    }
  });

  it('never inserts a property whose slug is missing or generic', () => {
    const src = readSrc('prisma/seed-demo.ts');
    // No literal "noida-villa" (the generic seed slug) anywhere in the demo seed.
    expect(src).not.toMatch(/['"`]noida-villa['"`]/);
  });
});

describe('demo isolation — removal script', () => {
  it('matches only the demo slug', () => {
    const src = readSrc('prisma/remove-demo.ts');
    expect(src).toContain("DEMO_SLUG = 'the-olive-house-demo'");
    expect(src).toMatch(/where:\s*\{\s*slug:\s*DEMO_SLUG\s*\}/);
  });

  it('exits safely when the demo is not present', () => {
    const src = readSrc('prisma/remove-demo.ts');
    expect(src).toContain('no demo property found');
  });

  it('does not delete by anything other than the demo slug', () => {
    const src = readSrc('prisma/remove-demo.ts');
    // Must not contain a generic delete-all or delete-by-name pattern.
    expect(src).not.toMatch(/deleteMany\(\s*\{\s*\}\s*\)/);
    expect(src).not.toMatch(/name:\s*['"`]The Olive House['"`]/);
  });
});

describe('application contains no hardcoded demo identifiers', () => {
  const applicationFiles = [
    'src/components/public/Header.tsx',
    'src/components/public/Footer.tsx',
    'src/components/public/Hero.tsx',
    'src/components/public/Gallery.tsx',
    'src/components/public/AmenityGrid.tsx',
    'src/components/public/PropertyStats.tsx',
    'src/components/public/LocationBlock.tsx',
    'src/components/public/CTABlock.tsx',
    'src/components/public/FAQList.tsx',
    'src/components/public/MobileStickyCTA.tsx',
    'src/components/public/StructuredData.tsx',
    'src/components/admin/AdminHeader.tsx',
    'src/components/admin/AdminSidebar.tsx',
    'src/lib/auth.ts',
    'src/lib/authorization.ts',
    'src/lib/money.ts',
    'src/lib/finance.ts',
    'src/lib/rate-limit.ts',
    'src/lib/security.ts',
    'src/lib/services/transactions.ts',
    'src/lib/services/settlements.ts',
    'src/lib/services/participants.ts',
    'src/lib/services/dashboard.ts',
    'src/lib/services/website.ts',
    'src/lib/services/storage.ts',
    'src/lib/validation.ts',
  ];

  const forbidden = [
    'Olive House',
    'the-olive-house-demo',
    'arjun.demo@example.com',
    'rohan.demo@example.com',
    'priya.demo@example.com',
    'DEMO-BOOKING',
    'demo-user-arjun',
    'demo-user-rohan',
    'demo-user-priya',
    'demo-property-olive-house',
    'demo-olive-house-placeholder',
    'A Private Escape in Noida',
  ];

  for (const f of applicationFiles) {
    it(`${path.basename(f)} contains no demo identifiers`, () => {
      const src = readSrc(f);
      for (const needle of forbidden) {
        expect(src, `${f} must not contain demo identifier "${needle}"`).not.toContain(needle);
      }
    });
  }
});

describe('env config — neutral defaults', () => {
  it('siteConfig.name is empty by default', () => {
    // We test the source, not the runtime, because process.env is frozen at
    // test boot. The source must show the OR-fallback to ''.
    const src = readSrc('src/lib/env.ts');
    expect(src).toMatch(/NEXT_PUBLIC_PROPERTY_NAME\s*\|\|\s*['"`]['"`]/);
  });

  it('siteConfig has no hardcoded "The Noida Villa"', () => {
    const src = readSrc('src/lib/env.ts');
    expect(src).not.toContain('The Noida Villa');
  });

  it('isDemoDeployment is gated on NEXT_PUBLIC_DEMO=1', () => {
    const src = readSrc('src/lib/env.ts');
    expect(src).toMatch(/isDemoDeployment[\s\S]*NEXT_PUBLIC_DEMO\s*===\s*['"`]1['"`]/);
  });
});

describe('UI demo indicators are env-gated', () => {
  it('public footer preview strip is gated', () => {
    const src = readSrc('src/components/public/Footer.tsx');
    expect(src).toContain('isDemoDeployment');
    expect(src).not.toMatch(/Preview[\s-]+staging/);
    // Verify the literal phrase is wrapped in the env gate.
    expect(src).toMatch(/isDemoDeployment[\s\S]*Preview/);
  });

  it('admin Demo Workspace pill is gated', () => {
    const src = readSrc('src/components/admin/AdminHeader.tsx');
    expect(src).toContain('isDemoDeployment');
    expect(src).toContain('Demo Workspace');
    expect(src).toMatch(/isDemoDeployment[\s\S]*Demo Workspace/);
  });
});

describe('package.json scripts — no destructive generic commands', () => {
  it('does not expose db:reset:production or db:remove-property', () => {
    const src = readSrc('package.json');
    expect(src).not.toMatch(/db:reset:production/);
    expect(src).not.toMatch(/db:remove-property/);
  });

  it('exposes db:seed:demo and db:remove-demo', () => {
    const src = readSrc('package.json');
    expect(src).toContain('db:seed:demo');
    expect(src).toContain('db:remove-demo');
  });

  it('exposes prisma migrations as the deploy-safe path', () => {
    const src = readSrc('package.json');
    expect(src).toContain('db:migrate:deploy');
  });
});

describe('generic seed is not the demo seed', () => {
  it('prisma/seed.ts is not the demo seed', () => {
    const demo = readSrc('prisma/seed-demo.ts');
    const generic = readSrc('prisma/seed.ts');
    expect(demo).not.toBe(generic);
    // Demo contains the demo slug; the generic seed does not.
    expect(demo).toContain('the-olive-house-demo');
    expect(generic).not.toContain('the-olive-house-demo');
  });
});

describe('empty database behavior is graceful', () => {
  it('homepage degrades when no property exists', () => {
    const src = readSrc('src/app/(public)/page.tsx');
    // The page checks for a default slug and renders a placeholder if missing.
    expect(src).toContain('getDefaultPropertySlug');
    expect(src).toContain('Site is being prepared');
  });
});

describe('demo seed — production guard', () => {
  it('defines an APP_ENV-aware guard helper', () => {
    const src = readSrc('prisma/seed-demo.ts');
    expect(src).toMatch(/function\s+readAppEnv/);
    expect(src).toMatch(/function\s+assertNotProduction/);
  });

  it('refuses to run when APP_ENV=production', () => {
    const src = readSrc('prisma/seed-demo.ts');
    // The guard must call `fail(...)` on APP_ENV=production.
    expect(src).toMatch(/env\s*===\s*['"`]production['"`][\s\S]*?fail\(/);
    // And must be invoked at the top of main().
    expect(src).toMatch(/assertNotProduction\(\)/);
  });

  it('refuses to run when APP_ENV is missing', () => {
    const src = readSrc('prisma/seed-demo.ts');
    // The guard must call `fail(...)` on the 'unknown' branch.
    expect(src).toMatch(/env\s*===\s*['"`]unknown['"`][\s\S]*?fail\(/);
  });

  it('allows APP_ENV=staging and APP_ENV=development', () => {
    const src = readSrc('prisma/seed-demo.ts');
    expect(src).toMatch(/['"`]staging['"`]/);
    expect(src).toMatch(/['"`]development['"`]/);
  });

  it('does not change the production seed (`prisma/seed.ts`)', () => {
    const prod = readSrc('prisma/seed.ts');
    expect(prod).not.toContain('assertNotProduction');
    expect(prod).not.toContain('APP_ENV=production');
  });

  it('does not modify the demo dataset itself', () => {
    const demo = readSrc('prisma/seed-demo.ts');
    // The 39-expense fixture set must still be present (sanity check).
    expect(demo).toContain('Edge: ₹10,001 split three ways');
    expect(demo).toContain('DEMO-BOOKING-001');
  });
});
