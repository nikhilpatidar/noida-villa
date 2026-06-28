import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { loadPublicProperty } from '@/lib/services/website';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';
import { PropertyStats } from '@/components/public/PropertyStats';

export const dynamic = "force-dynamic";


export async function generateMetadata(): Promise<Metadata> {
  const p = await prisma.property.findFirst();
  if (!p) return { title: 'Stay' };
  const data = await loadPublicProperty(p.slug);
  if (!data) return { title: 'Stay' };
  return {
    title: `Stay at ${data.name}`,
    description: data.shortSummary || data.description,
    alternates: { canonical: `${siteConfigUrl()}/stay` },
  };
}

function siteConfigUrl() { return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'; }

export default async function StayPage() {
  const p = await prisma.property.findFirst();
  if (!p) return null;
  const property = await loadPublicProperty(p.slug);
  if (!property) return null;
  return (
    <>
      <Header propertyName={property.name} />
      <main className="container-wide py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow">Stay</div>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl text-ink-900 text-balance">{property.aboutTitle || `About ${property.name}`}</h1>
          <div className="mt-8 prose prose-lg max-w-prose text-ink-700 text-pretty whitespace-pre-line">
            {property.aboutBody || property.description || 'A premium villa coming soon.'}
          </div>
        </div>
        <div className="mt-16">
          <PropertyStats maxGuests={property.maxGuests} bedrooms={property.bedrooms} beds={property.beds} bathrooms={property.bathrooms} />
        </div>
        {property.houseRules.length > 0 ? (
          <section className="mt-20">
            <h2 className="font-serif text-3xl text-ink-900">House Rules</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {property.houseRules.map((r) => (
                <div key={r.id} className="rounded-xl border border-ink-100 bg-white p-5">
                  <h3 className="font-medium text-ink-900">{r.title}</h3>
                  {r.description ? <p className="mt-1.5 text-sm text-ink-600 text-pretty">{r.description}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer
        propertyName={property.name}
        city={property.city}
        state={property.state}
        country={property.country}
        airbnbUrl={property.airbnbUrl}
        instagramUrl={property.instagramUrl}
        contactEmail={property.contactEmail}
      />
      <MobileStickyCTA />
    </>
  );
}