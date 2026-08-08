/**
 * Demo removal.
 *
 * Deletes the demo property and all its dependents (cascade via the schema).
 * Refuses to delete anything if the demo property does not exist.
 *
 * Usage: `npm run db:remove-demo`
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_SLUG = 'the-olive-house-demo';

async function main() {
  const property = await prisma.property.findUnique({
    where: { slug: DEMO_SLUG },
    select: { id: true, name: true },
  });
  if (!property) {
    console.log('[remove:demo] no demo property found — nothing to do.');
    return;
  }

  console.log(`[remove:demo] removing ${property.name} (${property.id})`);

  // Cascade rules in schema.prisma handle most dependents, but a few
  // junction-style rows need explicit cleanup.
  await prisma.$transaction(async (tx) => {
    const txns = await tx.transaction.findMany({ where: { propertyId: property.id }, select: { id: true } });
    await tx.expenseSplit.deleteMany({ where: { transactionId: { in: txns.map((t) => t.id) } } });
    await tx.incomeSplit.deleteMany({ where: { transactionId: { in: txns.map((t) => t.id) } } });
    await tx.attachment.updateMany({ where: { transactionId: { in: txns.map((t) => t.id) } }, data: { transactionId: null } });
    await tx.transaction.deleteMany({ where: { propertyId: property.id } });
    await tx.settlement.deleteMany({ where: { propertyId: property.id } });

    await tx.auditLog.deleteMany({ where: { propertyId: property.id } });
    await tx.faq.deleteMany({ where: { propertyId: property.id } });
    await tx.amenity.deleteMany({ where: { propertyId: property.id } });
    await tx.galleryItem.deleteMany({ where: { propertyId: property.id } });
    await tx.nearbyPlace.deleteMany({ where: { propertyId: property.id } });
    await tx.houseRule.deleteMany({ where: { propertyId: property.id } });
    await tx.guideArticle.deleteMany({ where: { propertyId: property.id } });
    await tx.category.deleteMany({ where: { propertyId: property.id } });
    await tx.websiteContent.deleteMany({ where: { propertyId: property.id } });
    await tx.seoMetadata.deleteMany({ where: { propertyId: property.id } });
    await tx.participant.deleteMany({ where: { propertyId: property.id } });
    await tx.propertyMembership.deleteMany({ where: { propertyId: property.id } });

    // The remaining top-level Property row. We deliberately delete by ID so
    // we do not depend on cascade order.
    await tx.property.delete({ where: { id: property.id } });
  });

  // Remove orphaned demo users last (only if no memberships remain anywhere).
  const demoUserIds = ['demo-user-arjun', 'demo-user-rohan', 'demo-user-priya'];
  for (const id of demoUserIds) {
    const stillMember = await prisma.propertyMembership.findFirst({ where: { userId: id } });
    if (!stillMember) {
      const u = await prisma.user.findUnique({ where: { id } });
      if (u) {
        await prisma.user.delete({ where: { id } });
        console.log(`[remove:demo]   removed orphan user ${u.email}`);
      }
    } else {
      console.log(`[remove:demo]   kept user ${id} (still a member of another property)`);
    }
  }

  console.log('[remove:demo] done');
}

main()
  .catch((e) => {
    console.error('[remove:demo] FAILED', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });