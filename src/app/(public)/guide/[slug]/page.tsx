import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadPublicProperty, getDefaultPropertySlug, getPublicGuideArticle } from '@/lib/services/website';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';

export const dynamic = "force-dynamic";


export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await getPublicGuideArticle(params.slug);
  if (!a) return { title: 'Guide' };
  return {
    title: a.title,
    description: a.excerpt ?? a.body.slice(0, 180),
    alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/guide/${a.slug}` },
  };
}

export default async function GuideArticlePage({ params }: { params: { slug: string } }) {
  const article = await getPublicGuideArticle(params.slug);
  if (!article) return notFound();
  // The article's propertyId is the default property for this site.
  // Resolve through the cached helpers so we don't hit the DB for the property row.
  const _slug = await getDefaultPropertySlug();
  if (!_slug) return notFound();
  const property = await loadPublicProperty(_slug);
  if (!property) return notFound();

  return (
    <>
      <Header propertyName={property.name} />
      <main className="container-prose py-16">
        <div className="eyebrow">Guide</div>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl text-ink-900 text-balance">{article.title}</h1>
        {article.excerpt ? <p className="mt-4 text-lg text-ink-600 text-pretty">{article.excerpt}</p> : null}
        <article className="mt-10 prose prose-stone max-w-prose text-ink-700 text-pretty whitespace-pre-line">
          {article.body}
        </article>
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