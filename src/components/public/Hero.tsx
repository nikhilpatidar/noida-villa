import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { siteConfig } from '@/lib/env';

export function Hero({
  eyebrow,
  title,
  subtitle,
  imagePath,
  comingSoon,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  imagePath?: string;
  comingSoon?: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {imagePath ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${imagePath})` }}
            aria-hidden
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-cream-200 to-olive-100" aria-hidden />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/30 via-ink-900/10 to-cream-50" />
      </div>
      <div className="container-wide min-h-[78vh] md:min-h-[88vh] flex flex-col justify-end pb-16 md:pb-24 pt-32">
        <div className="max-w-2xl animate-fade-up">
          <div className="eyebrow text-cream-100/90">{eyebrow}</div>
          <h1 className="mt-4 font-serif text-5xl md:text-7xl text-cream-50 leading-[1.05] text-balance">
            {title}
          </h1>
          <p className="mt-5 text-lg md:text-xl text-cream-100/90 max-w-xl text-pretty">
            {subtitle}
          </p>
          {comingSoon ? (
            <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-cream-50/95 px-4 py-2 text-ink-900 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-olive-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-olive-600" />
              </span>
              Coming soon to Airbnb — join the waitlist below.
            </div>
          ) : null}
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={siteConfig.airbnbUrl || '#contact'} data-track="airbnb-hero" className="btn-accent">
              Book on Airbnb <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/stay" className="btn-secondary border-cream-50/30 text-cream-50 hover:bg-cream-50/10">
              Explore the Villa
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}