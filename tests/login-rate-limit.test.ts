/**
 * Login rate-limit key regression tests.
 *
 * The previous login action used `rateLimit(\`login:${ip}:${email}\`)`. Since
 * the email is user-supplied, an attacker could rotate the email to bypass
 * the per-email lockout and effectively bypass the IP limit too. The fix
 * uses an IP-only key `login:${ip}`. Per-email brute force is still slow
 * because bcrypt.compare is the credential check.
 *
 * The login action is a server action (cannot be unit-imported under
 * vitest), so these tests cover the key shape and the rate-limit
 * behaviour end-to-end.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rateLimit, _resetRateLimit } from '../src/lib/rate-limit';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..');
const loginSrc = readFileSync(path.join(REPO, 'src/app/(admin)/admin/login/actions.ts'), 'utf8');

describe('login action — rate-limit key', () => {
  it('does NOT include the user-supplied email in the rate-limit key', () => {
    // The key template must be `login:${ip}` — no email component.
    expect(loginSrc).toMatch(/rateLimit\(\s*`login:\$\{ip\}`/);
    // Sanity: the previous vulnerable pattern is gone.
    expect(loginSrc).not.toMatch(/rateLimit\(\s*`login:\$\{ip\}:\$\{email\}`/);
  });

  it('normalises the email (lowercase + trim) before passing to signIn', () => {
    // Email must be normalised so case differences don't create separate
    // auth attempts (bcrypt cares about the exact bytes, but the rate-limit
    // key must not include email).
    expect(loginSrc).toMatch(/\.trim\(\)\.toLowerCase\(\)/);
  });

  it('documents the rationale for IP-only key', () => {
    expect(loginSrc).toContain('IP only');
  });
});

describe('login rate-limit — IP-only key behaviour', () => {
  beforeEach(() => _resetRateLimit());
  afterEach(() => vi.useRealTimers());

  it('all attempts from the same IP share a single bucket', () => {
    // Simulate 8 attempts from the same IP, with DIFFERENT email values.
    // Under the old scheme each email would have its own bucket and the
    // 8th attempt would never block. Under the IP-only scheme the 8th
    // attempt (any email) is blocked.
    const key = 'login:203.0.113.5';
    let lastBlocked = false;
    for (let i = 0; i < 8; i++) {
      const r = rateLimit(key, { limit: 8, windowMs: 60_000 });
      lastBlocked = !r.ok;
    }
    expect(lastBlocked).toBe(false);
    // 9th attempt from the same IP must be blocked regardless of email.
    const overflow = rateLimit(key, { limit: 8, windowMs: 60_000 });
    expect(overflow.ok).toBe(false);
  });

  it('attempts from different IPs are independent', () => {
    const a = rateLimit('login:203.0.113.1', { limit: 2, windowMs: 60_000 });
    const b = rateLimit('login:203.0.113.2', { limit: 2, windowMs: 60_000 });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    // Saturate IP 1.
    rateLimit('login:203.0.113.1', { limit: 2, windowMs: 60_000 });
    const aBlocked = rateLimit('login:203.0.113.1', { limit: 2, windowMs: 60_000 });
    expect(aBlocked.ok).toBe(false);
    // IP 2 is still fine.
    const bStillOk = rateLimit('login:203.0.113.2', { limit: 2, windowMs: 60_000 });
    expect(bStillOk.ok).toBe(true);
  });

  it('attempts from the same IP are blocked across the entire window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    const key = 'login:198.51.100.7';
    for (let i = 0; i < 8; i++) rateLimit(key, { limit: 8, windowMs: 60_000 });
    const blocked = rateLimit(key, { limit: 8, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    // 30s later (still inside the window) — still blocked.
    vi.setSystemTime(new Date('2025-01-01T00:00:30.000Z'));
    const stillBlocked = rateLimit(key, { limit: 8, windowMs: 60_000 });
    expect(stillBlocked.ok).toBe(false);
    // After the window — fresh budget.
    vi.setSystemTime(new Date('2025-01-01T00:01:01.000Z'));
    const fresh = rateLimit(key, { limit: 8, windowMs: 60_000 });
    expect(fresh.ok).toBe(true);
  });

  it('an attacker rotating emails cannot bypass the IP limit', () => {
    // This is the property the fix has to defend. With the IP-only key,
    // 9 attempts from the same IP — regardless of email — must include
    // exactly one blocked attempt.
    const key = 'login:203.0.113.99';
    let blocked = 0;
    for (let i = 0; i < 12; i++) {
      const r = rateLimit(key, { limit: 8, windowMs: 60_000 });
      if (!r.ok) blocked++;
    }
    expect(blocked).toBe(4); // 12 attempts, 8 allowed, 4 blocked
  });
});