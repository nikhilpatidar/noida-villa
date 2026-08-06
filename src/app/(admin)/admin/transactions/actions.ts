'use server';
import { requireMember, AuthorizationError } from '@/lib/authorization';
import { voidTransaction, FinanceValidationError } from '@/lib/services/transactions';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

export async function voidTransactionAction(id: string, propertyId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  const rl = rateLimit(`void:${session?.user?.id ?? 'anon'}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return { ok: false, error: 'Too many requests. Please slow down.' };

  try {
    const ctx = await requireMember(propertyId, 'OWNER');
    // Verify the transaction belongs to this property.
    const txn = await prisma.transaction.findUnique({ where: { id }, select: { propertyId: true } });
    if (!txn) return { ok: false, error: 'Transaction not found' };
    if (txn.propertyId !== propertyId) return { ok: false, error: 'Transaction does not belong to this property' };
    await voidTransaction(id, ctx.userId, reason, propertyId);
    revalidatePath('/admin');
    revalidatePath('/admin/transactions');
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    if (e instanceof FinanceValidationError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not void transaction' };
  }
}