/**
 * Loading boundary for the protected admin segment.
 *
 * While server work is in flight for an admin navigation, this UI is
 * rendered so the user sees immediate feedback instead of the previous
 * page appearing "frozen" until the next RSC payload arrives.
 *
 * This is a UX improvement only — it does not change actual server
 * latency. The Phase H caching fix in `getActivePropertyName` is what
 * reduces per-navigation DB work.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="h-7 w-40 rounded bg-admin-border/60" />
      <div className="h-4 w-72 rounded bg-admin-border/40" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-admin-border bg-admin-panel" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-admin-border bg-admin-panel" />
        <div className="h-64 rounded-xl border border-admin-border bg-admin-panel" />
      </div>
    </div>
  );
}