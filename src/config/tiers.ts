import { MembershipPlan } from "@prisma/client";

/**
 * Canonical tier facility limits — single source of truth for the entire platform.
 * Keep in sync with:
 *   - Stripe webhook (maxFacilities written to DB)
 *   - permissions.ts (TIER_FACILITY_LIMITS)
 *   - Pricing page UI
 *
 * Tier A  → 1 facility   ($300/yr)
 * Tier B  → 3 facilities  ($400/yr)
 * Tier C  → 10 facilities ($500/yr)
 */
export const TIER_LIMITS: Record<MembershipPlan, number> = {
  NONE: 0,
  TIER_A: 1,
  TIER_B: 3,
  TIER_C: 10,
};

/**
 * Get remaining facility slots for a user.
 */
export function getRemainingSlots(
  plan: MembershipPlan,
  currentCount: number
): number {
  return Math.max(TIER_LIMITS[plan] - currentCount, 0);
}