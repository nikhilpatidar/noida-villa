import type { Metadata } from 'next';
import { loadPublicProperty, getDefaultPropertySlug } from '@/lib/services/website';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';

export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: 'Terms',
  description: 'Website terms.',
  alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/terms` },
};

export default async function TermsPage() {
  const slug = await getDefaultPropertySlug();
  const property = slug ? await loadPublicProperty(slug) : null;
  return (
    <>
      <Header propertyName={property?.name ?? 'The property'} />
      <main className="container-prose py-16">
        <div className="eyebrow">Legal</div>
        <h1 className="mt-3 font-serif text-4xl text-ink-900">Terms of Use</h1>
        <p className="mt-4 text-sm text-ink-500">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <div className="mt-8 prose prose-stone max-w-prose text-ink-700 text-pretty">
          <p>
            By using this website you agree to these terms. The information provided is for general informational
            purposes about the property and the surrounding area.
          </p>
          <h2>No booking here</h2>
          <p>
            We do not process bookings through this website. All bookings are handled through Airbnb, which has its own
            terms and policies.
          </p>
          <h2>Intellectual property</h2>
          <p>All content on this site (text, photographs, design) is owned by us or our licensors unless stated otherwise.</p>
          <h2>Limitation of liability</h2>
          <p>
            We make reasonable efforts to keep information accurate but do not warrant completeness or fitness for a
            particular purpose. To the extent permitted by law, we exclude liability for indirect or consequential losses.
          </p>
          <h2>Governing law</h2>
          <p>These terms are governed by the laws of India.</p>
          <p className="text-sm text-ink-500">This document is a placeholder and should be reviewed by qualified counsel before launch.</p>
        </div>
      </main>
      <Footer
        propertyName={property?.name ?? 'The property'}
        city={property?.city}
        state={property?.state}
        country={property?.country}
        airbnbUrl={property?.airbnbUrl}
        instagramUrl={property?.instagramUrl}
        contactEmail={property?.contactEmail}
      />
      <MobileStickyCTA />
    </>
  );
}