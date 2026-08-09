# Implementation Status

> **Persistent checkpoint** — read this first when resuming work.

## Overall status

✅ **Foundation, finance, public site, admin app, SEO, security hardening and tests are complete.**

✅ **Build verified** — `npm run build` succeeds (exit 0); 26 routes generated; type-check passes; ESLint passes.

✅ **Tests** — 50 / 50 Vitest unit tests passing (8 advanced balance tests added in the hardening pass).

⚠️ The application requires `DATABASE_URL` and `npm install` + migrations + seed to run end-to-end. The in-memory rate limiter and on-disk receipt storage are single-instance; see **Remaining TODOs** for production-multi-instance concerns.

## Production hardening summary (Aug 2026 pass)

A deep production-readiness audit was performed across 26 priority areas. Hardening landed in this pass:

### Security
- [x] **Seed admin password policy** — `prisma/seed.ts` refuses to run without `SEED_ADMIN_EMAIL`. In production, `SEED_ADMIN_PASSWORD` must be ≥12 chars and contain upper + lower + digit; rejects a known-weak list (`ChangeMe!2024`, `admin`, `password`, etc.); never echoes the password to stdout in production; warns when `AUTH_SECRET` is unset.
- [x] **AUTH_SECRET enforcement** — `src/lib/auth.ts` throws at startup if `AUTH_SECRET` is missing in production. Dev fallback is clearly labelled insecure.
- [x] **Secure cookies** — `useSecureCookies: true` in production; cookies bound to a single host.
- [x] **Session lifetime** — JWT sessions capped at 8 hours.
- [x] **CSRF / same-origin check** — `src/lib/security.ts` exposes `verifySameOrigin()` and is applied in the login server action (defence-in-depth on top of NextAuth's built-in protection).
- [x] **Rate limiting** — `src/lib/rate-limit.ts` (in-memory, fixed-window, HMR-safe via `globalThis`). Applied to:
  - login: 8 req/min by IP+email
  - financial mutations (expenses, income, settlements, participants): 60 req/min by user+route
  - receipt upload: 30 req/min by user/IP
  - file download: 120 req/min by user/IP
- [x] **IDOR fixes (services)** — `createSettlement`, `updateParticipant`, `deactivateParticipant`, and `voidTransaction` now require an explicit `propertyId` and verify it matches the target row. `createParticipant` now verifies the linked user has an active `PropertyMembership`.
- [x] **Input hardening in transactions service** — `MAX_AMOUNT_MINOR = 1e15` cap; long-string truncation; duplicate `participantId` rejection; category and attachment `propertyId` verification.
- [x] **Path traversal in storage** — `saveReceipt`/`readReceipt` reject `..`, absolute paths, and control characters.

### Financial integrity
- [x] **Settlement validation** — `validateSettlementAmount` rejects amounts that exceed the debtor's outstanding balance with a 1 INR tolerance (already shipped).
- [x] **Pending / cancelled settlements** — correctly excluded from `computeBalances` (verified by new tests).
- [x] **Deactivated participants** — retain their historical share in the balance view (verified).
- [x] **Conservation invariant** — sum of nets is always 0 across any set of transactions (verified).

### Multi-owner
- [x] **Server-side `requireMember(propertyId, role)`** on every admin server action and API route. `OWNER` and `PROPERTY_ADMIN` have explicit role ordering.
- [x] **Soft delete** for participants (`isActive: false`) preserves historical splits and audit history.

### Operational
- [x] **DB indexes added** for `Transaction.voidedById`, `Transaction.[propertyId,createdById]`, `Attachment.[propertyId,uploadedById]`, `Settlement.createdById`, `Settlement.[propertyId,status]`, `Settlement.[propertyId,occurredOn]`.
- [x] **Receipt upload + download** — `POST /api/files/upload` (multipart, auth + membership + rate limit) and `GET /api/files/[id]` (auth + membership, `Cache-Control: private, no-store`). Wired into `ExpenseForm` and `IncomeForm` via `<ReceiptUploader>`.
- [x] **Void transaction action** — `src/app/(admin)/admin/transactions/actions.ts` with rate limit + property verification.
- [x] **Playwright E2E scaffold** — `playwright.config.ts` (chromium, sequential, retries on CI), `tests/e2e/auth.spec.ts` (3 auth tests). Run with `npm run test:e2e`.

### Documentation
- [x] `.env.example` — production guidance for `AUTH_SECRET` (required), `SEED_ADMIN_PASSWORD` (must meet policy), `NODE_ENV`.
- [x] This document updated to reflect the hardening pass.

## Architecture decisions

- **Next.js 14 App Router + TypeScript strict** for both public and admin surfaces (route groups `(public)` and `(admin)`)
- **PostgreSQL + Prisma** — multi-property capable schema, BigInt paise for money
- **NextAuth v5 (credentials)** — JWT sessions, bcrypt, role-aware session, secure cookies in production, 8h lifetime
- **Money in BigInt paise** (1 INR = 100 paise); `src/lib/money.ts` is the only formatter / parser / splitter
- **Server-authoritative finance** — `src/lib/services/*` and `src/lib/finance.ts`; never balances in views
- **API efficiency** — single aggregated `/admin` dashboard call (`loadDashboard`)
- **No fabricated data** — placeholders + env + CMS

## Completed phases

- [x] **Phase 1 — Discovery** (empty repo, chose stack)
- [x] **Phase 2 — Architecture** (data model, auth, money, API, SEO)
- [x] **Phase 3 — Foundation** (Prisma, NextAuth, design system, layout)
- [x] **Phase 4 — Public website** (home, stay, gallery, amenities, location, faq, contact, guide, privacy, terms)
- [x] **Phase 5 — Admin** (dashboard, transactions, expenses, income, settlements, people, owners, reports, property CMS, SEO CMS, audit)
- [x] **Phase 6 — Financial engine** (money utils, splits, balances, settlements, suggestions)
- [x] **Phase 7 — SEO** (sitemap, robots, JSON-LD, canonical, OG/Twitter)
- [x] **Phase 8 — Performance** (RSC, ISR for content pages, lazy lightbox, `next/font` swap, responsive images)
- [x] **Phase 9 — Security** (server-side authz, helmet-like headers, input validation, path traversal guard on storage, password hashing)
- [x] **Phase 10 — Testing** (50 tests, vitest)
- [x] **Phase 11 — Production hardening** (seed policy, AUTH_SECRET enforcement, CSRF, rate limiting, IDOR fixes, receipt routes, E2E scaffold, DB indexes, additional balance tests)
- [x] **Phase 12 — Build verification** (`npm run build` succeeds; type-check passes; lint passes)
- [x] **Phase 13 — Demo / Staging environment** (idempotent `prisma/seed-demo.ts` + `prisma/remove-demo.ts`, npm scripts, subtle UI indicators, docs)
- [x] **Phase 14 — Environment / deployment separation** (demo indicator env-gated on `NEXT_PUBLIC_DEMO`, `isDemoDeployment`/`appEnv` helper, neutral siteConfig defaults, Footer accepts DB-driven props, separation test suite, env/deployment model docs)

## Files created / changed in the hardening pass

```
prisma/schema.prisma                  + indexes on Transaction.voidedById,
                                        Transaction.[propertyId,createdById],
                                        Attachment.[propertyId,uploadedById],
                                        Settlement.createdById,
                                        Settlement.[propertyId,status],
                                        Settlement.[propertyId,occurredOn]
prisma/seed.ts                        production-only strong password policy,
                                        no password echo, AUTH_SECRET warning
src/lib/auth.ts                       AUTH_SECRET required in prod,
                                        useSecureCookies, 8h session
src/lib/authorization.ts              role ordering helpers
src/lib/rate-limit.ts                 NEW in-memory fixed-window limiter
src/lib/security.ts                   NEW verifySameOrigin helper
src/lib/services/transactions.ts      MAX_AMOUNT_MINOR, participant
                                        uniqueness, void requires propertyId
src/lib/services/settlements.ts       fromId/toId must belong to property
src/lib/services/participants.ts      update/deactivate require propertyId;
                                        create verifies user membership
src/app/(admin)/admin/login/actions.ts CSRF origin check, rate limit,
                                        generic error
src/app/(admin)/admin/expenses/actions.ts   rate limit
src/app/(admin)/admin/income/actions.ts     rate limit
src/app/(admin)/admin/settlements/actions.ts rate limit
src/app/(admin)/admin/people/actions.ts     rate limit
src/app/(admin)/admin/transactions/actions.ts NEW void action
src/app/api/files/upload/route.ts     NEW (POST)
src/app/api/files/[id]/route.ts       NEW (GET, private, no-store)
src/components/admin/ReceiptUploader.tsx    NEW client component
src/app/(admin)/admin/expenses/ExpenseForm.tsx wired to uploader
src/app/(admin)/admin/income/IncomeForm.tsx   wired to uploader
tests/balances-advanced.test.ts       NEW (8 tests)
tests/e2e/auth.spec.ts                NEW (3 tests)
playwright.config.ts                  NEW
.env.example                          production guidance
docs/IMPLEMENTATION_STATUS.md         this file (updated)
```

## Verification

- **Vitest**: **92 / 92 passing** (`npm run test`)
  - 42 separation tests (Phase 14): isolated demo seed/remove, no demo identifiers in app code, env-gated indicators, neutral siteConfig defaults, no destructive generic commands, empty-DB behaviour
  - 8 advanced balance scenarios (settlement accounting, multi-payer, deactivated-participant history, validation tolerance, suggestion optimality)
  - 42 baseline tests (splits, INR formatting, money edge cases, baseline balances)
- **TypeScript strict**: passes (`npm run type-check`)
- **ESLint**: passes, no warnings (`npm run lint`)
- **Next build**: ✅ passes (`npm run build`)
  - 26 routes generated, all dynamic (DB-dependent)
  - Largest admin route: `/admin` 101 kB / 215 kB First Load JS
  - Largest public route: `/gallery` 1.24 kB / 108 kB First Load JS
  - Shared chunk budget: 87.4 kB

## Required env

See `.env.example`. Required:

- `DATABASE_URL`
- `AUTH_SECRET` — **required in production** (auth will refuse to start without it)
- `NEXT_PUBLIC_SITE_URL`

Recommended:

- `NEXT_PUBLIC_PROPERTY_NAME`, `NEXT_PUBLIC_AIRBNB_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — **production seed will refuse to run if the password is <12 chars, lacks upper/lower/digit, or matches a known-weak value**

## Setup checklist (resume path)

```bash
npm install
cp .env.example .env  # fill in DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_SITE_URL
npm run db:push       # dev; or db:migrate:deploy for prod
npm run db:seed       # creates admin + property + categories
npm run dev
```

Default admin (from seed):
- email: `SEED_ADMIN_EMAIL` (default `admin@example.com`)
- password: in production **you must supply** `SEED_ADMIN_PASSWORD` meeting the policy; otherwise the seed aborts

## Production blockers vs recommended vs optional

### 🚨 Blockers before real production traffic

None remaining for the in-scope feature set. The application is functional and the security baseline is in place. The items below are **strongly recommended** before exposing to paying guests, but they are not strictly blockers for an internal pilot.

### ✅ Recommended before opening to the public

- **Switch to a distributed rate-limit store** — the current `src/lib/rate-limit.ts` is per-process. Behind a load balancer with N replicas, each replica has its own counter; effective limit ≈ N × limit. Replace with Redis (or Upstash) for true global limits.
- **Move receipt storage off the local filesystem** — `STORAGE_ROOT` defaults to `./storage`. For multi-instance or ephemeral deployments, use the S3-compatible adapter (a stub is in `src/lib/services/storage.ts`); production deployments should set `STORAGE_DRIVER=s3` and supply `S3_*` env.
- **Set up DB backups** — schema and data are now backing financial records. Configure `pg_dump` (or a managed backup) on at least a daily schedule with off-host retention. Restore procedure must be tested at least once.
- **Run `npm audit --production` and apply advisories** — re-check at every deploy.
- **Provision error monitoring** (e.g., Sentry) with `release` tags — the audit log covers financial events but not arbitrary server errors.
- **Enable TLS termination** at the proxy (Caddy / nginx / managed PaaS); HSTS is already emitted by Next.js defaults.

### 🟢 Optional / deferred features

- Inline edit of transactions (currently create + void only)
- Owner invitation flow (email magic link) — schema is ready; needs an email provider
- Public reviews section (waiting for real reviews)
- Realtime updates (websocket / SSE) — currently all views are RSC revalidate-on-action
- Multi-property picker / switcher in the UI (schema already supports multiple)
- Vacation rental schema.org enrichment when more data is available
- Full E2E coverage expansion (Playwright scaffold is in place; auth.spec.ts is the seed)
- Webhook-driven Airbnb import (the canonical Airbnb URL is editable via CMS today)

## How to update the Airbnb URL

Either:

1. Edit `NEXT_PUBLIC_AIRBNB_URL` in `.env` and restart, or
2. Log in as admin and edit the property field at `/admin/property`.

## Where to update property content

- Hero copy & image: `/admin/website`
- Address, capacity, amenities, gallery, house rules: `/admin/property`
- SEO defaults: `/admin/website` → SEO card
- Local guide: backend-only currently; the page is rendered from `GuideArticle` rows

## Known limitations

- The seed creates a single property. Multi-property is fully supported by the schema but the UI is single-property.
- Receipt storage is on the local filesystem by default; S3 adapter slot is ready but not yet shipped.
- Reviews and pricing are intentionally absent until real data exists.
- The in-memory rate limiter is per-process; see "Recommended" above for the production migration.

## Demo / Staging environment

**Status:** ✅ Ready.

A fictional property **The Olive House** in Noida is provided for owner demos, manual QA and bug discovery. It is fully idempotent and easy to reset.

| Script | Purpose |
|---|---|
| `npm run db:seed:demo` | Populate / refresh the demo property. Idempotent. |
| `npm run db:remove-demo` | Remove only the demo property and its dependents. Safe if not present. |

### Demo accounts

| Email | Role |
|---|---|
| `arjun.demo@example.com` | `PROPERTY_ADMIN` |
| `rohan.demo@example.com` | `OWNER` |
| `priya.demo@example.com` | `OWNER` |

Default dev passwords (`DemoAdmin!2024`, `DemoOwner!2024`) are printed by the seed in dev mode. In production, override via `DEMO_ADMIN_PASSWORD` / `DEMO_OWNER_PASSWORD`.

### Demo data shape

- 1 property (4 BR / 5 beds / 5 bath / 8 guests)
- 3 owners → 3 participants, all linked via `PropertyMembership`
- 39 expenses across 6 months, exercising EQUAL, PERCENTAGE and EXACT splits and all 3 owners as payers
- 17 income transactions with fictional `DEMO-BOOKING-NNN` references
- 5 settlements (4 completed + 1 pending)
- 25 amenities, 15 gallery items, 12 FAQs, 9 house rules, 9 nearby places, 6 guide articles
- Full CMS content (hero, about, SEO), realistic copy

### Subtle indicators

- Public footer: thin "Preview — staging environment" strip (only when `NEXT_PUBLIC_DEMO=1`).
- Admin header: tiny "Demo Workspace" pill next to the role badge.
- No big demo banners.

### What is fictional

All of it. The demo is a fictional property; the real villa will be configured in a fresh production deployment. Do not migrate the demo database into production.

## Environment / deployment separation

**Status:** ✅ Verified.

The application code contains zero hardcoded references to demo identifiers (Olive House, demo owner emails, demo Airbnb URL, demo booking refs). The separation test suite (`tests/separation.test.ts`, 42 tests) enforces this and verifies that:

- The demo seed is keyed on the demo slug `the-olive-house-demo` and uses deterministic IDs.
- The demo removal matches only that slug and is a safe no-op if absent.
- The demo indicator on both public and admin surfaces is gated on `NEXT_PUBLIC_DEMO=1` only.
- `siteConfig` defaults are empty / generic so an unconfigured production deployment does not display any specific property name.
- `package.json` exposes no destructive generic commands (`db:reset:production`, `db:remove-property`).
- The generic seed `prisma/seed.ts` is distinct from the demo seed `prisma/seed-demo.ts`.
- The homepage degrades gracefully when no property exists.

### Environment model

| Variable | Dev | Staging | Production |
|---|---|---|---|
| `DATABASE_URL` | local | **separate** staging DB | **separate** production DB |
| `APP_ENV` | unset | `staging` | `production` |
| `NEXT_PUBLIC_DEMO` | unset | `1` | unset |
| `SEED_ADMIN_PASSWORD` | dev default | strong staging pwd | **strong production pwd** |
| `DEMO_ADMIN_PASSWORD` | dev default | staging only | never set |
| `DEMO_OWNER_PASSWORD` | dev default | staging only | never set |

### Future production setup (recommended workflow)

1. Create fresh PostgreSQL database (separate from staging).
2. Set production environment variables (`AUTH_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `APP_ENV=production`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`).
3. `npm run db:migrate:deploy` (schema only, no data).
4. `npm run db:seed` (creates the first admin; the seed refuses weak passwords in production).
5. Sign in at `/admin/login`.
6. Configure property + content + owners + Airbnb URL + SEO via the admin CMS.
7. Launch.

No application code changes required.
