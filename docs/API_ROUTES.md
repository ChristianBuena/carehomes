# API Routes and Server Actions

Method, auth, role/permission, request body, and response codes for every
route under `src/app/api/**` and every server action under
`src/app/actions/**`, verified by reading the actual handler code (not
guessed). Status codes marked "confirmed" were exercised by the automated
test suite; others are read from the code but not independently exercised —
see TEST_REPORT.md for exactly which routes have test coverage.

Cookies used throughout: `auth-token` (7-day session JWT) and `mfa-pending`
(10-minute, login-step-2-only JWT, `path: /api`).

**Organization comes from the database, not the token.** The session JWT
still carries an `orgId`, but every ownership check reads the user's current
`User.organizationId` through `resolveSessionUser()` / `getUserFromRequest()`
in `src/lib/auth.ts`. A user moved to another organization loses access to
the old one on their next request, with no re-login. A valid token for a user
that no longer exists is treated as unauthenticated (401).

Last brought in line with the code on 2026-10-10 (round 3). Items that used
to be listed here as "confirmed bug" are fixed; see KNOWN_ISSUES.md.

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
- 401 invalid credentials — same message for "no such user" and "wrong password" (confirmed, does not leak account existence). A non-string email or password is also 401.
- 429 `{ error: "Too many failed login attempts. Try again in N minute(s)." }` with a `Retry-After` header (confirmed)
- 500 unexpected error
- **Throttling is per (email, client IP)**, in the `LoginAttempt` table
  (`src/services/login-throttle.service.ts`): 5 failed attempts from one
  address for one email within 15 minutes lock that pair for 15 minutes. The
  same email from another address is unaffected, so knowing someone's email
  is not enough to lock them out (confirmed). While locked, the correct
  password is also refused. Unknown emails are counted exactly like wrong
  passwords, so the 401 → 429 sequence is identical whether or not the
  account exists (confirmed). A correct password clears the pair's history.
- The client IP is the first `X-Forwarded-For` entry, then `X-Real-IP`, then
  the shared bucket `"unknown"` (`src/lib/client-ip.ts`). This is only
  trustworthy behind a proxy that overwrites the client's own
  `X-Forwarded-For`.

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
- Query: none is read. The handler calls `getFacilities()` with no filters,
  so it always returns the first page (9 facilities, by name).
- 200 `{ facilities: [...], total, ... }`
- **Open finding (round 3):** each facility includes
  `createdBy: { id, name, email }`, so this public endpoint returns the
  claiming user's email address. See KNOWN_ISSUES.md.

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
- Quota count filters `deletedAt: null` (confirmed), the same as the companion action below.
- The membership check, the quota count and the insert run in one
  transaction that locks the `Organization` row (`withOrgFacilityQuota()` in
  `src/services/facility.service.ts`), so concurrent requests from one org
  cannot exceed the limit (confirmed: 0 of 20 and 0 of 15 trials over limit;
  the race found in the first pass is fixed).
- The facility is created under the caller's **current** organization
  (database value, not the token's).

### `GET /api/facility/[id]`
- Auth: none (public directory).
- 200 the facility (active only), with `createdBy: { id, name }` only —
  never the claimant's email or password hash (confirmed; the first-pass leak
  is fixed)
- 404 not found / soft-deleted

### `DELETE /api/facility/[id]`
- Auth: `auth-token`. Permission: `manage_facilities` (ADMIN only).
- Soft-deletes (`deletedAt`), preserves rebuttals/audit trail.
- 200 `{ success: true, id }` (confirmed for ADMIN; confirmed 403 for a MEMBER, including a MEMBER from a different org)
- 401 / 403 / 404 as expected

### Server action: `claimFacility(facilityId: string)` — `src/app/actions/claimFacility.ts`
- Auth: `getUserFromRequest()`. No explicit permission check beyond being logged in.
- Claims an existing unclaimed facility (by id) for the caller's current org.
- Returns `{ success: true }` or `{ success: false, error }` (never throws for expected failure paths).
- Confirmed behaviors: claims successfully when below the org's tier limit;
  blocked at/above the limit; blocked with no/inactive membership; blocked
  (clear message) if already claimed by the caller; blocked (clear message,
  no mutation) if claimed by someone else; two users in the same org share
  one count (second is blocked once the first fills the quota).
- Uses the same `withOrgFacilityQuota()` as `POST /api/facility`: soft-deleted
  facilities do not count toward the limit, a soft-deleted facility cannot be
  claimed ("Facility not found."), and concurrent claims cannot exceed the
  limit or claim the same facility twice (all confirmed).

### Server action: `linkSeatToOrg(targetUserId, orgId)` — `src/app/actions/linkSeatToOrg.ts`
- Auth: `getUserFromRequest()`. Role: `user.role === "ADMIN"` exactly (not `hasPermission`).
- Returns `{ success: true }` or `{ success: false, error }`.
- Confirmed: non-ADMIN rejected; nonexistent target user rejected with a
  clear message; already-in-this-org rejected with a clear message; ADMIN
  can link an orgless user successfully.
- A nonexistent or empty `orgId` returns "Organization not found"
  (confirmed). A user who already belongs to a different org is **not**
  moved: "User already belongs to another organization" (confirmed). Both
  were bugs in the first pass and are fixed.
- The linked user gets access to the org on their next request, with the
  token they already hold (confirmed in `tests/integration/stale-org.test.ts`).

---

## Rebuttals

### `POST /api/rebuttal`
- Auth: `auth-token`. Permission: `submit_rebuttal`.
- Body: `{ title, content, facilityId }`
- 200 the created rebuttal, emails all ADMIN/MODERATOR accounts (confirmed; email failure does not fail the request)
- 400 missing fields (confirmed)
- 401 no token
- 401 also when the token's user no longer exists
- 403 insufficient permission — MODERATOR **and ADMIN** are blocked
  (confirmed; only MEMBERs hold `submit_rebuttal`)
- 403 when the facility's `organizationId` is not the caller's current
  organization. Any seat in the owning org may submit, not only the user who
  claimed the facility (confirmed). A caller with no organization can never
  match an unclaimed facility (confirmed).
- 404 facility not found or soft-deleted

### `GET /api/rebuttal/[id]`
- Auth: `auth-token` (confirmed; the route had no auth in the first pass).
- Allowed for the rebuttal's author, any member of the organization that
  owns the rebuttal's facility, and MODERATOR/ADMIN. Returns the rebuttal
  with the author's `id`, `name`, `email`.
- 401 no/invalid token or deleted user — 403 anyone else — 404 not
  found/soft-deleted (all confirmed)
- Approved rebuttals are served publicly by `GET /api/rebuttal/published`.

### `DELETE /api/rebuttal/[id]`
- Auth: `auth-token`. Authorization: owner OR `manage_facilities` (ADMIN).
- Soft-deletes.
- 200 / 401 / 403 / 404 as expected.

### `GET /api/rebuttal/published`
- Auth: none. Returns only `status: APPROVED`, non-deleted rebuttals (confirmed).
- **Open findings (round 3):** every row is returned whole, so the public
  response includes `documentUrl` (the original, un-watermarked document),
  `watermarkedUrl` (the full base64 PDF, when present) and the author's
  `email`. See TEST_REPORT.md round 3, D-1 and D-2.

### `POST /api/rebuttal/watermark`
- Auth: `auth-token`. Permission: `moderate_rebuttals` (ADMIN + MODERATOR).
- Body: `{ rebuttalId }`. Fetches the rebuttal's `documentUrl`, checks it is
  a text-searchable PDF, stamps the fixed text "PUBLIC REDACTED VERSION"
  diagonally on every page (`src/services/pdf-watermark.service.ts`) and
  stores the result in `Rebuttal.watermarkedUrl` as a base64 `data:` URL.
- 200 `{ success, watermarkedUrl }`, or `{ message: "Already watermarked", watermarkedUrl }`
- 400 missing `rebuttalId`, no document attached, not a PDF, or not text-searchable
- 401 / 403 / 404 as expected — 500 if the document cannot be fetched or processed
- Nothing in the application calls this route (the comment in the file says
  it runs automatically on approval; it does not), and no page reads
  `watermarkedUrl`.
- **Open findings (round 3):** the text-searchable check rejects ordinary
  text PDFs and accepts scans; there is no size limit; the watermark carries
  no user or organization information. See TEST_REPORT.md round 3, area D.

### `GET /api/rebuttal/watermark?rebuttalId=`
- Auth: optional. Anyone may read the watermarked URL of an APPROVED
  rebuttal. A caller with `moderate_rebuttals` also gets `originalUrl` and
  may read non-approved rebuttals.
- 200 `{ watermarkedUrl, originalUrl }` — 400 missing id — 403 not approved
  and not privileged — 404 not found/soft-deleted

### Server action: `submitRebuttal(formData)` — `src/app/actions/rebuttals.ts`
- Auth: `getUserFromRequest()`. Permission: `submit_rebuttal` (MEMBER only).
- Body (FormData): `title`, `facilityId`, `content`, `redactionAcknowledged` ("on"), optional `document` file (uploaded to Cloudinary).
- **Returns** `{ success: true }` or `{ success: false, error }`
  (`ActionResult`, `src/types/action-result.ts`). It never throws a message
  the user needs to read, because Next.js replaces thrown server-action
  messages with a generic one in production builds.
- Errors returned: "Unauthorized"; "Missing required fields."; "You must
  acknowledge the redaction policy."; "Forbidden: your role cannot submit
  rebuttals."; "Facility not found." (also for a soft-deleted facility);
  "This facility has not been claimed. …"; "Forbidden: you can only submit
  rebuttals for facilities your organization owns."; "Failed to upload the
  document. …"; and "Something went wrong. Please try again." for anything
  unexpected (logged server-side). All confirmed.
- The permission and ownership checks mirror `POST /api/rebuttal` and run
  before any upload (the missing ownership check found in the first pass is
  fixed).

### Server action: `updateRebuttal(rebuttalId, formData)`
- Auth: `getUserFromRequest()`.
- Requires the caller to be the rebuttal's owner AND the rebuttal to be in
  `REQUEST_FIX` status; re-enters `PENDING` and clears `moderatedById` on
  success.
- Returns the same `ActionResult`. Errors returned: "Unauthorized";
  "Rebuttal not found."; "Forbidden."; `Only rebuttals with "Fix Required"
  status can be edited.`; "Missing required fields."; the redaction and
  upload messages above; and the generic unexpected-error message (all
  confirmed).

### Callers of the rebuttal actions
`NewRebuttalForm.tsx`, `EditRebuttalForm.tsx` and `RebuttalPrintForm.tsx`
check `result.success` and render `result.error` in a `role="alert"` element.
Verified in a browser against both the dev server and a production build
(`tests/e2e/action-errors.spec.ts`).

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
- **Idempotent on redelivery.** Each `event.id` is claimed in the
  `ProcessedStripeEvent` table before handling; a redelivered event returns
  200 without repeating its side effects, so its email is sent once
  (confirmed). If handling fails, the claim is released and the route
  returns 500 so Stripe's retry is processed as a first delivery (confirmed).
  Rows in that table are never pruned (KNOWN_ISSUES.md).
- `maxFacilities` is taken from `TIER_FACILITY_LIMITS`, not a local table.

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
- 200 `{ count, users }` — users whose `lastReviewedAt` is null or older
  than 90 days, each with `organization.membership.{ plan, status }`
  (confirmed). The first-pass bug (a `membership` select directly on `User`,
  which always returned 500) is fixed; the select is now checked with
  `satisfies Prisma.UserSelect`.
- 401 / 403 as expected (MEMBER confirmed blocked).

### `POST /api/admin/access-review`
- Marks a user reviewed (`lastReviewedAt`). Confirmed working.

### `POST /api/admin/archive-moderation-logs`
- Auth: `auth-token`. Permission: `manage_facilities` (ADMIN only). Moves
  `ModerationLog` rows older than a cutoff (default 1 year) into
  `ArchivedModerationLog` inside a transaction. Confirmed working (0 archived
  when none are old enough; 403 for MEMBER).

---

## Pages requiring auth (summary — see ARCHITECTURE.md for the middleware mechanism)

All of `/dashboard/*` require a valid session (`redirect("/login")` otherwise).
Additional `hasPermission` gates: `/dashboard/facilities/claim`
(`claim_facility`, and also excludes ADMIN by an explicit role check),
`/dashboard/rebuttals/new` and `/dashboard/forms/rebuttal` (`submit_rebuttal`,
so MEMBER only — ADMIN no longer holds that permission),
`/dashboard/forms/redaction` (`access_library`, with a redundant
`|| role === "ADMIN"` clause; the facility picker is org-scoped for MEMBERs),
`/dashboard/facilities/manage` (`manage_facilities`),
`/dashboard/memberships` (`manage_memberships`), `/dashboard/moderation/*`
(`moderate_rebuttals`), `/dashboard/users` (`manage_users`). Pages that list
facilities (`/dashboard`, `/dashboard/facilities`, the two form pages, the
new-rebuttal page) scope them to the caller's current organization, not to
the user who claimed them. Only `/dashboard`, `/moderation`, `/admin`,
`/api/admin`, `/member` are covered by `src/middleware.ts` itself — every
other authenticated route/page enforces its own check inline (verified
route-by-route above). The middleware runs on the Edge and reads the role
from the token only; it does not look anything up in the database.
