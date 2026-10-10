# Permissions

Source of truth for roles/permissions: `src/lib/permissions.ts`. Verified
exhaustively in `tests/unit/permissions.test.ts` (every role x permission
pair, 72 assertions).

## Role x Permission matrix

| Permission | ADMIN | MODERATOR | MEMBER |
|---|---|---|---|
| `manage_users` | ✅ | ❌ | ❌ |
| `view_all_users` | ✅ | ❌ | ❌ |
| `manage_facilities` (create/edit/delete ANY facility) | ✅ | ❌ | ❌ |
| `claim_facility` | ✅ | ❌ | ✅ |
| `view_own_facilities` | ✅ | ❌ | ✅ |
| `submit_rebuttal` | ✅ (see note) | ❌ | ✅ |
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

**Note on ADMIN + `submit_rebuttal`:** `permissions.ts` genuinely grants
ADMIN this permission, so `hasPermission("ADMIN", "submit_rebuttal")` is
`true` and `POST /api/rebuttal` lets an ADMIN create a rebuttal (verified in
`tests/integration/rebuttals.test.ts`). This contradicts that route's own
inline comment ("only MEMBERs may submit rebuttals") and 403 error copy
("Admins and moderators cannot submit rebuttals"), and the dashboard page
(`/dashboard/rebuttals/new`) separately blocks ADMIN via an explicit
`user.role === "ADMIN"` check before you ever reach the form. Net effect: the
UI stops an admin from getting to the form, but the API itself does not
enforce that — anyone driving the API directly as an ADMIN can submit. See
TEST_REPORT.md.

`hasPermission(role, permission)` returns `false` for any role string not in
`{ADMIN, MODERATOR, MEMBER}` (including `""`), rather than throwing — verified.

## Membership tier facility limits

Source: `TIER_FACILITY_LIMITS` in `src/lib/permissions.ts` (also duplicated
in `src/config/tiers.ts` and the Stripe webhook — see ARCHITECTURE.md).

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

**The quota is scoped to the organization, not the individual user**, on the
facility-claiming path (`canClaimFacility(membership.plan, orgFacilityCount)`
in both `src/app/actions/claimFacility.ts` and
`src/app/api/facility/route.ts`). Two users in the same org share one count;
a different org's count is unaffected. See ARCHITECTURE.md for where this
scoping is and is not followed consistently elsewhere (rebuttal submission).

## Where permission checks actually live

Most routes call `hasPermission(user.role, "...")` inline after manually
reading/verifying the `auth-token` cookie. A smaller set uses the shared
`requirePermission()`/`requireRole()` helpers in `src/lib/roleGuard.ts`
(`/api/admin`, `/api/membership/update`, `/api/templates`). Both patterns are
correct when present — the gaps found in this test pass are routes/actions
missing a check entirely, not a flaw in the permission system itself. See
TEST_REPORT.md findings #1–#3.
