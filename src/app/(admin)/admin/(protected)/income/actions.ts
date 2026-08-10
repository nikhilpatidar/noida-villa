'use server';
import { requireMember, AuthorizationError } from '@/lib/authorization';
import { incomeCreateSchema } from '@/lib/validation';
import { createIncome, FinanceValidationError } from '@/lib/services/transactions';
import { rateLimit } from '@/lib/rate-limit';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { parseCalendarDate } from '@/lib/dates';

export async function createIncomeAction(input: unknown): Promise<{ ok: boolean; id?: string; error?: string }> {
  const session = await auth();
  const rl = rateLimit(`income:${session?.user?.id ?? 'anon'}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return { ok: false, error: 'Too many requests. Please slow down.' };

  const parsed = incomeCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const data = parsed.data;
  const occurredOn = parseCalendarDate(data.occurredOn);
  if (!occurredOn) return { ok: false, error: 'Invalid date' };
  try {
    const ctx = await requireMember(data.propertyId, 'OWNER');
    const txn = await createIncome({
      propertyId: data.propertyId,
      occurredOn,
      description: data.description,
      amount: data.amount,
      categoryId: data.categoryId || undefined,
      source: data.source || undefined,
      bookingRef: data.bookingRef || undefined,
      receivedById: data.receivedById,
      split: data.split,
      notes: data.notes || undefined,
      createdById: ctx.userId,
    });
    revalidatePath('/admin');
    revalidatePath('/admin/transactions');
    revalidatePath('/admin/income');
    return { ok: true, id: txn.id };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    if (e instanceof FinanceValidationError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not create income' };
  }
}