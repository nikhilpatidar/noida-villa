import { siteConfig } from '@/lib/env';

export function MobileStickyCTA() {
  if (!siteConfig.airbnbUrl) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 md:hidden border-t border-ink-100 bg-cream-50/95 backdrop-blur supports-[backdrop-filter]:bg-cream-50/80 px-4 py-3">
      <a href={siteConfig.airbnbUrl} data-track="airbnb-sticky" className="btn-accent w-full">Book on Airbnb</a>
    </div>
  );
}