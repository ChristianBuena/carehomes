import { describe, it, expect } from "vitest";
import {
  hasPermission,
  canClaimFacility,
  TIER_FACILITY_LIMITS,
  permissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
import { TIER_LIMITS } from "@/config/tiers";

describe("hasPermission() — full role x permission matrix", () => {
  const allPermissions = Array.from(
    new Set(Object.values(permissions).flat())
  ) as Permission[];
  const allRoles: Role[] = ["ADMIN", "MODERATOR", "MEMBER"];

  for (const role of allRoles) {
    for (const permission of allPermissions) {
      const expected = permissions[role].includes(permission);
      it(`${role} x ${permission} => ${expected}`, () => {
        expect(hasPermission(role, permission)).toBe(expected);
      });
    }
  }

  it("returns false for an unknown role", () => {
    expect(hasPermission("SUPERUSER", "manage_users")).toBe(false);
  });

  it("returns false for empty-string role", () => {
    expect(hasPermission("", "manage_users")).toBe(false);
  });

  it("ADMIN can moderate, MEMBER cannot", () => {
    expect(hasPermission("ADMIN", "moderate_rebuttals")).toBe(true);
    expect(hasPermission("MEMBER", "moderate_rebuttals")).toBe(false);
  });

  it("MODERATOR cannot claim facilities (not in its permission list)", () => {
    expect(hasPermission("MODERATOR", "claim_facility")).toBe(false);
  });

  it("MODERATOR cannot manage_memberships", () => {
    expect(hasPermission("MODERATOR", "manage_memberships")).toBe(false);
  });
});

describe("canClaimFacility() — tier boundaries", () => {
  it("NONE: 0 is blocked (max is 0)", () => {
    expect(canClaimFacility("NONE", 0)).toBe(false);
  });

  it("TIER_A: allows at count 0 (one below limit of 1)", () => {
    expect(canClaimFacility("TIER_A", 0)).toBe(true);
  });

  it("TIER_A: blocks at count 1 (at limit)", () => {
    expect(canClaimFacility("TIER_A", 1)).toBe(false);
  });

  it("TIER_A: blocks above limit", () => {
    expect(canClaimFacility("TIER_A", 2)).toBe(false);
  });

  it("TIER_B: allows at count 2 (one below limit of 3)", () => {
    expect(canClaimFacility("TIER_B", 2)).toBe(true);
  });

  it("TIER_B: blocks at count 3 (at limit)", () => {
    expect(canClaimFacility("TIER_B", 3)).toBe(false);
  });

  it("TIER_B: blocks above limit", () => {
    expect(canClaimFacility("TIER_B", 4)).toBe(false);
  });

  it("TIER_C: allows at count 9 (one below limit of 10)", () => {
    expect(canClaimFacility("TIER_C", 9)).toBe(true);
  });

  it("TIER_C: blocks at count 10 (at limit)", () => {
    expect(canClaimFacility("TIER_C", 10)).toBe(false);
  });

  it("TIER_C: blocks above limit", () => {
    expect(canClaimFacility("TIER_C", 11)).toBe(false);
  });

  it("unknown plan string defaults to limit 0 (blocked)", () => {
    expect(canClaimFacility("NOT_A_REAL_PLAN", 0)).toBe(false);
  });

  it("negative count is still allowed under a positive limit (no floor guard, documented as-is)", () => {
    // canClaimFacility has no lower bound check; count < limit is true for any negative count.
    expect(canClaimFacility("TIER_A", -1)).toBe(true);
  });
});

describe("Tier limit source-of-truth duplication (CH-18 risk)", () => {
  it("permissions.ts TIER_FACILITY_LIMITS matches config/tiers.ts TIER_LIMITS today", () => {
    // These two tables are maintained by hand in two different files (and a third
    // copy exists in the Stripe webhook route). This test only proves they agree
    // RIGHT NOW — it will not catch someone editing one file and forgetting the
    // other two, because there is no single source of truth to import from.
    expect(TIER_FACILITY_LIMITS.NONE).toBe(TIER_LIMITS.NONE);
    expect(TIER_FACILITY_LIMITS.TIER_A).toBe(TIER_LIMITS.TIER_A);
    expect(TIER_FACILITY_LIMITS.TIER_B).toBe(TIER_LIMITS.TIER_B);
    expect(TIER_FACILITY_LIMITS.TIER_C).toBe(TIER_LIMITS.TIER_C);
  });
});
