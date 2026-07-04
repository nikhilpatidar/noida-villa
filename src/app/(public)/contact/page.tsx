import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { loadPublicProperty } from '@/lib/services/website';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';
import { Mail, Phone } from 'lucide-react';
import { siteConfig } from '@/lib/env';

export const dynamic = "force-dynamic";


export const metadata: Metadata = { title: 'Contact', description: 'Get in touch.' };

export default async function ContactPage() {
  const p = await prisma.property.findFirst();
  if (!p) return null;
  const property = await loadPublicProperty(p.slug);
  if (!property) return null;
  return (
    <>
      <Header propertyName={property.name} />
      <main className="container-wide py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow">Contact</div>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl text-ink-900 text-balance">Get in touch</h1>
          <p className="mt-5 text-lg text-ink-600 text-pretty">
            For booking enquiries please use Airbnb. For other enquiries — events, longer stays, partnerships — reach us directly.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-3xl">
          {property.contactEmail ? (
            <a href={`mailto:${property.contactEmail}`} data-track="email-contact" className="rounded-xl border border-ink-100 bg-white p-6 hover:border-olive-300 transition-colors">
              <Mail className="h-5 w-5 text-olive-700" />
              <div className="mt-3 eyebrow">Email</div>
              <div className="mt-1 font-medium text-ink-900">{property.contactEmail}</div>
            </a>
          ) : null}
          {property.contactPhone ? (
            <a href={`tel:${property.contactPhone.replace(/\s/g, '')}`} data-track="phone-contact" className="rounded-xl border border-ink-100 bg-white p-6 hover:border-olive-300 transition-colors">
              <Phone className="h-5 w-5 text-olive-700" />
              <div className="mt-3 eyebrow">Phone</div>
              <div className="mt-1 font-medium text-ink-900">{property.contactPhone}</div>
            </a>
          ) : null}
        </div>

        {property.airbnbUrl ? (
          <div className="mt-12 max-w-3xl rounded-2xl bg-ink-900 text-cream-50 p-8">
            <div className="eyebrow text-cream-100/70">Booking</div>
            <h2 className="mt-2 font-serif text-3xl text-cream-50">Book on Airbnb</h2>
            <p className="mt-3 text-cream-100/80 text-pretty">For live availability, instant booking and the best rates, please use our Airbnb listing.</p>
            <a href={property.airbnbUrl} data-track="airbnb-contact" className="mt-6 btn-accent">Open Airbnb listing</a>
          </div>
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