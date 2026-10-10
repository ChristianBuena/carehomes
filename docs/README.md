# CareHomesSupportDocs.org — Project Overview

CareHomesSupportDocs.org is a nonprofit membership platform that helps licensed
California care facility operators manage, submit, and publish rebuttals to
regulatory citations (CCLD) in a compliant, transparent way. It is not a
government site and is not affiliated with CCLD; nothing on the platform is
legal advice.

This document covers what the application is, the tech stack, and how to set
it up and run it locally. For other documentation see:

- `docs/ARCHITECTURE.md` — data model, multi-seat model, auth/JWT flow, Stripe flow
- `docs/API_ROUTES.md` — every route and server action
- `docs/PERMISSIONS.md` — role and tier matrix
- `docs/TESTING.md` — how to run the test suite and add new tests
- `docs/TEST_REPORT.md` — results of the full system test pass, with bugs found
- `docs/KNOWN_ISSUES.md` — open gaps and anything not covered

## Tech Stack

- **Framework:** Next.js 16 (App Router), Turbopack
- **Database:** PostgreSQL, accessed via Prisma 7 with the `@prisma/adapter-pg` driver adapter
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui + Radix primitives
- **Auth:** Custom JWT (via `jose`) stored in an httpOnly cookie, plus a mandatory email OTP (MFA) step
- **Billing:** Stripe Checkout + Billing Portal + webhooks
- **Email:** Nodemailer (Gmail SMTP)
- **File storage:** UploadThing (member files) + Cloudinary (rebuttal document uploads)
- **PDF:** `pdf-lib` for watermarking published rebuttal documents
- **Forms:** React Hook Form + Zod (used selectively, not universally — see API_ROUTES.md)
- **Language:** TypeScript (strict, no `any` — one pre-existing exception documented in KNOWN_ISSUES.md)
- **Testing:** Vitest (unit/integration) + Playwright (E2E) — added as part of this test pass; see TESTING.md

## Data model at a glance

`Organization` is the billing/quota unit. A `Membership` (Stripe plan/status)
belongs to exactly one `Organization`. Multiple `User`s can belong to the same
`Organization` ("multi-seat") and share its facility quota. A `Facility` has
both a `createdById` (the individual user who physically claimed it — an
audit trail that never changes) and an `organizationId` (which org's quota it
counts against). See `docs/ARCHITECTURE.md` for the full picture, including
where the org-scoping is and isn't consistently applied.

## Local setup

### 1. Prerequisites

- Node.js 22+
- A PostgreSQL 15 server (the repo ships a `docker-compose.yml` with a `db`
  service, or use a native/local Postgres install — either works, nothing in
  the app requires Docker specifically)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.local` (already present for local dev) or create one with:

```
DATABASE_URL="postgresql://user:pass@localhost:5432/carehomes"
JWT_SECRET="any-long-random-string"
EMAIL_USER=...        # Gmail account used by Nodemailer
EMAIL_PASS=...        # Gmail app password
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_PRICE_A=...
STRIPE_PRICE_B=...
STRIPE_PRICE_C=...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Next.js loads `.env.local` then `.env` automatically; variables already set
in the shell environment take priority over both.

### 4. Set up the database

```bash
npx prisma migrate deploy   # applies every migration in prisma/migrations in order
npm run db:seed             # optional: seeds demo users, facilities, and rebuttals
```

**Note on the local `carehomes` database.** During this test pass, the local
dev database used by `.env.local` was found to have never been migrated
through `prisma migrate` (no `_prisma_migrations` table) and was missing
most tables added after 2026-07-24. This has since been fixed — a full
backup was taken, the missing schema was applied via a reviewed, purely
additive `prisma migrate diff` script, and all 15 migrations were marked
applied, with zero data loss (row counts verified unchanged). See
KNOWN_ISSUES.md item 14 for the exact steps, in case the same situation
recurs on another machine.

### 5. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`.

### 6. Run the tests

See `docs/TESTING.md` for the full test database setup. Short version:

```bash
# one-time: create a separate carehomes_test database and apply migrations to it
# (see TESTING.md for exact commands)

npm test          # Vitest unit + integration tests
npm run test:e2e  # Playwright end-to-end tests (spins up a dev server on :3101)
```
