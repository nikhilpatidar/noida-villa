import type { Metadata } from 'next';
import { loadPublicProperty, getDefaultPropertySlug } from '@/lib/services/website';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { AmenityGrid } from '@/components/public/AmenityGrid';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';

export const dynamic = "force-dynamic";


export const metadata: Metadata = { title: 'Amenities', description: 'Amenities available at the villa.' };

export default async function AmenitiesPage() {
  const slug = await getDefaultPropertySlug();
  if (!slug) return null;
  const property = await loadPublicProperty(slug);
  if (!property) return null;
  return (
    <>
      <Header propertyName={property.name} />
      <main className="container-wide py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow">Amenities</div>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl text-ink-900 text-balance">Everything for a comfortable stay.</h1>
        </div>
        <div className="mt-12">
          <AmenityGrid amenities={property.amenities} />
        </div>
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