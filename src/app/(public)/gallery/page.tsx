import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { loadPublicProperty } from '@/lib/services/website';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { Gallery } from '@/components/public/Gallery';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';

export const dynamic = "force-dynamic";


export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Gallery', description: 'Photos of the villa.' };
}

export default async function GalleryPage() {
  const p = await prisma.property.findFirst();
  if (!p) return null;
  const property = await loadPublicProperty(p.slug);
  if (!property) return null;
  return (
    <>
      <Header propertyName={property.name} />
      <main className="container-wide py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow">Gallery</div>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl text-ink-900 text-balance">Spaces, light, texture.</h1>
          <p className="mt-5 text-lg text-ink-600 text-pretty">
            A curated visual tour of the villa, gardens and living spaces.
          </p>
        </div>
        <div className="mt-12">
          <Gallery images={property.gallery} />
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