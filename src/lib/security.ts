/**
 * CSRF / Origin verification for server actions and API routes.
 *
 * Server actions in Next.js have built-in same-origin protection in most
 * configurations, but we add an explicit Origin/Referer check as defense in
 * depth. This guards against cross-site form submissions that target our
 * server actions.
 */

import { headers } from 'next/headers';
import { siteConfig } from './env';

export class OriginError extends Error {
  status: number;
  constructor(message: string = 'Invalid origin') {
    super(message);
    this.status = 403;
  }
}

/**
 * Verifies that the request's Origin or Referer header matches the
 * configured site URL. Skips verification for non-mutating GET requests.
 */
export async function verifySameOrigin(): Promise<void> {
  const h = await headers();
  const method = h.get('x-forwarded-method') ?? h.get('x-http-method-override');
  // Server actions carry an internal `next-action` header; they POST internally.
  // We only enforce on requests that look like cross-origin form submissions.
  // For Next.js server actions, the framework already enforces same-origin;
  // this is a belt-and-braces check.
  const origin = h.get('origin');
  const referer = h.get('referer');
  const expected = siteConfig.url.replace(/\/$/, '');
  const ok =
    (origin && origin.replace(/\/$/, '') === expected) ||
    (referer && referer.replace(/\/$/, '').startsWith(expected));
  if (!ok) {
    // For server actions invoked from same-origin pages, this should not fail.
    // If it does, we reject the request.
    throw new OriginError();
  }
}