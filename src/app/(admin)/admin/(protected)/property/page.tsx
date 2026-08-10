import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PropertyForm } from './PropertyForm';
import { requireRole, getActivePropertyId } from '@/lib/authorization';

export default async function PropertyCMSPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  // The session JWT already carries the active property id; no DB lookup.
  const propertyId = await getActivePropertyId();
  if (!propertyId) redirect('/admin/login');

  // Authorisation and the property CMS content fetch are independent — run
  // them in parallel. The CMS query is heavy (many relations) but does not
  // depend on the role check.
  const [roleResult, property] = await Promise.all([
    requireRole(propertyId, 'PROPERTY_ADMIN')
      .then(() => 'ok' as const)
      .catch((e) => (e && typeof e === 'object' && 'status' in e ? ('forbidden' as const) : ('error' as const))),
    prisma.property.findUnique({
      where: { id: propertyId },
      include: { websiteContent: true, seoMetadata: true, amenities: true, faqs: true, galleryItems: true, nearbyPlaces: true, houseRules: true },
    }),
  ]);

  if (roleResult !== 'ok' || !property) {
    return <div className="max-w-md"><h1 className="font-serif text-2xl">Forbidden</h1><p className="text-sm text-admin-muted">Admins only.</p></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow">CMS</div>
        <h1 className="mt-1 font-serif text-3xl text-admin-ink">Property</h1>
        <p className="mt-1 text-sm text-admin-muted">Edit details shown on the public website.</p>
      </div>

      <PropertyForm property={{
        id: property.id,
        name: property.name,
        tagline: property.tagline ?? '',
        shortSummary: property.shortSummary ?? '',
        description: property.description ?? '',
        city: property.city,
        state: property.state,
        country: property.country,
        addressLine: property.addressLine ?? '',
        postalCode: property.postalCode ?? '',
        bedrooms: property.bedrooms ?? null,
        beds: property.beds ?? null,
        bathrooms: property.bathrooms ? Number(property.bathrooms.toString()) : null,
        maxGuests: property.maxGuests ?? null,
        airbnbUrl: property.airbnbUrl ?? '',
        contactEmail: property.contactEmail ?? '',
        contactPhone: property.contactPhone ?? '',
        whatsappPhone: property.whatsappPhone ?? '',
        instagramUrl: property.instagramUrl ?? '',
        facebookUrl: property.facebookUrl ?? '',
        status: property.status,
      }} />
    </div>
  );
}