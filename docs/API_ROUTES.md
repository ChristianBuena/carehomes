# API Routes and Server Actions

Method, auth, role/permission, request body, and response codes for every
route under `src/app/api/**` and every server action under
`src/app/actions/**`, verified by reading the actual handler code (not
guessed). Status codes marked "confirmed" were exercised by the automated
test suite; others are read from the code but not independently exercised —
see TEST_REPORT.md for exactly which routes have test coverage.

Cookies used throughout: `auth-token` (7-day session JWT) and `mfa-pending`
(10-minute, login-step-2-only JWT, `path: /api`).

---

## Auth

### `POST /api/auth/signup`
- Auth: none. Role: none.
- Body: `{ name, email, password, confirmPassword }`
- 201 `{ success: true, message, userId }` — creates Organization + Membership(NONE/INACTIVE) + User (confirmed)
- 400 missing fields / password mismatch / password < 8 chars (confirmed)
- 409 email already in use (confirmed)
- 500 on unexpected error

```json
// Request
{ "name": "Jane Doe", "email": "jane@example.com", "password": "password123", "confirmPassword": "password123" }
// 201 Response
{ "success": true, "message": "User created successfully", "userId": "cl..." }
```

### `POST /api/auth/login`
- Auth: none.
- Body: `{ email, password }`
- 200 `{ success, mfaRequired: true, email, message }`, sets `mfa-pending` cookie, emails an OTP (confirmed)
- 400 missing email/password
- 401 invalid credentials — same message for "no such user" and "wrong password" (confirmed, does not leak account existence)
- 500 unexpected error

### `POST /api/auth/verify` (aliased by `POST /api/mfa/verify`)
- Auth: requires `mfa-pending` cookie (not `auth-token`).
- Body: `{ otp }` (or legacy `{ code }`), must be 6 digits
- 200 `{ success: true, message }`, sets `auth-token` (7d), clears `mfa-pending` (confirmed)
- 400 OTP not 6 digits
- 401 no/expired mfa-pending cookie, wrong OTP, expired OTP, reused OTP, or OTP invalidated after 5 attempts (all confirmed)
- 404 user not found (edge case: deleted between login and verify)
- 500 orgless user (`organizationId` null) — returns 500 with a clear message rather than issuing a tokenless/orgless session (confirmed via code read)

```json
// Request
{ "otp": "483920" }
// 200 Response
{ "success": true, "message": "OTP verified successfully" }
```

### `POST /api/mfa/generate`
- Auth: requires `mfa-pending` cookie.
- Body: none
- 200 `{ success: true, message: "OTP sent" }`
- 401 no/expired mfa-pending cookie
- 429 resend cooldown active (60s), `Retry-After` header set (confirmed)

### `GET /api/auth/me`
- Auth: `auth-token`.
- 200 `{ id, name, email, role, organization: { ..., membership } }` (confirmed)
- 401 no cookie / invalid token (confirmed)
- 404 user not found
- 500 unexpected error

### `POST /api/auth/logout`
- Auth: none required (idempotent).
- 200 `{ success: true, message }`, clears `auth-token` (confirmed)

---

## Facilities

### `GET /api/facility`
- Auth: none (public directory).
- Query: filters passed through to `getFacilities()` (not exercised by this test pass's filter logic directly — see KNOWN_ISSUES.md)
- 200 `{ facilities: [...], total }`

### `POST /api/facility`
- Auth: `auth-token`. Permission: `claim_facility`.
- Body: `{ name, address, description? }`
- **This creates a brand-new Facility row owned by the caller's org** — it is
  not the same operation as the `claimFacility` server action, which claims
  an *existing* row by id. See ARCHITECTURE.md / TEST_REPORT.md.
- 201 the created facility, with `createdById` + `organizationId` set (confirmed)
- 400 missing name/address (confirmed)
- 401 no token (confirmed)
- 403 insufficient permission, no/inactive membership, or at tier limit — message `"Facility limit reached — upgrade your plan to claim more facilities."` (all confirmed)
- Quota count filters `deletedAt: null` (confirmed) — see the companion action below for the inconsistency.
- **Confirmed race condition**: two concurrent POSTs from the same org one
  slot below its limit can both succeed (count-then-create is not
  transactional) — reproduced in 13/15 trials. See TEST_REPORT.md.

### `GET /api/facility/[id]`
- Auth: none.
- 200 the facility (active only) (confirmed)
- 404 not found / soft-deleted

### `DELETE /api/facility/[id]`
- Auth: `auth-token`. Permission: `manage_facilities` (ADMIN only).
- Soft-deletes (`deletedAt`), preserves rebuttals/audit trail.
- 200 `{ success: true, id }` (confirmed for ADMIN; confirmed 403 for a MEMBER, including a MEMBER from a different org)
- 401 / 403 / 404 as expected

### Server action: `claimFacility(facilityId: string)` — `src/app/actions/claimFacility.ts`
- Auth: `getUserFromRequest()`. No explicit permission check beyond being logged in.
- Claims an existing unclaimed facility (by id) for the caller's org.
- Returns `{ success: true }` or `{ success: false, error }` (never throws for expected failure paths).
- Confirmed behaviors: claims successfully when below the org's tier limit;
  blocked at/above the limit; blocked with no/inactive membership; blocked
  (clear message) if already claimed by the caller; blocked (clear message,
  no mutation) if claimed by someone else; two users in the same org share
  one count (second is blocked once the first fills the quota).
- **Confirmed bug**: the quota count query has no `deletedAt: null` filter —
  a soft-deleted facility still counts against the org's limit on this path,
  unlike `POST /api/facility` which does filter it.

### Server action: `linkSeatToOrg(targetUserId, orgId)` — `src/app/actions/linkSeatToOrg.ts`
- Auth: `getUserFromRequest()`. Role: `user.role === "ADMIN"` exactly (not `hasPermission`).
- Returns `{ success: true }` or `{ success: false, error }`.
- Confirmed: non-ADMIN rejected; nonexistent target user rejected with a
  clear message; already-in-this-org rejected with a clear message; ADMIN
  can link an orgless user successfully.
- **Confirmed bugs**: linking to a nonexistent `orgId` is not validated
  up front — it falls through to a raw Postgres foreign-key violation caught
  by the generic `catch`, surfacing `"Failed to link seat to organization"`
  instead of a clear "Organization not found". A user already in a
  *different* org is NOT blocked from being re-linked — their prior
  facility claims stay pointed at the old org, now orphaned from them.

---

## Rebuttals

### `POST /api/rebuttal`
- Auth: `auth-token`. Permission: `submit_rebuttal`.
- Body: `{ title, content, facilityId }`
- 200 the created rebuttal, emails all ADMIN/MODERATOR accounts (confirmed; email failure does not fail the request)
- 400 missing fields (confirmed)
- 401 no token
- 403 insufficient permission (MODERATOR blocked, confirmed), or
  **`facility.createdById !== user.userId`** — confirmed this is checked
  against the individual claiming user, not `user.orgId ===
  facility.organizationId`, so a teammate in the SAME org as the claimant is
  wrongly blocked. A genuine outsider (different org) is correctly blocked
  too, but for the wrong reason the schema was designed to avoid. ADMIN is
  **not** blocked here despite the route's own comment/error copy claiming
  otherwise (see PERMISSIONS.md).
- 404 facility not found

### `GET /api/rebuttal/[id]`
- Auth: **none** — confirmed no check exists at all.
- Returns the rebuttal regardless of status (PENDING/REJECTED included),
  plus the author's name/email.
- **Confirmed bug**: this leaks un-moderated/rejected content and submitter
  PII to anyone who has or guesses the id. See TEST_REPORT.md.
- 404 not found/deleted

### `DELETE /api/rebuttal/[id]`
- Auth: `auth-token`. Authorization: owner OR `manage_facilities` (ADMIN).
- Soft-deletes.
- 200 / 401 / 403 / 404 as expected.

### `GET /api/rebuttal/published`
- Auth: none. Returns only `status: APPROVED`, non-deleted rebuttals (confirmed).

### `POST /api/rebuttal/watermark`
- Auth: `auth-token`. Permission: `moderate_rebuttals`. Generates a watermarked PDF for a rebuttal's document. Not exercised by this test pass (see KNOWN_ISSUES.md).

### `GET /api/rebuttal/watermark`
- Mixed public/privileged behavior based on token presence — not exercised by this test pass.

### Server action: `submitRebuttal(formData)` — `src/app/actions/rebuttals.ts`
- Auth: `getUserFromRequest()`. **No permission check, no facility-ownership check of any kind.**
- Body (FormData): `title`, `facilityId`, `content`, `redactionAcknowledged` ("on"), optional `document` file (uploaded to Cloudinary).
- Throws (does not return an error object) on: not logged in, missing
  required fields, redaction checkbox not acknowledged, or an upload failure.
- **CRITICAL CONFIRMED BUG**: any authenticated user — from a different org,
  with no relationship to the facility, or targeting a completely unclaimed
  facility — can successfully submit a rebuttal for it. There is no
  equivalent of the `/api/rebuttal` route's (flawed, but present)
  `createdById` check. This is the single most exploitable finding in this
  report; see TEST_REPORT.md finding #1.

### Server action: `updateRebuttal(rebuttalId, formData)`
- Auth: `getUserFromRequest()`.
- Requires the caller to be the rebuttal's owner AND the rebuttal to be in
  `REQUEST_FIX` status; re-enters `PENDING` and clears `moderatedById` on
  success. Confirmed: non-owner rejected ("Forbidden."); wrong status
  rejected with a clear message.

---

## Moderation

### `GET /api/moderation`
- Auth: `auth-token`. Permission: `moderate_rebuttals`.
- Query: `rebuttalId` (required)
- 200 `{ success: true, logs }` — 400 if missing — 401/403 as expected.

### `POST /api/moderation`
- Auth: `auth-token`. Permission: `moderate_rebuttals`, then a per-action
  permission (`approve_rebuttal` / `reject_rebuttal` / `request_fix_rebuttal`).
- Body: `{ id, action: "approve"|"reject"|"request_fix", notes?, reason? }`
- 200 updates the `Rebuttal.status`, writes a `ModerationLog` row, emails the
  author (skipped if the status is unchanged) — all confirmed for all three actions.
- 400 missing `id`/`action`, or an unrecognized `action` string (confirmed)
- 401/403 as expected (MEMBER confirmed blocked on all three actions; ADMIN/MODERATOR confirmed allowed)
- 404 rebuttal not found (confirmed)

```json
// Request
{ "id": "clxyz...", "action": "approve", "notes": "Looks good" }
// 200 Response
{ "success": true, "message": "Rebuttal approved successfully", "rebuttal": { "...": "..." } }
```

---

## Membership / Billing

### `POST /api/membership/update`
- Auth: `auth-token`. Permission: `manage_memberships` (ADMIN only).
- Body: `{ organizationId, plan }` — admin-only manual override; normal
  members only reach an ACTIVE plan via Stripe Checkout.
- 200 upserted membership (confirmed)
- 400 missing/invalid `organizationId` or `plan` (confirmed)
- 401/403 as expected (confirmed MEMBER blocked)
- 404 organization not found (confirmed)

### `POST /api/stripe/checkout`
- Auth: `auth-token`.
- Body: `{ plan: "TIER_A"|"TIER_B"|"TIER_C" }`
- 200 `{ url }` — Checkout Session with `metadata: { orgId, userId, priceId }`, `client_reference_id: orgId` (all confirmed present)
- 400 invalid plan (confirmed)
- 401 no token (confirmed)
- 500 Stripe/config error

### `POST /api/stripe/portal`
- Auth: `auth-token`.
- 200 `{ url }` for the org's Stripe Billing Portal (confirmed)
- 400 no `stripeCustomerId` on the org's membership (confirmed)
- 401 no token

### `POST /api/stripe/webhook`
- Auth: Stripe signature (`stripe-signature` header, verified against `STRIPE_WEBHOOK_SECRET`).
- 400 missing/invalid signature (confirmed — both missing header and tampered signature)
- 200 for every recognized event type, and for unrecognized ones too (logged and no-op)
- Handles: `checkout.session.completed` (confirmed: activates Membership by
  `orgId`, correct tier/maxFacilities, sends one confirmation email; also
  confirmed: missing metadata is handled gracefully, no crash),
  `invoice.payment_succeeded` (confirmed: PAST_DUE → ACTIVE on renewal, email
  once for `subscription_cycle` reason), `invoice.payment_failed` (confirmed:
  → PAST_DUE), `invoice.upcoming` (reminder email, not exercised),
  `customer.subscription.deleted` (confirmed: → CANCELED/NONE/0).
- **Confirmed gap**: no `event.id` dedup table. DB writes stay idempotent on
  redelivery (upsert/updateMany), but a redelivered event sends its email a
  second time (confirmed: 2 emails for 2 deliveries of the same event).

---

## Dashboard / member-data routes

### `GET/POST/PUT/DELETE /api/deadlines`
- Auth: `auth-token`. Role: `role === "MEMBER"` exactly (ADMIN/MODERATOR blocked — a stricter check than `hasPermission`).
- All scoped to `userId`; PUT/DELETE 404 (not 403) when the id belongs to another user (confirmed IDOR-safe) rather than leaking existence.
- POST body: `{ citationId, dueDate, notes? }`; PUT adds `id`; DELETE takes `?id=`.

### `GET/DELETE/PATCH /api/files`
- Auth: `auth-token`. GET: own files, or any member's via `?userId=` if caller has `manage_users`. DELETE/PATCH: owner or `manage_users`. Soft-delete on DELETE, also deletes from UploadThing (best-effort).

### `POST/GET /api/files/share`, `DELETE /api/files/share/[id]`
- Auth: `auth-token`. Permission: `manage_file_shares`. POST validates ownership of every selected file before creating a cryptographically random (32-byte) share token. GET lists the caller's own non-revoked links. DELETE revokes.

### `GET /api/share/[token]`
- Auth: **none, by design** — this is the public attorney-facing link.
- Returns 404 (not found), 410 (revoked or expired), or the file list; logs an access row (ip/user-agent) fire-and-forget on every successful view.

---

## Templates

### `GET /api/templates`
- Auth: `auth-token`. Gate: `checkLibraryAccess()` (active membership, or ADMIN/MODERATOR bypass — see `src/services/template.service.ts`). Optional `?category=`.

### `POST /api/templates`, `DELETE /api/templates/[id]`
- Auth: `auth-token`. Permission: `manage_templates` (ADMIN only). POST validates category/format enums and required fields.

### `POST /api/templates/[id]/download`
- Auth: `auth-token`. Gate: `checkLibraryAccess()`. Tracks the download (`TemplateDownload` row + counter), returns `{ fileUrl }` for the client to navigate to.

---

## Takedowns / Incidents

### `POST /api/takedown`
- Auth: **none, by design** (public incident-report form). Zod-validated body (`requesterName`, `requesterEmail`, `facilityOrRebuttal`, `reason` enum, `supportingInfo`, optional `rebuttalId`/`facilityId`). Returns a ticket number and a 72-hour SLA deadline.

### `GET /api/takedown`, `GET/PATCH /api/takedown/[id]`
- Auth: `auth-token`. Permission: `manage_incidents` (ADMIN + MODERATOR). PATCH actions: `resolve`, `reject`, `emergency_takedown` (immediately unpublishes a rebuttal), `assign`, `in_review` — Zod-validated.

---

## Admin

### `GET /api/admin`
- Auth: `requireRole(["ADMIN"])`. Simple "Welcome Admin" smoke endpoint.

### `GET /api/admin/access-review`
- Auth: `auth-token`. Permission: `moderate_rebuttals` (ADMIN + MODERATOR).
- **CRITICAL CONFIRMED BUG — this endpoint always fails.** It selects a
  `membership` relation directly on `User`, which CH-18 removed (membership
  moved to `Organization`). Every call throws a
  `PrismaClientValidationError` ("Unknown field `membership` for select
  statement on model `User`") and the route's catch block returns a generic
  500. The entire `/dashboard/moderation/access-review` page — which calls
  this exact endpoint — is non-functional as a direct result. Confirmed with
  the real route handler in `tests/integration/admin.test.ts`; see
  TEST_REPORT.md finding #1 (this report's highest-severity item).
- 403 for MEMBER is correctly returned before the broken query ever runs (confirmed).

### `POST /api/admin/access-review`
- Marks a user reviewed (`lastReviewedAt`). Does not touch the broken
  relation — confirmed working.

### `POST /api/admin/archive-moderation-logs`
- Auth: `auth-token`. Permission: `manage_facilities` (ADMIN only). Moves
  `ModerationLog` rows older than a cutoff (default 1 year) into
  `ArchivedModerationLog` inside a transaction. Confirmed working (0 archived
  when none are old enough; 403 for MEMBER).

---

## Pages requiring auth (summary — see ARCHITECTURE.md for the middleware mechanism)

All of `/dashboard/*` require a valid session (`redirect("/login")` otherwise).
Additional `hasPermission` gates: `/dashboard/facilities/claim` and
`/dashboard/rebuttals/new` (`claim_facility`/`submit_rebuttal`, and also
explicitly excludes ADMIN by role check — see PERMISSIONS.md note on the
ADMIN/`submit_rebuttal` inconsistency), `/dashboard/facilities/manage`
(`manage_facilities`), `/dashboard/forms/rebuttal` and
`/dashboard/forms/redaction` (`submit_rebuttal`/`access_library`, both also
explicitly allow ADMIN through a separate `|| user.role === "ADMIN"` clause —
note this is the opposite pattern from the `/new` pages above),
`/dashboard/memberships` (`manage_memberships`), `/dashboard/moderation/*`
(`moderate_rebuttals`), `/dashboard/users` (`manage_users`). Only
`/dashboard`, `/moderation`, `/admin`, `/api/admin`, `/member` are covered by
`src/middleware.ts` itself — every other authenticated route/page enforces
its own check inline (verified route-by-route above).
