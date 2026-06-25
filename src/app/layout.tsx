import type { Metadata, Viewport } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import { siteConfig } from '@/lib/env';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#FBF8F4',
  width: 'device-width',
  initialScale: 1,
};

const _name = siteConfig.name;
const _tagline = siteConfig.tagline;
const _city = siteConfig.city;
const _state = siteConfig.state;
const _locationPhrase = [_city, _state].filter(Boolean).join(', ');
const _defaultTitle = _name ? `${_name} — ${_tagline || 'Private stay'}`.replace(/ —\s*$/, '') : 'Private villa';
const _defaultDescription = _name
  ? `${_name}${_locationPhrase ? ` in ${_locationPhrase}` : ''}. A private escape for stays, weekends and celebrations.`
  : 'A private villa for stays, weekends and celebrations.';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: _defaultTitle,
    template: _name ? `%s — ${_name}` : '%s',
  },
  description: _defaultDescription,
  applicationName: _name || undefined,
  authors: _name ? [{ name: _name }] : undefined,
  openGraph: {
    type: 'website',
    siteName: _name || undefined,
    locale: 'en_IN',
    title: _defaultTitle,
    description: _locationPhrase ? `A private villa in ${_locationPhrase}.` : 'A private villa.',
    url: siteConfig.url,
  },
  twitter: {
    card: 'summary_large_image',
    title: _defaultTitle,
    description: _locationPhrase ? `A private villa in ${_locationPhrase}.` : 'A private villa.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: siteConfig.url },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-screen bg-cream-50 text-ink-800 font-sans">
        {children}
      </body>
    </html>
  );
}