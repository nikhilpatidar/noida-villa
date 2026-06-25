import Link from 'next/link';
import { isDemoDeployment } from '@/lib/env';

export interface FooterProps {
  propertyName: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  airbnbUrl?: string | null;
  instagramUrl?: string | null;
  contactEmail?: string | null;
}

export function Footer({
  propertyName,
  city,
  state,
  country,
  airbnbUrl,
  instagramUrl,
  contactEmail,
}: FooterProps) {
  const year = new Date().getFullYear();
  const locationPhrase = [city, state].filter(Boolean).join(', ');
  return (
    <footer className="mt-24 border-t border-ink-100 bg-cream-100/40">
      <div className="container-wide py-14 grid gap-10 md:grid-cols-4">
        <div>
          <div className="font-serif text-2xl text-ink-900">{propertyName}</div>
          <p className="mt-3 text-sm text-ink-500 max-w-xs">
            {locationPhrase ? (
              <>A private villa in {locationPhrase}. Designed for stays, weekends and celebrations.</>
            ) : (
              <>A private villa designed for stays, weekends and celebrations.</>
            )}
          </p>
        </div>
        <div>
          <div className="eyebrow mb-3">Explore</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/stay" className="text-ink-700 hover:text-ink-900">Stay</Link></li>
            <li><Link href="/gallery" className="text-ink-700 hover:text-ink-900">Gallery</Link></li>
            <li><Link href="/amenities" className="text-ink-700 hover:text-ink-900">Amenities</Link></li>
            <li><Link href="/location" className="text-ink-700 hover:text-ink-900">Location</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-3">Plan</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/guide" className="text-ink-700 hover:text-ink-900">Local Guide</Link></li>
            <li><Link href="/faq" className="text-ink-700 hover:text-ink-900">FAQ</Link></li>
            <li><Link href="/contact" className="text-ink-700 hover:text-ink-900">Contact</Link></li>
            <li><Link href="/privacy" className="text-ink-700 hover:text-ink-900">Privacy</Link></li>
            <li><Link href="/terms" className="text-ink-700 hover:text-ink-900">Terms</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-3">Connect</div>
          <ul className="space-y-2 text-sm">
            {airbnbUrl ? (
              <li><a href={airbnbUrl} data-track="airbnb-footer" className="text-ink-700 hover:text-ink-900">Airbnb</a></li>
            ) : null}
            {instagramUrl ? (
              <li><a href={instagramUrl} data-track="instagram-footer" className="text-ink-700 hover:text-ink-900">Instagram</a></li>
            ) : null}
            {contactEmail ? (
              <li><a href={`mailto:${contactEmail}`} data-track="email-footer" className="text-ink-700 hover:text-ink-900">{contactEmail}</a></li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100">
        <div className="container-wide py-5 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-ink-500">
          <p>© {year} {propertyName}. All rights reserved.</p>
          {country ? <p>Made with care in {country}.</p> : null}
        </div>
      </div>
      {isDemoDeployment ? (
        <div className="bg-cream-200/60 border-t border-ink-100">
          <div className="container-wide py-2 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ink-500">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-olive-500" />
            Preview — staging environment
          </div>
        </div>
      ) : null}
    </footer>
  );
}