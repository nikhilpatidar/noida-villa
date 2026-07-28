'use server';
import { requireMember, AuthorizationError } from '@/lib/authorization';
import { participantCreateSchema } from '@/lib/validation';
import { createParticipant, deactivateParticipant } from '@/lib/services/participants';
import { rateLimit } from '@/lib/rate-limit';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

export async function createParticipantAction(input: any): Promise<{ ok: boolean; error?: string; id?: string }> {
  const session = await auth();
  const rl = rateLimit(`participant:${session?.user?.id ?? 'anon'}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return { ok: false, error: 'Too many requests. Please slow down.' };

  const propertyId = String((input as any)?.propertyId ?? '');
  if (!propertyId) return { ok: false, error: 'Missing propertyId' };
  const parsed = participantCreateSchema.safeParse({ ...input, propertyId });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    const ctx = await requireMember(propertyId, 'OWNER');
    const p = await createParticipant({
      propertyId,
      displayName: parsed.data.displayName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      kind: parsed.data.kind,
      notes: parsed.data.notes || null,
      actorId: ctx.userId,
    });
    revalidatePath('/admin/people');
    return { ok: true, id: p.id };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not create participant' };
  }
}

export async function deactivateParticipantAction(id: string, propertyId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  const rl = rateLimit(`participant-deact:${session?.user?.id ?? 'anon'}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return { ok: false, error: 'Too many requests. Please slow down.' };

  try {
    const ctx = await requireMember(propertyId, 'OWNER');
    await deactivateParticipant(id, propertyId, ctx.userId);
    revalidatePath('/admin/people');
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not deactivate' };
  }
}