# Known Issues

The short, scannable list. See TEST_REPORT.md for how each item was
confirmed, how it was fixed, and the test results.

Status as of round 3 (2026-10-10): every bug from the first test pass is
fixed, the open items from round 2 are closed, and the areas skipped in the
first pass have been tested. Round 3 **reported** the defects it found in
those areas without fixing them; they are the first list below.

## Open — defects found in round 3 (not fixed)

IDs match TEST_REPORT.md, which has expected vs actual, the test line and the
code line for each. Every one is pinned by a test marked as an expected
failure.

| ID | Severity | Issue |
|---|---|---|
| D-1 | **High** | Public `GET /api/rebuttal/published` returns the original, un-watermarked `documentUrl` of every approved rebuttal |
| D-3 | **High** | The watermark route rejects ordinary text PDFs as "scanned" (it looks for the letters `BT`/`ET` in the raw file) |
| D-4 | Medium | …and the same check accepts scanned PDFs with no text |
| D-2 | Medium | Public `GET /api/rebuttal/published` returns each author's email |
| D-5 | Medium | The watermark is a fixed text; it carries no user or organization information |
| D-6 | Medium | No size limit on watermarking; the whole PDF is stored as base64 in the `Rebuttal` row |
| A-1 | Medium | An unrecognised share-link expiry value silently creates a link that never expires |
| A-2, D-8 | Low | A garbage session token gets 500 instead of 401 on the file, share and watermark routes |
| A-3, A-5 | Low | Malformed `label` / `fileIds` input gets 500 instead of 400 |
| A-4 | Low | Duplicate file ids in a share request get a misleading 403 |
| A-6 | Low | `/share/<unknown token>` answers HTTP 200 with the not-found page |
| B-1 | Low | Template `fileUrl` accepts non-http schemes such as `javascript:` (ADMIN-only input) |
| D-7 | Low | A corrupt PDF is told it "appears to be a scanned image" |
| F-1 | Low | An upload is authorized for a deleted user's still-valid token, leaving an orphaned blob |

Found outside the requested areas, no test written:

- **Public `GET /api/facility` (the list) returns the claiming user's email**
  for each facility (`src/services/facility.service.ts:164`). Round 2 fixed
  only the single-facility route.
- **No `<Toaster />` is mounted anywhere**, so every `toast.*` call
  (`/dashboard/library`, `/dashboard/templates`, the print form) is
  invisible. The print form's submit error is now also shown inline.
- **Rebuttal documents over 1 MB probably cannot be uploaded**: the forms
  say 10 MB, but the upload goes through a server action and Next's default
  1 MB body limit is not raised. Not verified.

## Open — other

1. **Apply three migrations before running the app.** They have been
   applied to `carehomes_test` only:
   `20261010120000_add_processed_stripe_event`,
   `20261010130000_add_login_lockout` and
   `20261010140000_add_login_attempt`. Run `npx prisma migrate deploy`
   against the dev and production databases. Until the third one is applied,
   **login fails** (the route queries the `LoginAttempt` table). The Prisma
   client also still selects the two unused `User` lockout columns, so the
   second one is needed too.
2. **If `GET /api/facility/[id]` was reachable in production, password
   hashes were exposed** (TEST_REPORT.md #16, fixed in round 2). Consider
   forcing a password reset for users who had claimed a facility.
3. **Login throttling depends on the proxy.** The client IP is the first
   `X-Forwarded-For` entry. The proxy in front of the app must overwrite
   that header; one that only appends lets a client forge it and bypass the
   limit. Other accepted trade-offs (many-address attackers, shared NAT,
   IPv6 rotation, response timing) are listed in TEST_REPORT.md.
4. **`role` still comes from the session token.** The organization is now
   read from the database on every request, but a role change takes effect
   only at the next sign-in (tokens last 7 days). The Edge middleware also
   relies on the token alone.
5. **Unused columns.** `User.failedLoginAttempts`, `User.lockedUntil`,
   `Membership.canceledAt` and `ConsentLog.documentPublicId` exist in the
   database and the schema but no code uses them. They were kept so that no
   migration drops anything.
6. **`ProcessedStripeEvent` rows are never pruned.** The table is indexed on
   `processedAt` for a future cleanup job. `LoginAttempt` rows are pruned
   only opportunistically (on a failed login, rows idle for 24 hours).
7. **Other `any` uses remain** (Stripe object casts in the webhook,
   `catch (err: any)` in `claimFacility.ts` and `linkSeatToOrg.ts`, the
   `as any` casts in `tests/e2e/db-cli.ts`). The two in `rebuttals.ts` were
   removed in round 3.
8. **Not built: intake and consent / e-signature.** There is no intake
   route, page or model. `ConsentLog` and `MembershipAgreement` exist as
   models only; no code signs, reads or lists an agreement.
9. **`POST /api/rebuttal/watermark` is never called** by the application,
   and no page reads `watermarkedUrl`.
10. **Not covered by a running test:** UploadThing's own HTTP handler and
    its server-side limits, the Cloudinary upload in the rebuttal actions,
    and the `/dashboard/files`, `/dashboard/library` and
    `/dashboard/templates` pages in a browser. See "Could not test" in
    TEST_REPORT.md.

## Closed in round 3

| Was open item | Outcome | Proof |
|---|---|---|
| Schema behind the migration history | Columns and index added to `schema.prisma`; no migration | `prisma migrate diff` is empty |
| Server actions report errors by throwing | They return `{ success: false, error }`; the forms show it, including in a production build | `tests/integration/rebuttal-action.test.ts`; `tests/e2e/action-errors.spec.ts` (`npm run test:e2e:prod`) |
| `orgId` comes from the session token | Read from the database on every request | `tests/integration/stale-org.test.ts` |
| Login lockout lets anyone lock an account, and reveals that it exists | Lock is per (email, client IP); unknown emails behave identically | `tests/integration/security.test.ts` › "Rate limiting on login" |
| Other documents describe pre-fix behaviour | API_ROUTES.md, ARCHITECTURE.md, PERMISSIONS.md, TESTING.md updated | — |
| UploadThing callback, file sharing, templates, watermarking untested | Tested | `files.test.ts`, `uploadthing.test.ts`, `templates.test.ts`, `watermark.test.ts`, `share-page.spec.ts` |

## Fixed in round 2

| # | Severity | Issue | Proof |
|---|---|---|---|
| 1 | Critical | `GET /api/admin/access-review` always returned 500 (queried the removed `User.membership`) | `tests/integration/admin.test.ts` › "GET /api/admin/access-review — FIXED" |
| 2 | Critical | `submitRebuttal()` had no facility-ownership check | `tests/integration/rebuttal-action.test.ts` › "facility-ownership check (FIXED)" |
| 3 | High | `POST /api/rebuttal`, the facility page and the dashboards checked `createdById` instead of `organizationId` | `tests/integration/rebuttals.test.ts` › "ownership check is per-ORGANIZATION"; `tests/e2e/claim-button.spec.ts` tests 6 and 9 |
| 4 | High | `GET /api/rebuttal/[id]` had no authentication | `tests/integration/rebuttals.test.ts` › "GET /api/rebuttal/[id] — auth required…" |
| 5 | High | Facility claim quota race (was 13/15 trials over limit) | `tests/integration/facility-limits.test.ts` › "Race condition… (FIXED)": 0/20 and 0/15 over limit; `tests/integration/claim-action.test.ts` › "race conditions (FIXED)": 0/20 |
| 6 | Medium | Tier facility limits duplicated in three files | `tests/unit/permissions.test.ts` › "Tier limit single source of truth" |
| 7 | Medium | Soft-deleted facilities and rebuttals handled inconsistently | `tests/integration/claim-action.test.ts`; `tests/e2e/claim-button.spec.ts` test 8; `tests/integration/rebuttals.test.ts` › "Soft-deleted rebuttals…" |
| 8 | Medium | `linkSeatToOrg()` did not validate the org and allowed cross-org moves | `tests/integration/claim-action.test.ts` › linkSeatToOrg |
| 9 | Medium | Stripe webhook re-sent emails on every redelivery | `tests/integration/billing.test.ts` › "idempotency on duplicate delivery (FIXED)" |
| 10 | Low | ADMIN could submit rebuttals via the API | `tests/integration/rebuttals.test.ts` "ADMIN can NOT submit"; `tests/unit/permissions.test.ts` |
| 11 | Low | "Submit Rebuttal" CTA shown to members who do not own the facility | `tests/e2e/claim-button.spec.ts` tests 5 and 6 |
| 12 | Low | No rate limiting on the login password step | `tests/integration/security.test.ts` › "Rate limiting on login — per-account lockout" |
| 13 | Low | `(prisma as any).takedownRequest` | `tests/unit/prisma-query-shape.test.ts` |
| new | High | Public `GET /api/facility/[id]` returned the claimant's password hash and email | `tests/integration/security.test.ts` "FIXED (new finding, TEST_REPORT #16)" |

Decisions taken for the ambiguous items: cross-org seat moves are blocked;
only MEMBERs submit rebuttals; the webhook dedup uses a new table. Login
lockout was per account in round 2 and is per (email, client IP) since round
3 (5 attempts, 15 minutes). Files are private to the uploader (confirmed in
round 3).

## Tooling

- **`npx tsc --noEmit` does not catch invalid Prisma `select` / `include` /
  `where` / `data` fields** when at least one valid key is present. This is
  a property of Prisma's generic method signatures, not of an `any` or a
  cast (full explanation and reproduction in TEST_REPORT.md #10). It is now
  caught in CI by `tests/unit/prisma-query-shape.test.ts` (static, every
  Prisma call) and `tests/integration/route-smoke.test.ts` (runtime, every
  API route). Adding a route without a smoke case fails the suite.
- A stale `tsconfig.tsbuildinfo` was present at the start of the first
  pass. It was not masking anything; `*.tsbuildinfo` is git-ignored.

## Infrastructure / environment

- **Resolved in the first pass.** The local dev database (`carehomes`) had
  never been migrated through `prisma migrate`: there was no
  `_prisma_migrations` table and it was missing every table and column added
  since the 2026-07-24 `add_moderation_audit_trail` migration. It was fixed
  with the user's approval by taking a `pg_dump` backup, computing the
  additive delta with `prisma migrate diff`, applying it in one transaction,
  verifying row counts were unchanged, and marking the 15 migrations as
  applied with `prisma migrate resolve --applied`. The backup was written to
  a session-scoped scratch directory that has not survived that session.

## Minor

- **Removed.** The two stray files at the repo root, `d` and `ent-CH-4`
  (accidental shell-redirection output of `git branch`), were deleted with
  `git rm` after confirmation. The deletion is staged, not committed.
- The `dotenv` package (v17) prints a promotional "tip" line to stdout every
  time it loads an env file, including in production logs. It is a feature
  of that package version, not a security issue.

## Explicitly "not found" / not applicable

- No rate-limiting middleware or library exists in the dependency list. The
  rate limiting in the app is the OTP resend cooldown and attempt counter in
  `src/services/mfa.service.ts`, plus the login throttle in
  `src/services/login-throttle.service.ts`.
- No intake feature, no consent / e-signature flow, no file download route,
  no `AuditLog` model.
- No feature-flag or backwards-compatibility shim system exists.
