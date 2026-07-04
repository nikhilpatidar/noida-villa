import { siteConfig } from '@/lib/env';

export function LocationBlock({
  city,
  state,
  country,
  nearbyPlaces,
}: {
  city: string;
  state: string;
  country: string;
  nearbyPlaces: Array<{ id: string; name: string; category: string; distanceKm: number | null; description: string | null }>;
}) {
  const grouped = nearbyPlaces.reduce<Record<string, typeof nearbyPlaces>>((acc, p) => {
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <p className="text-ink-600 text-pretty">
          Set in {city}, {state}, our villa sits in the heart of one of {country}&apos;s most connected urban regions.
          Noida is widely known for its wide boulevards, manicured parks, business districts and excellent metro
          access to Delhi and the wider National Capital Region.
        </p>
        {nearbyPlaces.length > 0 ? (
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat}>
                <h3 className="font-serif text-xl text-ink-900 capitalize">{cat}</h3>
                <ul className="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white">
                  {grouped[cat].map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div>
                        <div className="font-medium text-ink-900">{p.name}</div>
                        {p.description ? <div className="text-sm text-ink-500 mt-0.5 text-pretty">{p.description}</div> : null}
                      </div>
                      {p.distanceKm !== null ? (
                        <span className="shrink-0 text-sm text-ink-500">{p.distanceKm} km</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-500">
            We will populate nearby places (metro, airports, restaurants, attractions) once the property is confirmed.
          </p>
        )}
      </div>
      <aside className="rounded-xl border border-ink-100 bg-white p-6">
        <div className="eyebrow">Region</div>
        <h3 className="font-serif text-2xl text-ink-900 mt-2">{city}</h3>
        <p className="mt-2 text-sm text-ink-500">{state}, {country}</p>
        <div className="mt-4 h-48 rounded-lg bg-gradient-to-br from-cream-200 to-olive-100 grid place-items-center text-xs text-ink-500">
          Map embed can be added once coordinates are confirmed.
        </div>
      </aside>
    </div>
  );
}