/**
 * Centralized property/content configuration.
 *
 * The public website reads CMS content from the DB (WebsiteContent / SeoMetadata / etc.).
 * For values that must be available at build time for static metadata (OG, sitemap)
 * we expose them via NEXT_PUBLIC_* env vars. The DB is still the source of truth
 * for runtime content.
 *
 * IMPORTANT: siteConfig is a build-time / fallback layer only. Runtime pages read
 * authoritative property data from the database (loadPublicProperty). The defaults
 * here are intentionally EMPTY or generic so that an unconfigured production deployment
 * does NOT silently display any specific property name, address, or Airbnb URL.
 *
 * `appEnv` is the deployment environment: 'development' | 'staging' | 'production'.
 * Defaults to 'development'. Used only where behaviour must differ by environment
 * (e.g. the demo/staging indicator). Application logic should not branch on this.
 */

export type AppEnv = 'development' | 'staging' | 'production';

function readAppEnv(): AppEnv {
  const v = (process.env.APP_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  if (v === 'production' || v === 'prod') return 'production';
  if (v === 'staging' || v === 'stage' || v === 'demo') return 'staging';
  return 'development';
}

export const appEnv: AppEnv = readAppEnv();

/**
 * `isDemoDeployment` is true ONLY when an explicit flag is set. We deliberately
 * do NOT infer demo status from a property name or any database content — the
 * production database will simply not set this flag.
 */
export const isDemoDeployment: boolean = process.env.NEXT_PUBLIC_DEMO === '1';

export const siteConfig = {
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  // Defaults below are empty / generic on purpose. The runtime application reads
  // from the database (WebsiteContent + Property + SeoMetadata) — these env
  // vars are only used to seed initial CMS values for a brand-new deployment
  // via `npm run db:seed` (see prisma/seed.ts).
  name: process.env.NEXT_PUBLIC_PROPERTY_NAME || '',
  tagline: process.env.NEXT_PUBLIC_PROPERTY_TAGLINE || '',
  city: process.env.NEXT_PUBLIC_PROPERTY_CITY || '',
  state: process.env.NEXT_PUBLIC_PROPERTY_STATE || '',
  country: process.env.NEXT_PUBLIC_PROPERTY_COUNTRY || '',
  airbnbUrl: process.env.NEXT_PUBLIC_AIRBNB_URL || '',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
  whatsappPhone: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || '',
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
  facebookUrl: process.env.NEXT_PUBLIC_FACEBOOK_URL || '',
  gaId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
  gscVerification: process.env.NEXT_PUBLIC_GSC_VERIFICATION || '',
} as const;

export const storageConfig = {
  root: process.env.STORAGE_ROOT || './storage',
} as const;

export const authConfig = {
  secret: process.env.AUTH_SECRET || '',
} as const;