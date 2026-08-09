# Noida Villa — Public Website + Multi-Owner Property Management

A production-quality, full-stack application built for a premium private villa in **Noida, Uttar Pradesh, India**.

It is delivered as **two coordinated products inside one application**:

1. **A premium public website** that ranks well in search, builds trust, and converts visitors into Airbnb bookings.
2. **A private multi-owner dashboard** for income/expense tracking, flexible splits, settlements, reports, audit logs, and CMS for the public site.

The primary booking source is Airbnb; the website does not duplicate the booking engine.

---

## Tech stack

| Layer | Choice |
|------|-------|
| Framework | Next.js 14 (App Router) + TypeScript (strict) |
| Auth | NextAuth (Auth.js v5) — credentials, JWT, bcrypt |
| Database | PostgreSQL via Prisma ORM |
| Validation | Zod |
| UI | Tailwind CSS + Radix primitives + Lucide icons |
| Charts | Recharts |
| Money | BigInt paise (₹1.00 = 100 paise) — no floats |
| Tests | Vitest (42 financial tests) |
| Storage | Local filesystem (`./storage`) for receipts — pluggable |

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env
# Edit .env: set DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_SITE_URL, etc.

# 3. Database
npm run db:push           # or: npm run db:migrate
npm run db:seed

# 4. Dev
npm run dev               # http://localhost:3000
```

Then:

- Public site: <http://localhost:3000>
- Admin login: <http://localhost:3000/admin/login>  (uses `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)

### Production build

```bash
npm run build
npm run start
```

### Verification

```bash
npm run type-check
npm run lint
npm run test
```

---

## Architecture

### Data model (Prisma → Postgres)

Core entities (see `prisma/schema.prisma`):

- `User` — authentication principal
- `PropertyMembership` — links a user to a property with a role
- `Participant` — financial principal (may or may not have a login)
- `Property` — multi-property capable; the public site reads from here
- `Category` — expense / income categories
- `Transaction` — unified expense + income with status, splits, attachments
- `ExpenseSplit`, `IncomeSplit` — per-participant allocation (BigInt paise)
- `Settlement` — Splitwise-style transfers (PENDING / COMPLETED / CANCELLED)
- `Attachment` — receipts (private storage)
- `AuditLog` — every important change
- `WebsiteContent`, `SeoMetadata`, `Faq`, `Amenity`, `GalleryItem`, `NearbyPlace`, `HouseRule` — public-site CMS
- `GuideArticle` — local guide (extendable)
- NextAuth tables: `Account`, `Session`, `VerificationToken`

### Money — INR paise (BigInt)

- All authoritative amounts are `BigInt` paise (₹1.00 = 100).
- `src/lib/money.ts` is the **only** place that parses / formats / splits money.
- `equalSplit`, `percentageSplit`, `exactSplit`, `computeSplits` are tested in `tests/`.
- The "no money lost" invariant is verified across many scenarios — see `tests/balances.test.ts`.

### Financial domain (server-authoritative)

- `src/lib/services/transactions.ts` — atomic expense / income creation
- `src/lib/services/settlements.ts` — settlement validation + suggestion
- `src/lib/services/dashboard.ts` — single aggregated dashboard payload
- `src/lib/finance.ts` — `computeBalances`, `suggestSettlements`, `validateSettlementAmount`

### Auth & authorization

- `src/lib/auth.ts` — NextAuth config (credentials provider, bcrypt, JWT).
- `src/lib/authorization.ts` — `requireMember`, `requireRole`, `hasAtLeast`.
- Every private API surface calls `requireMember(propertyId, role)` to verify:
  1. the user is authenticated
  2. belongs to the property
  3. has the required role
- Frontend authorization is **never** sufficient.

### Roles

- `PROPERTY_ADMIN` — full access, can manage owners, property, website, audit
- `OWNER` — can view shared workspace and create/edit expenses, income, settlements
- (Future: `STAFF`, `ACCOUNTANT`, `INVESTOR`, `READ_ONLY` — schema is ready)

### Public routes

`/`, `/stay`, `/gallery`, `/amenities`, `/location`, `/faq`, `/contact`, `/guide`, `/guide/[slug]`, `/privacy`, `/terms`

### Admin routes (all behind auth)

`/admin`, `/admin/login`, `/admin/transactions`, `/admin/expenses`, `/admin/expenses/new`, `/admin/income`, `/admin/settlements`, `/admin/people`, `/admin/owners`, `/admin/reports`, `/admin/property`, `/admin/website`, `/admin/audit`

---

## SEO

- Semantic HTML, unique titles + meta descriptions per page
- Sitemap (`/sitemap.xml`) and robots (`/robots.txt`) auto-generated
- JSON-LD: `LodgingBusiness`, `WebSite`, `BreadcrumbList`, `FAQPage`
- Canonical URLs on every page
- OG / Twitter metadata
- No fabricated ratings, reviews, prices, distances or amenities
- Local SEO: `Noida`, `Uttar Pradesh`, `India` consistent across the site
- Property status (`PREPARING` / `COMING_SOON` / `LIVE`) drives the homepage hero
- Mobile sticky CTA pointing at Airbnb

---

## Airbnb conversion

- Hero CTA, header CTA, contact CTA, footer CTA, mobile sticky CTA — all point at `NEXT_PUBLIC_AIRBNB_URL`
- `data-track="airbnb-..."` attributes ready for analytics
- We do **not** scrape Airbnb; URL is configurable

---

## Property content configuration

The CMS lives in the database. Set the **initial** values via `.env`:

```env
NEXT_PUBLIC_PROPERTY_NAME="The Noida Villa"
NEXT_PUBLIC_PROPERTY_TAGLINE="A private escape in Noida"
NEXT_PUBLIC_PROPERTY_CITY="Noida"
NEXT_PUBLIC_PROPERTY_STATE="Uttar Pradesh"
NEXT_PUBLIC_PROPERTY_COUNTRY="India"
NEXT_PUBLIC_AIRBNB_URL="https://www.airbnb.com/rooms/XXXXXXXX"
NEXT_PUBLIC_CONTACT_EMAIL="hello@example.com"
NEXT_PUBLIC_CONTACT_PHONE="+91-..."
```

Then log in to `/admin/website` and `/admin/property` to refine content, hero, gallery, FAQs, amenities, SEO defaults.

### How to update the Airbnb URL after launch

Two options:

1. Edit `NEXT_PUBLIC_PROPERTY_NAME` etc. and `NEXT_PUBLIC_AIRBNB_URL` in `.env`, then restart.
2. **Recommended**: open `/admin/property` while signed in as admin — the URL field is editable directly.

---

## Multi-owner workflow

1. Admin signs in (`/admin/login`).
2. Admin goes to `/admin/people` and adds each owner/investor as a **Participant**.
3. Admin invites each owner (or creates their User record) and assigns a role at `/admin/owners`.
4. Each owner signs in independently — they all see the same shared workspace.
5. Anyone can record expenses / income / settlements; only admins can manage property, website, owners, and view the audit log.

---

## Environment variables

See `.env.example`. The required ones are:

- `DATABASE_URL`
- `AUTH_SECRET` (generate via `openssl rand -base64 32`)
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PROPERTY_NAME`
- `NEXT_PUBLIC_AIRBNB_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL`

---

## Storage / receipts

Files uploaded as receipts are written to `STORAGE_ROOT` (`./storage` by default) with a sha256-derived filename. The browser accesses them via an authenticated route that checks property membership.

---

## Deployment

- **Build**: `npm run build`
- **Start**: `npm run start`
- **Migrate**: `npm run db:migrate:deploy`
- **Seed** (once): `npm run db:seed`
- Set all environment variables in your platform (Vercel / Render / Fly / etc.).
- For managed Postgres use the connection string in `DATABASE_URL`.
- For production storage, replace `src/lib/services/storage.ts` with S3/Cloudflare R2 — keep the same interface.

---

## Commands

| Script | Purpose |
|------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run type-check` | tsc strict |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (financial) |
| `npm run db:push` | Push schema (dev) |
| `npm run db:migrate` | Create & apply migration (dev) |
| `npm run db:migrate:deploy` | Apply pending migrations (prod) |
| `npm run db:seed` | Seed admin + property + categories |
| `npm run db:studio` | Open Prisma Studio |

---

## Demo / Staging Environment

A complete fictional property called **The Olive House** in Noida is provided for owner demos, manual QA and bug discovery. The demo data is keyed on the deterministic slug `the-olive-house-demo` and is fully **idempotent** — re-running the seed updates the existing rows instead of duplicating.

> The real villa does not exist yet in the database. The demo will be discarded before production. Do not migrate the demo database into production — instead, run a fresh production deployment and seed real data there.

### Commands

```bash
npm run db:seed:demo       # Idempotent. Safe to re-run.
npm run db:remove-demo     # Removes only the demo property and its dependents.
```

### Demo accounts

| Email | Role | Default dev password |
|---|---|---|
| `arjun.demo@example.com` | `PROPERTY_ADMIN` | `DemoAdmin!2024` |
| `rohan.demo@example.com` | `OWNER` | `DemoOwner!2024` |
| `priya.demo@example.com` | `OWNER` | `DemoOwner!2024` |

Set `DEMO_ADMIN_PASSWORD` and `DEMO_OWNER_PASSWORD` env vars to override the defaults. In production (`NODE_ENV=production`), the seed refuses to run with weak passwords.

### What gets seeded

- One fictional property: 4 bedrooms, 5 beds, 5 bathrooms, 8 guests
- 3 owners with active memberships and matching financial participants
- 25+ expenses across ~6 months, exercising EQUAL, PERCENTAGE and EXACT splits
- 15+ income transactions with fictional booking references (`DEMO-BOOKING-001` … `017`)
- Several settlements (PENDING + COMPLETED)
- 25 amenities, 15 gallery images, 12 FAQs, 9 house rules, 9 nearby places, 6 guide articles
- Full CMS content (hero, about, SEO)

### Subtle "Demo" indicators

- **Public site**: thin "Preview — staging environment" strip at the very bottom of the footer. Visible only when `NEXT_PUBLIC_DEMO=1`.
- **Admin header**: small "Demo Workspace" pill next to the role badge. Visible only when `NEXT_PUBLIC_DEMO=1`.
- The site itself is not covered in giant demo banners — the indicators are intentionally subtle.

### What is fictional (and intentionally so)

- All property data is fictional. Do not use it for production.
- Booking references (`DEMO-BOOKING-001` etc.) are placeholders. They do not correspond to real Airbnb bookings.
- Gallery images use the public `picsum.photos` placeholder service.
- The Airbnb URL is a placeholder (`/rooms/demo-olive-house-placeholder`).
- No fake ratings, reviews, prices or availability are inserted.

### Reset

```bash
npm run db:remove-demo     # safe if demo does not exist
npm run db:seed:demo       # re-create
```

### Future production transition

The demo will be discarded. Production will be a fresh deployment with a fresh database, real property data, real photographs, real owners and a real Airbnb listing.

---

## Environment / Deployment Model

The application is environment-agnostic. There is no `if (production)` branching in the runtime code. The only runtime difference is the *visibility* of the demo indicator, which is controlled entirely by `NEXT_PUBLIC_DEMO=1`.

### Development

Local. Uses a local PostgreSQL (`DATABASE_URL`).

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed                  # creates a default property + first admin
npm run db:seed:demo             # optional: also seed The Olive House demo
npm run dev
```

### Staging / Demo

A deployed instance used for owner presentations and QA. It runs against a **separate staging database** and runs the demo seed.

```bash
# Staging environment
APP_ENV=staging
NEXT_PUBLIC_DEMO=1               # enables demo indicators
DATABASE_URL=<staging-postgres>  # DIFFERENT from production
AUTH_SECRET=<staging-secret>
NEXT_PUBLIC_SITE_URL=https://staging.example.com

# One-time, on the staging database
npm run db:migrate:deploy
npm run db:seed:demo             # idempotent
```

### Production

A *fresh* PostgreSQL with the real property data. **Never** runs the demo seed.

```bash
# Production environment
APP_ENV=production
NEXT_PUBLIC_DEMO=                # blank or unset
DATABASE_URL=<production-postgres>  # DIFFERENT from staging
AUTH_SECRET=<production-secret>      # strong, generated
NEXT_PUBLIC_SITE_URL=https://www.example.com

# Migrations only — never the demo seed
npm run db:migrate:deploy
```

### Future production setup

When the real villa is ready:

1. Create a fresh PostgreSQL database (different from staging).
2. Provision environment variables for the production deployment.
3. Run `npm run db:migrate:deploy` — creates the schema, **no data**.
4. Run `npm run db:seed` — creates the **first admin only** (no property, no demo content). The admin must be configured explicitly via `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` env vars. The seed refuses to run in production with weak passwords.
5. Sign in at `/admin/login`.
6. Use the admin CMS to add:
   - Property details (`/admin/property`)
   - Website content (`/admin/website`)
   - Gallery photographs (`/admin/website`)
   - Amenities, FAQs, house rules (`/admin/website`)
   - The real Airbnb URL (`/admin/property`)
   - SEO metadata (`/admin/website`)
7. Add real owners (`/admin/owners`) and link them to financial participants (`/admin/people`).
8. Verify the public site, then launch.

No application code changes are required.

### Hard rules

- **Never** run `npm run db:seed:demo` or `npm run db:remove-demo` against a production database. Both scripts target a specific demo slug and would corrupt the production schema if accidentally invoked.
- **Never** create generic destructive commands such as `db:reset:production` or `db:remove-property`. Production data must be deliberately hard to delete.
- **Never** carry demo data into production. The demo database is disposable.
- **Never** auto-seed on application startup. Migrations and data seeding are separate steps.
- **Never** hardcode demo identifiers in application code. The separation test suite enforces this.

### Environment variables

| Variable | Purpose | Dev | Staging | Production |
|---|---|---|---|---|
| `DATABASE_URL` | Postgres connection | local | **separate** staging DB | **separate** production DB |
| `AUTH_SECRET` | NextAuth JWT signing | dev fallback | required | required (strong) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL | localhost | staging URL | real URL |
| `APP_ENV` | `development` / `staging` / `production` | unset | `staging` | `production` |
| `NEXT_PUBLIC_DEMO` | Show demo indicators | unset | `1` | unset |
| `STORAGE_ROOT` | Receipt storage path | `./storage` | staging path | production path (or S3) |
| `SEED_ADMIN_EMAIL` | First admin email | `admin@example.com` | staging admin | **real production admin** |
| `SEED_ADMIN_PASSWORD` | First admin password | dev default | staging password | **strong, never committed** |
| `DEMO_ADMIN_PASSWORD` | Demo admin password | dev default | staging only | **never set** |
| `DEMO_OWNER_PASSWORD` | Demo owner password | dev default | staging only | **never set** |

---

## What is intentionally a placeholder

The villa is being prepared. The following fields are **placeholders until you have real data**:

- exact address, latitude / longitude
- bedrooms / beds / bathrooms / max guests
- amenity list
- Airbnb URL
- contact details
- gallery images (replace the design with real photography)
- social media URLs
- FAQ entries

All of these are editable through the admin CMS without code changes.

---

## License

Private & confidential.
