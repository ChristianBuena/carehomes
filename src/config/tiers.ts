import { MembershipPlan } from "@/generated/prisma/enums";
import { TIER_FACILITY_LIMITS } from "@/lib/permissions";

/**
 * Tier facility limits, typed against the Prisma MembershipPlan enum.
 *
 * This is NOT a second table: it is the same object as
 * permissions.ts TIER_FACILITY_LIMITS (the table canClaimFacility enforces),
 * which is the single source of truth. The Record<MembershipPlan, number>
 * annotation makes tsc fail if the enum and that table ever disagree on keys.
 *
 * Tier A  → 1 facility   ($300/yr)
 * Tier B  → 3 facilities  ($400/yr)
 * Tier C  → 10 facilities ($500/yr)
 */
export const TIER_LIMITS: Record<MembershipPlan, number> = TIER_FACILITY_LIMITS;

/**
 * Get remaining facility slots for a user.
 */
export function getRemainingSlots(
  plan: MembershipPlan,
  currentCount: number
): number {
  return Math.max(TIER_LIMITS[plan] - currentCount, 0);
}
