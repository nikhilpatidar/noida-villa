import type { Metadata } from 'next';
import { loadPublicProperty, getDefaultPropertySlug } from '@/lib/services/website';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { LocationBlock } from '@/components/public/LocationBlock';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';

export const dynamic = "force-dynamic";


export const metadata: Metadata = { title: 'Location', description: 'Where to find the villa.' };

export default async function LocationPage() {
  const slug = await getDefaultPropertySlug();
  if (!slug) return null;
  const property = await loadPublicProperty(slug);
  if (!property) return null;
  return (
    <>
      <Header propertyName={property.name} />
      <main className="container-wide py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow">Location</div>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl text-ink-900 text-balance">
            In the heart of {property.city}.
          </h1>
          <p className="mt-5 text-lg text-ink-600 text-pretty">
            Close to business districts, metro, shopping and the best of Delhi NCR.
          </p>
        </div>
        <div className="mt-12">
          <LocationBlock
            city={property.city}
            state={property.state}
            country={property.country}
            nearbyPlaces={property.nearbyPlaces}
          />
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