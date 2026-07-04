import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { loadPublicProperty } from '@/lib/services/website';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { FAQList } from '@/components/public/FAQList';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';

export const dynamic = "force-dynamic";


export const metadata: Metadata = { title: 'FAQ', description: 'Frequently asked questions.' };

export default async function FAQPage() {
  const p = await prisma.property.findFirst();
  if (!p) return null;
  const property = await loadPublicProperty(p.slug);
  if (!property) return null;
  return (
    <>
      <Header propertyName={property.name} />
      <main className="container-wide py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow">FAQ</div>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl text-ink-900 text-balance">Common questions</h1>
        </div>
        <div className="mt-10 max-w-3xl">
          <FAQList items={property.faqs} />
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