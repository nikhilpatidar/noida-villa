import type { Metadata } from 'next';
import { loadPublicProperty, getDefaultPropertySlug } from '@/lib/services/website';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';

export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How we handle your information.',
  alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/privacy` },
};

export default async function PrivacyPage() {
  const slug = await getDefaultPropertySlug();
  const property = slug ? await loadPublicProperty(slug) : null;
  return (
    <>
      <Header propertyName={property?.name ?? 'The property'} />
      <main className="container-prose py-16">
        <div className="eyebrow">Legal</div>
        <h1 className="mt-3 font-serif text-4xl text-ink-900">Privacy Policy</h1>
        <p className="mt-4 text-sm text-ink-500">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <div className="mt-8 prose prose-stone max-w-prose text-ink-700 text-pretty">
          <p>
            This website is operated by the owners of {property?.name ?? 'the property'} (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
            We respect your privacy and are committed to handling your information transparently and responsibly.
          </p>
          <h2>Information we collect</h2>
          <p>
            When you visit this website we may collect: technical information sent by your browser (IP address, user agent,
            referrer); cookies or similar storage that you have consented to; and any information you voluntarily provide by
            contacting us or filling a form.
          </p>
          <h2>How we use information</h2>
          <p>
            We use the information to operate and improve the website, respond to enquiries, and (where enabled) measure
            traffic using privacy-respecting analytics. We do not sell your information.
          </p>
          <h2>Booking</h2>
          <p>
            Bookings are processed by Airbnb. Their privacy policy governs any information you provide to them.
          </p>
          <h2>Your rights</h2>
          <p>
            Subject to applicable law, you may request access to, correction of, or deletion of personal information we hold about you.
          </p>
          <h2>Contact</h2>
          <p>For privacy questions, please contact us at the email listed on our Contact page.</p>
          <p className="text-sm text-ink-500">This policy is provided as a placeholder and should be reviewed by qualified counsel before launch.</p>
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