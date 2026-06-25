import Link from 'next/link';
import { siteConfig } from '@/lib/env';

export function Header({ propertyName }: { propertyName: string }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-cream-50/80 border-b border-ink-100/60">
      <div className="container-wide flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 group" aria-label={`${propertyName} — Home`}>
          <span className="font-serif text-xl text-ink-900 tracking-tight">{propertyName}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary">
          <Link href="/stay" className="text-sm text-ink-700 hover:text-ink-900 transition-colors">Stay</Link>
          <Link href="/gallery" className="text-sm text-ink-700 hover:text-ink-900 transition-colors">Gallery</Link>
          <Link href="/amenities" className="text-sm text-ink-700 hover:text-ink-900 transition-colors">Amenities</Link>
          <Link href="/location" className="text-sm text-ink-700 hover:text-ink-900 transition-colors">Location</Link>
          <Link href="/guide" className="text-sm text-ink-700 hover:text-ink-900 transition-colors">Guide</Link>
          <Link href="/faq" className="text-sm text-ink-700 hover:text-ink-900 transition-colors">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={siteConfig.airbnbUrl || '#contact'}
            className="btn-accent"
            aria-label="Book on Airbnb"
            data-track="airbnb-header"
          >
            Book on Airbnb
          </a>
        </div>
      </div>
    </header>
  );
}