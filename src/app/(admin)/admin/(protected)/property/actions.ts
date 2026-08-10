'use server';
import { requireMember, AuthorizationError } from '@/lib/authorization';
import { propertyUpdateSchema } from '@/lib/validation';
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/services/audit';
import { revalidatePath, revalidateTag } from 'next/cache';
import { PUBLIC_PROPERTY_TAG } from '@/lib/services/website';

export async function updatePropertyAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = propertyUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    const ctx = await requireMember(parsed.data.id, 'PROPERTY_ADMIN');
    await prisma.$transaction(async (tx) => {
      const before = await tx.property.findUnique({ where: { id: parsed.data.id } });
      const updated = await tx.property.update({
        where: { id: parsed.data.id },
        data: {
          name: parsed.data.name ?? undefined,
          tagline: parsed.data.tagline ?? undefined,
          shortSummary: parsed.data.shortSummary ?? undefined,
          description: parsed.data.description ?? undefined,
          city: parsed.data.city ?? undefined,
          state: parsed.data.state ?? undefined,
          country: parsed.data.country ?? undefined,
          addressLine: parsed.data.addressLine ?? undefined,
          postalCode: parsed.data.postalCode ?? undefined,
          latitude: parsed.data.latitude ?? undefined,
          longitude: parsed.data.longitude ?? undefined,
          bedrooms: parsed.data.bedrooms ?? undefined,
          beds: parsed.data.beds ?? undefined,
          bathrooms: parsed.data.bathrooms ?? undefined,
          maxGuests: parsed.data.maxGuests ?? undefined,
          airbnbUrl: parsed.data.airbnbUrl || undefined,
          contactEmail: parsed.data.contactEmail || undefined,
          contactPhone: parsed.data.contactPhone || undefined,
          whatsappPhone: parsed.data.whatsappPhone || undefined,
          instagramUrl: parsed.data.instagramUrl || undefined,
          facebookUrl: parsed.data.facebookUrl || undefined,
          status: parsed.data.status ?? undefined,
        },
      });
      await writeAudit(tx, {
        propertyId: parsed.data.id,
        actorId: ctx.userId,
        action: 'property.updated',
        entity: 'Property',
        entityId: parsed.data.id,
        meta: { before, after: updated },
      });
    });
    revalidatePath('/admin/property');
    revalidatePath('/');
    revalidatePath('/stay');
    revalidatePath('/location');
    // Bump the shared property cache so both the public site and the
    // admin sidebar see the new property name (e.g. when "name" was
    // changed). Without this, the cached property loader would show
    // the old name for up to the cache's TTL window.
    revalidateTag(PUBLIC_PROPERTY_TAG);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not save property' };
  }
}