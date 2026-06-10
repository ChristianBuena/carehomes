import { MembershipPlan } from "@prisma/client";

/**
 * Tier limits configuration
 * Defines how many facilities each plan can create
 */
export const TIER_LIMITS: Record<MembershipPlan, number> = {
  NONE: 0,
  TIER_A: 1,
  TIER_B: 5,
  TIER_C: Infinity, // unlimited
};

/**
 * Optional helper: check if a plan is unlimited
 */
export function isUnlimited(plan: MembershipPlan): boolean {
  return plan === "TIER_C";
}

/**
 * Get remaining slots for a user
 */
export function getRemainingSlots(
  plan: MembershipPlan,
  currentCount: number
): number {
  const limit = TIER_LIMITS[plan];

  if (limit === Infinity) return Infinity;

  return Math.max(limit - currentCount, 0);
}

/**
 * Check if user can create another facility
 */
export function canCreateFacility(
  plan: MembershipPlan,
  currentCount: number
): boolean {
  const limit = TIER_LIMITS[plan];

  if (limit === Infinity) return true;

  return currentCount < limit;
}