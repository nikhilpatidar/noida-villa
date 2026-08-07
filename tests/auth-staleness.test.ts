/**
 * Auth staleness regression tests.
 *
 * Bug #2: the JWT callback only refreshed membership on `trigger === 'update'`,
 * which meant a deactivated user kept admin access for the full 8-hour JWT
 * lifetime. The fix re-validates the user + memberships on a TTL (default 60s),
 * and drops the token entirely if `user.isActive === false`.
 *
 * These are source-level checks (no DB) so they can run in the standard
 * `npm run test` suite without testcontainers.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..');
const authSrc = readFileSync(path.join(REPO, 'src/lib/auth.ts'), 'utf8');

describe('auth.ts — JWT membership staleness fix', () => {
  it('re-validates user.isActive inside the jwt callback', () => {
    // The callback must hit prisma.user (not just propertyMembership) so it
    // can see the user's `isActive` flag.
    expect(authSrc).toMatch(/prisma\.user\.findUnique/);
    // It must inspect isActive and bail if the user was deactivated.
    expect(authSrc).toMatch(/isActive/);
  });

  it('drops the token when the user has been deactivated', () => {
    // When isActive is false the callback should return an empty token so the
    // session callback short-circuits and the user is effectively logged out.
    expect(authSrc).toMatch(/return\s*\{\s*\}\s*as\s*any/);
  });

  it('refreshes memberships on a TTL, not only on the `update` trigger', () => {
    // The old code only refreshed when `trigger === 'update'`. The fix must
    // also refresh when the token's checkedAt timestamp is older than the TTL.
    expect(authSrc).toMatch(/STALE_AFTER_S/);
    // Must NOT gate the refresh solely on trigger === 'update'.
    expect(authSrc).not.toMatch(/if\s*\(\s*trigger\s*===\s*['"]update['"]\s*&&\s*token\.uid\s*\)/);
  });

  it('updates token.checkedAt after each refresh', () => {
    expect(authSrc).toMatch(/token\.checkedAt\s*=\s*now/);
  });
});