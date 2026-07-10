import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const property = await prisma.property.findFirst({
    include: { faqs: { where: { isActive: true } }, galleryItems: true },
  });
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/stay`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/gallery`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/amenities`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/location`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/guide`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  let guideUrls: MetadataRoute.Sitemap = [];
  if (property) {
    const articles = await prisma.guideArticle.findMany({
      where: { propertyId: property.id, isPublished: true },
      select: { slug: true, updatedAt: true },
    });
    guideUrls = articles.map((a) => ({
      url: `${SITE_URL}/guide/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    }));
  }
  return [...staticUrls, ...guideUrls];
}