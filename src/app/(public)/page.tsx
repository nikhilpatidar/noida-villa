import Link from 'next/link';
import { prisma } from '@/lib/db';
import { loadPublicProperty } from '@/lib/services/website';
import { Hero } from '@/components/public/Hero';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';
import { Gallery } from '@/components/public/Gallery';
import { AmenityGrid } from '@/components/public/AmenityGrid';
import { PropertyStats } from '@/components/public/PropertyStats';
import { CTABlock } from '@/components/public/CTABlock';
import { StructuredData } from '@/components/public/StructuredData';
import { siteConfig } from '@/lib/env';

export const dynamic = "force-dynamic";
 // ISR — keep CMS edits fresh without rebuild

export default async function HomePage() {
  // Discover the first property. In multi-property future, routing can be slug-based.
  const firstProperty = await prisma.property.findFirst({
    select: { id: true, slug: true, name: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!firstProperty) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-3xl text-ink-900">Site is being prepared</h1>
          <p className="mt-3 text-ink-600">
            The villa website is not yet configured. Please set up the database and seed initial content.
          </p>
        </div>
      </main>
    );
  }

  const property = await loadPublicProperty(firstProperty.slug);
  if (!property) return null;
  const comingSoon = property.status !== 'LIVE';

  return (
    <>
      <StructuredData property={property} />
      <Header propertyName={property.name} />
      <main id="main">
        <Hero
          eyebrow={property.heroEyebrow}
          title={property.heroTitle}
          subtitle={property.heroSubtitle}
          imagePath={property.heroImagePath || undefined}
          comingSoon={comingSoon}
        />

        <section className="container-wide py-20 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] items-end">
            <div className="max-w-2xl">
              <div className="eyebrow">Welcome</div>
              <h2 className="mt-3 font-serif text-4xl md:text-5xl text-ink-900 text-balance">
                A private escape designed for memorable stays.
              </h2>
              <p className="mt-5 text-lg text-ink-600 text-pretty">
                {property.shortSummary || property.description || `Discover a thoughtfully designed villa in ${siteConfig.city}, ${siteConfig.state}.`}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/gallery" className="btn-secondary">View gallery</Link>
              <Link href="/stay" className="btn-primary">About the villa</Link>
            </div>
          </div>
          <div className="mt-12">
            <PropertyStats
              maxGuests={property.maxGuests}
              bedrooms={property.bedrooms}
              beds={property.beds}
              bathrooms={property.bathrooms}
            />
          </div>
        </section>

        <section className="container-wide py-16">
          <Gallery images={property.gallery} />
        </section>

        <section className="container-wide py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="eyebrow">The experience</div>
            <h2 className="mt-3 font-serif text-4xl text-ink-900 text-balance">Made for slowing down.</h2>
            <p className="mt-5 text-lg text-ink-600 text-pretty">
              {property.experienceBody || 'Bright interiors, calm bedrooms, a private garden, and the warmth of a home that has been designed — not decorated.'}
            </p>
          </div>
        </section>

        <section className="bg-cream-100/50 py-20">
          <div className="container-wide">
            <div className="max-w-3xl">
              <div className="eyebrow">Amenities</div>
              <h2 className="mt-3 font-serif text-4xl text-ink-900">Everything you need.</h2>
              <p className="mt-4 text-ink-600">A curated set of amenities for comfort, work and play.</p>
            </div>
            <div className="mt-12">
              <AmenityGrid amenities={property.amenities} />
            </div>
          </div>
        </section>

        <section className="container-wide py-20 md:py-28">
          <CTABlock
            title="Ready to plan your stay?"
            subtitle={`Book on Airbnb for live availability, or reach out for special occasions, group stays and longer visits.`}
          />
        </section>
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