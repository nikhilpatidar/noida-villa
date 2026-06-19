/**
 * Auth.js (NextAuth v5) configuration.
 *
 * - Credentials provider with bcrypt-hashed passwords.
 * - JWT sessions.
 * - Custom session.user.role populated from PropertyMembership lookup.
 *
 * The "property context" (which property the user is currently viewing) is selected
 * by /admin/property/[id] routes; default membership is the first active one.
 */

import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from './db';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role | null;
      membershipPropertyIds: string[];
    } & DefaultSession['user'];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Refuse to start without AUTH_SECRET in production.
  secret: process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('AUTH_SECRET is required in production') })()
    : 'dev-only-insecure-secret-please-set-AUTH_SECRET'),
  // Use secure cookies in production.
  useSecureCookies: process.env.NODE_ENV === 'production',
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 }, // 8 hours
  pages: { signIn: '/admin/login' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
          include: { memberships: { where: { isActive: true } } },
        });
        if (!user || !user.isActive || !user.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        // Choose highest role across active memberships
        const roles = user.memberships.map((m) => m.role);
        const role: Role | null = roles.includes('PROPERTY_ADMIN') ? 'PROPERTY_ADMIN' : roles.includes('OWNER') ? 'OWNER' : null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role,
          membershipPropertyIds: user.memberships.map((m) => m.propertyId),
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.uid = (user as any).id;
        token.role = (user as any).role ?? null;
        token.membershipPropertyIds = (user as any).membershipPropertyIds ?? [];
        token.checkedAt = Math.floor(Date.now() / 1000);
      }
      // Always re-validate membership against the database, but cap the
      // check rate so we don't hit Prisma on every single middleware fetch.
      // This closes the gap where a deactivated user kept access for up to
      // the full JWT lifetime (8h) because the token was only refreshed
      // on explicit `update` triggers. While we are at the DB we also
      // confirm `user.isActive`; if the user was deactivated between
      // logins, we drop the token so the session becomes invalid.
      if (token.uid) {
        const now = Math.floor(Date.now() / 1000);
        const last = typeof token.checkedAt === 'number' ? token.checkedAt : 0;
        const STALE_AFTER_S = 60;
        if (trigger === 'update' || now - last >= STALE_AFTER_S) {
          const dbUser = await prisma.user.findUnique({
            where: { id: String(token.uid) },
            select: {
              isActive: true,
              memberships: {
                where: { isActive: true },
                select: { propertyId: true, role: true },
              },
            },
          });
          if (!dbUser || !dbUser.isActive) {
            // User deactivated — invalidate the token entirely.
            return {} as any;
          }
          token.membershipPropertyIds = dbUser.memberships.map((m) => m.propertyId);
          token.role = dbUser.memberships.some((m) => m.role === 'PROPERTY_ADMIN')
            ? 'PROPERTY_ADMIN'
            : dbUser.memberships.some((m) => m.role === 'OWNER')
            ? 'OWNER'
            : null;
          token.checkedAt = now;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) {
        session.user.id = String(token.uid);
        session.user.role = (token.role as Role | null) ?? null;
        session.user.membershipPropertyIds = (token.membershipPropertyIds as string[]) ?? [];
      }
      return session;
    },
  },
});