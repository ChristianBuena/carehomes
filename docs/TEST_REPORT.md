# Test Report

Run against a dedicated `carehomes_test` Postgres database (never the real
`carehomes` dev database), with Stripe and email mocked. See TESTING.md for
exact setup/mocking details. Every bug below was reproduced with an
automated test against the real application code — nothing in this report
is a guess from reading code alone; where a claim could not be verified by a
running test, it says so explicitly.

## Summary

| Area | Tests written | Passed | Failed | Skipped |
|---|---|---|---|---|
| A. Auth and session (signup/login/MFA/JWT) | 18 | 18 | 0 | 0 |
| B. Roles and permissions (`hasPermission` matrix) | 72 | 72 | 0 | 0 |
| C. Facility limits (API route) | 21 | 21 | 0 | 0 |
| C/D. Facility limits + multi-seat (server action) | 15 | 15 | 0 | 0 |
| D. Organization / seat linking | (included above) | — | — | — |
| E/F. Rebuttals — API route, IDOR, moderation | 18 | 18 | 0 | 0 |
| F. Rebuttals — server actions | 8 | 8 | 0 | 0 |
| H. Billing / Stripe (mocked) | 18 | 18 | 0 | 0 |
| Admin (access-review, archive logs) | 6 | 6 | 0 | 0 |
| I. Security / edge cases / IDOR / injection | 17 | 17 | 0 | 0 |
| JWT unit tests | 10 | 10 | 0 | 0 |
| E2E — claim button states (Playwright) | 7 | 7 | 0 | 0 |
| **Total** | **210** | **210** | **0** | **0** |

"Passed" above means the test ran and its assertion held — for confirmed
bugs, the assertion documents the actual (buggy) behavior, not the ideal
one; see each finding below for what "passing" means in that case. **No
test was skipped.** Every test that was written runs and passes against the
current codebase; "0 failed" reflects that the suite accurately describes
reality, not that the application has no bugs — the bugs are documented as
findings below and exercised as passing "confirms the bug" tests.

Build integrity (Step J): `npx prisma validate` ✅, `npx tsc --noEmit` ✅ (with
an important caveat, finding #10), `npm run build` ✅ against `carehomes_test`.
It initially failed against the real local dev `carehomes` database for an
environmental reason unrelated to the code (finding #15) — that database's
migration history was reconciled during this pass (with the user's approval)
and `npm run build` now also passes ✅ against it.

## Findings, most severe first

### 1. CRITICAL — `GET /api/admin/access-review` always fails (500), and the page is completely non-functional

- **File/line:** `src/app/api/admin/access-review/route.ts:34-40` (the `select` clause)
- **Also affects:** `src/app/dashboard/moderation/access-review/page.tsx` (calls this exact endpoint)
- **Expected:** returns the list of users due for access review (ADMIN/MODERATOR).
- **Actual:** every call throws `PrismaClientValidationError: Unknown field 'membership' for select statement on model 'User'` and the route's catch block returns a generic 500.
- **Why:** CH-18 moved `Membership` off `User` onto `Organization` (`Organization.membership`), but this query still does `prisma.user.findMany({ select: { ..., membership: { select: { plan, status } } } })`. The CH-18 PR description itself flags this exact risk ("ensure downstream components reference `user.organization.membership` rather than the deprecated `user.membership` structure") — this one query was missed.
- **Confirmed by:** `tests/integration/admin.test.ts` — calls the real route handler as ADMIN and as MODERATOR, both get 500; MEMBER correctly gets 403 before the broken query ever runs.
- **Important side-finding:** `npx tsc --noEmit` does **not** catch this — see finding #10. "The build passes" gave zero warning that this endpoint is dead.
- **Suggested fix:** change the `select` to go through the relation:
  ```ts
  select: {
    id: true, name: true, email: true, role: true, createdAt: true, lastReviewedAt: true,
    organization: { select: { membership: { select: { plan: true, status: true } } } },
  }
  ```
  and update the client page's `ReviewUser` type / rendering (`user.membership` → `user.organization?.membership`) to match.

### 2. CRITICAL — `submitRebuttal()` server action has no facility-ownership check at all

- **File/line:** `src/app/actions/rebuttals.ts:14-76`
- **Expected (per task spec, item F):** "A user from another org cannot submit a rebuttal for that facility (expect 403)."
- **Actual:** any authenticated user — regardless of org, regardless of whether they've ever claimed anything, even targeting a facility with `organizationId: null, createdById: null` — can successfully create a `Rebuttal` row for it. There is no permission check and no ownership check of any kind; the function only validates that required form fields are present and the redaction checkbox is ticked.
- **Confirmed by:** `tests/integration/rebuttal-action.test.ts` — a user in Org B successfully submits a rebuttal for a facility claimed by Org A; a user successfully submits a rebuttal for a completely unclaimed facility.
- **Exploitability note:** the normal `/dashboard/rebuttals/new` form only lists the caller's own claimed facilities in its dropdown, so casual UI navigation doesn't surface this — but the `facilityId` is just a hidden form field with no server-side revalidation, so anyone editing that field (browser devtools) or posting directly to the action reaches this path.
- **Suggested fix:** before creating the rebuttal, look up the facility and require `facility.organizationId === user.orgId` (mirroring, correctly this time, what finding #3 shows the API route should have done).

### 3. HIGH — `POST /api/rebuttal` (and the facility detail page's UI state) checks the wrong field for multi-seat ownership

- **File/line:** `src/app/api/rebuttal/route.ts:51` (`facility.createdById !== user.userId`); `src/app/(public)/facilities/[slug]/page.tsx:99-100` (`isClaimedByCurrentUser`/`isClaimedByOther`)
- **Expected (per task spec, item F and the CH-18 PR's own stated goal):** "Any org member can submit a rebuttal for any facility the org owns."
- **Actual:** both the API route and the UI compare against the individual claiming user's id, not the org id. A second member of the *same* org as the person who physically clicked "Claim" is treated identically to a total stranger: the API returns 403, and the facility page renders a disabled "Already Claimed" button instead of "Submit Rebuttal".
- **Confirmed by:** `tests/integration/rebuttals.test.ts` (API-level) and, live in a real browser, `tests/e2e/claim-button.spec.ts` ("CONFIRMS BUG LIVE IN THE BROWSER..." test) — a teammate sees the disabled "Already Claimed" button and no "Submit Rebuttal" CTA.
- **Suggested fix:** change both checks to `facility.organizationId === user.orgId`.

### 4. HIGH — `GET /api/rebuttal/[id]` has no auth and leaks un-moderated content + submitter PII

- **File/line:** `src/app/api/rebuttal/[id]/route.ts:7-23`; `src/services/rebuttal.service.ts:33-41` (`getRebuttalById` doesn't filter by status)
- **Expected:** rebuttal detail should be gated the same way the rest of the moderation workflow is, or at minimum only expose `APPROVED` content publicly (as `/api/rebuttal/published` correctly does).
- **Actual:** a fully anonymous request to this endpoint returns a `PENDING` or `REJECTED` rebuttal's full content, document URL, and the submitting member's name and email.
- **Confirmed by:** `tests/integration/rebuttals.test.ts` — anonymous GET on a PENDING and on a REJECTED rebuttal both return 200 with full content and the author's email.
- **Suggested fix:** require auth + `moderate_rebuttals` OR ownership for non-APPROVED rebuttals; or filter to `status: APPROVED` for anonymous callers (mirroring `/api/rebuttal/published`).

### 5. HIGH — Facility claim quota check has a real, reproducible race condition

- **File/line:** `src/app/api/facility/route.ts:55-64` (count, then create — not in a transaction)
- **Expected (task spec item I):** report the race honestly.
- **Actual:** two concurrent `POST /api/facility` requests from the same TIER_A (limit 1) org, both starting from count 0, can both pass the `canClaimFacility` check and both succeed, leaving the org with 2 facilities against a limit of 1.
- **Confirmed by:** `tests/integration/facility-limits.test.ts` — 15 trials of the exact race, run against the real route handler and real Postgres connections: **the limit was exceeded in 13/15 trials.** This is timing-dependent (not 15/15, not 0/15), which the test explicitly reports rather than asserting a single fixed outcome.
- **Note:** the `claimFacility` server action (the *other* claim path) has the identical pattern (count-then-update, no transaction) and is very likely equally racy, though it wasn't separately load-tested since it can't be driven concurrently through the `@/lib/auth`-mocking test harness the same way a route can.
- **Suggested fix:** wrap the count-check and the create/update in a single `prisma.$transaction` with `Serializable` isolation, or enforce the limit with a database-level constraint/trigger, or use an atomic `UPDATE ... WHERE (SELECT COUNT(*) ...) < limit`-style conditional write.

### 6. MEDIUM — Tier facility limits are hand-maintained in three separate places

- **Files:** `src/lib/permissions.ts` (`TIER_FACILITY_LIMITS`), `src/config/tiers.ts` (`TIER_LIMITS`), `src/app/api/stripe/webhook/route.ts` (`tierConfig`)
- All three currently agree (`{NONE:0, TIER_A:1, TIER_B:3, TIER_C:10}`), confirmed by `tests/unit/permissions.test.ts`. The duplication is intentional per a comment in `permissions.ts` (Edge-compatible middleware can't import anything that pulls in `@prisma/client`), but there is no automated check tying the three together — a future edit to one without the other two would silently desync pricing from enforcement.
- **Suggested fix:** at minimum, a shared test (now added — see above) that fails loudly if they ever diverge; ideally, generate the Edge-safe copy from the canonical one at build time instead of hand-duplicating it.

### 7. MEDIUM — Soft-deleted facilities are inconsistently counted toward the org's quota

- **Files:** `src/app/actions/claimFacility.ts:24-26` (no `deletedAt: null` filter) vs. `src/app/api/facility/route.ts:55-56` (filters it)
- **Confirmed by:** `tests/integration/claim-action.test.ts` — an org with one soft-deleted facility is treated as *at* its TIER_A limit by the `claimFacility` action (count=1, blocked) but as empty by the `/api/facility` route (count=0, allowed), for the identical database state.
- **Suggested fix:** add `deletedAt: null` to the count query in `claimFacility.ts`.

### 8. MEDIUM — `linkSeatToOrg()` has two validation gaps

- **File:** `src/app/actions/linkSeatToOrg.ts`
- **Gap A:** no upfront check that `orgId` refers to a real `Organization`. It's still rejected (the DB foreign-key constraint throws), but surfaces as the generic `"Failed to link seat to organization"` rather than a clear `"Organization not found"`.
- **Gap B:** no check for whether the target user already belongs to a *different* org. The task description says to test for this "if that is the rule" — it is not enforced. A user can be silently moved between orgs; their previously-claimed facilities stay pointed at the old `organizationId`, now orphaned from any user currently in that org.
- **Confirmed by:** `tests/integration/claim-action.test.ts` (both gaps, including proving the orphaned facility stays attributed correctly but to a now-unreachable-from-that-org state).
- **Suggested fix:** `prisma.organization.findUnique` check before the update, returning a clear 404-equivalent message; decide and enforce a policy on cross-org seat moves (block, or explicitly transfer/release their facilities).

### 9. MEDIUM — Stripe webhook has no event-level idempotency; DB is safe, emails are not

- **File:** `src/app/api/stripe/webhook/route.ts`
- All DB writes use `upsert`/`updateMany` keyed by `organizationId` or `stripeSubscriptionId`, so replaying the same event is harmless to the database. There is no `event.id` tracking table, though, so every handler's email send re-fires on every redelivery.
- **Confirmed by:** `tests/integration/billing.test.ts` — the same `checkout.session.completed` event delivered twice results in exactly one `Membership` row (correct), but `sendEmail` is called twice (confirmed double-send).
- **Suggested fix:** record processed `event.id`s (even a short-TTL table) and short-circuit side effects (not necessarily the DB writes, which are already safe) on a repeat.

### 10. MEDIUM — `npx tsc --noEmit` does not catch invalid Prisma Client `select`/`include` fields

- This is a tooling finding, confirmed by direct reproduction, not a guess: the exact `select` object from finding #1 (`membership` on a `User` query) type-checks cleanly with zero TypeScript errors (verified on a clean incremental-build cache, i.e. not a stale `tsconfig.tsbuildinfo` artifact — see below), yet throws at runtime every time. This project's Prisma 7 + the newer `prisma-client` generator (as opposed to the classic `prisma-client-js`) appears to generate `select` types that don't reject unknown relation names at compile time.
- **Practical implication:** "the build passes" and "`tsc --noEmit` is clean" are not evidence that Prisma queries are schema-valid in this codebase. Only a test that actually executes the query against a real database (as this test pass's integration suite now does) can catch this class of bug. There were zero such tests before this pass.
- **Side note, also confirmed:** the repo had a stale `tsconfig.tsbuildinfo` (incremental build cache, dated well before the most recent schema changes) checked into the working tree at the start of this session. It did not happen to be masking anything load-bearing here (the finding above was reproduced from a genuinely clean rebuild), but a stale incremental cache is a general risk for silently skipping re-checks — consider adding `*.tsbuildinfo` cleanup to CI or verifying `tsc --noEmit` is occasionally run with a clean cache.

### 11. LOW — ADMIN actually *can* submit rebuttals via the API, contradicting the route's own comments

- **File:** `src/app/api/rebuttal/route.ts:19-25` (comment: "only MEMBERs may submit rebuttals"; error message: "Admins and moderators cannot submit rebuttals") vs. `src/lib/permissions.ts` (ADMIN's permission list includes `submit_rebuttal`)
- **Confirmed by:** `tests/integration/rebuttals.test.ts` — an ADMIN's `POST /api/rebuttal` returns 200, not 403.
- The dashboard page (`/dashboard/rebuttals/new`) separately blocks ADMIN via an explicit `user.role === "ADMIN"` check, so this is only reachable by calling the API directly, not through normal navigation. Low severity, but a real inconsistency between three independent places that all claim to express the same rule (permission table, API error copy, UI role check) and don't agree.
- **Suggested fix:** either remove `submit_rebuttal` from ADMIN's permission list, or update the route's comment/message and decide the rule once.

### 12. LOW — "Submit Rebuttal" CTA shown to non-owners on the facility page

- **File:** `src/components/facilities/ApprovedRebuttalsSection.tsx:152` (and the "Are you the operator of this facility? Submit a rebuttal as a member." banner at line 204-205)
- Gated only by `hasActiveMembership`, not by facility ownership — any active member sees this on any facility with zero published rebuttals, regardless of whether they have any relationship to it.
- **Not independently exploitable**: it links to `/dashboard/rebuttals/new`, whose facility picker is separately scoped to the user's own claimed facilities (`src/app/dashboard/rebuttals/new/page.tsx:24-28`), so clicking it does not let you submit for the facility you were viewing unless you already own it.
- **Confirmed by:** `tests/e2e/claim-button.spec.ts` (documented, not asserted as a defect, per the test's own comment).
- **Suggested fix:** gate the CTA/copy on ownership too, for clarity, even though it's not a security gap today.

### 13. LOW — No rate limiting on the login password step

- **File:** `src/app/api/auth/login/route.ts`
- The post-OTP step is well-protected (5-attempt lockout, single-use codes, 60s resend cooldown — all confirmed working in `tests/integration/auth.test.ts`). The password step itself has no lockout, delay, or CAPTCHA.
- **Confirmed by:** `tests/integration/security.test.ts` — 10 consecutive wrong-password attempts against the same account all return an identical 401 with no escalation.
- **Suggested fix:** add a per-account or per-IP rate limit on `/api/auth/login`.

### 14. LOW (code quality) — one remaining `as any` in the codebase

- **File/line:** `src/app/api/takedown/[id]/route.ts:12` — `const takedownDelegate = (prisma as any).takedownRequest;`
- Violates this project's own "strict TypeScript, no `any`" rule (AGENTS.md). Not independently tested as a functional bug (the takedown PATCH/GET routes otherwise behave correctly in the parts exercised), but worth fixing for consistency.

## Environment finding (not a code bug, but blocked an honest build-integrity check)

### 15. RESOLVED — the local dev database (`carehomes`) had never been migrated via `prisma migrate` and was missing most of the current schema

- There was no `_prisma_migrations` table in it at all (confirmed via `psql`). It had only 6 tables (`User`, `Organization`, `Membership`, `Facility`, `Rebuttal`, `MfaOtp`) — everything from the `add_moderation_audit_trail` migration (2026-07-24) onward was absent: `ModerationLog`, `ArchivedModerationLog`, `Template`, `TemplateDownload`, `TakedownRequest`, `ConsentLog`, `MemberFile`, `FileShareLink`, `FileShareLinkFile`, `FileShareAccessLog`, `MembershipAgreement`, plus newer columns on existing tables (`Rebuttal.deletedAt`/`watermarkedUrl`, etc).
- **Impact (before the fix):** `npm run build` failed against this database (the home page's build-time data fetch threw `P2022: column Rebuttal.deletedAt does not exist`). If the app were actually run against this database, `/dashboard/deadlines`, `/dashboard/moderation`, `/dashboard/templates`, takedowns, file storage/sharing, and the consent flow would all have thrown `relation does not exist` errors.
- **What I did:** diagnosed this with read-only `psql \dt`/`\d` commands first, then asked the user how to proceed (baseline-and-forward-migrate vs. reset vs. leave it) since it's their real local database. They chose the non-destructive baseline option. I took a full `pg_dump` backup, computed the exact additive delta with `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`, reviewed it line-by-line to confirm there were zero `DROP`/`DELETE`/`TRUNCATE` statements, applied it inside a single transaction, verified row counts were identical before/after (no data loss), and then marked all 15 migrations as applied via `prisma migrate resolve --applied` so `prisma migrate status` now reports a clean, in-sync history. `npm run build` now passes against the real `carehomes` database too. Full details and the exact commands are in KNOWN_ISSUES.md.

## What was not tested, and why

The task's explicit emphasis (and the vast majority of this report) is the
CH-18 organization/multi-seat change and the core auth/permissions/facility/
rebuttal/billing business rules — these got exhaustive coverage. Given the
overall size of this codebase (30+ API routes, 4 server actions, ~90 pages),
the following were read and documented in API_ROUTES.md but not given
dedicated automated test coverage in this pass:

- Member file storage and attorney share-link flows (`/api/files*`,
  `/api/share/[token]`) — read and documented as apparently correct
  (ownership checks present, cryptographically random tokens, revocation/
  expiry handled), not independently verified by a running test.
- Template library (`/api/templates*`) — same: read and documented, not
  independently tested.
- Takedown/incident admin actions beyond the public submission endpoint
  (`resolve`/`reject`/`emergency_takedown`/`assign` on `PATCH
  /api/takedown/[id]`) — the public `POST /api/takedown` intake path was not
  separately given its own test file (it's a straightforward Zod-validated
  public form; no auth/role logic to exercise).
- `POST/GET /api/rebuttal/watermark` (PDF watermarking) — not exercised; it
  depends on `pdf-lib` and document URLs that weren't part of this pass's
  fixtures.
- Facility search/filter query building (`src/services/facility.service.ts`'s
  `buildWhereClause`) — read, looks correct, not independently tested.
- `/dashboard/facilities` "Claimed by" label rendering and
  `/dashboard/settings` beyond basic auth-gate — not covered by the E2E
  suite (which focused on `ClaimFacilityButton` states specifically, per the
  task's explicit emphasis on item E).
- The membership-agreement / e-signature (`ConsentLog`) flow — not exercised.
- Any load/performance testing — out of scope for this pass.
