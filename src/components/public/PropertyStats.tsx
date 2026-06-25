import { Users, BedDouble, Bath, Maximize } from 'lucide-react';

export function PropertyStats({
  maxGuests,
  bedrooms,
  beds,
  bathrooms,
}: {
  maxGuests?: number | null;
  bedrooms?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
}) {
  const items: { label: string; value: string; icon: React.ReactNode }[] = [];
  if (maxGuests) items.push({ label: 'Guests', value: `${maxGuests}`, icon: <Users className="h-4 w-4" /> });
  if (bedrooms) items.push({ label: 'Bedrooms', value: `${bedrooms}`, icon: <BedDouble className="h-4 w-4" /> });
  if (beds) items.push({ label: 'Beds', value: `${beds}`, icon: <Maximize className="h-4 w-4" /> });
  if (bathrooms) items.push({ label: 'Bathrooms', value: `${bathrooms}`, icon: <Bath className="h-4 w-4" /> });

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border border-ink-100 bg-white p-5 text-center">
          <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cream-100 text-ink-700">
            {it.icon}
          </div>
          <div className="font-serif text-2xl text-ink-900">{it.value}</div>
          <div className="text-xs uppercase tracking-wide text-ink-500 mt-1">{it.label}</div>
        </div>
      ))}
    </div>
  );
}