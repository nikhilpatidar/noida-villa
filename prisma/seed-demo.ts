/**
 * Demo / Staging seed.
 *
 * Populates a fictional, realistic property called "The Olive House" in Noida
 * so the application can be presented to owners and stress-tested before the
 * real villa is ready. This seed is fully IDEMPOTENT and is keyed on the
 * deterministic slug `the-olive-house-demo`. Running it twice is a no-op
 * for existing data (upserts by stable keys).
 *
 * REMOVAL: `npm run db:remove-demo` deletes the demo property and all of its
 * dependents (cascade) by slug. It exits safely if the demo is not present.
 *
 * IMPORTANT:
 *   - This demo will be discarded before production. The real property will be
 *     configured in a fresh production deployment, NOT migrated from this seed.
 *   - Demo accounts use passwords from env vars when provided (recommended),
 *     otherwise fall back to a clearly-labelled shared dev password.
 *   - No fabricated ratings, reviews, prices or availability are inserted.
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ------------------------------------------------------------
// Demo identity
// ------------------------------------------------------------
export const DEMO_SLUG = 'the-olive-house-demo';
const DEMO_PROPERTY_NAME = 'The Olive House';
const DEMO_TAGLINE = 'A Private Escape in Noida';

// Picsum.photos serves safely-licensed placeholder photos. Demo only.
const PIC = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

const DEMO_AIRBNB_URL = 'https://www.airbnb.com/rooms/demo-olive-house-placeholder';

// Stable IDs — re-using on each run lets upserts target existing rows.
const ID = {
  admin: 'demo-user-arjun',
  owner1: 'demo-user-rohan',
  owner2: 'demo-user-priya',
  property: 'demo-property-olive-house',
  participant: {
    arjun: 'demo-participant-arjun',
    rohan: 'demo-participant-rohan',
    priya: 'demo-participant-priya',
  },
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function fail(msg: string): never {
  console.error(`\n[seed:demo] REFUSED: ${msg}\n`);
  process.exit(1);
}

function isProd() {
  return process.env.NODE_ENV === 'production';
}

function readAppEnv(): 'development' | 'staging' | 'production' | 'unknown' {
  const v = (process.env.APP_ENV || '').toLowerCase();
  if (v === 'production' || v === 'prod') return 'production';
  if (v === 'staging' || v === 'stage' || v === 'demo') return 'staging';
  if (v === 'development' || v === 'dev') return 'development';
  return 'unknown';
}

/**
 * Hard refusal: the demo seed must NEVER run against a production database.
 *
 * - APP_ENV=production  → refuse immediately.
 * - APP_ENV=staging     → allowed.
 * - APP_ENV=development → allowed.
 * - APP_ENV missing     → refuse. We do not silently allow seeding a database
 *                         whose environment is unknown; the user must set
 *                         APP_ENV explicitly so the deployment is auditable.
 */
function assertNotProduction() {
  const env = readAppEnv();
  if (env === 'production') {
    fail(
      'APP_ENV=production: `npm run db:seed:demo` is staging-only. ' +
      'The demo dataset (The Olive House, demo owners, demo expenses) is for staging/QA ' +
      'and must not be written to a production database. Unset APP_ENV or set it to ' +
      '`staging` or `development` before running this seed.',
    );
  }
  if (env === 'unknown') {
    fail(
      'APP_ENV is not set. Refusing to run the demo seed against an unknown environment. ' +
      'Set APP_ENV to `staging` or `development` explicitly. ' +
      'Use APP_ENV=production only with the production seed (`npm run db:seed`).',
    );
  }
}

async function ensureUser(input: {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
}) {
  const hash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.upsert({
    where: { id: input.id },
    update: {
      email: input.email,
      name: input.name,
      passwordHash: hash,
      isActive: true,
    },
    create: {
      id: input.id,
      email: input.email,
      name: input.name,
      passwordHash: hash,
      isActive: true,
    },
  });
  return user;
}

async function ensureMembership(propertyId: string, userId: string, role: Role) {
  await prisma.propertyMembership.upsert({
    where: { propertyId_userId: { propertyId, userId } },
    update: { isActive: true, role },
    create: { propertyId, userId, role, isActive: true, joinedAt: new Date() },
  });
}

async function ensureParticipant(input: {
  id: string;
  propertyId: string;
  displayName: string;
  email: string;
  userId: string;
  notes?: string;
}) {
  await prisma.participant.upsert({
    where: { id: input.id },
    update: {
      displayName: input.displayName,
      email: input.email,
      userId: input.userId,
      isActive: true,
    },
    create: {
      id: input.id,
      propertyId: input.propertyId,
      displayName: input.displayName,
      email: input.email,
      kind: 'OWNER',
      userId: input.userId,
      isActive: true,
      notes: input.notes,
    },
  });
}

// ------------------------------------------------------------
// Categories
// ------------------------------------------------------------
const EXPENSE_CATEGORIES = [
  'Electricity',
  'Water',
  'Internet',
  'Cleaning',
  'Maintenance',
  'Repairs',
  'Furniture',
  'Appliances',
  'Supplies',
  'Property Tax',
  'Insurance',
  'Airbnb Fees',
  'Marketing',
  'Staff',
  'Utilities',
  'Miscellaneous',
];

const INCOME_CATEGORIES = ['Airbnb', 'Direct Booking', 'Weekend Stay', 'Holiday Stay', 'Other'];

// ------------------------------------------------------------
// Amenities, Gallery, FAQ, House rules, Nearby places, Guide
// ------------------------------------------------------------
const AMENITIES: { group: string; name: string; iconKey: string }[] = [
  { group: 'connectivity', name: 'High-speed Wi-Fi', iconKey: 'wifi' },
  { group: 'connectivity', name: 'Smart TV with streaming', iconKey: 'tv' },
  { group: 'comfort', name: 'Air conditioning', iconKey: 'thermometer' },
  { group: 'comfort', name: 'Hot water 24/7', iconKey: 'droplet' },
  { group: 'comfort', name: 'Fresh linen & towels', iconKey: 'bed' },
  { group: 'comfort', name: 'Comfortable premium beds', iconKey: 'bed-double' },
  { group: 'comfort', name: 'Wardrobe in every bedroom', iconKey: 'shirt' },
  { group: 'comfort', name: 'Blackout curtains', iconKey: 'moon' },
  { group: 'kitchen', name: 'Fully equipped kitchen', iconKey: 'utensils' },
  { group: 'kitchen', name: 'Gas stove & oven', iconKey: 'flame' },
  { group: 'kitchen', name: 'Refrigerator & microwave', iconKey: 'refrigerator' },
  { group: 'kitchen', name: 'Filtered drinking water', iconKey: 'glass-water' },
  { group: 'kitchen', name: 'Coffee maker & kettle', iconKey: 'coffee' },
  { group: 'kitchen', name: 'Cooking basics & utensils', iconKey: 'chef-hat' },
  { group: 'kitchen', name: 'Dining area for 8', iconKey: 'utensils-crossed' },
  { group: 'work', name: 'Dedicated work desk', iconKey: 'laptop' },
  { group: 'work', name: 'Power backup', iconKey: 'battery-charging' },
  { group: 'outdoor', name: 'Private garden', iconKey: 'trees' },
  { group: 'outdoor', name: 'Outdoor seating area', iconKey: 'sofa' },
  { group: 'outdoor', name: 'Rooftop terrace', iconKey: 'sun' },
  { group: 'outdoor', name: 'Private parking', iconKey: 'car' },
  { group: 'laundry', name: 'Washing machine', iconKey: 'washing-machine' },
  { group: 'laundry', name: 'Iron & ironing board', iconKey: 'shirt' },
  { group: 'safety', name: 'Smoke alarms & extinguishers', iconKey: 'shield' },
  { group: 'safety', name: 'First-aid kit', iconKey: 'briefcase-medical' },
  { group: 'safety', name: 'Secure lockbox check-in', iconKey: 'lock' },
];

const GALLERY: { seed: string; altText: string; caption: string; group: string }[] = [
  { seed: 'olive-exterior-dusk', altText: 'Villa exterior at dusk', caption: 'The Olive House at dusk', group: 'Exterior' },
  { seed: 'olive-front-garden', altText: 'Front garden with olive trees', caption: 'The front garden', group: 'Exterior' },
  { seed: 'olive-living-1', altText: 'Living room with sofas', caption: 'Living room', group: 'Living Room' },
  { seed: 'olive-living-tv', altText: 'Living room with smart TV', caption: 'Movie nights', group: 'Living Room' },
  { seed: 'olive-kitchen-1', altText: 'Kitchen counter and stove', caption: 'Fully equipped kitchen', group: 'Kitchen' },
  { seed: 'olive-dining', altText: 'Dining table set for eight', caption: 'Dining area', group: 'Dining' },
  { seed: 'olive-bedroom-master', altText: 'Master bedroom with king bed', caption: 'Master bedroom', group: 'Bedroom' },
  { seed: 'olive-bedroom-2', altText: 'Second bedroom with queen bed', caption: 'Second bedroom', group: 'Bedroom' },
  { seed: 'olive-bedroom-3', altText: 'Third bedroom with twin beds', caption: 'Twin room', group: 'Bedroom' },
  { seed: 'olive-bedroom-4', altText: 'Fourth bedroom', caption: 'Fourth bedroom', group: 'Bedroom' },
  { seed: 'olive-bathroom-1', altText: 'Modern bathroom with shower', caption: 'Bathroom', group: 'Bathroom' },
  { seed: 'olive-terrace-day', altText: 'Terrace during the day', caption: 'Terrace', group: 'Terrace' },
  { seed: 'olive-terrace-night', altText: 'Terrace at night with string lights', caption: 'Evenings on the terrace', group: 'Night' },
  { seed: 'olive-detail', altText: 'Hand-crafted door detail', caption: 'Detail', group: 'Detail' },
  { seed: 'olive-garden-bench', altText: 'Garden bench under trees', caption: 'The garden', group: 'Garden' },
];

const HOUSE_RULES: { title: string; description: string }[] = [
  { title: 'Check-in', description: 'From 3:00 PM. Early check-in subject to availability — please ask in advance.' },
  { title: 'Check-out', description: 'By 11:00 AM. Late check-out subject to availability and may incur an additional charge.' },
  { title: 'Smoking', description: 'No smoking inside the villa. Designated outdoor smoking area available.' },
  { title: 'Guests', description: 'Registered guests only. Maximum occupancy as listed in the listing.' },
  { title: 'Noise', description: 'Quiet hours from 10:00 PM to 7:00 AM. Please be considerate of neighbours.' },
  { title: 'Parties & events', description: 'Parties and large gatherings are not permitted without prior written approval.' },
  { title: 'Pets', description: 'Pets are not permitted at this property.' },
  { title: 'Parking', description: 'One private parking space on-site. Additional vehicles use street parking.' },
  { title: 'ID & verification', description: 'Government-issued ID required for all guests prior to check-in, per platform policy.' },
];

const FAQS: { q: string; a: string }[] = [
  { q: 'How many guests can the villa accommodate?', a: 'The Olive House sleeps up to 8 guests across 4 bedrooms with 5 beds. The configuration includes a master bedroom with a king bed, two queen bedrooms, and a twin bedroom.' },
  { q: 'What are the check-in and check-out times?', a: 'Check-in is from 3:00 PM and check-out is by 11:00 AM. Early check-in and late check-out may be possible subject to availability — please ask in advance.' },
  { q: 'Is parking available on-site?', a: 'Yes — one private parking space is available on the property. Additional vehicles can use street parking nearby.' },
  { q: 'Is Wi-Fi included?', a: 'Yes, high-speed Wi-Fi is available throughout the villa and is included in every stay.' },
  { q: 'Is the kitchen fully equipped?', a: 'Yes. The kitchen includes a gas stove, oven, refrigerator, microwave, kettle, coffee maker, filtered drinking water, cookware, dinnerware, and utensils.' },
  { q: 'Are pets allowed?', a: 'No, pets are not permitted at this property.' },
  { q: 'Is the villa suitable for families with children?', a: 'Yes. The villa is family-friendly with blackout curtains, a private garden, and a dedicated work desk. Children must be supervised on the terrace.' },
  { q: 'How do I book?', a: 'The Olive House is available on Airbnb. Use the "Book on Airbnb" buttons on this site to view live availability and instant booking.' },
  { q: 'Where exactly is the villa located?', a: 'We share the precise address with confirmed guests after booking, to protect the privacy of the home and the neighbourhood. The villa is in Noida with quick access to the rest of Delhi NCR.' },
  { q: 'Is the area well connected?', a: 'Yes. The Noida metro network, cab services and app-based rides make getting around Delhi NCR straightforward.' },
  { q: 'How do I contact the hosts?', a: 'For booking enquiries please use Airbnb messaging. For other enquiries, the contact details on our Contact page work for confirmed guests.' },
  { q: 'Is the villa available for long stays?', a: 'Longer stays are welcome. Reach out via the Contact page for stays beyond what is shown on the listing.' },
];

const NEARBY: { name: string; category: string; description: string }[] = [
  { name: 'Noida Metro — Sector 18', category: 'metro', description: 'Major metro hub with connections across the Delhi NCR network.' },
  { name: 'DLF Mall of India', category: 'shopping', description: 'Large shopping mall with international brands, dining and entertainment.' },
  { name: 'The Great India Place', category: 'shopping', description: 'Mixed-use complex with retail, food court and cinema.' },
  { name: 'Atta Market', category: 'shopping', description: 'Iconic local market known for food, shopping and evening strolls.' },
  { name: 'India Expo Mart', category: 'business', description: 'Major exhibition venue hosting trade shows and conferences.' },
  { name: 'Buddh International Circuit area', category: 'attraction', description: 'Region is connected to Greater Noida attractions via the expressway.' },
  { name: 'Sector 18 market & food street', category: 'restaurant', description: 'A lively stretch of cafes and restaurants popular with locals and visitors.' },
  { name: 'Noida Golf Course', category: 'attraction', description: 'Well-known green space for relaxed walks and golf.' },
  { name: 'Delhi border (Ashram / DND Flyway)', category: 'transit', description: 'Quick access into central Delhi and the airport corridor.' },
];

const GUIDE_ARTICLES: { slug: string; title: string; excerpt: string; body: string; cover?: string }[] = [
  {
    slug: 'things-to-do-in-noida',
    title: 'Things to Do in Noida: A Curated List',
    excerpt: 'From markets and malls to parks and the metro — a balanced guide to spending a weekend in Noida.',
    body:
      `Noida is often experienced as a transit point on the way to Delhi, but it rewards a closer look. The city has its own rhythm: wide tree-lined avenues, well-planned sectors, lively markets and a metro network that ties the NCR together.

This guide pulls together a short, honest list of things worth doing during a stay at The Olive House — from morning walks to late-evening eats. It is not exhaustive; it is the list we would share with friends visiting for the first time.

1. Sector 18 in the evening
Sector 18 is the social heart of Noida. In the evening the streets fill with families and the food stalls light up. It is a good place to feel the city's pace.

2. The metro
Noida's metro is clean, predictable and connects you quickly to Delhi and other NCR hubs. It is also a useful orientation tool — sectors line up neatly along the lines.

3. Malls, if that is your thing
DLF Mall of India and The Great India Place are large and well-run. They are useful when you want a quiet afternoon with food and a cinema.

4. Markets
Atta Market is the obvious choice. It is busy, friendly and inexpensive.

5. Day trips
The expressway puts Agra within reach for an early start, and Delhi is a short metro ride away for museums and old-city walks.

6. Slowing down
If you are staying at the villa, give yourself a full day to do very little. The garden, the terrace and a quiet evening are the whole point.`,
  },
  {
    slug: 'weekend-guide-to-noida',
    title: 'A Weekend Guide to Noida',
    excerpt: 'A two-day plan for visitors who want a balanced mix of city, food and downtime.',
    body:
      `A weekend in Noida is best approached without trying to "see everything". Pick a rhythm and stick to it.

Saturday morning
Start with a relaxed breakfast — the villa kitchen is well-equipped, and a long breakfast on the terrace is the right way to begin.

Saturday afternoon
Pick one of: a mall (DLF Mall of India), a market (Atta Market), or a slow walk around a green sector. Do not try to combine all three.

Saturday evening
Sector 18 for dinner. Pick a place that looks busy — that is the local heuristic. Walk after dinner; the area is well-lit and safe.

Sunday morning
Coffee, a quiet corner of the villa, and time to plan the day rather than rushing into it.

Sunday afternoon
If you want movement: a short metro ride to Delhi for one focused visit — a museum, a market, a single neighbourhood. Do not try to "do Delhi" from Noida in a half-day.

Sunday evening
Back to the villa. Light dinner. Early night. The point of staying here is to not be in a hurry.`,
  },
  {
    slug: 'exploring-delhi-ncr',
    title: 'Exploring Delhi NCR from Noida',
    excerpt: 'How to use Noida as a base for short trips into Delhi, Gurgaon and Agra.',
    body:
      `The single most useful thing to know about Noida is its position relative to the rest of the NCR. The metro, the expressways, and the airport corridor all converge here, which means Noida is a workable base for short trips.

To central Delhi
The metro is the most predictable option. Allow about an hour to Connaught Place from Sector 18. Cabs are faster off-peak and slower at peak.

To Gurgaon
The drive to Gurgaon is straightforward outside peak hours. Allow 90 minutes to two hours depending on traffic.

To Agra
A long day, but doable. Leave early, plan a focused visit to the Taj complex, and be back in Noida by evening.

To the airport
The airport is accessible via the expressway. Allow 90 minutes to be safe.

The villa is in a quiet pocket of the city, which is the second most useful thing to know. After a long day out, returning to a calm residential street rather than a busy main road changes the entire feel of the trip.`,
  },
  {
    slug: 'where-to-stay-in-noida',
    title: 'Where to Stay in Noida',
    excerpt: 'A quick orientation to Noida\'s neighbourhoods for first-time visitors.',
    body:
      `Most visitors to Noida stay for one of three reasons: a wedding, a work trip, or a leisure weekend. The right area depends on which.

For weddings
Most Noida weddings cluster around the larger sectors and a handful of well-known banquet venues. Staying within ten minutes of the venue saves a lot of driving.

For work
If your meetings are in Noida, stay close to the sector you will be working in. Noida's traffic at peak hours is real and underestimated.

For leisure
Look for a quieter residential pocket rather than a sector on a main road. The point of a leisure trip is to slow down. The Olive House is in exactly that kind of pocket — close enough to get anywhere quickly, far enough to feel residential.

Whatever you choose, ask about power backup, water pressure and Wi-Fi reliability. They vary more than listings suggest.`,
  },
  {
    slug: 'food-and-dining-in-noida',
    title: 'Food and Dining in Noida',
    excerpt: 'Where locals eat, what to order, and what is worth driving across the city for.',
    body:
      `Noida's food scene is, like most cities, a mix of neighbourhood institutions and newer openings. The neighbourhood institutions are where to start.

Sector 18
The most concentrated food strip in the city. It is busy in the evening and the food quality is consistent. You will find everything from North Indian thalis to modern cafes to late-night street food.

Atta Market
Smaller than Sector 18 and more local. It is a good place for an unhurried dinner.

Malls
The malls in Noida have a reliable set of chains. Useful when you want a predictable dinner after a long day.

The villa kitchen
A genuinely useful option that many visitors underestimate. The kitchen is fully set up for home cooking, and the wet market and supermarket options in the area are good.

If you are visiting Delhi
Old Delhi is the obvious pilgrimage. Pick one lane, eat slowly, and plan a short visit.`,
  },
  {
    slug: 'first-time-visitors-guide-to-noida',
    title: 'A First-Time Visitor\'s Guide to Noida',
    excerpt: 'Practical orientation for visitors who have never been to the city before.',
    body:
      `If this is your first visit to Noida, here is a short, practical orientation.

Language
Hindi is the primary language. English is widely understood in restaurants, malls, and metros. A few Hindi phrases are appreciated but not required.

Money
UPI is the default payment method almost everywhere — small shops, restaurants, autos, even some parking attendants. Carry a card as a backup.

Getting around
The metro is the backbone. App-based cabs are reliable and inexpensive. Autos are common but the meter situation is uneven.

Time zone
India has a single time zone (IST). It is 5:30 ahead of GMT and does not change for daylight savings.

Weather
Noida has three usable seasons: October to March (cool and pleasant), April to June (hot and dry), and July to September (monsoon). Plan around them.

What to pack
Comfortable walking shoes, layers for cool evenings in winter, sunscreen for summer, and a light rain layer for the monsoon. Modest clothing is appreciated at religious sites if you plan to visit any.

What not to worry about
The tap water is not potable. Bottled or filtered water is widely available. The villa has a filtered drinking-water setup.`,
  },
];

// ------------------------------------------------------------
// Synthetic transactions
// ------------------------------------------------------------
function monthsAgo(n: number, day = 12): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  d.setHours(12, 0, 0, 0);
  return d;
}

const paise = (rupees: number | string): bigint => BigInt(Math.round(Number(rupees) * 100));

interface ExpensePlan {
  description: string;
  amount: number;
  categoryName: string;
  paidBy: 'arjun' | 'rohan' | 'priya';
  split:
    | { method: 'EQUAL'; participantIds: Array<'arjun' | 'rohan' | 'priya'> }
    | { method: 'PERCENTAGE'; participantIds: Array<'arjun' | 'rohan' | 'priya'>; percentages: [number, number, number] }
    | { method: 'EXACT'; participantIds: Array<'arjun' | 'rohan' | 'priya'>; amounts: [number, number, number] };
  notes?: string;
  occurredOn: Date;
}

interface IncomePlan {
  description: string;
  amount: number;
  source: string;
  bookingRef: string;
  receivedBy: 'arjun' | 'rohan' | 'priya';
  split:
    | { method: 'EQUAL' }
    | { method: 'PERCENTAGE'; percentages: [number, number, number] };
  occurredOn: Date;
}

const EXPENSES: ExpensePlan[] = [
  // ---- 6 months ago ----
  { description: 'Monthly electricity bill', amount: 8420, categoryName: 'Electricity', paidBy: 'arjun', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(6, 4) },
  { description: 'Water tanker refill', amount: 2200, categoryName: 'Water', paidBy: 'rohan', split: { method: 'EQUAL', participantIds: ['rohan', 'priya'] }, occurredOn: monthsAgo(6, 7) },
  { description: 'Internet — quarterly', amount: 5997, categoryName: 'Internet', paidBy: 'arjun', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(6, 9) },
  { description: 'Deep clean before first guest', amount: 3500, categoryName: 'Cleaning', paidBy: 'priya', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(6, 14) },
  { description: 'Garden maintenance — pruning & mulching', amount: 4800, categoryName: 'Maintenance', paidBy: 'arjun', split: { method: 'PERCENTAGE', participantIds: ['arjun', 'rohan', 'priya'], percentages: [50, 25, 25] }, occurredOn: monthsAgo(6, 18) },
  { description: 'AC servicing', amount: 2750, categoryName: 'Repairs', paidBy: 'rohan', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(6, 22) },

  // ---- 5 months ago ----
  { description: 'Refurbishment — bedside lamps (×4)', amount: 7200, categoryName: 'Furniture', paidBy: 'priya', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, notes: 'Replaced mismatched lamps with matching set.', occurredOn: monthsAgo(5, 3) },
  { description: 'New kettle and toaster', amount: 4350, categoryName: 'Appliances', paidBy: 'arjun', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(5, 11) },
  { description: 'Welcome supplies — coffee, tea, sugar', amount: 1280, categoryName: 'Supplies', paidBy: 'priya', split: { method: 'EXACT', participantIds: ['arjun', 'rohan', 'priya'], amounts: [400, 440, 440] }, occurredOn: monthsAgo(5, 13) },
  { description: 'Property tax — quarterly advance', amount: 18500, categoryName: 'Property Tax', paidBy: 'arjun', split: { method: 'PERCENTAGE', participantIds: ['arjun', 'rohan', 'priya'], percentages: [40, 30, 30] }, occurredOn: monthsAgo(5, 15) },
  { description: 'Villa insurance — annual', amount: 12400, categoryName: 'Insurance', paidBy: 'rohan', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(5, 20) },

  // ---- 4 months ago ----
  { description: 'Airbnb host service fee', amount: 3120, categoryName: 'Airbnb Fees', paidBy: 'priya', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(4, 2) },
  { description: 'Plumber — kitchen sink', amount: 1450, categoryName: 'Repairs', paidBy: 'rohan', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(4, 6) },
  { description: 'Pest control quarterly', amount: 2200, categoryName: 'Maintenance', paidBy: 'arjun', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(4, 10) },
  { description: 'New linen set', amount: 9800, categoryName: 'Furniture', paidBy: 'priya', split: { method: 'PERCENTAGE', participantIds: ['arjun', 'rohan', 'priya'], percentages: [50, 25, 25] }, occurredOn: monthsAgo(4, 16) },
  { description: 'Cleaning between bookings', amount: 1800, categoryName: 'Cleaning', paidBy: 'rohan', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(4, 24) },
  { description: 'Electricity — higher month (AC)', amount: 11250, categoryName: 'Electricity', paidBy: 'arjun', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(4, 28) },

  // ---- 3 months ago ----
  { description: 'New dishwasher', amount: 32500, categoryName: 'Appliances', paidBy: 'arjun', split: { method: 'PERCENTAGE', participantIds: ['arjun', 'rohan', 'priya'], percentages: [40, 30, 30] }, occurredOn: monthsAgo(3, 4) },
  { description: 'Bathroom fittings refresh', amount: 6750, categoryName: 'Repairs', paidBy: 'rohan', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(3, 9) },
  { description: 'Welcome amenities restock', amount: 2150, categoryName: 'Supplies', paidBy: 'priya', split: { method: 'EXACT', participantIds: ['arjun', 'rohan', 'priya'], amounts: [700, 700, 750] }, occurredOn: monthsAgo(3, 14) },
  { description: 'Wi-Fi router upgrade', amount: 5400, categoryName: 'Internet', paidBy: 'arjun', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(3, 18) },
  { description: 'Instagram ad campaign', amount: 4200, categoryName: 'Marketing', paidBy: 'priya', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(3, 22) },
  { description: 'Cleaning — end-of-month deep', amount: 2400, categoryName: 'Cleaning', paidBy: 'rohan', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(3, 27) },

  // ---- 2 months ago ----
  { description: 'Rooftop terrace — outdoor furniture', amount: 18900, categoryName: 'Furniture', paidBy: 'arjun', split: { method: 'PERCENTAGE', participantIds: ['arjun', 'rohan', 'priya'], percentages: [50, 25, 25] }, notes: 'Two benches, four chairs, side table.', occurredOn: monthsAgo(2, 2) },
  { description: 'Housekeeping supplies', amount: 1480, categoryName: 'Supplies', paidBy: 'priya', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(2, 6) },
  { description: 'Electricity', amount: 9450, categoryName: 'Electricity', paidBy: 'arjun', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(2, 8) },
  { description: 'Property tax — quarterly', amount: 18500, categoryName: 'Property Tax', paidBy: 'arjun', split: { method: 'PERCENTAGE', participantIds: ['arjun', 'rohan', 'priya'], percentages: [40, 30, 30] }, occurredOn: monthsAgo(2, 15) },
  { description: 'Garden lights installation', amount: 4200, categoryName: 'Maintenance', paidBy: 'rohan', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(2, 20) },

  // ---- 1 month ago ----
  { description: 'Mid-stay clean', amount: 1800, categoryName: 'Cleaning', paidBy: 'priya', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(1, 4) },
  { description: 'Water — monthly', amount: 1100, categoryName: 'Water', paidBy: 'rohan', split: { method: 'EQUAL', participantIds: ['rohan', 'priya'] }, occurredOn: monthsAgo(1, 9) },
  { description: 'Washing machine repair', amount: 2350, categoryName: 'Repairs', paidBy: 'arjun', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(1, 14) },
  { description: 'Utilities bundle (small)', amount: 980, categoryName: 'Utilities', paidBy: 'priya', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(1, 19) },
  { description: 'Holiday decor for terrace', amount: 3750, categoryName: 'Miscellaneous', paidBy: 'arjun', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(1, 24) },

  // ---- Edge cases (this month) ----
  { description: 'Tiny replacement bulb', amount: 120, categoryName: 'Supplies', paidBy: 'priya', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, occurredOn: monthsAgo(0, 2) },
  { description: 'Edge: ₹10,001 split three ways', amount: 10001, categoryName: 'Miscellaneous', paidBy: 'arjun', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, notes: 'Tests large-remainder rounding across 3.', occurredOn: monthsAgo(0, 5) },
  { description: 'Edge: ₹1,000 split three ways', amount: 1000, categoryName: 'Miscellaneous', paidBy: 'rohan', split: { method: 'EQUAL', participantIds: ['arjun', 'rohan', 'priya'] }, notes: 'Tests small equal split.', occurredOn: monthsAgo(0, 8) },
  { description: 'Edge: exact split with remainder', amount: 4999.99, categoryName: 'Miscellaneous', paidBy: 'priya', split: { method: 'EXACT', participantIds: ['arjun', 'rohan', 'priya'], amounts: [1500, 1700, 1799.99] }, occurredOn: monthsAgo(0, 11) },
];

const INCOMES: IncomePlan[] = [
  // 6 months ago
  { description: 'Airbnb booking — Sharma family (weekend)', amount: 18500, source: 'Airbnb', bookingRef: 'DEMO-BOOKING-001', receivedBy: 'arjun', split: { method: 'EQUAL' }, occurredOn: monthsAgo(6, 12) },
  { description: 'Direct booking — Patel family', amount: 22000, source: 'Direct Booking', bookingRef: 'DEMO-BOOKING-002', receivedBy: 'rohan', split: { method: 'PERCENTAGE', percentages: [40, 30, 30] }, occurredOn: monthsAgo(6, 25) },

  // 5 months ago
  { description: 'Airbnb booking — couple retreat', amount: 14800, source: 'Airbnb', bookingRef: 'DEMO-BOOKING-003', receivedBy: 'priya', split: { method: 'EQUAL' }, occurredOn: monthsAgo(5, 8) },
  { description: 'Long weekend — friends group', amount: 32000, source: 'Airbnb', bookingRef: 'DEMO-BOOKING-004', receivedBy: 'arjun', split: { method: 'EQUAL' }, occurredOn: monthsAgo(5, 22) },

  // 4 months ago
  { description: 'Diwali week stay', amount: 45000, source: 'Airbnb', bookingRef: 'DEMO-BOOKING-005', receivedBy: 'rohan', split: { method: 'PERCENTAGE', percentages: [40, 30, 30] }, occurredOn: monthsAgo(4, 14) },
  { description: 'Direct booking — wedding guests', amount: 16800, source: 'Direct Booking', bookingRef: 'DEMO-BOOKING-006', receivedBy: 'priya', split: { method: 'EQUAL' }, occurredOn: monthsAgo(4, 26) },

  // 3 months ago
  { description: 'Christmas / New Year week', amount: 52000, source: 'Airbnb', bookingRef: 'DEMO-BOOKING-007', receivedBy: 'arjun', split: { method: 'EQUAL' }, occurredOn: monthsAgo(3, 12) },
  { description: 'Off-peak weekend', amount: 12000, source: 'Direct Booking', bookingRef: 'DEMO-BOOKING-008', receivedBy: 'rohan', split: { method: 'EQUAL' }, occurredOn: monthsAgo(3, 19) },
  { description: 'Corporate relocation stay', amount: 38000, source: 'Direct Booking', bookingRef: 'DEMO-BOOKING-009', receivedBy: 'priya', split: { method: 'PERCENTAGE', percentages: [40, 30, 30] }, occurredOn: monthsAgo(3, 28) },

  // 2 months ago
  { description: 'Holi weekend', amount: 26000, source: 'Airbnb', bookingRef: 'DEMO-BOOKING-010', receivedBy: 'arjun', split: { method: 'EQUAL' }, occurredOn: monthsAgo(2, 9) },
  { description: 'Republic Day stay', amount: 21000, source: 'Airbnb', bookingRef: 'DEMO-BOOKING-011', receivedBy: 'rohan', split: { method: 'EQUAL' }, occurredOn: monthsAgo(2, 22) },

  // 1 month ago
  { description: 'Family reunion week', amount: 34000, source: 'Direct Booking', bookingRef: 'DEMO-BOOKING-012', receivedBy: 'priya', split: { method: 'PERCENTAGE', percentages: [40, 30, 30] }, occurredOn: monthsAgo(1, 6) },
  { description: 'Two-night couple stay', amount: 9500, source: 'Airbnb', bookingRef: 'DEMO-BOOKING-013', receivedBy: 'arjun', split: { method: 'EQUAL' }, occurredOn: monthsAgo(1, 14) },
  { description: 'Long weekend — extended family', amount: 28500, source: 'Airbnb', bookingRef: 'DEMO-BOOKING-014', receivedBy: 'rohan', split: { method: 'EQUAL' }, occurredOn: monthsAgo(1, 21) },

  // This month
  { description: 'Mid-week business stay', amount: 14200, source: 'Direct Booking', bookingRef: 'DEMO-BOOKING-015', receivedBy: 'priya', split: { method: 'EQUAL' }, occurredOn: monthsAgo(0, 3) },
  { description: 'Weekend leisure booking', amount: 19500, source: 'Airbnb', bookingRef: 'DEMO-BOOKING-016', receivedBy: 'arjun', split: { method: 'PERCENTAGE', percentages: [40, 30, 30] }, occurredOn: monthsAgo(0, 9) },
  { description: 'Holiday booking — upcoming', amount: 24500, source: 'Airbnb', bookingRef: 'DEMO-BOOKING-017', receivedBy: 'priya', split: { method: 'EQUAL' }, occurredOn: monthsAgo(0, 13) },
];

// Settlements: pairs of completed transfers that pay down the running balance.
interface SettlementPlan {
  from: 'arjun' | 'rohan' | 'priya';
  to: 'arjun' | 'rohan' | 'priya';
  amount: number;
  occurredOn: Date;
  paymentRef?: string;
  status: 'PENDING' | 'COMPLETED';
}

const SETTLEMENTS: SettlementPlan[] = [
  { from: 'priya', to: 'arjun', amount: 4200, occurredOn: monthsAgo(4, 18), paymentRef: 'UPI-DEMO-001', status: 'COMPLETED' },
  { from: 'rohan', to: 'arjun', amount: 3500, occurredOn: monthsAgo(3, 22), paymentRef: 'UPI-DEMO-002', status: 'COMPLETED' },
  { from: 'priya', to: 'rohan', amount: 1800, occurredOn: monthsAgo(2, 25), paymentRef: 'UPI-DEMO-003', status: 'COMPLETED' },
  { from: 'rohan', to: 'arjun', amount: 2400, occurredOn: monthsAgo(1, 15), paymentRef: 'UPI-DEMO-004', status: 'COMPLETED' },
  // One pending to exercise the PENDING path
  { from: 'priya', to: 'arjun', amount: 1200, occurredOn: monthsAgo(0, 6), paymentRef: undefined, status: 'PENDING' },
];

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
async function main() {
  assertNotProduction();
  console.log(`[seed:demo] starting (APP_ENV=${readAppEnv()})`);

  // ---- Passwords ----
  const pwdAdmin = process.env.DEMO_ADMIN_PASSWORD ?? 'DemoAdmin!2024';
  const pwdOwner = process.env.DEMO_OWNER_PASSWORD ?? 'DemoOwner!2024';
  const pwdOwner2 = process.env.DEMO_OWNER2_PASSWORD ?? pwdOwner;

  if (isProd()) {
    // Production-grade passwords even for the demo.
    if (pwdAdmin.length < 12 || pwdOwner.length < 12 || pwdOwner2.length < 12) {
      fail('Demo passwords must be ≥12 chars in production (use DEMO_ADMIN_PASSWORD / DEMO_OWNER_PASSWORD env vars).');
    }
  }

  // ---- Property ----
  const property = await prisma.property.upsert({
    where: { slug: DEMO_SLUG },
    update: {
      name: DEMO_PROPERTY_NAME,
      tagline: DEMO_TAGLINE,
      shortSummary:
        'A premium four-bedroom private villa in Noida, designed for weekend escapes, family stays and small groups. Built for slow mornings, long dinners and evenings on the terrace.',
      description:
        'The Olive House is a private villa in Noida for families, couples, and small groups visiting Delhi NCR. Four bedrooms, five bathrooms, a fully equipped kitchen and a private garden set the stage for a comfortable stay, while a rooftop terrace is the right place to end the day.\n\nThe villa is offered with full-service turnover cleaning, welcome amenities, secure check-in and a dedicated workspace. Bookings are managed through Airbnb for live availability and instant confirmation.',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      status: 'COMING_SOON',
      bedrooms: 4,
      beds: 5,
      bathrooms: 5,
      maxGuests: 8,
      airbnbUrl: DEMO_AIRBNB_URL,
      contactEmail: 'hello@olive-house-demo.example.com',
      contactPhone: '+91-9000000000',
      whatsappPhone: '+91-9000000000',
      instagramUrl: 'https://instagram.com/olive-house-demo',
    },
    create: {
      id: ID.property,
      slug: DEMO_SLUG,
      name: DEMO_PROPERTY_NAME,
      tagline: DEMO_TAGLINE,
      shortSummary:
        'A premium four-bedroom private villa in Noida, designed for weekend escapes, family stays and small groups. Built for slow mornings, long dinners and evenings on the terrace.',
      description:
        'The Olive House is a private villa in Noida for families, couples, and small groups visiting Delhi NCR. Four bedrooms, five bathrooms, a fully equipped kitchen and a private garden set the stage for a comfortable stay, while a rooftop terrace is the right place to end the day.\n\nThe villa is offered with full-service turnover cleaning, welcome amenities, secure check-in and a dedicated workspace. Bookings are managed through Airbnb for live availability and instant confirmation.',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      status: 'COMING_SOON',
      bedrooms: 4,
      beds: 5,
      bathrooms: 5,
      maxGuests: 8,
      airbnbUrl: DEMO_AIRBNB_URL,
      contactEmail: 'hello@olive-house-demo.example.com',
      contactPhone: '+91-9000000000',
      whatsappPhone: '+91-9000000000',
      instagramUrl: 'https://instagram.com/olive-house-demo',
    },
  });

  // ---- Website content (CMS) ----
  await prisma.websiteContent.upsert({
    where: { propertyId: property.id },
    update: {
      heroEyebrow: 'A Private Escape',
      heroTitle: DEMO_PROPERTY_NAME,
      heroSubtitle: 'A private four-bedroom villa in Noida, built for slow mornings, long dinners and evenings under the terrace lights.',
      heroImagePath: PIC('olive-hero', 1920, 1080),
      aboutTitle: `About ${DEMO_PROPERTY_NAME}`,
      aboutBody:
        'The Olive House is a private four-bedroom villa in a quiet residential pocket of Noida. The layout is designed for groups who want to share a home — not a hotel — with a kitchen that is genuinely usable, a garden that is private, and a terrace that earns its place in the evening.\n\nEach of the four bedrooms is set up for a comfortable stay with blackout curtains, fresh linen and ample storage. Two of the bedrooms have ensuite bathrooms; the remaining two share a large bathroom and a half-bath on the ground floor.\n\nThe villa is professionally cleaned between every booking. Check-in is via secure lockbox. We do not live on-site; we are available through Airbnb messaging throughout every stay.',
      experienceBody:
        'Mornings: coffee on the terrace, the garden in soft light, breakfast cooked in a kitchen that has everything you need.\n\nAfternoons: a work desk if you need it, a quiet reading corner if you don\'t, and the metro within easy reach if you want to step out.\n\nEvenings: dinner around a table set for eight, a glass of something on the rooftop terrace, and a quiet night in a residential pocket of the city.',
      contactBody:
        'For booking enquiries please use the Airbnb link on this site. For other enquiries — events, longer stays, partnerships — reach us through the contact details on this page. We respond within a day.',
    },
    create: {
      propertyId: property.id,
      heroEyebrow: 'A Private Escape',
      heroTitle: DEMO_PROPERTY_NAME,
      heroSubtitle: 'A private four-bedroom villa in Noida, built for slow mornings, long dinners and evenings under the terrace lights.',
      heroImagePath: PIC('olive-hero', 1920, 1080),
      aboutTitle: `About ${DEMO_PROPERTY_NAME}`,
      aboutBody:
        'The Olive House is a private four-bedroom villa in a quiet residential pocket of Noida. The layout is designed for groups who want to share a home — not a hotel — with a kitchen that is genuinely usable, a garden that is private, and a terrace that earns its place in the evening.\n\nEach of the four bedrooms is set up for a comfortable stay with blackout curtains, fresh linen and ample storage. Two of the bedrooms have ensuite bathrooms; the remaining two share a large bathroom and a half-bath on the ground floor.\n\nThe villa is professionally cleaned between every booking. Check-in is via secure lockbox. We do not live on-site; we are available through Airbnb messaging throughout every stay.',
      experienceBody:
        'Mornings: coffee on the terrace, the garden in soft light, breakfast cooked in a kitchen that has everything you need.\n\nAfternoons: a work desk if you need it, a quiet reading corner if you don\'t, and the metro within easy reach if you want to step out.\n\nEvenings: dinner around a table set for eight, a glass of something on the rooftop terrace, and a quiet night in a residential pocket of the city.',
      contactBody:
        'For booking enquiries please use the Airbnb link on this site. For other enquiries — events, longer stays, partnerships — reach us through the contact details on this page. We respond within a day.',
    },
  });

  // ---- SEO ----
  await prisma.seoMetadata.upsert({
    where: { propertyId: property.id },
    update: {
      defaultTitle: `${DEMO_PROPERTY_NAME} — A Private Villa in Noida`,
      defaultDescription:
        'A four-bedroom private villa in Noida for families, couples and small groups visiting Delhi NCR. Sleeps 8. Full kitchen, private garden and rooftop terrace.',
      defaultOgImagePath: PIC('olive-og', 1200, 630),
      twitterHandle: '@olive_house_demo',
    },
    create: {
      propertyId: property.id,
      defaultTitle: `${DEMO_PROPERTY_NAME} — A Private Villa in Noida`,
      defaultDescription:
        'A four-bedroom private villa in Noida for families, couples and small groups visiting Delhi NCR. Sleeps 8. Full kitchen, private garden and rooftop terrace.',
      defaultOgImagePath: PIC('olive-og', 1200, 630),
      twitterHandle: '@olive_house_demo',
    },
  });

  // ---- Categories ----
  const categoryByName = new Map<string, string>();
  for (let i = 0; i < EXPENSE_CATEGORIES.length; i++) {
    const c = await prisma.category.upsert({
      where: { propertyId_name_kind: { propertyId: property.id, name: EXPENSE_CATEGORIES[i], kind: 'EXPENSE' } },
      update: { sortOrder: i, isActive: true },
      create: { propertyId: property.id, name: EXPENSE_CATEGORIES[i], kind: 'EXPENSE', sortOrder: i, isActive: true },
    });
    categoryByName.set(c.name, c.id);
  }
  for (let i = 0; i < INCOME_CATEGORIES.length; i++) {
    const c = await prisma.category.upsert({
      where: { propertyId_name_kind: { propertyId: property.id, name: INCOME_CATEGORIES[i], kind: 'INCOME' } },
      update: { sortOrder: i, isActive: true },
      create: { propertyId: property.id, name: INCOME_CATEGORIES[i], kind: 'INCOME', sortOrder: i, isActive: true },
    });
    categoryByName.set(c.name, c.id);
  }

  // ---- Amenities (idempotent by (propertyId, name)) ----
  // No unique constraint on (propertyId, name) in schema; clean-and-reinsert to keep idempotent.
  await prisma.amenity.deleteMany({ where: { propertyId: property.id } });
  await prisma.amenity.createMany({
    data: AMENITIES.map((a, i) => ({
      propertyId: property.id,
      group: a.group,
      name: a.name,
      iconKey: a.iconKey,
      sortOrder: i,
      isActive: true,
    })),
  });

  // ---- Gallery ----
  await prisma.galleryItem.deleteMany({ where: { propertyId: property.id } });
  await prisma.galleryItem.createMany({
    data: GALLERY.map((g, i) => ({
      propertyId: property.id,
      imagePath: PIC(g.seed, 1600, 1067),
      altText: g.altText,
      caption: g.caption,
      sortOrder: i,
      isActive: true,
      isHero: i === 0,
    })),
  });

  // ---- House rules ----
  await prisma.houseRule.deleteMany({ where: { propertyId: property.id } });
  await prisma.houseRule.createMany({
    data: HOUSE_RULES.map((r, i) => ({
      propertyId: property.id,
      title: r.title,
      description: r.description,
      sortOrder: i,
      isActive: true,
    })),
  });

  // ---- FAQs ----
  await prisma.faq.deleteMany({ where: { propertyId: property.id } });
  await prisma.faq.createMany({
    data: FAQS.map((f, i) => ({
      propertyId: property.id,
      question: f.q,
      answer: f.a,
      sortOrder: i,
      isActive: true,
    })),
  });

  // ---- Nearby places ----
  await prisma.nearbyPlace.deleteMany({ where: { propertyId: property.id } });
  await prisma.nearbyPlace.createMany({
    data: NEARBY.map((n, i) => ({
      propertyId: property.id,
      name: n.name,
      category: n.category,
      description: n.description,
      sortOrder: i,
      isActive: true,
    })),
  });

  // ---- Guide articles (unique on propertyId+slug) ----
  for (const a of GUIDE_ARTICLES) {
    await prisma.guideArticle.upsert({
      where: { propertyId_slug: { propertyId: property.id, slug: a.slug } },
      update: {
        title: a.title,
        excerpt: a.excerpt,
        body: a.body,
        coverImage: a.cover ?? PIC(`olive-cover-${a.slug}`, 1600, 900),
        isPublished: true,
        publishedAt: new Date(),
      },
      create: {
        propertyId: property.id,
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        body: a.body,
        coverImage: a.cover ?? PIC(`olive-cover-${a.slug}`, 1600, 900),
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  // ---- Users + memberships + participants ----
  const arjun = await ensureUser({ id: ID.admin, email: 'arjun.demo@example.com', name: 'Arjun Mehta', role: 'PROPERTY_ADMIN', password: pwdAdmin });
  const rohan = await ensureUser({ id: ID.owner1, email: 'rohan.demo@example.com', name: 'Rohan Kapoor', role: 'OWNER', password: pwdOwner });
  const priya = await ensureUser({ id: ID.owner2, email: 'priya.demo@example.com', name: 'Priya Sharma', role: 'OWNER', password: pwdOwner2 });

  await ensureMembership(property.id, arjun.id, 'PROPERTY_ADMIN');
  await ensureMembership(property.id, rohan.id, 'OWNER');
  await ensureMembership(property.id, priya.id, 'OWNER');

  await ensureParticipant({
    id: ID.participant.arjun,
    propertyId: property.id,
    displayName: 'Arjun Mehta',
    email: 'arjun.demo@example.com',
    userId: arjun.id,
    notes: 'Demo owner 1 (Property Admin).',
  });
  await ensureParticipant({
    id: ID.participant.rohan,
    propertyId: property.id,
    displayName: 'Rohan Kapoor',
    email: 'rohan.demo@example.com',
    userId: rohan.id,
    notes: 'Demo owner 2.',
  });
  await ensureParticipant({
    id: ID.participant.priya,
    propertyId: property.id,
    displayName: 'Priya Sharma',
    email: 'priya.demo@example.com',
    userId: priya.id,
    notes: 'Demo owner 3.',
  });

  // ---- Transactions & settlements (deterministic, idempotent) ----
  // We delete existing demo transactions/settlements and re-insert to keep
  // the dataset deterministic across re-runs without violating any unique
  // constraint we do not control.
  const existingTxns = await prisma.transaction.findMany({ where: { propertyId: property.id }, select: { id: true } });
  if (existingTxns.length > 0) {
    await prisma.expenseSplit.deleteMany({ where: { transactionId: { in: existingTxns.map((t) => t.id) } } });
    await prisma.incomeSplit.deleteMany({ where: { transactionId: { in: existingTxns.map((t) => t.id) } } });
    await prisma.attachment.updateMany({ where: { transactionId: { in: existingTxns.map((t) => t.id) } }, data: { transactionId: null } });
    await prisma.transaction.deleteMany({ where: { propertyId: property.id } });
  }
  await prisma.settlement.deleteMany({ where: { propertyId: property.id } });

  const pid = { arjun: ID.participant.arjun, rohan: ID.participant.rohan, priya: ID.participant.priya };

  for (const e of EXPENSES) {
    const payer = pid[e.paidBy];
    const splits = computeSplitsLocal(paise(e.amount), e.split, pid);
    const categoryId = categoryByName.get(e.categoryName) ?? null;
    await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          propertyId: property.id,
          type: 'EXPENSE',
          status: 'ACTIVE',
          occurredOn: e.occurredOn,
          occurredAt: e.occurredOn,
          description: e.description.slice(0, 200),
          amountMinor: paise(e.amount),
          categoryId,
          paidById: payer,
          splitMethod: e.split.method,
          notes: e.notes ?? null,
          createdById: arjun.id,
          expenseSplits: {
            create: splits.map((s) => ({
              participantId: s.participantId,
              amountMinor: s.amountMinor,
              sharePercentSnapshot: (e.split.method === 'PERCENTAGE' && e.split.participantIds.includes(pidToKey(s.participantId, pid)))
                ? e.split.percentages[e.split.participantIds.indexOf(pidToKey(s.participantId, pid))]
                : null,
              shareExactSnapshot: e.split.method === 'EXACT'
                ? BigInt(Math.round(Number(e.split.amounts[e.split.participantIds.indexOf(pidToKey(s.participantId, pid))]) * 100))
                : null,
            })),
          },
        },
      });
      await tx.auditLog.create({
        data: {
          propertyId: property.id,
          actorId: arjun.id,
          action: 'expense.created',
          entity: 'Transaction',
          entityId: txn.id,
          meta: { amountMinor: paise(e.amount).toString(), paidBy: e.paidBy, demo: true },
        },
      });
    });
  }

  for (const i of INCOMES) {
    const recv = pid[i.receivedBy];
    const splits = computeSplitsLocal(paise(i.amount), i.split, pid);
    const categoryId = categoryByName.get('Airbnb') ?? null;
    await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          propertyId: property.id,
          type: 'INCOME',
          status: 'ACTIVE',
          occurredOn: i.occurredOn,
          occurredAt: i.occurredOn,
          description: i.description.slice(0, 200),
          amountMinor: paise(i.amount),
          categoryId,
          source: i.source,
          bookingRef: i.bookingRef,
          receivedById: recv,
          splitMethod: i.split.method,
          createdById: arjun.id,
          incomeSplits: {
            create: splits.map((s) => ({
              participantId: s.participantId,
              entitledMinor: s.amountMinor,
              receivedMinor: s.amountMinor,
              sharePercentSnapshot: i.split.method === 'PERCENTAGE'
                ? i.split.percentages[['arjun', 'rohan', 'priya'].indexOf(pidToKey(s.participantId, pid))]
                : null,
            })),
          },
        },
      });
      await tx.auditLog.create({
        data: {
          propertyId: property.id,
          actorId: arjun.id,
          action: 'income.created',
          entity: 'Transaction',
          entityId: txn.id,
          meta: { amountMinor: paise(i.amount).toString(), bookingRef: i.bookingRef, demo: true },
        },
      });
    });
  }

  for (const s of SETTLEMENTS) {
    await prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.create({
        data: {
          propertyId: property.id,
          fromId: pid[s.from],
          toId: pid[s.to],
          amountMinor: paise(s.amount),
          occurredOn: s.occurredOn,
          status: s.status,
          completedAt: s.status === 'COMPLETED' ? s.occurredOn : null,
          paymentRef: s.paymentRef ?? null,
          createdById: arjun.id,
          notes: 'Demo settlement.',
        },
      });
      await tx.auditLog.create({
        data: {
          propertyId: property.id,
          actorId: arjun.id,
          action: s.status === 'COMPLETED' ? 'settlement.completed' : 'settlement.created',
          entity: 'Settlement',
          entityId: settlement.id,
          meta: { from: s.from, to: s.to, amountMinor: paise(s.amount).toString(), demo: true },
        },
      });
    });
  }

  // ---- Audit: property setup ----
  await prisma.auditLog.create({
    data: {
      propertyId: property.id,
      actorId: arjun.id,
      action: 'property.demo_seeded',
      entity: 'Property',
      entityId: property.id,
      meta: { demo: true, expenses: EXPENSES.length, incomes: INCOMES.length, settlements: SETTLEMENTS.length },
    },
  });

  console.log('[seed:demo] done');
  console.log(`  Property: ${property.name} (slug: ${property.slug})`);
  console.log(`  Accounts:`);
  console.log(`    admin: arjun.demo@example.com (PROPERTY_ADMIN)`);
  console.log(`    owner: rohan.demo@example.com (OWNER)`);
  console.log(`    owner: priya.demo@example.com (OWNER)`);
  if (!isProd()) {
    console.log(`  Passwords (dev defaults — DO NOT use in production):`);
    console.log(`    admin: ${pwdAdmin}`);
    console.log(`    owner: ${pwdOwner}`);
    console.log(`    owner: ${pwdOwner2}`);
    console.log(`  In production, set DEMO_ADMIN_PASSWORD and DEMO_OWNER_PASSWORD env vars.`);
  } else {
    console.log(`  Passwords: set via DEMO_ADMIN_PASSWORD / DEMO_OWNER_PASSWORD env vars (not echoed).`);
  }
  console.log(`  Data:`);
  console.log(`    expenses: ${EXPENSES.length}`);
  console.log(`    incomes: ${INCOMES.length}`);
  console.log(`    settlements: ${SETTLEMENTS.length}`);
  console.log(`    amenities: ${AMENITIES.length}`);
  console.log(`    gallery: ${GALLERY.length}`);
  console.log(`    faqs: ${FAQS.length}`);
  console.log(`    house rules: ${HOUSE_RULES.length}`);
  console.log(`    nearby places: ${NEARBY.length}`);
  console.log(`    guide articles: ${GUIDE_ARTICLES.length}`);
}

// ------------------------------------------------------------
// Local split helpers (use the project's money utilities' invariants)
// ------------------------------------------------------------
function pidToKey(participantId: string, pid: Record<string, string>): 'arjun' | 'rohan' | 'priya' {
  if (participantId === pid.arjun) return 'arjun';
  if (participantId === pid.rohan) return 'rohan';
  return 'priya';
}

function computeSplitsLocal(
  total: bigint,
  split:
    | { method: 'EQUAL'; participantIds?: Array<'arjun' | 'rohan' | 'priya'> }
    | { method: 'PERCENTAGE'; participantIds?: Array<'arjun' | 'rohan' | 'priya'>; percentages: [number, number, number] }
    | { method: 'EXACT'; participantIds: Array<'arjun' | 'rohan' | 'priya'>; amounts: [number, number, number] },
  pid: Record<string, string>,
): { participantId: string; amountMinor: bigint }[] {
  // For income splits, all three owners always participate unless stated otherwise.
  const ids = (split.participantIds ?? (['arjun', 'rohan', 'priya'] as const)).map((k) => pid[k]);
  if (split.method === 'EQUAL') {
    const n = ids.length;
    const base = total / BigInt(n);
    const rem = total - base * BigInt(n);
    return ids.map((id, i) => ({ participantId: id, amountMinor: base + (i < Number(rem) ? 1n : 0n) }));
  }
  if (split.method === 'PERCENTAGE') {
    const [p1, p2, p3] = split.percentages;
    const sum = p1 + p2 + p3;
    if (sum !== 100) throw new Error(`bad percentages ${sum}`);
    const bps = [p1, p2, p3].map((p) => Math.round(p * 100));
    let allocated = 0n;
    const parts = bps.map((b) => {
      const amt = (total * BigInt(b)) / 10000n;
      allocated += amt;
      return amt;
    });
    let rem = total - allocated;
    let idx = parts.length - 1;
    while (rem !== 0n && idx >= 0) {
      if (rem > 0n) {
        parts[idx] += 1n;
        rem -= 1n;
      } else if (parts[idx] > 0n) {
        parts[idx] -= 1n;
        rem += 1n;
      }
      if (idx === 0) idx = parts.length - 1;
      else idx--;
    }
    return ids.map((id, i) => ({ participantId: id, amountMinor: parts[i] }));
  }
  // EXACT
  const amts = [split.amounts[0], split.amounts[1], split.amounts[2]].map((a) => paise(a));
  const sum = amts.reduce((a, b) => a + b, 0n);
  if (sum !== total) throw new Error(`bad exact split ${sum} vs ${total}`);
  return ids.map((id, i) => ({ participantId: id, amountMinor: amts[i] }));
}

main()
  .catch((e) => {
    console.error('[seed:demo] FAILED', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });