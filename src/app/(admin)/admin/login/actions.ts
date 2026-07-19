'use server';
import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { rateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { siteConfig } from '@/lib/env';

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  // Rate limit by IP only. Including the user-supplied email in the key
  // would let an attacker bypass the limit by rotating emails (each
  // rotated email gets its own fresh bucket). Slow bcrypt on the
  // credential check is the layer that prevents per-email brute force;
  // the IP limit is the layer that prevents the IP from being saturated.
  // The x-forwarded-for header is not trusted without a proper proxy; in
  // a hosted deployment, set TRUST_PROXY headers.
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`login:${ip}`, { limit: 8, windowMs: 60_000 });
  if (!rl.ok) return { error: 'Too many attempts. Please wait a minute and try again.' };

  // CSRF same-origin check (defense in depth).
  const origin = h.get('origin');
  const referer = h.get('referer');
  const expected = siteConfig.url.replace(/\/$/, '');
  const okOrigin =
    (origin && origin.replace(/\/$/, '') === expected) ||
    (referer && referer.replace(/\/$/, '').startsWith(expected));
  if (!okOrigin) {
    return { error: 'Request blocked.' };
  }

  try {
    await signIn('credentials', { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      // Generic error to avoid leaking whether the email exists.
      return { error: 'Wrong email or password.' };
    }
    throw e;
  }
  redirect('/admin');
}