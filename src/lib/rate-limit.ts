/**
 * Simple in-memory rate limiter (per-process).
 *
 * For production multi-instance deployments, replace the store with Redis
 * or a database-backed counter. The interface stays the same.
 *
 * NOTE: This is intentionally simple. It uses a fixed-window algorithm which
 * is acceptable for protecting a small number of endpoints in a small app.
 *
 * Memory bound: the underlying Map grows only with currently-live buckets.
 * Each `rateLimit()` call deletes its key first if the bucket has expired,
 * so expired buckets do not linger. A soft cap (MAX_KEYS) prevents a
 * malicious caller from causing unbounded growth by churning distinct
 * keys; when the cap is hit, the oldest expired entries are pruned, and
 * if still over cap the oldest entries overall are dropped (recording
 * rate-limit decisions continues normally).
 */

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  windowStart: number;
}

// Soft cap on simultaneous distinct keys. Generous enough for legitimate
// traffic, small enough that even an attacker churning unique keys cannot
// push us past it before we sweep.
const MAX_KEYS = 10_000;

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, Bucket> | undefined;
}

const store: Map<string, Bucket> =
  (globalThis as any).__rateLimitStore ??
  ((globalThis as any).__rateLimitStore = new Map<string, Bucket>());

/**
 * Lazy / amortized cleanup. If the store has grown beyond MAX_KEYS, evict
 * expired buckets first, then the oldest entries overall until under cap.
 * Cheaper than a periodic timer because it only runs under pressure.
 */
function maybePrune(now: number, windowMs: number) {
  if (store.size < MAX_KEYS) return;

  // 1) Drop every bucket that has already expired — free.
  for (const [k, b] of store) {
    if (now - b.windowStart >= windowMs) store.delete(k);
  }
  if (store.size < MAX_KEYS) return;

  // 2) Still over cap. Drop the oldest buckets until under cap. Map iteration
  //    is insertion order, which is a good proxy for "oldest live windowStart".
  //    Aim for MAX_KEYS - 1 so the imminent insert leaves the map at exactly
  //    MAX_KEYS.
  const toDrop = store.size - (MAX_KEYS - 1);
  let dropped = 0;
  for (const k of store.keys()) {
    if (dropped >= toDrop) break;
    store.delete(k);
    dropped++;
  }
}

/** Returns ok=true if the request is within the limit. */
export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const bucket = store.get(key);
  // If the bucket has expired, drop the old entry first so the Map does not
  // accumulate dead keys. This is the primary memory-growth defence.
  if (bucket && now - bucket.windowStart >= windowMs) {
    store.delete(key);
  }
  maybePrune(now, windowMs);
  const fresh = store.get(key);
  if (!fresh) {
    store.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (fresh.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: windowMs - (now - fresh.windowStart) };
  }
  fresh.count += 1;
  return { ok: true, remaining: limit - fresh.count, retryAfterMs: 0 };
}

/** Test/utility: reset the in-memory store. */
export function _resetRateLimit() {
  store.clear();
}

/** Test/utility: current entry count (used by regression tests). */
export function _rateLimitSize(): number {
  return store.size;
}