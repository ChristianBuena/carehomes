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
```

One membership per organization (`organizationId` is `@unique`). This is the
single row Stripe webhooks update. `maxFacilities` is denormalized onto this
row by the webhook/membership-update routes for display purposes, but the
actual limit enforcement at claim time is computed from `plan` via
`canClaimFacility()`/`TIER_FACILITY_LIMITS` (see PERMISSIONS.md) — not read
from this `maxFacilities` field. This means `maxFacilities` and the live
`TIER_FACILITY_LIMITS` table can only drift apart if someone edits one
without the other (see KNOWN_ISSUES.md).

### Facility

```
id, slug (unique), name, address, ... , deletedAt (soft delete)
createdById    -- nullable, FK -> User, onDelete: SetNull  (AUDIT: who physically claimed it, never changes)
organizationId -- nullable, FK -> Organization, onDelete: SetNull  (QUOTA: which org's count it is)
```

This dual-FK design is CH-18's intended multi-seat mechanism: the quota check
is supposed to use `organizationId` everywhere, while `createdById` stays as
a historical "who actually clicked claim" record. In practice, this is only
followed consistently on the *claim* path. The *rebuttal-submission* path
still gates on `createdById` (or doesn't gate at all) — see TEST_REPORT.md
finding #1/#2, this is the single biggest gap found in this test pass.

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

### Other models

`CitationDeadline` (per-user, MEMBER-only), `ModerationLog` /
`ArchivedModerationLog` (audit trail + 1-year archival job),
`Template`/`TemplateDownload` (template library), `TakedownRequest` (72-hour
SLA incident workflow), `ConsentLog` (e-signature audit trail for the
membership agreement), `MemberFile`/`FileShareLink`/`FileShareLinkFile`/`FileShareAccessLog`
(private file storage + time-limited attorney share links).

## How multi-seat works (CH-18)

1. **Signup** (`src/app/api/auth/signup/route.ts`) creates one `Organization`
   + one `Membership` (plan `NONE`, status `INACTIVE`) + one `User` pointing
   at that org, all in one request. There is no "join an existing org" flow
   at signup — every new signup gets its own fresh org.
2. **Adding a second seat to an org** is a manual, ADMIN-only action:
   `linkSeatToOrg(targetUserId, orgId)` in `src/app/actions/linkSeatToOrg.ts`.
   It re-points `User.organizationId`. There is no self-service "invite a
   teammate" flow.
3. **The JWT carries `orgId`** (see below), so every authenticated request
   already knows which org's quota to check without an extra lookup in most
   cases.
4. **Claiming a facility** checks the *organization's* current facility count
   against its tier limit (`canClaimFacility`), not the individual user's —
   this is the part of CH-18 that works as designed, and is covered
   extensively in `tests/integration/claim-action.test.ts` and
   `tests/integration/facility-limits.test.ts` (tier boundaries, cross-org
   isolation, same-org sharing, no-org safety).
5. **Submitting a rebuttal for a facility the org owns** is where CH-18 is
   incomplete — see TEST_REPORT.md. The REST route checks the wrong field
   (`createdById` instead of `organizationId`), and the server action used by
   the dashboard form checks nothing at all.
6. **Billing** activates/updates the `Membership` keyed by `organizationId`
   (from Stripe metadata), so it is already multi-seat-correct — any seat's
   dashboard reflects the same org-level plan/status.

## Auth / JWT flow

1. `POST /api/auth/signup` — creates org+membership+user, hashes password
   with bcrypt (cost 10).
2. `POST /api/auth/login` — verifies password; on success, creates an
   `MfaOtp` row (unless a resend cooldown is active) and emails the code.
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
4. Every subsequent authenticated request reads `auth-token`, either via
   `NextRequest.cookies` directly (most API routes) or via
   `getUserFromRequest()` in `src/lib/auth.ts` (server actions and a few
   routes), which wraps `next/headers` `cookies()` + `verifyToken()`.
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
  `organizationId` or `stripeSubscriptionId`, which makes them naturally
  idempotent on redelivery — **but there is no `event.id` dedup table, so a
  redelivered webhook event sends its confirmation/renewal/cancellation email
  again** (confirmed in TEST_REPORT.md: DB state stays correct, email count
  doubles).
- `POST /api/stripe/portal` opens a Billing Portal session for the org's
  `stripeCustomerId`.
- `POST /api/membership/update` is a separate ADMIN-only manual override
  (`manage_memberships` permission) for support/testing — members can only
  reach an ACTIVE paid plan through the real Stripe flow.

## Known structural inconsistency: three copies of the tier limit table

`TIER_FACILITY_LIMITS` (`src/lib/permissions.ts`), `TIER_LIMITS`
(`src/config/tiers.ts`), and `tierConfig` (`src/app/api/stripe/webhook/route.ts`)
all hard-code the same `{ NONE: 0, TIER_A: 1, TIER_B: 3, TIER_C: 10 }` mapping
independently, with a comment in `permissions.ts` explaining the duplication
is intentional (Edge-compatible middleware can't import a module that
transitively pulls in `@prisma/client`). All three currently agree. There is
no automated check that they stay that way — see KNOWN_ISSUES.md.
