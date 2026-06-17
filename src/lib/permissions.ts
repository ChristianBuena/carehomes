export type Role = "ADMIN" | "MODERATOR" | "MEMBER";

export type Permission =
  // User management
  | "manage_users"
  | "view_all_users"

  // Facility management
  | "manage_facilities"      // ADMIN only — create, edit, delete any facility
  | "claim_facility"         // MEMBER — claim an unclaimed facility (within tier limit)
  | "view_own_facilities"    // MEMBER — view their claimed facilities

  // Rebuttal — member actions
  | "submit_rebuttal"        // MEMBER — submit rebuttal for owned facility
  | "view_own_rebuttals"     // MEMBER — view their own rebuttal statuses
  | "edit_own_rebuttal"      // MEMBER — edit rebuttal when status is REQUEST_FIX

  // Rebuttal — moderation actions
  | "moderate_rebuttals"     // ADMIN + MODERATOR — view moderation queue
  | "approve_rebuttal"       // ADMIN + MODERATOR — approve → makes it public
  | "reject_rebuttal"        // ADMIN + MODERATOR — reject rebuttal
  | "request_fix_rebuttal"   // ADMIN + MODERATOR — send back to member for revision

  // Public content
  | "publish_rebuttals"      // ADMIN + MODERATOR — approved rebuttals visible on public site

  // Membership
  | "manage_memberships";    // ADMIN only — view and modify any membership

export const permissions: Record<Role, Permission[]> = {
  ADMIN: [
    "manage_users",
    "view_all_users",
    "manage_facilities",
    "claim_facility",
    "view_own_facilities",
    "submit_rebuttal",
    "view_own_rebuttals",
    "edit_own_rebuttal",
    "moderate_rebuttals",
    "approve_rebuttal",
    "reject_rebuttal",
    "request_fix_rebuttal",
    "publish_rebuttals",
    "manage_memberships",
  ],

  MODERATOR: [
    "view_own_rebuttals",
    "moderate_rebuttals",
    "approve_rebuttal",
    "reject_rebuttal",
    "request_fix_rebuttal",
    "publish_rebuttals",
  ],

  MEMBER: [
    "claim_facility",
    "view_own_facilities",
    "submit_rebuttal",
    "view_own_rebuttals",
    "edit_own_rebuttal",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const rolePermissions = permissions[role as Role] ?? [];
  return rolePermissions.includes(permission);
}

/**
 * Membership tier facility limits
 * MEMBER must also have an ACTIVE membership to use these
 */
export const TIER_FACILITY_LIMITS: Record<string, number> = {
  NONE: 0,
  TIER_A: 1,
  TIER_B: 3,
  TIER_C: 10,
};

/**
 * Check if a member can claim more facilities based on their tier
 */
export function canClaimFacility(
  plan: string,
  currentFacilityCount: number
): boolean {
  const limit = TIER_FACILITY_LIMITS[plan] ?? 0;
  return currentFacilityCount < limit;
}