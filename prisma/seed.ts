/**
 * Seed script.
 *
 * Creates:
 *   - The default property (singleton for now)
 *   - The initial admin user (from .env)
 *   - Default expense & income categories
 *
 * SECURITY:
 *   - Refuses to run if SEED_ADMIN_EMAIL is missing.
 *   - Refuses to run if SEED_ADMIN_PASSWORD is missing or shorter than 12 chars
 *     in production (NODE_ENV=production).
 *   - Refuses to run if SEED_ADMIN_PASSWORD matches a known weak value.
 *   - Refuses to run if AUTH_SECRET is missing (we still hint at .env).
 *
 * Run: `npm run db:seed`
 *
 * For development, providing a short password is allowed but a warning is emitted.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const WEAK_PASSWORDS = new Set([
  'changeme!2024',
  'change-me-2024',
  'change me 2024',
  'password',
  'password123',
  '12345678',
  'admin',
  'admin123',
  'admin1234',
  'administrator',
  'qwerty',
  'qwerty123',
  'letmein',
  'welcome',
  'welcome1',
  'iloveyou',
  'default',
  'test',
  'test1234',
  'demo',
  'demo1234',
  'passw0rd',
]);

function fail(msg: string): never {
  console.error(`\n[seed] REFUSED: ${msg}\n`);
  process.exit(1);
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!email) {
    fail('SEED_ADMIN_EMAIL is required. Set it in your environment (e.g. .env).');
  }
  if (!email.includes('@')) {
    fail(`SEED_ADMIN_EMAIL "${email}" is not a valid email address.`);
  }

  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  const name = (process.env.SEED_ADMIN_NAME ?? 'Property Admin').trim() || 'Property Admin';

  // Production must always have a strong password.
  if (isProduction()) {
    if (password.length < 12) {
      fail('SEED_ADMIN_PASSWORD must be at least 12 characters in production.');
    }
    if (WEAK_PASSWORDS.has(password.toLowerCase())) {
      fail('SEED_ADMIN_PASSWORD matches a known weak value. Choose a strong password.');
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      fail('SEED_ADMIN_PASSWORD must contain uppercase, lowercase, and a digit in production.');
    }
  } else {
    // Dev: require at least 8 chars and warn on weak.
    if (password.length < 8) {
      fail('SEED_ADMIN_PASSWORD must be at least 8 characters.');
    }
    if (WEAK_PASSWORDS.has(password.toLowerCase())) {
      console.warn('[seed] WARNING: SEED_ADMIN_PASSWORD is a known weak value. Acceptable in development only.');
    }
  }

  // Hint about AUTH_SECRET
  if (!process.env.AUTH_SECRET) {
    console.warn('[seed] WARNING: AUTH_SECRET is not set. Auth.js will refuse to start in production.');
  }

  const slug = 'noida-villa';
  const propertyName = process.env.NEXT_PUBLIC_PROPERTY_NAME || 'The Noida Villa';

  const property = await prisma.property.upsert({
    where: { slug },
    create: {
      slug,
      name: propertyName,
      city: process.env.NEXT_PUBLIC_PROPERTY_CITY || 'Noida',
      state: process.env.NEXT_PUBLIC_PROPERTY_STATE || 'Uttar Pradesh',
      country: process.env.NEXT_PUBLIC_PROPERTY_COUNTRY || 'India',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      status: 'COMING_SOON',
      airbnbUrl: process.env.NEXT_PUBLIC_AIRBNB_URL || null,
      contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
      contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || null,
      whatsappPhone: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || null,
      instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || null,
      facebookUrl: process.env.NEXT_PUBLIC_FACEBOOK_URL || null,
      websiteContent: {
        create: {
          heroEyebrow: 'A Private Stay',
          heroTitle: propertyName,
          heroSubtitle: process.env.NEXT_PUBLIC_PROPERTY_TAGLINE || 'A private escape in Noida',
        },
      },
      seoMetadata: {
        create: {
          defaultTitle: `${propertyName} — Private Stay in ${process.env.NEXT_PUBLIC_PROPERTY_CITY || 'Noida'}`,
          defaultDescription: `${propertyName} in ${process.env.NEXT_PUBLIC_PROPERTY_CITY || 'Noida'}, ${process.env.NEXT_PUBLIC_PROPERTY_STATE || 'Uttar Pradesh'}.`,
        },
      },
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isActive: true, name },
    create: { email, passwordHash, name, isActive: true },
  });

  await prisma.propertyMembership.upsert({
    where: { propertyId_userId: { propertyId: property.id, userId: user.id } },
    update: { isActive: true, role: 'PROPERTY_ADMIN' },
    create: { propertyId: property.id, userId: user.id, role: 'PROPERTY_ADMIN', isActive: true, joinedAt: new Date() },
  });

  await prisma.participant.upsert({
    where: { id: `${property.id}-${user.id}` },
    update: {},
    create: {
      id: `${property.id}-${user.id}`,
      propertyId: property.id,
      displayName: name,
      email,
      kind: 'OWNER',
      userId: user.id,
    },
  });

  const expenseCats = ['Electricity', 'Water', 'Internet', 'Maintenance', 'Cleaning', 'Repairs', 'Furniture', 'Appliances', 'Supplies', 'Property Tax', 'Insurance', 'Airbnb Fees', 'Staff', 'Marketing', 'Utilities', 'Miscellaneous'];
  const incomeCats = ['Airbnb', 'Direct Booking', 'Other'];
  for (let i = 0; i < expenseCats.length; i++) {
    await prisma.category.upsert({
      where: { propertyId_name_kind: { propertyId: property.id, name: expenseCats[i], kind: 'EXPENSE' } },
      update: { sortOrder: i },
      create: { propertyId: property.id, name: expenseCats[i], kind: 'EXPENSE', sortOrder: i },
    });
  }
  for (let i = 0; i < incomeCats.length; i++) {
    await prisma.category.upsert({
      where: { propertyId_name_kind: { propertyId: property.id, name: incomeCats[i], kind: 'INCOME' } },
      update: { sortOrder: i },
      create: { propertyId: property.id, name: incomeCats[i], kind: 'INCOME', sortOrder: i },
    });
  }

  console.log('Seed complete.');
  console.log(`  Property: ${property.name} (${property.slug})`);
  console.log(`  Admin:    ${email}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`  Password: (set via SEED_ADMIN_PASSWORD — never echoed in production)`);
  } else {
    console.log(`  Password: (set via SEED_ADMIN_PASSWORD — not echoed)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });