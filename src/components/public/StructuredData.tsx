import { siteConfig } from '@/lib/env';
import type { PublicPropertyData } from '@/lib/services/website';

/**
 * Server component: emits JSON-LD structured data. Renders nothing visible.
 */
export function StructuredData({ property }: { property: PublicPropertyData }) {
  const siteUrl = siteConfig.url;
  const lodging: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    '@id': `${siteUrl}/#lodging`,
    name: property.name,
    description: property.shortSummary || property.description || property.tagline,
    url: siteUrl,
    image: property.heroImagePath || property.gallery[0]?.imagePath || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.city,
      addressRegion: property.state,
      addressCountry: property.country,
      streetAddress: property.addressLine || undefined,
    },
    amenityFeature: property.amenities.map((a) => ({
      '@type': 'LocationFeatureSpecification',
      name: a.name,
    })),
    numberOfRooms: property.bedrooms || undefined,
    petsAllowed: false,
    checkinTime: '14:00',
    checkoutTime: '11:00',
  };
  if (property.latitude !== null && property.longitude !== null) {
    (lodging as any).geo = {
      '@type': 'GeoCoordinates',
      latitude: property.latitude,
      longitude: property.longitude,
    };
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: property.name,
    url: siteUrl,
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: property.name, item: `${siteUrl}/stay` },
    ],
  };

  const faq = property.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: property.faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  } : null;

  const ld = [lodging, website, breadcrumbs, faq].filter(Boolean);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}