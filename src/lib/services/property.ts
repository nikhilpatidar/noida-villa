/**
 * Property-name lookup service.
 *
 * Used by both the public site (already caches via `loadPublicProperty`)
 * and the admin layout (sidebar header). The property name is static
 * reference data, not user-specific or authorization-sensitive, and is
 * already exposed publicly on the marketing site. Caching it by propertyId
 * under PUBLIC_PROPERTY_TAG means:
 *
 *   - Multiple admins on the same property share the cached entry.
 *   - The existing CMS invalidation hook (`updateWebsiteContentAction` /
 *     `updateSeoAction` already call `revalidateTag(PUBLIC_PROPERTY_TAG)`)
 *     also busts this cache when an admin edits the property name.
 *   - A 5-minute TTL bounds staleness if a tag call is somehow missed.
 *
 * This addresses the largest remaining per-navigation DB hit on the
 * admin layout (the `prisma.property.findUnique({ select: { name } })` that
 * previously ran on every admin page request from Vercel iad1 → Supabase
 * ap-south-1).
 */
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';
import { PUBLIC_PROPERTY_TAG } from '@/lib/services/website';

async function _getPropertyNameById(propertyId: string): Promise<string | null> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { name: true },
  });
  return property?.name ?? null;
}

export const getPropertyNameById = unstable_cache(
  _getPropertyNameById,
  ['property-name-by-id'],
  { tags: [PUBLIC_PROPERTY_TAG], revalidate: 300 },
);