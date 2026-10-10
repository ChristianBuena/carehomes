# Testing

No test framework existed in this repository before the first test pass,
which added **Vitest** (unit + integration) and **Playwright** (E2E).

History: the first pass wrote tests that pinned the behaviour it found,
bugs included, and changed no application code. The second pass (2026-10-10)
fixed those bugs and turned each "confirms bug" test into a "FIXED" test.
Round 3 closed the remaining open items and added tests for the areas the
first pass skipped. Test names containing "FIXED" describe behaviour that
used to be wrong.

## What was installed

```
devDependencies added:
  vitest, vite-tsconfig-paths, dotenv-cli   (unit/integration)
  @playwright/test                           (E2E; chromium browser downloaded via `npx playwright install chromium`)

package.json scripts added:
  "test":          dotenv -e .env.test -- vitest run
  "test:watch":    dotenv -e .env.test -- vitest
  "test:e2e":      dotenv -e .env.test -- playwright test
  "test:e2e:prod": dotenv -e .env.test -- playwright test --config playwright.prod.config.ts
  "test:db:migrate": dotenv -e .env.test -- prisma migrate deploy
```

New files: `vitest.config.ts`, `playwright.config.ts`,
`playwright.prod.config.ts`, `.env.test` (gitignored — `.env*` was already in
`.gitignore`), everything under `tests/`.

## Test database — do this once

Tests must never run against the real `carehomes` database. A separate
`carehomes_test` database was created on the same local Postgres instance:

```bash
# 1. Create the test database (only needs to be done once)
PGPASSWORD=<your-postgres-password> psql -h localhost -U postgres -c "CREATE DATABASE carehomes_test;"

# 2. Point .env.test at it and apply every migration
#    (.env.test already exists in this repo with DATABASE_URL pointing at
#    carehomes_test, a dedicated test-only JWT_SECRET, and dummy Stripe/email
#    values — those services are mocked, see below)
npm run test:db:migrate
```

`tests/setup.ts` hard-fails immediately if `DATABASE_URL` does not contain
`carehomes_test`, specifically so a misconfigured `.env.test` can never
accidentally point tests at a real database.

New migrations are applied to the test database with the same
`npm run test:db:migrate` (`prisma migrate deploy`). Never run
`prisma migrate dev` against it or any other database from this workflow.
Three migrations written during the fix passes have been applied to
`carehomes_test` only and still need `npx prisma migrate deploy` on the dev
and production databases: `20261010120000_add_processed_stripe_event`,
`20261010130000_add_login_lockout`, `20261010140000_add_login_attempt`.

Every Vitest integration test calls `resetDb()` in `beforeEach`, which
`TRUNCATE ... RESTART IDENTITY CASCADE`s every application table. A new
model must be added to that list in `tests/helpers/db.ts`. Tests run
with `fileParallelism: false` (one file at a time) because they share one
physical database and would otherwise stomp on each other's fixtures.

## Mocking — no real third-party network calls

- **Email** (`@/lib/mailer`'s `sendEmail`): `vi.mock("@/lib/mailer", ...)` in
  every test file that would otherwise trigger a real Gmail SMTP send
  (signup/login/moderation/webhook tests). OTP *generation and verification
  logic* is still exercised for real against the test database — only the
  actual email transport is mocked.
- **Stripe**: `src/lib/stripe.ts`'s exported client is partially mocked —
  `checkout.sessions.create`, `billingPortal.sessions.create`, and
  `subscriptions.retrieve` are `vi.fn()`s (these would be real network
  calls), but `webhooks.constructEvent` is the REAL Stripe SDK signature
  verifier (pure local HMAC against `STRIPE_WEBHOOK_SECRET` from
  `.env.test` — no network involved), so the signature-verification tests
  are testing the real cryptographic logic, not a mock of it.
- **Cloudinary**: not mocked, but also never invoked — the rebuttal-action
  tests never attach a `document` file, so the `file.size > 0` branch that
  would call Cloudinary never executes.
- **UploadThing**: `uploadthing/server`'s `UTApi` is replaced by a class
  whose `deleteFiles` is a `vi.fn()` wherever `DELETE /api/files` is called.
  The upload router's `middleware` and `onUploadComplete` callbacks are
  invoked directly; no request reaches UploadThing.
- **`fetch`** (used by `POST /api/rebuttal/watermark` to download the
  original document) is replaced with `vi.spyOn(globalThis, "fetch")` and
  returns an in-memory PDF built with `pdf-lib` (`tests/helpers/pdf.ts`). In
  `watermark.test.ts` any un-mocked `fetch` call rejects.

## Why some tests mock `@/lib/auth` or `next/headers`, and some don't

- Most **API routes** (`src/app/api/**/route.ts`) read the session cookie
  directly off the `NextRequest` (`req.cookies.get("auth-token")`). These are
  tested by constructing a real `NextRequest` with that cookie set — see
  `tests/helpers/http.ts`'s `buildRequest()`/`authCookie()`.
- Some routes (checkout, portal, membership/update, the Stripe webhook's
  `headers()` call) and all **server actions** (`claimFacility`,
  `linkSeatToOrg`, `submitRebuttal`, `updateRebuttal`) read via
  `cookies()`/`headers()` from `next/headers`, which only works inside
  Next's own request-scoped `AsyncLocalStorage` — calling the exported
  function directly from a test has no such scope and throws. Two ways this
  is handled here, both exercising the REAL function body, not a
  reimplementation of it:
  1. `tests/setup.ts` registers a global `vi.mock("next/headers", ...)`
     backed by `tests/helpers/nextRequestContext.ts`, and `buildRequest()`
     mirrors whatever cookies/headers you pass it into that mock context.
     Used for routes.
  2. For server actions, `vi.mock("@/lib/auth", ...)` replaces
     `getUserFromRequest()` with a `vi.fn()` the test controls directly
     (see `tests/integration/claim-action.test.ts` /
     `rebuttal-action.test.ts`) — simpler, and the standard pattern for
     testing Next Server Actions outside the framework runtime.

  Mocking `@/lib/auth` bypasses the database lookup of the user's current
  organization, so those files cannot test stale-session behaviour.
  `tests/integration/stale-org.test.ts` deliberately does **not** mock it: it
  sets the cookie with `setRequestCookies()` and calls the real
  `getUserFromRequest()`.

## Client IP in tests

`POST /api/auth/login` throttles per (email, client IP). A request built
without an `x-forwarded-for` header lands in the shared `"unknown"` bucket,
which is what the older lockout tests rely on. To act as a specific address,
pass `headers: { "x-forwarded-for": "203.0.113.50" }` to `buildRequest()`.

## Folder structure

```
tests/
├── setup.ts                 global Vitest setup: loads .env.test, guards the DB,
│                             registers the next/headers mock
├── helpers/
│   ├── db.ts                 testDb (real Prisma client), resetDb(), factories
│   │                          (createOrg, createUser, createMembership, createFacility,
│   │                           createRebuttal, createMemberFile, createShareLink,
│   │                           createTemplate, createOrgWithUser)
│   ├── http.ts               buildRequest() / authCookie() — build a real NextRequest
│   │                          with cookies, and sign a real session JWT for a fixture user
│   ├── nextRequestContext.ts backing store for the next/headers mock
│   └── pdf.ts                builds test PDFs with pdf-lib and reads back the text drawn on each page
├── unit/
│   ├── permissions.test.ts   hasPermission() full role x permission matrix, canClaimFacility() boundaries,
│   │                          tier-limit single source of truth
│   ├── jwt.test.ts           sign/verify, tamper, expiry, mfa-pending token semantics
│   └── prisma-query-shape.test.ts  static check of every Prisma call in src/ against the schema
├── integration/               real route handlers + server actions, real Postgres (carehomes_test)
│   ├── auth.test.ts           signup, login, full MFA flow (valid/wrong/expired/reused/max-attempts), /me, logout
│   ├── facility-limits.test.ts tier boundaries via the API route, org quota sharing/isolation, concurrency
│   ├── claim-action.test.ts   claimFacility() and linkSeatToOrg() server actions (real code, @/lib/auth mocked)
│   ├── rebuttals.test.ts      /api/rebuttal, /api/rebuttal/[id], moderation flow + role gating, soft delete
│   ├── rebuttal-action.test.ts submitRebuttal()/updateRebuttal(): ownership, returned (never thrown) errors
│   ├── billing.test.ts        checkout/portal metadata, webhook signature + events + idempotency, membership/update
│   ├── admin.test.ts          access-review, archive-moderation-logs
│   ├── security.test.ts       injection strings, long/empty/unicode input, IDOR, login lockout per (email, IP)
│   ├── stale-org.test.ts      a user moved between orgs: the old session follows the database (real @/lib/auth)
│   ├── route-smoke.test.ts    every API route's happy path; fails if a route has no case
│   ├── files.test.ts          member files and share links: roles, private-to-uploader, IDOR, expiry, revocation
│   ├── uploadthing.test.ts    upload authorization + completion callbacks (called directly), filenames, limits config
│   ├── templates.test.ts      template library access by tier/status/role, content leakage, admin management
│   └── watermark.test.ts      watermark content, who can generate/request, corrupt input, large files
└── e2e/
    ├── fixtures.ts            seeds the test DB via a tsx subprocess (see below), injects a signed session cookie
    ├── db-cli.ts               the tsx subprocess entry point
    ├── claim-button.spec.ts   real browser rendering of every ClaimFacilityButton state, org-scoped dashboards
    ├── action-errors.spec.ts  server-action errors are readable in the forms (also run against a production build)
    └── share-page.spec.ts     the public /share/[token] page: valid, revoked, expired, unknown
```

### Tests marked as expected failures

A test whose name starts with `FAILS [Low|Medium|High]` asserts the
**expected** behaviour for a defect that has been reported but not fixed. It
is marked `it.fails` (Vitest) or `test.fail()` (Playwright), so it counts as
passing while the defect exists and the suite stays green. When the defect is
fixed the test fails as an "unexpected pass": remove the marker and the
`FAILS […]:` prefix. Every such test is listed in TEST_REPORT.md. Vitest's
summary shows them as "expected fail".

### Why E2E seeding shells out to a subprocess

Playwright's own TypeScript transform can't load the generated Prisma client
(`src/generated/prisma/client.ts` uses `import.meta`, which needs real ESM —
Vitest/Vite handles this fine via its own transform, Playwright's lighter one
does not). `tests/e2e/fixtures.ts` therefore spawns `npx tsx
tests/e2e/db-cli.ts` as a subprocess per fixture call, which runs under
`tsx`'s real ESM loader and talks to `carehomes_test` directly. This is
slower than an in-process call (~1-2s per fixture) but keeps E2E specs
simple and avoids fighting Playwright's bundler.

### Why E2E doesn't drive the real login form

Logging in through the actual UI needs the real OTP, which needs real email
(forbidden) or scraping the DB mid-flow. Since
`tests/integration/auth.test.ts` already exhaustively covers the login+MFA
flow (with mocked email) at the route level, E2E specs instead seed fixtures
directly and inject a validly-signed `auth-token` cookie
(`tests/e2e/fixtures.ts`'s `loginAs()`) — this still exercises the real page
component, real middleware, and real Prisma-backed render logic; only the
login *form* itself is skipped, and that gap is covered elsewhere.

## Running the tests

```bash
npm test            # Vitest: all unit + integration tests, one run
npm run test:watch  # Vitest: watch mode
npm run test:e2e    # Playwright: boots a dev server on :3101 against carehomes_test, runs every spec in tests/e2e
npm run test:e2e:prod  # Playwright: `next build` + `next start` on :3102, runs action-errors.spec.ts only
```

`test:e2e:prod` exists because Next.js hides the message of an error thrown
by a server action only in a production build. It is the run that proves the
rebuttal forms show the server's real message. It rebuilds `.next`, so allow
a few minutes.

The dev-server run is slow on a cold `.next` cache (each first visit compiles
its route). On a slow disk the first run after a clean checkout can time out
across the board and pass on the next run; `action-errors.spec.ts` sets a 90
second timeout for that reason.

Vitest and Playwright both load `.env.test` via `dotenv-cli` in the npm
script itself — you don't need to `source` anything manually. (Next.js
treats variables already set in the process environment as higher priority
than its own `.env.local`/`.env` files, which is what lets `test:e2e` safely
point the real dev server at `carehomes_test` instead of the real `carehomes`
database.)

## Adding new tests

- **Unit test** (pure functions, no DB): add to `tests/unit/`, no special
  setup needed.
- **Integration test** (a route handler or server action against the real
  test DB): add to `tests/integration/`. Use the factories in
  `tests/helpers/db.ts` to build fixtures, `buildRequest()`/`authCookie()`
  from `tests/helpers/http.ts` for routes, and the `vi.mock("@/lib/auth", ...)`
  pattern shown in `claim-action.test.ts` for server actions. Always call
  `resetDb()` in a `beforeEach`.
- **E2E test**: add a `.spec.ts` under `tests/e2e/`, import fixtures from
  `./fixtures`, call `resetDb()` in a `test.beforeEach`. Keep this layer
  small and focused on things that genuinely need a real browser (visual
  states, client-side interactivity) — route-level behavior belongs in
  `tests/integration/` instead, where it's much faster to run and debug.

## Build integrity checks

```bash
npx prisma validate   # schema syntax/relations
npx tsc --noEmit       # type-check — see TEST_REPORT.md for an important caveat
                        # about what this does NOT catch (invalid Prisma select/include fields)
npm run build          # full production build
```

`npm run build` performs real static-generation data fetches at build time
(e.g. the home page), so it needs a reachable database with every migration
applied, including the three listed under "Test database". To build against
`carehomes_test`:

```bash
set -a && source .env.test && set +a && npm run build
```

Two more checks run as ordinary Vitest tests:

- `tests/unit/prisma-query-shape.test.ts` statically checks every Prisma
  call in `src/` against the schema (tsc does not reject unknown `select` /
  `include` / `where` / `data` fields — see KNOWN_ISSUES.md).
- `tests/integration/route-smoke.test.ts` calls every API route's happy path
  against the test database and fails if a route has no case, if any Prisma
  operation errors, or if a response contains a stored password hash.
  **Adding a route without adding a smoke case fails the suite.**
