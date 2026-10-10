# Test Report

Run against a dedicated `carehomes_test` Postgres database (never the real
`carehomes` dev database), with Stripe and email mocked. See TESTING.md for
exact setup/mocking details.

This report has two halves: the original test pass, which found the bugs
below, and the fix pass (2026-10-10), which fixed them. Every finding is now
marked with its status and the test that proves it. A test listed as proof
used to assert the buggy behaviour and now asserts the fixed behaviour; no
test was deleted or weakened.

## Round 3 (2026-10-10): open items closed, skipped areas tested

Work was done on the branch `round-3-cleanup-and-skipped-areas`; nothing was
committed. Part 1 closed the open items from KNOWN_ISSUES.md. Part 2 tested
the areas the first pass skipped and **reports** what it found without fixing
it.

### Totals now

| Suite | Files | Tests | Passed | Expected-fail (reported defects) | Failed | Skipped |
|---|---|---|---|---|---|---|
| Vitest (unit + integration) | 17 | 486 | 471 | 15 | 0 | 0 |
| Playwright, dev server | 3 | 18 | 17 | 1 | 0 | 0 |
| Playwright, production build (`test:e2e:prod`) | 1 | 4 | 4 | 0 | 0 | 0 |

"Expected-fail" tests assert the correct behaviour for a defect listed below
and are marked `it.fails` / `test.fail()`, so the suites stay green (see
TESTING.md). Build integrity: `npx tsc --noEmit` clean; `next build`
succeeded against `carehomes_test` (as part of `test:e2e:prod`);
`prisma migrate diff` between the migrated test database and `schema.prisma`
is empty.

The first full Playwright run of the session failed all 9 tests, including
the logged-out one, and the next run passed 9/9 with no change in between. A
later run had one transient failure in an existing test
(`claim-button.spec.ts` test 9, two "1 Owned" badges during a page
transition) that did not recur in the two full runs after it. Both look like a cold
dev-server cache on a slow disk; neither was investigated further.

### Part 1 — what changed

| Item | Result | Proof |
|---|---|---|
| 1. Schema drift (finding #17) | **CLOSED.** `ConsentLog.documentPublicId`, `Membership.canceledAt` and `@@index([updatedAt])` on `Facility` were added to `schema.prisma`. No migration. No code uses the two columns. (The task named `AuditLog.documentPublicId`; there is no `AuditLog` model — the column is on `ConsentLog`.) | `prisma migrate diff --from-config-datasource --to-schema` is empty |
| 2. Stale `orgId` | **FIXED.** Ownership checks read the user's current `organizationId` from the database (`resolveSessionUser()` in `src/lib/auth.ts`). | `stale-org.test.ts` (12 tests) |
| 3. Login lockout | **CHANGED** to a lock per (email, client IP). One person can no longer lock out another. Unknown emails are throttled identically, so a lock no longer reveals that an account exists. | `security.test.ts` › "Rate limiting on login" (18 tests: the 8 from round 2 plus 10 new) |
| 4. Server actions | **FIXED.** `submitRebuttal()` and `updateRebuttal()` return `{ success: false, error }`; the three forms display it. | `rebuttal-action.test.ts` (20 tests); `action-errors.spec.ts` on the dev server and on a production build |
| 5. Docs | API_ROUTES.md, ARCHITECTURE.md, PERMISSIONS.md and TESTING.md rewritten where they described pre-fix behaviour. | — |

**Item 2, design.** Chosen: look the organization up on every request.
Rejected: invalidating sessions when a user's organization changes. That
needs a new column (a session version) and still needs a database read per
request to compare it, so it costs the same and adds a migration; it also
forces a re-login where the lookup simply follows the change. Cost of the
chosen design: one primary-key query per authenticated request that goes
through `getUserFromRequest()` / `resolveSessionUser()`. Not covered: `role`
is still read from the token and can be up to 7 days stale; the Edge
middleware cannot query the database and still trusts the token for its
role checks.

**Item 3, trade-offs.**
- An attacker with many addresses gets 5 guesses per address per 15 minutes
  against one account. There is deliberately no per-account cap, because a
  per-account cap is exactly what lets a stranger lock someone out. The OTP
  second factor remains the backstop.
- Everyone behind one shared address (an office NAT) shares the counter for
  a given email, so a colleague's typos can lock you out of that address for
  15 minutes. Only for the same email, though.
- The limit is only as good as the client IP. The app reads the first
  `X-Forwarded-For` entry. The proxy in front must overwrite that header; if
  it only appends, a client can forge the first entry and get unlimited
  attempts. Requests with no forwarding header all share one bucket.
- An IPv6 user who can rotate addresses within their own prefix gets a fresh
  counter per address. Addresses are not grouped by /64.
- The table also holds rows for emails that do not exist (needed so unknown
  and real emails behave the same). Rows untouched for 24 hours are deleted
  on the next failed login; there is no scheduled cleanup.
- Response timing still differs between a known and an unknown email
  (bcrypt runs only for a known one). Not addressed.
- `User.failedLoginAttempts` and `User.lockedUntil` are no longer used and
  were left in place, so nothing is dropped.
- Test changes: the 8 existing lockout tests now read the lock state from
  `LoginAttempt` instead of `User`. One had its expectation reversed on
  purpose: "an unknown email always gets 401, no lockout state" became "an
  unknown email gets exactly the same 401 → 429 sequence as a real account".

**Item 4, notes.**
- The 12 assertions in `rebuttal-action.test.ts` that were
  `rejects.toThrow(X)` are now `toEqual({ success: false, error:
  stringMatching(X) })` with the same patterns. Three test titles changed
  from "throws…" to "returns an error…".
- `RebuttalPrintForm.tsx` reported errors only through a `sonner` toast, and
  **no `<Toaster />` is mounted anywhere in the app**, so those messages
  were never visible. The form now also shows the error inline. The missing
  toaster still affects every other toast (see KNOWN_ISSUES.md).
- Two smoke cases (`/api/admin GET`, `/api/stripe/checkout POST`) were
  flagged `noPrisma`; they now make the session lookup, so the flag was
  removed and they are held to the stricter "must reach Prisma without
  error" check.

### Part 2 — inventory of the skipped areas

| Area | Routes | Server actions | Pages / components | Other |
|---|---|---|---|---|
| A. File sharing | `GET/PATCH/DELETE /api/files`; `POST/GET /api/files/share`; `DELETE /api/files/share/[id]`; `GET /api/share/[token]` (public) | not found | `/dashboard/files`; `/share/[token]` (queries Prisma itself) | `src/types/share.ts` |
| B. Template library | `GET/POST /api/templates`; `DELETE /api/templates/[id]`; `POST /api/templates/[id]/download` | not found | `/dashboard/library`; `/dashboard/templates` | `src/services/template.service.ts` |
| C. Intake | not found | not found | not found | no model; only public copy saying intake is unavailable |
| D. PDF watermarking | `POST/GET /api/rebuttal/watermark` | not found | not found (nothing calls the route or reads `watermarkedUrl`) | `src/services/pdf-watermark.service.ts` |
| E. Consent / e-signature | not found | not found | not found | models `ConsentLog`, `MembershipAgreement` only; nothing reads or writes them |
| F. UploadThing | `GET/POST /api/uploadthing` (library-generated) | not found | `UploadButton` in `/dashboard/files` | `src/lib/uploadthing.ts`; `src/lib/upload.ts` is empty |

There is no download route: "download" means being given the file's
UploadThing URL by the list or share endpoints.

### Part 2 — summary by area

| Area | Tests written | Passed | Failed (expected behaviour not met) | Skipped | Where |
|---|---|---|---|---|---|
| A. File sharing | 74 | 68 | 6 | 0 | `files.test.ts` (58), filename and limit tests in `uploadthing.test.ts` (11), `share-page.spec.ts` (5) |
| B. Template library | 33 | 32 | 1 | 0 | `templates.test.ts` |
| C. Intake | 0 | — | — | — | not found: nothing to test |
| D. PDF watermarking | 37 | 29 | 8 | 0 | `watermark.test.ts` |
| E. Consent / e-signature | 0 | — | — | — | not found: nothing to test |
| F. UploadThing | 16 | 15 | 1 | 0 | `uploadthing.test.ts` |
| G. Cross-cutting | 49 (existing) | 49 | 0 | 0 | `route-smoke.test.ts` (47), `prisma-query-shape.test.ts` (2) |

G: round 3 added no API route, so the smoke test needed no new case; its
coverage check (every exported method of every route file has a case or a
reasoned exemption) passes. `/api/uploadthing` GET and POST remain exempt
because the handler is UploadThing's own; its two callbacks are now tested
directly. The Prisma query-shape audit was re-run over the new code
(`login-throttle.service.ts`, `auth.ts`, the rewritten actions) and passes.

### Part 2 — failures (reported, NOT fixed)

Each is pinned by a test that asserts the expected behaviour. "Test" is the
line of that test; "Code" is where the behaviour comes from.

| ID | Severity | Expected | Actual | Test | Code |
|---|---|---|---|---|---|
| D-1 | **High** | The original, un-watermarked document of a published rebuttal is not available to the public | `GET /api/rebuttal/published` (no login) returns every approved rebuttal's `documentUrl`. The watermark route withholds it from non-moderators; this route does not | `tests/integration/watermark.test.ts:277` | `src/app/api/rebuttal/published/route.ts:11` (`include` returns all columns) |
| D-3 | **High** | An ordinary text PDF is accepted for watermarking | Rejected as "a scanned image". `isPdfTextSearchable()` searches the raw file for the letters `BT` and `ET`; real PDFs compress their content streams, so the operators are not visible | `tests/integration/watermark.test.ts:373` | `src/services/pdf-watermark.service.ts:47` |
| D-4 | Medium | A scanned PDF with no text is rejected | Accepted: any file of a few hundred KB contains the byte pairs `BT` and `ET` by chance. The check is close to noise in both directions | `tests/integration/watermark.test.ts:381` | `src/services/pdf-watermark.service.ts:47` |
| D-2 | Medium | The public list of published rebuttals does not expose the author's email | It returns `user.email` for every approved rebuttal | `tests/integration/watermark.test.ts:284` | `src/app/api/rebuttal/published/route.ts:16` |
| D-5 | Medium | The watermark contains the correct user or organization information | The watermark is the fixed text "PUBLIC REDACTED VERSION"; `applyWatermark()` takes no user or organization | `tests/integration/watermark.test.ts:120` | `src/services/pdf-watermark.service.ts:14` |
| D-6 | Medium | A document above the stated 10 MB limit is refused | Any size is downloaded into memory, stamped, base64-encoded and stored in `Rebuttal.watermarkedUrl` (12 MB in → about 16 MB of text in the row, also returned in the response) | `tests/integration/watermark.test.ts:431` | `src/app/api/rebuttal/watermark/route.ts:55`, `:80` |
| A-1 | Medium | An unrecognised share-link expiry is rejected (400) | `"1h"`, `"7 days"` and `7` all return 200 and create a link that **never expires** | `tests/integration/files.test.ts:407` | `src/app/api/files/share/route.ts:10` (`expiryToEnum` defaults to NEVER) |
| A-2 | Low | A garbage `auth-token` gets 401 on the file routes | 500 on all six handlers; the bare `catch {}` swallows the verification error. No data is touched | `tests/integration/files.test.ts:297` | `src/app/api/files/route.ts:46,92,133`; `files/share/route.ts:107,154`; `files/share/[id]/route.ts:46` |
| A-3 | Low | A non-string `label` in `PATCH /api/files` gets 400 | 500 (unhandled Prisma validation error) | `tests/integration/files.test.ts:290` | `src/app/api/files/route.ts:127` |
| A-4 | Low | The same file id listed twice is accepted or rejected as a bad request | 403 "One or more files not found or not owned by you" | `tests/integration/files.test.ts:421` | `src/app/api/files/share/route.ts:69` |
| A-5 | Low | A malformed `fileIds` (not an array) gets 400 | 500 | `tests/integration/files.test.ts:427` | `src/app/api/files/share/route.ts:56` |
| A-6 | Low | An unknown share token is answered with HTTP 404 | HTTP 200 with the "Page Not Found" content: the route has a `loading.tsx`, so the response starts streaming before `notFound()` runs. No files are shown | `tests/e2e/share-page.spec.ts:75` | `src/app/share/[token]/loading.tsx` |
| B-1 | Low | A template `fileUrl` that is not an http(s) URL is rejected | `javascript:…` is stored; the library page later navigates the member's browser to it. Only an ADMIN can create templates | `tests/integration/templates.test.ts:315` | `src/app/api/templates/route.ts:65` |
| D-7 | Low | A corrupt PDF gets a clear "corrupt / unreadable" message | 400, but with "appears to be a scanned image … upload an OCR-processed PDF". Nothing is stored | `tests/integration/watermark.test.ts:334` | `src/services/pdf-watermark.service.ts:50` |
| D-8 | Low | A garbage `auth-token` gets 401 on `POST /api/rebuttal/watermark` | 500 | `tests/integration/watermark.test.ts:211` | `src/app/api/rebuttal/watermark/route.ts:20` |
| F-1 | Low | A valid token for a deleted user is rejected before the upload | Accepted: the file is stored at UploadThing, then the database write fails on its foreign key, leaving an orphaned blob | `tests/integration/uploadthing.test.ts:113` | `src/lib/uploadthing.ts:27` |

No Critical failure was found. No cross-organization access was found in
any of the four areas: every IDOR test passes.

### Part 2 — behaviour confirmed (passing), worth knowing

- **Files are private to the uploader.** A same-org colleague cannot list,
  relabel, delete or share them; another organization's member cannot
  either; `?userId=` is honoured only for an ADMIN. A MODERATOR has no
  override.
- **Share links.** Expired and revoked links return 410 with no files, on
  both the API and the page. Revocation takes effect immediately. A link
  whose owner is deleted returns 404. Files deleted after sharing drop out.
  A share-all link also shows files uploaded later (by design). Only
  successful views are logged.
- **Templates.** Access depends on the membership **status** in the
  database, not the tier and not the session: all three paid tiers are
  equal, and access ends the moment the membership lapses. A refused request
  returns no titles or URLs and is not counted.
- **Watermark.** Only MODERATOR/ADMIN can generate one; a MEMBER cannot,
  even for their own rebuttal. An unpublished rebuttal's URLs cannot be
  requested by the public or by another organization. Non-PDF input is
  refused with a clear 400 and nothing is stored.
- **UploadThing.** Authorization runs before a file is accepted, and the
  user id comes only from the session. The stored record is tied to that
  user. Filenames (5,000 characters, unicode, `../../`, HTML) are stored as
  text and never used as a path.

### Part 2 — decisions for you (current behaviour pinned, not judged)

- **Who may upload.** The upload authorization checks only that there is a
  valid session. A MODERATOR, an ADMIN and a MEMBER with no active
  membership can all upload (`uploadthing.test.ts`, "role and membership are
  NOT checked").
- **The upload callback trusts UploadThing's reported type.** Anything it
  reports is stored, as `OTHER` if unrecognised. GIF and SVG pass the
  `image` rule.
- **`POST /api/rebuttal/watermark` is never called** by the application.
- **Template file URLs are static.** The list returns each `fileUrl`
  directly, so a member can skip the download counter, and a former member
  who kept a URL keeps the file.

### Found while working, outside the requested areas (no test written)

- **Public `GET /api/facility` returns the claiming user's email** for each
  facility (`src/services/facility.service.ts:164`). Round 2 fixed the
  single-facility route; the list route still selects `email`. Read from the
  code, not exercised by a test.
- **No `<Toaster />` is mounted**, so `toast.*` calls in
  `/dashboard/library`, `/dashboard/templates` and the print form show
  nothing.
- **Rebuttal documents over 1 MB probably cannot be uploaded.** The forms
  say "max. 10MB", the upload goes through a server action, and
  `next.config.ts` does not raise Next's default 1 MB server-action body
  limit. Not verified by a test.
- `next build` logs "Auth error: Dynamic server usage…" for each dashboard
  page: `getUserFromRequest()`'s catch logs Next's normal bail-out signal.
  The pages work (the production E2E run passes); it is log noise.

### Could not test, and why

| What | Why |
|---|---|
| C. Intake | Not found in the codebase |
| E. Consent / e-signature (signing, re-signing, revocation, audit log, spoofing) | Not found: only two unused models exist |
| UploadThing's enforcement of type, size (16 MB) and count (10) limits | Enforced on UploadThing's servers; only the configuration can be asserted without a real call |
| Whether a file URL stops working after delete or revoke | Depends on UploadThing storage. The app calls `deleteFiles` on delete (asserted with a mock); revoking a share does not invalidate a URL someone already has |
| The signed HTTP callback into `/api/uploadthing` | Needs UploadThing's signature; the two callbacks it invokes were called directly instead |
| Cloudinary upload inside the rebuttal actions | Would be a real third-party call; tests never attach a document |
| `/dashboard/files`, `/dashboard/library`, `/dashboard/templates` in a browser | Not attempted; their API routes are covered. The upload button needs UploadThing |
| Login throttling behind the real proxy | Header handling is tested; whether the production proxy overwrites `X-Forwarded-For` can only be checked in that environment |

### Files created or changed in round 3

Created: `src/lib/client-ip.ts`, `src/services/login-throttle.service.ts`,
`src/types/action-result.ts`,
`prisma/migrations/20261010140000_add_login_attempt/migration.sql`,
`playwright.prod.config.ts`, `tests/helpers/pdf.ts`,
`tests/integration/stale-org.test.ts`, `tests/integration/files.test.ts`,
`tests/integration/uploadthing.test.ts`,
`tests/integration/templates.test.ts`,
`tests/integration/watermark.test.ts`, `tests/e2e/action-errors.spec.ts`,
`tests/e2e/share-page.spec.ts`.

Changed (application): `prisma/schema.prisma`, `package.json`,
`src/lib/auth.ts`, `src/lib/jwt.ts` (comment only),
`src/app/api/auth/login/route.ts`, `src/app/api/facility/route.ts`,
`src/app/api/rebuttal/route.ts`, `src/app/api/rebuttal/[id]/route.ts`,
`src/app/actions/rebuttals.ts`,
`src/app/dashboard/rebuttals/new/NewRebuttalForm.tsx`,
`src/app/dashboard/rebuttals/[id]/edit/EditRebuttalForm.tsx`,
`src/app/dashboard/forms/rebuttal/RebuttalPrintForm.tsx`. The generated
Prisma client in `src/generated/prisma` (git-ignored) was regenerated with
`prisma generate`.

Changed (tests): `tests/helpers/db.ts`, `tests/e2e/db-cli.ts`,
`tests/e2e/fixtures.ts`, `tests/integration/security.test.ts`,
`tests/integration/rebuttal-action.test.ts`,
`tests/integration/route-smoke.test.ts`.

Changed (docs): `docs/API_ROUTES.md`, `docs/ARCHITECTURE.md`,
`docs/PERMISSIONS.md`, `docs/TESTING.md`, `docs/TEST_REPORT.md`,
`docs/KNOWN_ISSUES.md`.

The migration was applied to `carehomes_test` only, with
`prisma migrate deploy`. `prisma migrate dev` was never run and no other
database was touched.

---

# Round 2 report (fix pass), kept for reference

The numbers and statuses below are as of the end of round 2. Where round 3
changed something it is noted inline.

## Summary after the fix pass

| Suite | Files | Tests | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| Vitest (unit + integration) | 12 | 304 | 304 | 0 | 0 |
| Playwright (E2E, real browser) | 1 | 9 | 9 | 0 | 0 |
| **Total** | **13** | **313** | **313** | **0** | **0** |

Before the fix pass the totals were 203 Vitest + 7 Playwright = 210.

| Vitest file | Tests |
|---|---|
| `tests/integration/admin.test.ts` | 7 |
| `tests/integration/auth.test.ts` | 18 |
| `tests/integration/billing.test.ts` | 25 |
| `tests/integration/claim-action.test.ts` | 21 |
| `tests/integration/facility-limits.test.ts` | 23 |
| `tests/integration/rebuttal-action.test.ts` | 15 |
| `tests/integration/rebuttals.test.ts` | 34 |
| `tests/integration/route-smoke.test.ts` (new) | 47 |
| `tests/integration/security.test.ts` | 25 |
| `tests/unit/jwt.test.ts` | 10 |
| `tests/unit/permissions.test.ts` | 77 |
| `tests/unit/prisma-query-shape.test.ts` (new) | 2 |

Build integrity: `npx prisma validate` ✅, `npx tsc --noEmit` ✅ (also with
`--incremental false`), `npm run build` ✅ against `carehomes_test`.

**Before running the app anywhere else, apply the two new migrations**
(`npx prisma migrate deploy`): `20261010120000_add_processed_stripe_event`
and `20261010130000_add_login_lockout`. They have been applied to
`carehomes_test` only. Without the second one, login fails, because the
`User` query selects columns the database does not have yet.

## Status of every finding

| # | Severity | Finding | Status | Proof |
|---|---|---|---|---|
| 1 | Critical | `GET /api/admin/access-review` always 500 | **FIXED** | `admin.test.ts` › "GET /api/admin/access-review — FIXED" (4 tests) |
| 2 | Critical | `submitRebuttal()` had no ownership check | **FIXED** | `rebuttal-action.test.ts` › "submitRebuttal() server action — facility-ownership check (FIXED)" (12 tests) |
| 3 | High | Rebuttal API and facility page checked the user, not the org | **FIXED** | `rebuttals.test.ts` › "POST /api/rebuttal — ownership check is per-ORGANIZATION"; `claim-button.spec.ts` tests 6 and 9 |
| 4 | High | `GET /api/rebuttal/[id]` had no auth | **FIXED** | `rebuttals.test.ts` › "GET /api/rebuttal/[id] — auth required…" (11 tests) |
| 5 | High | Facility claim quota race | **FIXED** | `facility-limits.test.ts` › "Race condition… (FIXED)" (0/20 and 0/15 over limit); `claim-action.test.ts` › "race conditions (FIXED)" (0/20) |
| 6 | Medium | Tier limits duplicated in three files | **FIXED** | `permissions.test.ts` › "Tier limit single source of truth" (5 tests); `billing.test.ts` per-tier webhook tests |
| 7 | Medium | Soft-deleted facilities counted inconsistently | **FIXED** | `claim-action.test.ts` (2 tests); `claim-button.spec.ts` test 8; `rebuttals.test.ts` › "Soft-deleted rebuttals…" (5 tests) |
| 8 | Medium | `linkSeatToOrg()` validation gaps | **FIXED** | `claim-action.test.ts` › "linkSeatToOrg() server action" (10 tests) |
| 9 | Medium | Stripe webhook re-sent emails on redelivery | **FIXED** | `billing.test.ts` › "idempotency on duplicate delivery (FIXED)" (5 tests) |
| 10 | Medium | `tsc` does not catch invalid Prisma fields | **EXPLAINED, now caught in CI** | `prisma-query-shape.test.ts` (static); `route-smoke.test.ts` (runtime) |
| 11 | Low | ADMIN could submit rebuttals via the API | **FIXED** | `rebuttals.test.ts` "ADMIN can NOT submit"; `rebuttal-action.test.ts`; `permissions.test.ts` |
| 12 | Low | "Submit Rebuttal" CTA shown to non-owners | **FIXED** | `claim-button.spec.ts` tests 2, 5 and 6 |
| 13 | Low | No rate limiting on the login password step | **FIXED** (round 3: now per email + IP) | `security.test.ts` › "Rate limiting on login — lockout per (email, client IP)" (18 tests) |
| 14 | Low | `(prisma as any).takedownRequest` | **FIXED** | `prisma-query-shape.test.ts` asserts no Prisma call goes through an `any` client |
| 15 | Env | Dev database never migrated | Resolved in the first pass | — |
| 16 | **High (new)** | Public `GET /api/facility/[id]` returned the claimant's password hash and email | **FIXED** | `security.test.ts` "FIXED (new finding, TEST_REPORT #16)"; `route-smoke.test.ts` password-hash assertion on every route |
| 17 | **Medium (new)** | `schema.prisma` is behind the migration history | **CLOSED in round 3** (added to the schema) | `prisma migrate diff` is empty |

## Findings in detail

### 1. CRITICAL — `GET /api/admin/access-review` always failed (500) — FIXED

- **Was:** the query selected `User.membership`, which CH-18 moved to
  `Organization.membership`. Every call threw `PrismaClientValidationError`.
- **Fix:** `src/app/api/admin/access-review/route.ts` now selects
  `organization: { select: { membership: { select: { plan, status } } } }`,
  and the select object carries `satisfies Prisma.UserSelect` so tsc rejects
  an unknown field there. `src/app/dashboard/moderation/access-review/page.tsx`
  reads `user.organization?.membership`.
- **Proof:** `tests/integration/admin.test.ts` — ADMIN and MODERATOR get 200;
  the payload carries the membership for a paying org, `{ membership: null }`
  for an org without one, and `organization: null` for a user with no org;
  recently reviewed users are excluded.

### 2. CRITICAL — `submitRebuttal()` had no facility-ownership check — FIXED

- **Fix:** `src/app/actions/rebuttals.ts` now checks, before any upload:
  the `submit_rebuttal` permission, that the facility exists and is not
  soft-deleted, that it is claimed, and that
  `facility.organizationId === user.orgId`. Each case throws its own message
  ("Facility not found.", "This facility has not been claimed…", "Forbidden:
  you can only submit rebuttals for facilities your organization owns.").
- **Proof:** `tests/integration/rebuttal-action.test.ts` — other-org and
  unclaimed submissions are rejected and no `Rebuttal` row is written; the
  claimant and a same-org teammate succeed; MODERATOR and ADMIN are rejected.
- **Still open:** the action reports errors by throwing, as it always did.
  Next.js replaces thrown server-action messages with a generic one in
  production builds, so users see the specific text only in development.
  Returning `{ success: false, error }` would fix that but changes the two
  forms that call it.

### 3. HIGH — ownership was checked per user instead of per organization — FIXED

- **Fix:** `POST /api/rebuttal` checks `facility.organizationId === user.orgId`.
  The facility page computes "claimed by me / by someone else" from the
  organization. The rebuttal pickers (`/dashboard/rebuttals/new`,
  `/dashboard/forms/rebuttal`), the "My Facilities" list and quota bar, the
  dashboard owned-count and the redaction-form picker all list the
  organization's facilities.
- **Proof:** `tests/integration/rebuttals.test.ts` — a teammate gets 200, a
  former claimant now in another org gets 403, an unclaimed facility is 403
  for everyone. `tests/e2e/claim-button.spec.ts` test 6 (teammate sees
  "Facility Claimed", the header "Submit Rebuttal" CTA, and the facility in
  the new-rebuttal picker) and test 9 (teammate sees the org's facility on
  three dashboard pages and never another org's).

### 4. HIGH — `GET /api/rebuttal/[id]` had no auth — FIXED

- **Fix:** `src/app/api/rebuttal/[id]/route.ts` requires a valid session
  (401 otherwise, including for a tampered token) and allows only the
  author, members of the facility's organization, and MODERATOR/ADMIN (403
  otherwise). Error responses contain only `{ error }`.
- **Proof:** `tests/integration/rebuttals.test.ts` — 11 tests covering
  anonymous access to PENDING, REJECTED and APPROVED rebuttals, a tampered
  token, another org's member, a user with no org against an unclaimed
  facility, the author, a teammate, MODERATOR and ADMIN.

### 5. HIGH — facility claim quota race — FIXED

- **Fix:** `withOrgFacilityQuota()` in `src/services/facility.service.ts`
  runs the membership check, the count and the write in one Prisma
  transaction that first locks the organization with
  `SELECT "id" FROM "Organization" WHERE "id" = $1 FOR UPDATE`. Both claim
  paths use it (`POST /api/facility` and the `claimFacility` action).
  `claimFacility` also claims with a conditional `updateMany` (only while
  the facility is still unclaimed), so two different organizations cannot
  both win the same facility.
- **Result of the concurrency tests:**
  - 2 concurrent requests, TIER_A (limit 1), 20 trials: **0/20 over limit**
    (every trial: one 201, one 403, final count 1).
  - 8 concurrent requests, TIER_B (limit 3) with 1 already claimed, 15
    trials: **0/15 over limit** (every trial: two 201, six 403, final count 3).
  - `claimFacility` action, one org claiming two facilities at once, 20
    trials: **0/20 over limit**.
  - Two orgs claiming the same facility at once, 20 trials: exactly one
    winner every time.
- **Negative control:** with only the `FOR UPDATE` clause removed (the same
  transaction at default isolation), the three limit tests fail, e.g. five
  201 responses in the 8-way burst. The lock is what fixes the race.

### 6. MEDIUM — tier limits in three places — FIXED

- **Fix:** `TIER_FACILITY_LIMITS` in `src/lib/permissions.ts` (the table
  `canClaimFacility` enforces) is the only table. `src/config/tiers.ts`
  exports the same object as `TIER_LIMITS`; the Stripe webhook, the seed and
  the test factory read from it.
- **Proof:** `tests/unit/permissions.test.ts` — `TIER_LIMITS` is the same
  object by identity, and a source scan fails if any file under `src/` or
  `prisma/seed.ts` re-declares a numeric limit. `tests/integration/billing.test.ts`
  — for each tier, the `maxFacilities` the webhook writes equals the limit
  `canClaimFacility` enforces.

### 7. MEDIUM — soft-delete handling — FIXED

- **Fix (facilities):** both claim paths share one count that filters
  `deletedAt: null`; the facility page's "Limit Reached" state uses the same
  filter; a soft-deleted facility cannot be claimed; the homepage total
  excludes soft-deleted facilities.
- **Fix (rebuttals):** the moderation pre-check, both watermark handlers and
  the emergency-takedown lookup treat a soft-deleted rebuttal as not found
  (404).
- **Proof:** `tests/integration/claim-action.test.ts` (soft-deleted facility
  does not count; cannot be claimed), `tests/e2e/claim-button.spec.ts` test 8,
  `tests/integration/rebuttals.test.ts` › "Soft-deleted rebuttals are treated
  as not found everywhere".

### 8. MEDIUM — `linkSeatToOrg()` — FIXED

- **Gap A:** a nonexistent or empty `orgId` returns "Organization not found".
- **Gap B (decision: block):** a user who already belongs to a different
  organization cannot be re-linked; the action returns "User already belongs
  to another organization" and nothing changes.
- **Proof:** `tests/integration/claim-action.test.ts`.

### 9. MEDIUM — Stripe webhook idempotency — FIXED

- **Fix:** new `ProcessedStripeEvent` table (migration
  `20261010120000_add_processed_stripe_event`). The handler claims
  `event.id` with an `INSERT … ON CONFLICT DO NOTHING`; a redelivery still
  runs the (idempotent) database writes but sends no email. If processing
  fails with a 500 the claim is released so Stripe's retry is handled in full.
- **Proof:** `tests/integration/billing.test.ts` — same event three times
  sends one email; five concurrent deliveries send one email; two different
  events send two; a failed first attempt followed by a retry sends one.
- **Note:** rows are never pruned. The table has an index on `processedAt`
  for a future cleanup job.

### 10. MEDIUM — why `npx tsc --noEmit` did not catch finding 1

No `any` or cast was involved in that query, and the generated types are
strict. The cause is the shape of Prisma's generated method signatures
(`src/generated/prisma/models/User.ts`):

```ts
findMany<T extends UserFindManyArgs>(
  args?: Prisma.SelectSubset<T, UserFindManyArgs<ExtArgs>>
): ...
```

with (`src/generated/prisma/internal/prismaNamespace.ts`):

```ts
export type SelectSubset<T, U> = {
  [key in keyof T]: key extends keyof U ? T[key] : never
} & ...
```

The argument's type is inferred as `T`, and `T` only has to be *assignable*
to `UserFindManyArgs`. Assignability allows extra properties, and
`SelectSubset` only checks the top-level keys (`select`, `where`, …), so an
unknown key nested inside `select` is accepted. The field simply comes back
typed `never`. Reproduced directly:

| Code | tsc result |
|---|---|
| `prisma.user.findMany({ select: { id: true, membership: { select: { plan: true } } } })` | no error |
| `prisma.user.findMany({ where: { id: "x", nope: 1 } })` | no error |
| `prisma.user.update({ where: { id: "x" }, data: { name: "n", nope: 1 } })` | no error |
| `prisma.user.findMany({ select: { membership: true } })` (no valid key at all) | error (weak-type check) |
| `const s: Prisma.UserSelect = { id: true, nope: true }` | error TS2353 |
| `{ … } satisfies Prisma.UserSelect` with `membership` | error TS2353 |

The same happens under TypeScript 5.9, so it is not specific to TypeScript 6.

Two things in the codebase did hide queries from tsc completely, and both
are fixed: `(prisma as any).takedownRequest` in
`src/app/api/takedown/[id]/route.ts` and `src/services/takedown.service.ts`
(8 calls), and `const conditions: object[]` in `buildWhereClause()` in
`src/services/facility.service.ts`.

**Now caught in CI by two tests:**

- `tests/unit/prisma-query-shape.test.ts` uses the TypeScript compiler API
  to apply the strict check to every Prisma call under `src/` and
  `prisma/seed.ts` (143 calls in 42 files, 994 keys), and fails on any
  `any`-typed client. It includes a self-test that flags the original
  `User.membership` bug.
- `tests/integration/route-smoke.test.ts` calls every exported HTTP method
  of every `src/app/api/**/route.ts` on its happy path against the real
  database (47 cases covering 31 of the 32 route files; the UploadThing
  route is exempt, with the reason recorded in the test) and fails on any
  Prisma error, including one a route swallows. A route added without a case fails the
  coverage test. Verified by injecting `membership` into `GET /api/auth/me`:
  tsc stayed green, the smoke test failed.

**Audit result (what was checked):** every Prisma model call in the repo —
143 calls, 0 invalid fields. The first run, right after fixing finding 1,
covered the 139 calls that existed then and was also clean. Per model now:
ArchivedModerationLog 1, CitationDeadline 6, Facility 20, FileShareAccessLog 1,
FileShareLink 6, MemberFile 9, Membership 10, MfaOtp 8, ModerationLog 5,
Organization 6, ProcessedStripeEvent 2, Rebuttal 30, TakedownRequest 8,
Template 5, TemplateDownload 1, User 25. Dynamically built `where` objects
(`buildWhereClause()` for facilities, the takedown search) were read by hand
and are now typed, so tsc checks them. No `$queryRaw`/`$executeRaw` existed
before this pass; the one added (`FOR UPDATE`) is exercised by the race
tests.

### 11. LOW — ADMIN could submit rebuttals — FIXED (decision: MEMBER only)

`submit_rebuttal` was removed from ADMIN in `src/lib/permissions.ts`. The
API route, the server action, `/dashboard/rebuttals/new` and
`/dashboard/forms/rebuttal` now all refuse ADMIN.

### 12. LOW — "Submit Rebuttal" CTA shown to non-owners — FIXED

`ApprovedRebuttalsSection` takes `canSubmitRebuttal`. Non-members see
"Become a Member", members whose organization owns the facility see "Submit
Rebuttal", other members see no CTA.

### 13. LOW — login rate limiting — FIXED (decision: per-account lockout)

- **Fix:** `User.failedLoginAttempts` and `User.lockedUntil` (migration
  `20261010130000_add_login_lockout`). Five consecutive wrong passwords lock
  the account for 15 minutes; the locking attempt and every attempt during
  the lock return 429 with `Retry-After`, including the correct password. A
  successful login resets the counter.
- **Trade-offs to be aware of:** a locked account answers 429 while an
  unknown email answers 401, which reveals that the account exists; and
  anyone who knows an email address can lock that account for 15 minutes.

### 14. LOW — `as any` on the Prisma client — FIXED

Both `(prisma as any).takedownRequest` casts are gone. Other `any` uses
remain (Stripe object casts in the webhook, `catch (err: any)` clauses, one
in `submitRebuttal`); none of them hides a Prisma query.

### 15. RESOLVED (first pass) — local dev database had never been migrated

Unchanged from the first pass; details are in KNOWN_ISSUES.md.

### 16. HIGH (new) — `GET /api/facility/[id]` leaked the claimant's password hash — FIXED

- **Found by:** the new route smoke test, which asserts that no response
  contains a stored password hash.
- **Was:** `getFacilityById()` used `include: { createdBy: true }`, so this
  public, unauthenticated endpoint returned the claiming user's whole `User`
  row, including `password` and `email`.
- **Fix:** it now selects `createdBy: { id, name }` only.
- **Proof:** `tests/integration/security.test.ts` "FIXED (new finding,
  TEST_REPORT #16)".
- **Follow-up for you:** if this endpoint was reachable in production,
  treat the password hashes of users who had claimed a facility as exposed.

### 17. MEDIUM (new) — `schema.prisma` is behind the migration history — CLOSED in round 3

`prisma migrate diff` from the migrated test database to `schema.prisma`
shows three things the migrations create that the schema file does not
declare: the column `ConsentLog.documentPublicId`
(`20260904051356_add_consent_document_public_id`), the column
`Membership.canceledAt` and the index `Facility_updatedAt_idx` (both from
`20260914062032_add_canceled_at`). No code references them. The risk is
that the next `prisma migrate dev` generates a migration that drops both
columns. Not changed here, because whether to restore them in the schema or
drop them is a product decision. The two migrations added in this pass
contain only their own changes.

## What was still not covered by a running test at the end of round 2

Round 3 covered the UploadThing callbacks, file sharing, the template
library and watermarking; see the round 3 section at the top for what
remains.

- `src/app/api/uploadthing/route.ts` (UploadThing's generated handler) and
  the `onUploadComplete` write in `src/lib/uploadthing.ts`: statically
  checked only.
- Server components and pages other than the ones the E2E suite visits:
  their Prisma queries are checked statically, not executed.
- Member file sharing, the template library, takedown admin actions and PDF
  watermarking now have happy-path coverage through the smoke test, but no
  dedicated permission or edge-case tests.
- The membership-agreement / e-signature (`ConsentLog`) flow.
- Load and performance testing.
