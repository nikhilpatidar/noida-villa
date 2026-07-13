/**
 * Participant service.
 *
 * SECURITY: all writes verify that the participant belongs to the property
 * that the caller is acting on. Client cannot smuggle IDs across properties.
 */
import { prisma } from '@/lib/db';
import { writeAudit } from './audit';

export async function createParticipant(input: {
  propertyId: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  kind?: 'OWNER' | 'INVESTOR' | 'STAFF' | 'OTHER';
  notes?: string | null;
  userId?: string | null;
  actorId: string;
}) {
  // If a userId is given, it must already be a member of this property.
  if (input.userId) {
    const member = await prisma.propertyMembership.findFirst({
      where: { userId: input.userId, propertyId: input.propertyId, isActive: true },
      select: { id: true },
    });
    if (!member) throw new Error('Linked user is not an active member of this property');
  }
  return prisma.$transaction(async (tx) => {
    const p = await tx.participant.create({
      data: {
        propertyId: input.propertyId,
        displayName: input.displayName.slice(0, 120),
        email: input.email || null,
        phone: input.phone ? input.phone.slice(0, 40) : null,
        kind: input.kind ?? 'OWNER',
        notes: input.notes ? input.notes.slice(0, 2000) : null,
        userId: input.userId || null,
      },
    });
    await writeAudit(tx, {
      propertyId: input.propertyId,
      actorId: input.actorId,
      action: 'participant.created',
      entity: 'Participant',
      entityId: p.id,
      meta: { displayName: input.displayName, kind: input.kind ?? 'OWNER' },
    });
    return p;
  });
}

export async function updateParticipant(
  id: string,
  propertyId: string,
  data: Partial<{ displayName: string; email: string | null; phone: string | null; kind: 'OWNER' | 'INVESTOR' | 'STAFF' | 'OTHER'; notes: string | null; isActive: boolean }>,
  actorId: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.participant.findUnique({ where: { id } });
    if (!existing) throw new Error('Participant not found');
    if (existing.propertyId !== propertyId) {
      throw new Error('Participant does not belong to this property');
    }
    if (data.displayName !== undefined) data.displayName = data.displayName.slice(0, 120);
    if (data.phone) data.phone = data.phone.slice(0, 40);
    if (data.notes) data.notes = data.notes.slice(0, 2000);
    const p = await tx.participant.update({ where: { id }, data });
    await writeAudit(tx, {
      propertyId: existing.propertyId,
      actorId,
      action: 'participant.updated',
      entity: 'Participant',
      entityId: id,
      meta: { before: existing, after: p },
    });
    return p;
  });
}

export async function deactivateParticipant(id: string, propertyId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.participant.findUnique({ where: { id } });
    if (!existing) throw new Error('Participant not found');
    if (existing.propertyId !== propertyId) {
      throw new Error('Participant does not belong to this property');
    }
    if (!existing.isActive) return existing;
    const p = await tx.participant.update({ where: { id }, data: { isActive: false } });
    await writeAudit(tx, {
      propertyId: existing.propertyId,
      actorId,
      action: 'participant.deactivated',
      entity: 'Participant',
      entityId: id,
      meta: { displayName: existing.displayName },
    });
    return p;
  });
}