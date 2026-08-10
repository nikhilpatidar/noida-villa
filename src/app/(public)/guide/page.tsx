import type { Metadata } from 'next';
import Link from 'next/link';
import { loadPublicProperty, getDefaultPropertySlug, listPublicGuideArticles } from '@/lib/services/website';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';

export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: 'Local Guide',
  description: 'A curated guide to Noida and Delhi NCR.',
};

export default async function GuideIndexPage() {
  const slug = await getDefaultPropertySlug();
  if (!slug) return null;
  const property = await loadPublicProperty(slug);
  if (!property) return null;

  const articles = await listPublicGuideArticles(property.id);

  return (
    <>
      <Header propertyName={property.name} />
      <main className="container-wide py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow">Guide</div>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl text-ink-900 text-balance">
            Stories from {property.city}.
          </h1>
          <p className="mt-5 text-lg text-ink-600 text-pretty">
            Curated reading on the city, the area, and how to make the most of your stay.
          </p>
        </div>

        <div className="mt-12">
          {articles.length === 0 ? (
            <div className="rounded-xl border border-ink-100 bg-white p-8 text-ink-600">
              <p>The local guide is being written. In the meantime, reach out and we&apos;ll happily share recommendations.</p>
            </div>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2">
              {articles.map((a) => (
                <li key={a.id}>
                  <Link href={`/guide/${a.slug}`} className="block rounded-xl border border-ink-100 bg-white p-6 hover:border-olive-300 transition-colors">
                    <h2 className="font-serif text-2xl text-ink-900">{a.title}</h2>
                    {a.excerpt ? <p className="mt-2 text-ink-600 text-pretty">{a.excerpt}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
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