/**
 * Zod validation schemas shared by server actions and API routes.
 *
 * Money: amounts are accepted as decimal strings and converted to paise (BigInt) on the server.
 */

import { z } from 'zod';

// ---- Common ----

export const cuidSchema = z.string().min(20).max(40);

// A decimal string like "1250.50" — we convert to paise on the server.
// Defence-in-depth:
//  - No leading minus sign (form-level; the service layer also rejects <= 0)
//  - No scientific notation, no Infinity, no NaN — strict digit-only format
//  - No empty / whitespace-only / multi-dot values
//  - Total digit length capped so a malicious caller cannot submit a
//    10,000-digit string that BigInt would happily parse but cost real CPU
//    to process. 13 integer digits covers up to ₹10 trillion (well above
//    MAX_AMOUNT_MINOR = 1e15 paise = ₹10 lakh crore).
const MAX_MONEY_DIGITS = 13;
export const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount with up to 2 decimals')
  .refine(
    (v) => {
      const [int, frac = ''] = v.split('.');
      return int.length + frac.length <= MAX_MONEY_DIGITS;
    },
    { message: 'Amount is too large' },
  );

// ---- Auth ----

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(200),
});

// ---- People / Participants ----

export const participantKindSchema = z.enum(['OWNER', 'INVESTOR', 'STAFF', 'OTHER']);

export const participantCreateSchema = z.object({
  displayName: z.string().min(1).max(120),
  email: z.string().email().toLowerCase().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  kind: participantKindSchema.default('OWNER'),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export const participantUpdateSchema = participantCreateSchema.extend({
  id: cuidSchema,
  isActive: z.boolean().optional(),
});

// ---- Transactions ----

export const splitMethodSchema = z.enum(['EQUAL', 'PERCENTAGE', 'EXACT']);

export const splitInputSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('EQUAL'), participantIds: z.array(cuidSchema).min(1) }),
  z.object({ method: z.literal('PERCENTAGE'), participantIds: z.array(cuidSchema).min(1), percentages: z.array(z.number().min(0).max(100)).min(1) }),
  z.object({ method: z.literal('EXACT'), participantIds: z.array(cuidSchema).min(1), amounts: z.array(z.string().regex(/^\d+$/)).min(1) }),
]);


export const expenseCreateSchema = z.object({
  propertyId: cuidSchema,
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(200),
  amount: moneyString,
  categoryId: cuidSchema.optional().or(z.literal('')),
  paidById: cuidSchema,
  split: splitInputSchema,
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export const incomeCreateSchema = z.object({
  propertyId: cuidSchema,
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(200),
  amount: moneyString,
  categoryId: cuidSchema.optional().or(z.literal('')),
  source: z.string().max(80).optional().or(z.literal('')),
  bookingRef: z.string().max(120).optional().or(z.literal('')),
  receivedById: cuidSchema,
  split: splitInputSchema,
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export const transactionUpdateSchema = z.object({
  id: cuidSchema,
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().min(1).max(200).optional(),
  amount: moneyString.optional(),
  categoryId: cuidSchema.optional().or(z.literal('')),
  paidById: cuidSchema.optional(),
  receivedById: cuidSchema.optional(),
  split: splitInputSchema.optional(),
  notes: z.string().max(2000).optional().or(z.literal('')),
  voidReason: z.string().max(500).optional(),
});

// ---- Settlements ----

export const settlementCreateSchema = z.object({
  propertyId: cuidSchema,
  fromId: cuidSchema,
  toId: cuidSchema,
  amount: moneyString,
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export const settlementUpdateSchema = z.object({
  id: cuidSchema,
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
  notes: z.string().max(1000).optional(),
  paymentRef: z.string().max(120).optional(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ---- Property content ----

export const propertyUpdateSchema = z.object({
  id: cuidSchema,
  name: z.string().min(1).max(120).optional(),
  tagline: z.string().max(200).optional(),
  shortSummary: z.string().max(500).optional(),
  description: z.string().max(20000).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  addressLine: z.string().max(200).optional(),
  postalCode: z.string().max(40).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  beds: z.number().int().min(0).max(100).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  maxGuests: z.number().int().min(0).max(100).optional(),
  airbnbUrl: z.string().url().optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(40).optional().or(z.literal('')),
  whatsappPhone: z.string().max(40).optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['PREPARING', 'COMING_SOON', 'LIVE', 'TEMPORARILY_UNAVAILABLE']).optional(),
});

export const websiteContentUpdateSchema = z.object({
  propertyId: cuidSchema,
  heroEyebrow: z.string().max(120).optional().or(z.literal('')),
  heroTitle: z.string().max(200).optional().or(z.literal('')),
  heroSubtitle: z.string().max(500).optional().or(z.literal('')),
  heroImagePath: z.string().max(500).optional().or(z.literal('')),
  aboutTitle: z.string().max(200).optional().or(z.literal('')),
  aboutBody: z.string().max(20000).optional().or(z.literal('')),
  experienceBody: z.string().max(20000).optional().or(z.literal('')),
  contactBody: z.string().max(20000).optional().or(z.literal('')),
});

export const seoUpdateSchema = z.object({
  propertyId: cuidSchema,
  defaultTitle: z.string().max(200).optional().or(z.literal('')),
  defaultDescription: z.string().max(500).optional().or(z.literal('')),
  defaultOgImagePath: z.string().max(500).optional().or(z.literal('')),
  twitterHandle: z.string().max(60).optional().or(z.literal('')),
});

// ---- Category ----

export const categoryCreateSchema = z.object({
  propertyId: cuidSchema,
  name: z.string().min(1).max(80),
  kind: z.enum(['EXPENSE', 'INCOME']),
  sortOrder: z.number().int().optional(),
});