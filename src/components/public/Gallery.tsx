'use client';
import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GalleryImage {
  id: string;
  imagePath: string;
  altText: string;
  caption?: string | null;
}

export function Gallery({ images }: { images: GalleryImage[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  if (images.length === 0) return null;

  const hero = images[0];
  const rest = images.slice(1);

  const open = (i: number) => setLightboxIdx(i);
  const close = () => setLightboxIdx(null);
  const step = (dir: 1 | -1) => {
    if (lightboxIdx === null) return;
    setLightboxIdx((lightboxIdx + dir + images.length) % images.length);
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-3 h-[420px] md:h-[560px]">
        <button
          onClick={() => open(0)}
          className="md:col-span-2 md:row-span-2 relative overflow-hidden rounded-xl bg-cream-200 group"
          aria-label={`View ${hero.altText}`}
        >
          {hero.imagePath ? (
            <Image src={hero.imagePath} alt={hero.altText} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-ink-400 text-sm">Replace with property photo</div>
          )}
        </button>
        {rest.slice(0, 4).map((img, i) => (
          <button
            key={img.id}
            onClick={() => open(i + 1)}
            className="relative overflow-hidden rounded-xl bg-cream-200 group"
            aria-label={`View ${img.altText}`}
          >
            {img.imagePath ? (
              <Image src={img.imagePath} alt={img.altText} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-ink-400 text-xs">Add photo</div>
            )}
          </button>
        ))}
      </div>

      {lightboxIdx !== null && (
        <div className="fixed inset-0 z-50 bg-ink-900/95 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Photo viewer">
          <button onClick={close} aria-label="Close" className="absolute top-5 right-5 rounded-full p-2 text-white/90 hover:bg-white/10">
            <X className="h-6 w-6" />
          </button>
          <button onClick={() => step(-1)} aria-label="Previous" className="absolute left-4 md:left-10 rounded-full p-3 text-white/80 hover:bg-white/10">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button onClick={() => step(1)} aria-label="Next" className="absolute right-4 md:right-10 rounded-full p-3 text-white/80 hover:bg-white/10">
            <ChevronRight className="h-6 w-6" />
          </button>
          <figure className="relative max-w-[90vw] max-h-[85vh] w-full h-full">
            {images[lightboxIdx].imagePath ? (
              <Image src={images[lightboxIdx].imagePath} alt={images[lightboxIdx].altText} fill sizes="100vw" className={cn('object-contain')} priority />
            ) : null}
            {images[lightboxIdx].caption ? (
              <figcaption className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm">{images[lightboxIdx].caption}</figcaption>
            ) : null}
          </figure>
        </div>
      )}
    </div>
  );
}