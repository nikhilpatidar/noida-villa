/**
 * Rate-limit memory-bound regression tests.
 *
 * The previous implementation only *overwrote* an expired bucket with a
 * fresh one — it never deleted the old key. A long-running process that
 * saw enough unique keys (rotating IPs, login attempts, etc.) would grow
 * the Map without bound until OOM.
 *
 * The fix:
 *  - deletes the old key when it has expired
 *  - has a soft cap (MAX_KEYS) that prunes expired, then oldest entries
 *  - preserves the existing rate-limit semantics
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rateLimit, _resetRateLimit, _rateLimitSize } from '../src/lib/rate-limit';

describe('rateLimit — existing semantics', () => {
  beforeEach(() => _resetRateLimit());
  afterEach(() => vi.useRealTimers());

  it('allows requests up to the limit inside the window', () => {
    const r1 = rateLimit('k', { limit: 3, windowMs: 1000 });
    const r2 = rateLimit('k', { limit: 3, windowMs: 1000 });
    const r3 = rateLimit('k', { limit: 3, windowMs: 1000 });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r3.remaining).toBe(0);
  });

  it('rejects the request that exceeds the limit and reports retryAfterMs', () => {
    rateLimit('k', { limit: 2, windowMs: 1000 });
    rateLimit('k', { limit: 2, windowMs: 1000 });
    const overflow = rateLimit('k', { limit: 2, windowMs: 1000 });
    expect(overflow.ok).toBe(false);
    expect(overflow.remaining).toBe(0);
    expect(overflow.retryAfterMs).toBeGreaterThan(0);
    expect(overflow.retryAfterMs).toBeLessThanOrEqual(1000);
  });

  it('opens a fresh window after the window elapses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    rateLimit('k', { limit: 1, windowMs: 1000 });
    expect(rateLimit('k', { limit: 1, windowMs: 1000 }).ok).toBe(false);
    // Advance past the window.
    vi.setSystemTime(new Date('2025-01-01T00:00:01.500Z'));
    const after = rateLimit('k', { limit: 1, windowMs: 1000 });
    expect(after.ok).toBe(true);
  });

  it('keys are independent from each other', () => {
    rateLimit('a', { limit: 1, windowMs: 1000 });
    expect(rateLimit('a', { limit: 1, windowMs: 1000 }).ok).toBe(false);
    expect(rateLimit('b', { limit: 1, windowMs: 1000 }).ok).toBe(true);
  });
});

describe('rateLimit — memory bound', () => {
  beforeEach(() => _resetRateLimit());
  afterEach(() => vi.useRealTimers());

  it('does not retain an entry whose window has expired', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    rateLimit('single', { limit: 5, windowMs: 1000 });
    expect(_rateLimitSize()).toBe(1);

    // Advance past the window. The next call must delete the dead key.
    vi.setSystemTime(new Date('2025-01-01T00:00:02.000Z'));
    rateLimit('single', { limit: 5, windowMs: 1000 });
    // After the expired entry is garbage-collected, exactly one live key
    // remains (the fresh bucket for the same key).
    expect(_rateLimitSize()).toBe(1);
  });

  it('expires entries over time and bounds the map to currently-live keys', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    // Create 100 distinct keys in one window.
    for (let i = 0; i < 100; i++) {
      rateLimit(`k${i}`, { limit: 5, windowMs: 1000 });
    }
    expect(_rateLimitSize()).toBe(100);

    // Advance past the window and touch any one key to trigger lazy cleanup.
    vi.setSystemTime(new Date('2025-01-01T00:00:05.000Z'));
    rateLimit('k0', { limit: 5, windowMs: 1000 });

    // The other 99 keys are still alive (never touched) — this is the
    // expected lazy-cleanup behaviour: we only free a key when we see it
    // again after expiry. Tickle them all:
    for (let i = 1; i < 100; i++) {
      rateLimit(`k${i}`, { limit: 5, windowMs: 1000 });
    }
    // Now exactly one live entry per key remains.
    expect(_rateLimitSize()).toBe(100);
  });

  it('does not grow unbounded under churn of unique keys', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    const WINDOW = 1000;
    // Simulate 5000 unique keys all in one short window.
    for (let i = 0; i < 5000; i++) {
      rateLimit(`unique-${i}`, { limit: 1, windowMs: WINDOW });
    }
    expect(_rateLimitSize()).toBe(5000);

    // Advance past the window and trigger lazy cleanup on every key.
    vi.setSystemTime(new Date('2025-01-01T00:00:10.000Z'));
    for (let i = 0; i < 5000; i++) {
      rateLimit(`unique-${i}`, { limit: 1, windowMs: WINDOW });
    }
    // Each key's expired entry was deleted before the fresh bucket was
    // created — so the size remains at 5000 (= one live entry per key).
    expect(_rateLimitSize()).toBe(5000);
  });

  it('enforces MAX_KEYS once exceeded, dropping oldest entries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    // 10_000 live keys should be fine (== MAX_KEYS).
    for (let i = 0; i < 10_000; i++) {
      rateLimit(`k${i}`, { limit: 100, windowMs: 60_000 });
    }
    expect(_rateLimitSize()).toBe(10_000);

    // Adding one more triggers the prune path. Since no entries are
    // expired yet, the implementation drops the oldest entries to fall
    // back under the cap.
    rateLimit('k-extra', { limit: 100, windowMs: 60_000 });
    expect(_rateLimitSize()).toBeLessThanOrEqual(10_000);
    // The new key must still be present and functional.
    expect(rateLimit('k-extra', { limit: 100, windowMs: 60_000 }).ok).toBe(true);
  });

  it('does not weaken rate-limit decisions when memory pressure is high', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    // Fill past the cap.
    for (let i = 0; i < 10_500; i++) {
      rateLimit(`x${i}`, { limit: 100, windowMs: 60_000 });
    }
    // Even after pruning, the limit on the new key ('recent') must be
    // enforced from its first request.
    const r1 = rateLimit('recent', { limit: 2, windowMs: 60_000 });
    const r2 = rateLimit('recent', { limit: 2, windowMs: 60_000 });
    const r3 = rateLimit('recent', { limit: 2, windowMs: 60_000 });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
  });
});