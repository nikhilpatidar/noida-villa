/**
 * Audit log writer.
 *
 * Accepts a Prisma transaction client so the audit row is part of the same atomic operation.
 */
import { Prisma } from '@prisma/client';

export interface AuditEntry {
  propertyId?: string | null;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
}

export async function writeAudit(tx: Prisma.TransactionClient, entry: AuditEntry) {
  await tx.auditLog.create({
    data: {
      propertyId: entry.propertyId ?? null,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      meta: (entry.meta as any) ?? Prisma.JsonNull,
    },
  });
}