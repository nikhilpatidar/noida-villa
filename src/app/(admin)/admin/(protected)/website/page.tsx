import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { WebsiteForm } from './WebsiteForm';
import { SeoForm } from './SeoForm';
import { requireRole, getActivePropertyId } from '@/lib/authorization';

export default async function WebsitePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  // The session JWT already carries the active property id; no DB lookup.
  const propertyId = await getActivePropertyId();
  if (!propertyId) redirect('/admin/login');

  // Authorisation check and CMS content fetch are independent — run them
  // in parallel. If the role check fails we still get to render the
  // Forbidden block; we just checked the DB for content needlessly, which
  // is cheaper than waiting for them sequentially.
  const [roleResult, cms] = await Promise.all([
    requireRole(propertyId, 'PROPERTY_ADMIN')
      .then(() => 'ok' as const)
      .catch((e) => (e && typeof e === 'object' && 'status' in e ? ('forbidden' as const) : ('error' as const))),
    prisma.property.findUnique({
      where: { id: propertyId },
      include: { websiteContent: true, seoMetadata: true },
    }),
  ]);

  if (roleResult !== 'ok' || !cms) {
    return <div className="max-w-md"><h1 className="font-serif text-2xl">Forbidden</h1><p className="text-sm text-admin-muted">Admins only.</p></div>;
  }

  const wc = cms.websiteContent ?? { heroEyebrow: '', heroTitle: '', heroSubtitle: '', heroImagePath: '', aboutTitle: '', aboutBody: '', experienceBody: '', contactBody: '' };
  const seo = cms.seoMetadata ?? { defaultTitle: '', defaultDescription: '', defaultOgImagePath: '', twitterHandle: '' };

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow">CMS</div>
        <h1 className="mt-1 font-serif text-3xl text-admin-ink">Website</h1>
        <p className="mt-1 text-sm text-admin-muted">Content and SEO settings used by the public site.</p>
      </div>

      <WebsiteForm propertyId={propertyId} initial={wc as any} />
      <SeoForm propertyId={propertyId} initial={seo as any} />
    </div>
  );
}