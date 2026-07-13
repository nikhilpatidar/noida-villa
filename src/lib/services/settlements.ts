/**
 * Settlement service — validate against current balances, then write atomically.
 *
 * SECURITY: every settlement verifies that fromId/toId belong to the same
 * property. Self-settlements are rejected. Settlements cannot cross properties.
 */

import { prisma } from '@/lib/db';
import { toMinor, type MinorAmount } from '@/lib/money';
import { writeAudit } from './audit';
import { computeBalances, suggestSettlements, validateSettlementAmount } from '@/lib/finance';
import { FinanceValidationError } from './transactions';

export interface CreateSettlementInput {
  propertyId: string;
  fromId: string;
  toId: string;
  amount: string; // decimal string
  occurredOn: Date;
  notes?: string | null;
  createdById: string;
}

export async function createSettlement(input: CreateSettlementInput) {
  if (input.fromId === input.toId) throw new FinanceValidationError('From and to must differ');
  const amountMinor = toMinor(input.amount);
  if (amountMinor <= 0n) throw new FinanceValidationError('Amount must be positive');

  // Verify both participants belong to the same property.
  const parts = await prisma.participant.findMany({
    where: { id: { in: [input.fromId, input.toId] }, propertyId: input.propertyId },
    select: { id: true },
  });
  if (parts.length !== 2) {
    throw new FinanceValidationError('Both participants must belong to this property');
  }

  // Pull current balances for validation.
  const [participants, transactions, settlements] = await Promise.all([
    prisma.participant.findMany({ where: { propertyId: input.propertyId, isActive: true }, select: { id: true } }),
    prisma.transaction.findMany({
      where: { propertyId: input.propertyId, status: 'ACTIVE' },
      include: { expenseSplits: true, incomeSplits: true },
    }),
    prisma.settlement.findMany({ where: { propertyId: input.propertyId } }),
  ]);

  const balances = computeBalances(
    participants.map((p) => p.id),
    transactions.map((t) => ({
      id: t.id,
      type: t.type as 'EXPENSE' | 'INCOME',
      status: t.status as 'ACTIVE' | 'VOIDED',
      paidById: t.paidById,
      receivedById: t.receivedById,
      expenseSplits: t.expenseSplits.map((s) => ({ participantId: s.participantId, amountMinor: BigInt(s.amountMinor.toString()) })),
      incomeSplits: t.incomeSplits.map((s) => ({
        participantId: s.participantId,
        entitledMinor: BigInt(s.entitledMinor.toString()),
        receivedMinor: BigInt(s.receivedMinor.toString()),
      })),
    })),
    settlements.map((s) => ({
      id: s.id,
      status: s.status as 'PENDING' | 'COMPLETED' | 'CANCELLED',
      fromId: s.fromId,
      toId: s.toId,
      amountMinor: BigInt(s.amountMinor.toString()),
    })),
  );

  const check = validateSettlementAmount(balances, input.fromId, input.toId, amountMinor);
  if (!check.ok) throw new FinanceValidationError(check.reason || 'Invalid settlement');

  return prisma.$transaction(async (tx) => {
    const settlement = await tx.settlement.create({
      data: {
        propertyId: input.propertyId,
        fromId: input.fromId,
        toId: input.toId,
        amountMinor,
        occurredOn: input.occurredOn,
        notes: input.notes ? input.notes.slice(0, 1000) : null,
        createdById: input.createdById,
        status: 'PENDING',
      },
    });
    await writeAudit(tx, {
      propertyId: input.propertyId,
      actorId: input.createdById,
      action: 'settlement.created',
      entity: 'Settlement',
      entityId: settlement.id,
      meta: { fromId: input.fromId, toId: input.toId, amountMinor: amountMinor.toString() },
    });
    return settlement;
  });
}

export async function completeSettlement(id: string, actorId: string, paymentRef?: string | null) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.settlement.findUnique({ where: { id } });
    if (!existing) throw new FinanceValidationError('Settlement not found');
    if (existing.status === 'COMPLETED') return existing;
    const updated = await tx.settlement.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        paymentRef: paymentRef ? paymentRef.slice(0, 120) : null,
      },
    });
    await writeAudit(tx, {
      propertyId: existing.propertyId,
      actorId,
      action: 'settlement.completed',
      entity: 'Settlement',
      entityId: id,
      meta: { paymentRef: paymentRef ? paymentRef.slice(0, 120) : null },
    });
    return updated;
  });
}

export async function cancelSettlement(id: string, actorId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.settlement.findUnique({ where: { id } });
    if (!existing) throw new FinanceValidationError('Settlement not found');
    if (existing.status === 'CANCELLED') return existing;
    const updated = await tx.settlement.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await writeAudit(tx, {
      propertyId: existing.propertyId,
      actorId,
      action: 'settlement.cancelled',
      entity: 'Settlement',
      entityId: id,
      meta: { reason: reason ? reason.slice(0, 500) : null },
    });
    return updated;
  });
}

export async function computeSuggestions(propertyId: string) {
  const [participants, transactions, settlements] = await Promise.all([
    prisma.participant.findMany({ where: { propertyId, isActive: true } }),
    prisma.transaction.findMany({
      where: { propertyId, status: 'ACTIVE' },
      include: { expenseSplits: true, incomeSplits: true },
    }),
    prisma.settlement.findMany({ where: { propertyId } }),
  ]);
  const balances = computeBalances(
    participants.map((p) => p.id),
    transactions.map((t) => ({
      id: t.id,
      type: t.type as 'EXPENSE' | 'INCOME',
      status: t.status as 'ACTIVE' | 'VOIDED',
      paidById: t.paidById,
      receivedById: t.receivedById,
      expenseSplits: t.expenseSplits.map((s) => ({ participantId: s.participantId, amountMinor: BigInt(s.amountMinor.toString()) })),
      incomeSplits: t.incomeSplits.map((s) => ({
        participantId: s.participantId,
        entitledMinor: BigInt(s.entitledMinor.toString()),
        receivedMinor: BigInt(s.receivedMinor.toString()),
      })),
    })),
    settlements.map((s) => ({
      id: s.id,
      status: s.status as 'PENDING' | 'COMPLETED' | 'CANCELLED',
      fromId: s.fromId,
      toId: s.toId,
      amountMinor: BigInt(s.amountMinor.toString()),
    })),
  );
  return { balances, suggestions: suggestSettlements(balances) };
}