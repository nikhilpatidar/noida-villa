import { siteConfig } from '@/lib/env';

export function CTABlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-ink-900 text-cream-100 px-8 py-14 md:px-14 md:py-20">
      <div className="absolute inset-0 -z-10 opacity-30" aria-hidden>
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-olive-700 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-terracotta-400 blur-3xl" />
      </div>
      <div className="max-w-2xl">
        <h2 className="font-serif text-4xl md:text-5xl text-cream-50 text-balance">{title}</h2>
        <p className="mt-4 text-cream-100/80 text-pretty">{subtitle}</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={siteConfig.airbnbUrl || '#contact'} data-track="airbnb-cta" className="btn-accent">Book on Airbnb</a>
        <a href={`mailto:${siteConfig.contactEmail || ''}`} data-track="email-cta" className="btn-secondary border-cream-50/30 text-cream-50 hover:bg-cream-50/10">Contact us</a>
      </div>
    </section>
  );
}