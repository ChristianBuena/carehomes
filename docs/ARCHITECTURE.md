# Architecture

## Data model

Defined in `prisma/schema.prisma`. The core entities, in rough dependency order:

### Organization

The billing and quota unit. Created automatically at signup (one personal
org per new user) or by an admin. Owns exactly one `Membership` and zero or
more `Facility` rows and `User` rows.

### User

```
id, name, email (unique), password (bcrypt hash), role (MEMBER | MODERATOR | ADMIN)
organizationId  -- nullable, FK to Organization, onDelete: SetNull
failedLoginAttempts, lockedUntil  -- UNUSED since round 3 (see LoginAttempt); kept so nothing is dropped
```

A user with `organizationId = null` is valid (e.g. a brand-new row created
directly, or a legacy edge case) — routes that look up `Membership` by
`organizationId` handle this safely (the lookup simply finds nothing and the
route returns 403/empty rather than crashing — verified in
`tests/integration/facility-limits.test.ts`).

### Membership

```
id, organizationId (unique, FK -> Organization, onDelete: Cascade)
plan: NONE | TIER_A | TIER_B | TIER_C
status: ACTIVE | INACTIVE | PAST_DUE | CANCELED
maxFacilities: Int
stripeCustomerId, stripeSubscriptionId
startDate, endDate, nextBillingDate
canceledAt  -- declared so the schema matches the migrations; no code reads or writes it
```

One membership per organization (`organizationId` is `@unique`). This is the
single row Stripe webhooks update. `maxFacilities` is denormalized onto this
row by the webhook/membership-update routes for display purposes, but the
actual limit enforcement at claim time is computed from `plan` via
`canClaimFacility()`/`TIER_FACILITY_LIMITS` (see PERMISSIONS.md) — not read
from this `maxFacilities` field. Every writer of `maxFacilities` now takes
the number from `TIER_FACILITY_LIMITS`, so the two cannot drift.

### Facility

```
id, slug (unique), name, address, ... , deletedAt (soft delete)
createdById    -- nullable, FK -> User, onDelete: SetNull  (AUDIT: who physically claimed it, never changes)
organizationId -- nullable, FK -> Organization, onDelete: SetNull  (QUOTA: which org's count it is)
```

This dual-FK design is CH-18's multi-seat mechanism: every ownership and
quota check uses `organizationId`, while `createdById` stays as a historical
"who actually clicked claim" record. Since the round-2 fixes this holds on
the claim path, the rebuttal-submission route and action, the rebuttal read
route, the public facility page and the dashboard pages.

### Rebuttal

```
id, title, content, documentUrl, watermarkedUrl, status, deletedAt
userId      -- who authored it
facilityId  -- nullable, which facility it's about
moderatedById -- nullable, which moderator/admin last acted on it
```

`status` moves PENDING → APPROVED | REJECTED | REQUEST_FIX via
`src/services/moderation.service.ts`, which also writes a `ModerationLog`
row on every transition (even a no-op transition to the same status still
logs, though the moderation API route skips sending a notification email in
that case).

### MfaOtp

```
id, email, code, expiresAt, attempts, used, createdAt
```

Not tied to a `userId` — looked up by `email` because the OTP step happens
before the caller has a full session. A single mfa-pending JWT (separate,
short-lived, `purpose: "mfa_pending"`) binds the OTP step to the email that
passed the password check, so the OTP endpoints never trust an email supplied
in the request body. See "Auth / JWT flow" below.

### LoginAttempt

```
id, email, ipAddress, failedAttempts, lastFailedAt, lockedUntil
@@unique([email, ipAddress])
```

Login throttling state, one row per (email, client IP) pair that has failed
the password step. `email` is whatever was typed, lower-cased, and need not
belong to an account. See "Auth / JWT flow" step 2.

### ProcessedStripeEvent

```
id (the Stripe event id), type, processedAt
```

One row per handled Stripe webhook event, used to make redelivery a no-op.

### Other models

`CitationDeadline` (per-user, MEMBER-only), `ModerationLog` /
`ArchivedModerationLog` (audit trail + 1-year archival job),
`Template`/`TemplateDownload` (template library), `TakedownRequest` (72-hour
SLA incident workflow), `MemberFile`/`FileShareLink`/`FileShareLinkFile`/`FileShareAccessLog`
(private file storage + time-limited attorney share links; files belong to
the uploading **user**, not to the organization).

`ConsentLog` and `MembershipAgreement` (e-signature audit trail for the
membership agreement) exist in the schema only. No route, server action,
page, service or seed reads or writes them, so there is no signing flow.
`ConsentLog.documentPublicId` is declared so the schema matches the
migrations; nothing uses it.

The schema and the migration history agree: `prisma migrate diff` between a
fully migrated database and `schema.prisma` is empty (checked in round 3).

## How multi-seat works (CH-18)

1. **Signup** (`src/app/api/auth/signup/route.ts`) creates one `Organization`
   + one `Membership` (plan `NONE`, status `INACTIVE`) + one `User` pointing
   at that org, all in one request. There is no "join an existing org" flow
   at signup — every new signup gets its own fresh org.
2. **Adding a second seat to an org** is a manual, ADMIN-only action:
   `linkSeatToOrg(targetUserId, orgId)` in `src/app/actions/linkSeatToOrg.ts`.
   It only links a user who has **no** organization, to an organization
   that exists; moving a user who is already in another org is refused.
   There is no self-service "invite a teammate" flow.
3. **The user's organization is read from the database on every request.**
   The JWT still carries the `orgId` it was issued with, but
   `resolveSessionUser()` in `src/lib/auth.ts` replaces it with the current
   `User.organizationId` (one indexed primary-key lookup per request). A seat
   that is linked, moved or removed therefore sees the change on its next
   request, without signing in again. See "Auth / JWT flow" step 4.
4. **Claiming a facility** checks the *organization's* current facility count
   against its tier limit (`canClaimFacility`), not the individual user's.
   The check and the write are atomic: `withOrgFacilityQuota()` locks the
   `Organization` row for the transaction. Covered in
   `tests/integration/claim-action.test.ts` and
   `tests/integration/facility-limits.test.ts` (tier boundaries, cross-org
   isolation, same-org sharing, no-org safety, concurrency).
5. **Submitting a rebuttal** requires the facility's `organizationId` to be
   the caller's current organization, in both `POST /api/rebuttal` and the
   `submitRebuttal()` server action, so any seat in the owning org can
   submit. Only MEMBERs can submit.
6. **Billing** activates/updates the `Membership` keyed by `organizationId`
   (from Stripe metadata), so it is already multi-seat-correct — any seat's
   dashboard reflects the same org-level plan/status.

## Auth / JWT flow

1. `POST /api/auth/signup` — creates org+membership+user, hashes password
   with bcrypt (cost 10).
2. `POST /api/auth/login` — first checks the throttle for this (email,
   client IP) pair and answers 429 if it is locked. Then verifies the
   password. A failure (wrong password **or** unknown email) is counted in
   `LoginAttempt`; the 5th failure within 15 minutes locks the pair for 15
   minutes. Because the lock is per address, an attacker who knows an email
   locks only their own address and the real owner can still sign in from
   theirs. The client IP comes from `X-Forwarded-For` (first entry), so the
   app must sit behind a proxy that overwrites that header. On success the
   pair's history is cleared, an
   `MfaOtp` row is created (unless a resend cooldown is active) and the code is emailed.
   Issues a short-lived (`10 min`) `mfa-pending` cookie (httpOnly,
   `path: /api`) whose JWT payload is `{ email, purpose: "mfa_pending" }` —
   **not** a session token. `verifyToken()` explicitly rejects any token
   whose payload has `purpose === "mfa_pending"`, so this token can never be
   used to authenticate a normal request even if leaked into the wrong cookie
   jar.
3. `POST /api/auth/verify` (aliased at `/api/mfa/verify`) — reads the email
   from the `mfa-pending` cookie (never from the request body), verifies the
   6-digit OTP via constant-time comparison (`crypto.timingSafeEqual`),
   enforces `OTP_MAX_ATTEMPTS = 5` (the OTP is invalidated after 5 wrong
   guesses, and is single-use). On success, issues the real `auth-token`
   session cookie — a 7-day JWT with
   `{ userId, email, role, orgId }` — and clears the `mfa-pending` cookie.
4. Every subsequent authenticated request reads `auth-token`. There are two
   ways to turn it into a user, and which one a handler uses matters:
   - `resolveSessionUser(token)` / `getUserFromRequest()` in
     `src/lib/auth.ts` verify the token **and** load the user's current
     `organizationId` from the database. Everything that makes an
     organization-ownership decision uses these: all server actions, the
     dashboard and facility pages, `POST /api/facility`, `POST /api/rebuttal`,
     `GET`/`DELETE /api/rebuttal/[id]`, the Stripe checkout and portal
     routes, and the `roleGuard` helpers. They return null (→ 401) if the
     user no longer exists.
   - `verifyToken(token)` in `src/lib/jwt.ts` only verifies the signature.
     Routes whose checks need just `userId` and `role` still call it
     directly (files, share links, deadlines, moderation, takedowns,
     watermark, admin, UploadThing). `role` is therefore still token-based
     and can be up to 7 days stale after a role change.
   A static test (`tests/integration/stale-org.test.ts`) fails if any file
   reads `.orgId` from a `verifyToken()` result.
5. `src/middleware.ts` enforces authentication (401/redirect) for
   `/dashboard/*`, `/moderation/*`, `/admin/*`, `/api/admin/*`, `/member/*`
   only. **Most API routes are not in the middleware matcher** — they each
   do their own `verifyToken`/`hasPermission` check inline. This was
   verified route-by-route (see API_ROUTES.md); the ones that are missing a
   check entirely are called out explicitly.

## Stripe flow

- **Organization creation happens BEFORE checkout**, at signup — not inside
  the webhook. The webhook only ever activates/updates a `Membership` that
  already has an `organizationId` to attach to.
- `POST /api/stripe/checkout` creates a Checkout Session with
  `metadata: { orgId, userId, priceId }` and `client_reference_id: orgId`.
- `POST /api/stripe/webhook` verifies the signature via
  `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`
  and handles: `checkout.session.completed` (activate/upsert membership),
  `invoice.payment_succeeded` (renew, reset PAST_DUE → ACTIVE),
  `invoice.payment_failed` (→ PAST_DUE), `invoice.upcoming` (reminder email
  only), `customer.subscription.deleted` (→ CANCELED, plan NONE,
  maxFacilities 0). All DB writes use `upsert`/`updateMany` keyed by
  `organizationId` or `stripeSubscriptionId`. Each `event.id` is also
  claimed in `ProcessedStripeEvent` before it is handled, so a redelivered
  event is acknowledged without re-sending its confirmation, renewal or
  cancellation email. A failed handler releases its claim so Stripe's retry
  is processed normally.
- `POST /api/stripe/portal` opens a Billing Portal session for the org's
  `stripeCustomerId`.
- `POST /api/membership/update` is a separate ADMIN-only manual override
  (`manage_memberships` permission) for support/testing — members can only
  reach an ACTIVE paid plan through the real Stripe flow.

## Tier limits: one table

`TIER_FACILITY_LIMITS` in `src/lib/permissions.ts` is the only place the
`{ NONE: 0, TIER_A: 1, TIER_B: 3, TIER_C: 10 }` mapping is written. It lives
there because that file is Edge-safe (no `@prisma/client` import).
`TIER_LIMITS` in `src/config/tiers.ts` is the same object re-exported with a
`Record<MembershipPlan, number>` type, and the Stripe webhook, the
membership-update route and the seed import the numbers rather than repeat
them. `tests/unit/permissions.test.ts` ("Tier limit single source of truth")
fails if a second copy appears.

## Server actions return their errors

`submitRebuttal()`, `updateRebuttal()`, `claimFacility()` and
`linkSeatToOrg()` return `{ success: true }` or `{ success: false, error }`
and never throw a message meant for the user. Next.js replaces the message of
an error thrown from a server action with a generic one in production builds,
so a thrown message is readable only in development. Unexpected failures are
logged on the server and returned as "Something went wrong. Please try
again." The three rebuttal forms render the returned error in a
`role="alert"` element.
