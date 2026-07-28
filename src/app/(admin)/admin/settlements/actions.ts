'use server';
import { requireMember, AuthorizationError } from '@/lib/authorization';
import { settlementCreateSchema } from '@/lib/validation';
import { createSettlement, completeSettlement, cancelSettlement } from '@/lib/services/settlements';
import { FinanceValidationError } from '@/lib/services/transactions';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { parseCalendarDate } from '@/lib/dates';

export async function createSettlementAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  const rl = rateLimit(`settle:${session?.user?.id ?? 'anon'}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return { ok: false, error: 'Too many requests. Please slow down.' };

  const parsed = settlementCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const occurredOn = parseCalendarDate(parsed.data.occurredOn);
  if (!occurredOn) return { ok: false, error: 'Invalid date' };
  try {
    const ctx = await requireMember(parsed.data.propertyId, 'OWNER');
    await createSettlement({
      propertyId: parsed.data.propertyId,
      fromId: parsed.data.fromId,
      toId: parsed.data.toId,
      amount: parsed.data.amount,
      occurredOn,
      notes: parsed.data.notes || undefined,
      createdById: ctx.userId,
    });
    revalidatePath('/admin');
    revalidatePath('/admin/settlements');
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    if (e instanceof FinanceValidationError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not create settlement' };
  }
}

export async function completeSettlementAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  const rl = rateLimit(`settle-complete:${session?.user?.id ?? 'anon'}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return { ok: false, error: 'Too many requests. Please slow down.' };

  // Atomically look up the property + verify membership in one transaction.
  try {
    const s = await prisma.settlement.findUnique({ where: { id }, select: { propertyId: true } });
    if (!s) return { ok: false, error: 'Settlement not found' };
    const ctx = await requireMember(s.propertyId, 'OWNER');
    await completeSettlement(id, ctx.userId);
    revalidatePath('/admin/settlements');
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not complete settlement' };
  }
}

export async function cancelSettlementAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  const rl = rateLimit(`settle-cancel:${session?.user?.id ?? 'anon'}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return { ok: false, error: 'Too many requests. Please slow down.' };

  try {
    const s = await prisma.settlement.findUnique({ where: { id }, select: { propertyId: true } });
    if (!s) return { ok: false, error: 'Settlement not found' };
    const ctx = await requireMember(s.propertyId, 'OWNER');
    await cancelSettlement(id, ctx.userId);
    revalidatePath('/admin/settlements');
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not cancel settlement' };
  }
}