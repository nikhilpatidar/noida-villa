import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { WebsiteForm } from './WebsiteForm';
import { SeoForm } from './SeoForm';
import { requireRole } from '@/lib/authorization';

export default async function WebsitePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  const property = await prisma.property.findFirst({
    where: { memberships: { some: { userId: session.user.id, isActive: true } } },
    include: { websiteContent: true, seoMetadata: true },
  });
  if (!property) redirect('/admin/login');

  try { await requireRole(property.id, 'PROPERTY_ADMIN'); }
  catch { return <div className="max-w-md"><h1 className="font-serif text-2xl">Forbidden</h1><p className="text-sm text-admin-muted">Admins only.</p></div>; }

  const wc = property.websiteContent ?? { heroEyebrow: '', heroTitle: '', heroSubtitle: '', heroImagePath: '', aboutTitle: '', aboutBody: '', experienceBody: '', contactBody: '' };
  const seo = property.seoMetadata ?? { defaultTitle: '', defaultDescription: '', defaultOgImagePath: '', twitterHandle: '' };

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow">CMS</div>
        <h1 className="mt-1 font-serif text-3xl text-admin-ink">Website</h1>
        <p className="mt-1 text-sm text-admin-muted">Content and SEO settings used by the public site.</p>
      </div>

      <WebsiteForm propertyId={property.id} initial={wc as any} />
      <SeoForm propertyId={property.id} initial={seo as any} />
    </div>
  );
}