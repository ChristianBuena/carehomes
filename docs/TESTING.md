# Testing

No test framework existed in this repository before this test pass. This
test pass added **Vitest** (unit + integration) and **Playwright** (E2E), per
the ground rules: use what's in the repo, and if nothing exists, use Vitest
+ Playwright and say what was installed.

## What was installed

```
devDependencies added:
  vitest, vite-tsconfig-paths, dotenv-cli   (unit/integration)
  @playwright/test                           (E2E; chromium browser downloaded via `npx playwright install chromium`)

package.json scripts added:
  "test":          dotenv -e .env.test -- vitest run
  "test:watch":    dotenv -e .env.test -- vitest
  "test:e2e":      dotenv -e .env.test -- playwright test
  "test:db:migrate": dotenv -e .env.test -- prisma migrate deploy
```

New files: `vitest.config.ts`, `playwright.config.ts`, `.env.test` (gitignored
— `.env*` was already in `.gitignore`), everything under `tests/`.

**No application code was changed to make any test pass.** Every confirmed
bug in TEST_REPORT.md was left exactly as found; tests assert the actual
(sometimes buggy) behavior and say so explicitly in their names/comments.

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

Every Vitest integration test calls `resetDb()` in `beforeEach`, which
`TRUNCATE ... RESTART IDENTITY CASCADE`s every application table. Tests run
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

## Folder structure

```
tests/
├── setup.ts                 global Vitest setup: loads .env.test, guards the DB,
│                             registers the next/headers mock
├── helpers/
│   ├── db.ts                 testDb (real Prisma client), resetDb(), factories
│   │                          (createOrg, createUser, createMembership, createFacility,
│   │                           createRebuttal, createOrgWithUser)
│   ├── http.ts               buildRequest() / authCookie() — build a real NextRequest
│   │                          with cookies, and sign a real session JWT for a fixture user
│   └── nextRequestContext.ts backing store for the next/headers mock
├── unit/
│   ├── permissions.test.ts   hasPermission() full role x permission matrix, canClaimFacility() boundaries
│   └── jwt.test.ts           sign/verify, tamper, expiry, mfa-pending token semantics
├── integration/               real route handlers + server actions, real Postgres (carehomes_test)
│   ├── auth.test.ts           signup, login, full MFA flow (valid/wrong/expired/reused/max-attempts), /me, logout
│   ├── facility-limits.test.ts tier boundaries via the API route, org quota sharing/isolation, race condition
│   ├── claim-action.test.ts   claimFacility() and linkSeatToOrg() server actions (real code, @/lib/auth mocked)
│   ├── rebuttals.test.ts      /api/rebuttal, /api/rebuttal/[id] (IDOR), moderation flow + role gating
│   ├── rebuttal-action.test.ts submitRebuttal()/updateRebuttal() server actions
│   ├── billing.test.ts        checkout/portal metadata, webhook signature + events + idempotency, membership/update
│   ├── admin.test.ts          access-review (confirms the broken-query bug), archive-moderation-logs
│   └── security.test.ts       injection strings, long/empty/unicode input, IDOR, brute-force-login gap
└── e2e/
    ├── fixtures.ts            seeds the test DB via a tsx subprocess (see below), injects a signed session cookie
    ├── db-cli.ts               the tsx subprocess entry point
    └── claim-button.spec.ts   real browser rendering of every ClaimFacilityButton state
```

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
npm run test:e2e    # Playwright: boots a dev server on :3101 against carehomes_test, runs claim-button.spec.ts
```

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
(e.g. the home page), so it needs a reachable, correctly-migrated database.
**It will fail against the current local dev `carehomes` database** because
that database is missing most of the schema (see KNOWN_ISSUES.md) — this is
an environment/migration-drift issue, not an application bug. Point it at
`carehomes_test` (fully migrated by this test pass) to get a true read on
whether the code itself builds:

```bash
set -a && source .env.test && set +a && npm run build
```
