/**
 * Public website content service.
 *
 * Reads from DB; falls back to env-based defaults. Single source of truth.
 *
 * Performance: the loader and the slug-resolution helper are wrapped in
 * Next.js `unstable_cache` so public pages do not hit the database on
 * every request. CMS edits invalidate via `revalidateTag('public-property')`.
 * See `src/app/(admin)/admin/(protected)/website/actions.ts`.
 */
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';
import { siteConfig } from '@/lib/env';

export interface PublicPropertyData {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  shortSummary: string;
  description: string;
  status: string;
  city: string;
  state: string;
  country: string;
  addressLine: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  maxGuests: number | null;
  airbnbUrl: string;
  contactEmail: string;
  contactPhone: string;
  whatsappPhone: string;
  instagramUrl: string;
  facebookUrl: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImagePath: string;
  aboutTitle: string;
  aboutBody: string;
  experienceBody: string;
  contactBody: string;
  seoTitle: string;
  seoDescription: string;
  ogImagePath: string;
  twitterHandle: string;
  amenities: Array<{ group: string; name: string; iconKey: string | null }>;
  gallery: Array<{ id: string; imagePath: string; altText: string; caption: string | null; isHero: boolean }>;
  faqs: Array<{ id: string; question: string; answer: string }>;
  houseRules: Array<{ id: string; title: string; description: string | null }>;
  nearbyPlaces: Array<{ id: string; name: string; category: string; distanceKm: number | null; description: string | null }>;
}

/** Public tag used by CMS actions to invalidate the public-property cache. */
export const PUBLIC_PROPERTY_TAG = 'public-property';

/** Raw (uncached) loader — kept private so callers always go through the cached wrapper. */
async function _loadPublicProperty(slug: string): Promise<PublicPropertyData | null> {
  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      websiteContent: true,
      seoMetadata: true,
      amenities: { where: { isActive: true }, orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }] },
      galleryItems: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }] },
      faqs: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      houseRules: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      nearbyPlaces: { where: { isActive: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] },
    },
  });
  if (!property) return null;

  const wc = property.websiteContent;
  const seo = property.seoMetadata;

  return {
    id: property.id,
    slug: property.slug,
    name: property.name,
    tagline: property.tagline ?? siteConfig.tagline,
    shortSummary: property.shortSummary ?? '',
    description: property.description ?? '',
    status: property.status,
    city: property.city,
    state: property.state,
    country: property.country,
    addressLine: property.addressLine,
    latitude: property.latitude ? Number(property.latitude.toString()) : null,
    longitude: property.longitude ? Number(property.longitude.toString()) : null,
    bedrooms: property.bedrooms,
    beds: property.beds,
    bathrooms: property.bathrooms ? Number(property.bathrooms.toString()) : null,
    maxGuests: property.maxGuests,
    airbnbUrl: property.airbnbUrl ?? siteConfig.airbnbUrl,
    contactEmail: property.contactEmail ?? siteConfig.contactEmail,
    contactPhone: property.contactPhone ?? siteConfig.contactPhone,
    whatsappPhone: property.whatsappPhone ?? siteConfig.whatsappPhone,
    instagramUrl: property.instagramUrl ?? siteConfig.instagramUrl,
    facebookUrl: property.facebookUrl ?? siteConfig.facebookUrl,
    heroEyebrow: wc?.heroEyebrow ?? 'A Private Stay',
    heroTitle: wc?.heroTitle ?? property.name,
    heroSubtitle: wc?.heroSubtitle ?? property.tagline ?? siteConfig.tagline,
    heroImagePath: wc?.heroImagePath ?? '',
    aboutTitle: wc?.aboutTitle ?? `About ${property.name}`,
    aboutBody: wc?.aboutBody ?? property.description ?? '',
    experienceBody: wc?.experienceBody ?? '',
    contactBody: wc?.contactBody ?? '',
    seoTitle: seo?.defaultTitle ?? `${property.name} — Private Stay in ${property.city}`,
    seoDescription: seo?.defaultDescription ?? (property.description ?? '').slice(0, 180),
    ogImagePath: seo?.defaultOgImagePath ?? '',
    twitterHandle: seo?.twitterHandle ?? '',
    amenities: property.amenities.map((a: any) => ({ group: a.group, name: a.name, iconKey: a.iconKey })),
    gallery: property.galleryItems.map((g: any) => ({
      id: g.id,
      imagePath: g.imagePath,
      altText: g.altText,
      caption: g.caption,
      isHero: g.isHero,
    })),
    faqs: property.faqs.map((f: any) => ({ id: f.id, question: f.question, answer: f.answer })),
    houseRules: property.houseRules.map((h: any) => ({ id: h.id, title: h.title, description: h.description })),
    nearbyPlaces: property.nearbyPlaces.map((n: any) => ({
      id: n.id,
      name: n.name,
      category: n.category,
      distanceKm: n.distanceKm ? Number(n.distanceKm.toString()) : null,
      description: n.description,
    })),
  };
}

/**
 * Cached loader. CMS edits call `revalidateTag(PUBLIC_PROPERTY_TAG)`.
 * A short revalidate window (5 min) bounds staleness if a tag call is
 * somehow missed.
 */
export const loadPublicProperty = unstable_cache(
  _loadPublicProperty,
  ['public-property-by-slug'],
  { tags: [PUBLIC_PROPERTY_TAG], revalidate: 300 },
);

/**
 * Resolve the slug of the first (default) property. Cached under the same
 * tag so a CMS edit that adds/renames a property is reflected promptly.
 */
async function _getDefaultPropertySlug(): Promise<string | null> {
  const p = await prisma.property.findFirst({
    select: { slug: true },
    orderBy: { createdAt: 'asc' },
  });
  return p?.slug ?? null;
}

export const getDefaultPropertySlug = unstable_cache(
  _getDefaultPropertySlug,
  ['public-default-slug'],
  { tags: [PUBLIC_PROPERTY_TAG], revalidate: 300 },
);

/**
 * Published guide articles for the default property. Cached under
 * PUBLIC_PROPERTY_TAG so a future CMS article editor naturally invalidates
 * via the same revalidateTag call that CMS edits already use.
 */
export interface PublicGuideArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
}

async function _listPublicGuideArticles(propertyId: string): Promise<PublicGuideArticleSummary[]> {
  const rows = await prisma.guideArticle.findMany({
    where: { propertyId, isPublished: true },
    orderBy: { publishedAt: 'desc' },
    select: { id: true, slug: true, title: true, excerpt: true },
  });
  return rows;
}

export const listPublicGuideArticles = unstable_cache(
  _listPublicGuideArticles,
  ['public-guide-articles'],
  { tags: [PUBLIC_PROPERTY_TAG], revalidate: 300 },
);

/**
 * Single published guide article by slug. Cached under the same tag so
 * generateMetadata() and the page render share one DB hit when the
 * same slug is requested. Articles are public, low-write.
 */
export interface PublicGuideArticle extends PublicGuideArticleSummary {
  body: string;
  publishedAt: Date | null;
  propertyId: string;
}

async function _getPublicGuideArticle(slug: string): Promise<PublicGuideArticle | null> {
  const a = await prisma.guideArticle.findFirst({
    where: { slug, isPublished: true },
    select: { id: true, slug: true, title: true, excerpt: true, body: true, publishedAt: true, propertyId: true },
  });
  return a ?? null;
}

export const getPublicGuideArticle = unstable_cache(
  _getPublicGuideArticle,
  ['public-guide-article-by-slug'],
  { tags: [PUBLIC_PROPERTY_TAG], revalidate: 300 },
);