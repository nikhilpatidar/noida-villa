/**
 * Transaction service — atomic create/update/void of expenses and incomes.
 *
 * All amounts in BigInt (paise). Server-authoritative.
 *
 * SECURITY: every write verifies that the referenced entities (paidById,
 * receivedById, split participants, categoryId, attachmentIds) belong to the
 * same property as the transaction. Client cannot smuggle IDs across
 * properties.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { computeSplits, toMinor, type MinorAmount, type SplitInput } from '@/lib/money';
import { writeAudit } from './audit';

export interface CreateExpenseInput {
  propertyId: string;
  occurredOn: Date;
  description: string;
  amount: string; // decimal string
  categoryId?: string | null;
  paidById: string;
  split: SplitInput;
  notes?: string | null;
  createdById: string;
  attachmentIds?: string[];
}

export interface CreateIncomeInput {
  propertyId: string;
  occurredOn: Date;
  description: string;
  amount: string;
  categoryId?: string | null;
  source?: string | null;
  bookingRef?: string | null;
  receivedById: string;
  split: SplitInput;
  notes?: string | null;
  createdById: string;
  attachmentIds?: string[];
}

export class FinanceValidationError extends Error {}

/**
 * Verify that every participantId in `ids` belongs to `propertyId`.
 * Returns the matching Participant rows (active only).
 */
async function assertParticipantsInProperty(
  tx: Prisma.TransactionClient,
  propertyId: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) throw new FinanceValidationError('No participants in split');
  // Reject empty/whitespace IDs early.
  for (const id of ids) if (typeof id !== 'string' || !id) throw new FinanceValidationError('Invalid participant id');
  const found = await tx.participant.findMany({
    where: { id: { in: ids }, propertyId, isActive: true },
    select: { id: true },
  });
  if (found.length !== new Set(ids).size) {
    throw new FinanceValidationError('One or more participants are not active members of this property');
  }
  // Reject duplicate participant IDs.
  if (new Set(ids).size !== ids.length) {
    throw new FinanceValidationError('Duplicate participants in split');
  }
}

export async function createExpense(input: CreateExpenseInput) {
  const amountMinor = toMinor(input.amount);
  if (amountMinor <= 0n) throw new FinanceValidationError('Amount must be positive');
  if (amountMinor > MAX_AMOUNT_MINOR) throw new FinanceValidationError('Amount exceeds maximum');

  const splits = computeSplits(amountMinor, input.split);
  const participantIds = Array.from(new Set([input.paidById, ...splits.map((s) => s.participantId)]));

  return prisma.$transaction(async (tx) => {
    // All participants must belong to the same property.
    await assertParticipantsInProperty(tx, input.propertyId, participantIds);

    // Optional category must belong to the same property.
    if (input.categoryId) {
      const cat = await tx.category.findFirst({
        where: { id: input.categoryId, propertyId: input.propertyId },
        select: { id: true },
      });
      if (!cat) throw new FinanceValidationError('Category not found in this property');
    }

    // Optional attachments must belong to the same property.
    if (input.attachmentIds?.length) {
      const atts = await tx.attachment.findMany({
        where: { id: { in: input.attachmentIds }, propertyId: input.propertyId },
        select: { id: true },
      });
      if (atts.length !== input.attachmentIds.length) {
        throw new FinanceValidationError('One or more attachments do not belong to this property');
      }
    }

    const txn = await tx.transaction.create({
      data: {
        propertyId: input.propertyId,
        type: 'EXPENSE',
        occurredOn: input.occurredOn,
        description: input.description.slice(0, 200),
        amountMinor,
        categoryId: input.categoryId || null,
        paidById: input.paidById,
        splitMethod: input.split.method,
        notes: input.notes ? input.notes.slice(0, 2000) : null,
        createdById: input.createdById,
        expenseSplits: {
          create: splits.map((s) => ({
            participantId: s.participantId,
            amountMinor: s.amountMinor,
          })),
        },
      },
      include: { expenseSplits: true },
    });

    if (input.attachmentIds?.length) {
      await tx.attachment.updateMany({
        where: { id: { in: input.attachmentIds }, propertyId: input.propertyId },
        data: { transactionId: txn.id },
      });
    }

    await writeAudit(tx, {
      propertyId: input.propertyId,
      actorId: input.createdById,
      action: 'expense.created',
      entity: 'Transaction',
      entityId: txn.id,
      meta: { amountMinor: amountMinor.toString(), paidById: input.paidById },
    });

    return txn;
  });
}

export async function createIncome(input: CreateIncomeInput) {
  const amountMinor = toMinor(input.amount);
  if (amountMinor <= 0n) throw new FinanceValidationError('Amount must be positive');
  if (amountMinor > MAX_AMOUNT_MINOR) throw new FinanceValidationError('Amount exceeds maximum');

  const splits = computeSplits(amountMinor, input.split);
  const participantIds = Array.from(new Set([input.receivedById, ...splits.map((s) => s.participantId)]));

  return prisma.$transaction(async (tx) => {
    await assertParticipantsInProperty(tx, input.propertyId, participantIds);

    if (input.categoryId) {
      const cat = await tx.category.findFirst({
        where: { id: input.categoryId, propertyId: input.propertyId },
        select: { id: true },
      });
      if (!cat) throw new FinanceValidationError('Category not found in this property');
    }

    if (input.attachmentIds?.length) {
      const atts = await tx.attachment.findMany({
        where: { id: { in: input.attachmentIds }, propertyId: input.propertyId },
        select: { id: true },
      });
      if (atts.length !== input.attachmentIds.length) {
        throw new FinanceValidationError('One or more attachments do not belong to this property');
      }
    }

    const txn = await tx.transaction.create({
      data: {
        propertyId: input.propertyId,
        type: 'INCOME',
        occurredOn: input.occurredOn,
        description: input.description.slice(0, 200),
        amountMinor,
        categoryId: input.categoryId || null,
        source: input.source ? input.source.slice(0, 80) : null,
        bookingRef: input.bookingRef ? input.bookingRef.slice(0, 120) : null,
        receivedById: input.receivedById,
        splitMethod: input.split.method,
        notes: input.notes ? input.notes.slice(0, 2000) : null,
        createdById: input.createdById,
        incomeSplits: {
          create: splits.map((s) => {
            const participantId = (s as any).participantId;
            return {
              participantId,
              entitledMinor: s.amountMinor,
              receivedMinor: s.amountMinor,
            };
          }),
        },
      },
      include: { incomeSplits: true },
    });

    if (input.attachmentIds?.length) {
      await tx.attachment.updateMany({
        where: { id: { in: input.attachmentIds }, propertyId: input.propertyId },
        data: { transactionId: txn.id },
      });
    }

    await writeAudit(tx, {
      propertyId: input.propertyId,
      actorId: input.createdById,
      action: 'income.created',
      entity: 'Transaction',
      entityId: txn.id,
      meta: { amountMinor: amountMinor.toString(), source: input.source, bookingRef: input.bookingRef },
    });

    return txn;
  });
}

export async function voidTransaction(id: string, actorId: string, reason: string, propertyId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findUnique({ where: { id } });
    if (!existing) throw new FinanceValidationError('Transaction not found');
    if (existing.propertyId !== propertyId) {
      throw new FinanceValidationError('Transaction does not belong to this property');
    }
    if (existing.status === 'VOIDED') return existing;
    const updated = await tx.transaction.update({
      where: { id },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedById: actorId,
        voidReason: reason ? reason.slice(0, 500) : null,
      },
    });
    await writeAudit(tx, {
      propertyId: existing.propertyId,
      actorId,
      action: existing.type === 'EXPENSE' ? 'expense.voided' : 'income.voided',
      entity: 'Transaction',
      entityId: id,
      meta: { reason },
    });
    return updated;
  });
}

/**
 * Hard cap per transaction. 1e15 paise = ₹10,00,00,00,000 (10 lakh crore).
 * Prevents accidental or malicious overflow of BigInt operations.
 */
export const MAX_AMOUNT_MINOR = 1_000_000_000_000_000n;