'use server';
import { requireMember, AuthorizationError } from '@/lib/authorization';
import { websiteContentUpdateSchema, seoUpdateSchema } from '@/lib/validation';
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/services/audit';
import { revalidatePath } from 'next/cache';

export async function updateWebsiteContentAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = websiteContentUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  try {
    const ctx = await requireMember(parsed.data.propertyId, 'PROPERTY_ADMIN');
    await prisma.$transaction(async (tx) => {
      const data = {
        heroEyebrow: parsed.data.heroEyebrow || null,
        heroTitle: parsed.data.heroTitle || null,
        heroSubtitle: parsed.data.heroSubtitle || null,
        heroImagePath: parsed.data.heroImagePath || null,
        aboutTitle: parsed.data.aboutTitle || null,
        aboutBody: parsed.data.aboutBody || null,
        experienceBody: parsed.data.experienceBody || null,
        contactBody: parsed.data.contactBody || null,
      };
      const upserted = await tx.websiteContent.upsert({
        where: { propertyId: parsed.data.propertyId },
        create: { propertyId: parsed.data.propertyId, ...data },
        update: data,
      });
      await writeAudit(tx, {
        propertyId: parsed.data.propertyId,
        actorId: ctx.userId,
        action: 'website.content.updated',
        entity: 'WebsiteContent',
        entityId: upserted.id,
      });
    });
    revalidatePath('/admin/website');
    revalidatePath('/');
    revalidatePath('/stay');
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not save' };
  }
}

export async function updateSeoAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = seoUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  try {
    const ctx = await requireMember(parsed.data.propertyId, 'PROPERTY_ADMIN');
    await prisma.$transaction(async (tx) => {
      const data = {
        defaultTitle: parsed.data.defaultTitle || null,
        defaultDescription: parsed.data.defaultDescription || null,
        defaultOgImagePath: parsed.data.defaultOgImagePath || null,
        twitterHandle: parsed.data.twitterHandle || null,
      };
      const upserted = await tx.seoMetadata.upsert({
        where: { propertyId: parsed.data.propertyId },
        create: { propertyId: parsed.data.propertyId, ...data },
        update: data,
      });
      await writeAudit(tx, {
        propertyId: parsed.data.propertyId,
        actorId: ctx.userId,
        action: 'seo.updated',
        entity: 'SeoMetadata',
        entityId: upserted.id,
      });
    });
    revalidatePath('/admin/website');
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not save' };
  }
}