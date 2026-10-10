# Permissions

Source of truth for roles/permissions: `src/lib/permissions.ts`. Verified
exhaustively in `tests/unit/permissions.test.ts` (every role x permission
pair).

## Role x Permission matrix

| Permission | ADMIN | MODERATOR | MEMBER |
|---|---|---|---|
| `manage_users` | ✅ | ❌ | ❌ |
| `view_all_users` | ✅ | ❌ | ❌ |
| `manage_facilities` (create/edit/delete ANY facility) | ✅ | ❌ | ❌ |
| `claim_facility` | ✅ | ❌ | ✅ |
| `view_own_facilities` | ✅ | ❌ | ✅ |
| `submit_rebuttal` | ❌ (see note) | ❌ | ✅ |
| `view_own_rebuttals` | ✅ | ✅ | ✅ |
| `edit_own_rebuttal` | ✅ | ❌ | ✅ |
| `moderate_rebuttals` (view queue) | ✅ | ✅ | ❌ |
| `approve_rebuttal` | ✅ | ✅ | ❌ |
| `reject_rebuttal` | ✅ | ✅ | ❌ |
| `request_fix_rebuttal` | ✅ | ✅ | ❌ |
| `publish_rebuttals` | ✅ | ✅ | ❌ |
| `manage_memberships` | ✅ | ❌ | ❌ |
| `access_library` | ✅ | ✅ | ✅ |
| `manage_templates` | ✅ | ❌ | ❌ |
| `manage_incidents` (takedowns) | ✅ | ✅ | ❌ |
| `manage_file_shares` | ✅ | ❌ | ✅ |

**Note on ADMIN + `submit_rebuttal`:** only MEMBERs submit rebuttals. ADMIN
no longer holds this permission (it did in the first pass, which let an
admin submit through the API even though the UI hid the form). `POST
/api/rebuttal`, the `submitRebuttal()` action and the two form pages all
gate on `hasPermission(role, "submit_rebuttal")`, so the API and the UI now
agree (verified in `tests/integration/rebuttals.test.ts`,
`rebuttal-action.test.ts` and `tests/unit/permissions.test.ts`).

`hasPermission(role, permission)` returns `false` for any role string not in
`{ADMIN, MODERATOR, MEMBER}` (including `""`), rather than throwing — verified.

## Membership tier facility limits

Source: `TIER_FACILITY_LIMITS` in `src/lib/permissions.ts`, the single copy
(`src/config/tiers.ts` re-exports the same object; the Stripe webhook imports
it — see ARCHITECTURE.md).

| Plan | Max facilities |
|---|---|
| `NONE` | 0 |
| `TIER_A` | 1 |
| `TIER_B` | 3 |
| `TIER_C` | 10 |

`canClaimFacility(plan, currentCount)` returns `currentCount < limit`.
Boundary behavior, verified in `tests/unit/permissions.test.ts` and exercised
end-to-end in `tests/integration/facility-limits.test.ts` /
`tests/integration/claim-action.test.ts`:

| Plan | count = limit−1 | count = limit | count = limit+1 |
|---|---|---|---|
| TIER_A (1) | allowed (0) | blocked (1) | blocked (2) |
| TIER_B (3) | allowed (2) | blocked (3) | blocked (4) |
| TIER_C (10) | allowed (9) | blocked (10) | blocked (11) |
| NONE (0) | n/a | blocked (0) | blocked |

An unrecognized plan string defaults to a limit of 0 (blocked), not a crash.
`canClaimFacility` has no lower-bound guard — a negative count is treated as
"below the limit" and would be allowed; this can't currently happen through
any code path that writes `currentFacilityCount` (always a `prisma.count()`),
so it's a theoretical note, not an exploitable gap.

**The quota is scoped to the organization, not the individual user.** Both
`src/app/actions/claimFacility.ts` and `src/app/api/facility/route.ts` go
through `withOrgFacilityQuota()` (`src/services/facility.service.ts`), which
locks the organization row, requires an ACTIVE membership, counts the org's
non-deleted facilities and calls `canClaimFacility()`, all in one
transaction. Two users in the same org share one count; a different org's
count is unaffected; soft-deleted facilities do not count; concurrent claims
cannot exceed the limit.

## Ownership rules (who may act on what)

Role permissions say what kind of action a role may take. These rules say
which records it applies to. "Current organization" always means the value
in the database at request time, never the one in the session token.

| Resource | Rule |
|---|---|
| Facility (claim, create) | Assigned to the caller's current organization. |
| Rebuttal — submit | The facility's organization must be the caller's current organization. Any seat in that org may submit. |
| Rebuttal — read by id | Author, any member of the facility's organization, MODERATOR, ADMIN. |
| Rebuttal — edit (`updateRebuttal`) | Author only, and only while the status is REQUEST_FIX. |
| Rebuttal — delete | Author or ADMIN. |
| Citation deadline | The owning user only (MEMBER role only). Others get 404. |
| Member file — list, relabel, delete | The uploading user, or ADMIN (`manage_users`). Private to the uploader: a colleague in the same organization has no access. |
| Share link — create, list, revoke | The creating user (`manage_file_shares`); ADMIN may revoke any. Only the creator's own files can be attached. |
| Share link — open (`/api/share/[token]`) | Anyone holding the token, until it expires or is revoked. |
| Template — list, download | Any ADMIN or MODERATOR; a MEMBER whose organization's membership is ACTIVE (any paid tier). |
| Template — create, remove | ADMIN (`manage_templates`). |
| Watermark — generate | ADMIN or MODERATOR, for any rebuttal. |
| Seat linking (`linkSeatToOrg`) | ADMIN only; only for a user with no organization. |

Roles are still read from the session token. A role change takes effect when
the user next signs in (tokens last 7 days).

## Where permission checks actually live

Most routes call `hasPermission(user.role, "...")` inline after manually
reading/verifying the `auth-token` cookie. A smaller set uses the shared
`requirePermission()`/`requireRole()` helpers in `src/lib/roleGuard.ts`
(`/api/admin`, `/api/membership/update`, `/api/templates`). Both patterns are
correct when present. The routes and actions that were missing a check in the
first pass (TEST_REPORT.md findings #1–#4) have one now.

Anything that compares an organization id must get its user from
`resolveSessionUser()` or `getUserFromRequest()` (`src/lib/auth.ts`), which
read the organization from the database. `verifyToken()` alone is acceptable
only where the check needs `userId` and `role`.
