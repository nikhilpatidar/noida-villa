import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { loadPublicProperty } from '@/lib/services/website';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { MobileStickyCTA } from '@/components/public/MobileStickyCTA';

export const dynamic = "force-dynamic";


export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await prisma.guideArticle.findFirst({ where: { slug: params.slug, isPublished: true } });
  if (!a) return { title: 'Guide' };
  return {
    title: a.title,
    description: a.excerpt ?? a.body.slice(0, 180),
    alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/guide/${a.slug}` },
  };
}

export default async function GuideArticlePage({ params }: { params: { slug: string } }) {
  const article = await prisma.guideArticle.findFirst({
    where: { slug: params.slug, isPublished: true },
  });
  if (!article) return notFound();
  const property = await prisma.property.findUnique({ where: { id: article.propertyId } });
  if (!property) return notFound();
  const p = await loadPublicProperty(property.slug);
  if (!p) return notFound();

  return (
    <>
      <Header propertyName={p.name} />
      <main className="container-prose py-16">
        <div className="eyebrow">Guide</div>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl text-ink-900 text-balance">{article.title}</h1>
        {article.excerpt ? <p className="mt-4 text-lg text-ink-600 text-pretty">{article.excerpt}</p> : null}
        <article className="mt-10 prose prose-stone max-w-prose text-ink-700 text-pretty whitespace-pre-line">
          {article.body}
        </article>
      </main>
      <Footer
        propertyName={p.name}
        city={p.city}
        state={p.state}
        country={p.country}
        airbnbUrl={p.airbnbUrl}
        instagramUrl={p.instagramUrl}
        contactEmail={p.contactEmail}
      />
      <MobileStickyCTA />
    </>
  );
}