import { Wifi, Tv, Car, Coffee, Wind, Waves, ShieldCheck, Trees, Utensils, Bath, Snowflake, Dumbbell, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  tv: Tv,
  parking: Car,
  coffee: Coffee,
  ac: Wind,
  pool: Waves,
  security: ShieldCheck,
  garden: Trees,
  kitchen: Utensils,
  bath: Bath,
  snowflake: Snowflake,
  gym: Dumbbell,
};

export function AmenityIcon({ iconKey }: { iconKey?: string | null }) {
  const Icon = iconKey ? ICONS[iconKey] : null;
  return Icon ? <Icon className="h-5 w-5" /> : <Wifi className="h-5 w-5" />;
}

export function AmenityGrid({ amenities }: { amenities: Array<{ group: string; name: string; iconKey?: string | null }> }) {
  if (amenities.length === 0) return null;
  const grouped = amenities.reduce<Record<string, typeof amenities>>((acc, a) => {
    (acc[a.group] ||= []).push(a);
    return acc;
  }, {});
  return (
    <div className="space-y-10">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <h3 className="font-serif text-2xl text-ink-900 capitalize">{group}</h3>
          <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((a) => {
              const k = `${group}-${a.name}`;
              return (
                <div key={k} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3">
                  <span className="text-ink-700"><AmenityIcon iconKey={a.iconKey} /></span>
                  <span className="text-sm text-ink-800">{a.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}