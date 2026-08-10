'use server';
import { requireMember, AuthorizationError } from '@/lib/authorization';
import { expenseCreateSchema } from '@/lib/validation';
import { createExpense, FinanceValidationError } from '@/lib/services/transactions';
import { rateLimit } from '@/lib/rate-limit';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { parseCalendarDate } from '@/lib/dates';

export async function createExpenseAction(input: unknown): Promise<{ ok: boolean; id?: string; error?: string }> {
  const session = await auth();
  const rl = rateLimit(`expense:${session?.user?.id ?? 'anon'}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return { ok: false, error: 'Too many requests. Please slow down.' };

  const parsed = expenseCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const data = parsed.data;
  const occurredOn = parseCalendarDate(data.occurredOn);
  if (!occurredOn) return { ok: false, error: 'Invalid date' };
  try {
    const ctx = await requireMember(data.propertyId, 'OWNER');
    const txn = await createExpense({
      propertyId: data.propertyId,
      occurredOn,
      description: data.description,
      amount: data.amount,
      categoryId: data.categoryId || undefined,
      paidById: data.paidById,
      split: data.split,
      notes: data.notes || undefined,
      createdById: ctx.userId,
    });
    revalidatePath('/admin');
    revalidatePath('/admin/transactions');
    revalidatePath('/admin/expenses');
    return { ok: true, id: txn.id };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    if (e instanceof FinanceValidationError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not create expense' };
  }
}