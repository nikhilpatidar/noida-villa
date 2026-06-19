/**
 * Server-side authorization.
 *
 * IMPORTANT: every API / server action that touches private data MUST call
 * `requireMember(...)` or `requireRole(...)` to verify:
 *
 *   1. The user is authenticated.
 *   2. The user belongs to the requested property.
 *   3. The user has the required role (or higher) for the requested action.
 */

import { auth } from './auth';
import { prisma } from './db';
import { Role } from '@prisma/client';

export class AuthorizationError extends Error {
  status: number;
  constructor(message: string, status: number = 403) {
    super(message);
    this.status = status;
  }
}

export interface AuthedContext {
  userId: string;
  role: Role;
  propertyId: string;
}

const ROLE_ORDER: Record<Role, number> = { OWNER: 1, PROPERTY_ADMIN: 2 };

export function hasAtLeast(role: Role, required: Role): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER[required];
}

/** Throws if not authenticated. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new AuthorizationError('Not authenticated', 401);
  return session;
}

/**
 * Require that the authenticated user is a member of `propertyId` and has at least `required` role.
 * Returns the membership context.
 */
export async function requireMember(propertyId: string, required: Role = 'OWNER'): Promise<AuthedContext> {
  const session = await requireSession();
  const membership = await prisma.propertyMembership.findFirst({
    where: { userId: session.user.id, propertyId, isActive: true },
  });
  if (!membership) throw new AuthorizationError('Not a member of this property', 403);
  if (!hasAtLeast(membership.role, required)) {
    throw new AuthorizationError('Insufficient permissions', 403);
  }
  return { userId: session.user.id, role: membership.role, propertyId };
}

/** Require that the user has at least one active membership. */
export async function requireAnyMember(): Promise<{ userId: string; role: Role; propertyIds: string[] }> {
  const session = await requireSession();
  const memberships = await prisma.propertyMembership.findMany({
    where: { userId: session.user.id, isActive: true },
  });
  if (memberships.length === 0) throw new AuthorizationError('No active membership', 403);
  const role: Role = memberships.some((m) => m.role === 'PROPERTY_ADMIN')
    ? 'PROPERTY_ADMIN'
    : 'OWNER';
  return { userId: session.user.id, role, propertyIds: memberships.map((m) => m.propertyId) };
}

/** Strict alias of requireMember with the same semantics. */
export async function requireRole(propertyId: string, required: Role): Promise<AuthedContext> {
  return requireMember(propertyId, required);
}

/** Lightweight `requireSession` returning the session or null. */
export async function currentSession() {
  return await auth();
}