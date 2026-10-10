import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
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

  it("only MEMBER can submit rebuttals — ADMIN and MODERATOR cannot (TEST_REPORT #11)", () => {
    expect(hasPermission("MEMBER", "submit_rebuttal")).toBe(true);
    expect(hasPermission("ADMIN", "submit_rebuttal")).toBe(false);
    expect(hasPermission("MODERATOR", "submit_rebuttal")).toBe(false);
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

describe("Tier limit single source of truth (FIXED; was duplicated by hand in three files)", () => {
  it("the table canClaimFacility enforces has exactly the expected limits", () => {
    expect(TIER_FACILITY_LIMITS).toEqual({ NONE: 0, TIER_A: 1, TIER_B: 3, TIER_C: 10 });
  });

  it("permissions.ts TIER_FACILITY_LIMITS matches config/tiers.ts TIER_LIMITS", () => {
    expect(TIER_FACILITY_LIMITS.NONE).toBe(TIER_LIMITS.NONE);
    expect(TIER_FACILITY_LIMITS.TIER_A).toBe(TIER_LIMITS.TIER_A);
    expect(TIER_FACILITY_LIMITS.TIER_B).toBe(TIER_LIMITS.TIER_B);
    expect(TIER_FACILITY_LIMITS.TIER_C).toBe(TIER_LIMITS.TIER_C);
  });

  it("config/tiers.ts TIER_LIMITS is the very same object, not a copy — they cannot drift", () => {
    expect(TIER_LIMITS).toBe(TIER_FACILITY_LIMITS);
  });

  it("canClaimFacility's boundary follows the table for every plan", () => {
    for (const [plan, limit] of Object.entries(TIER_FACILITY_LIMITS)) {
      expect(canClaimFacility(plan, limit)).toBe(false);
      if (limit > 0) expect(canClaimFacility(plan, limit - 1)).toBe(true);
    }
  });

  it("no source file re-declares a numeric facility limit: the only `TIER_x: <number>` / " +
     "`maxFacilities: <number>` literals under src/ and prisma/seed.ts are in src/lib/permissions.ts", () => {
    const root = path.resolve(__dirname, "..", "..");
    const offenders: string[] = [];
    const scan = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "generated" && entry.name !== "node_modules") scan(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          check(full);
        }
      }
    };
    const check = (file: string) => {
      const rel = path.relative(root, file);
      if (rel === path.join("src", "lib", "permissions.ts")) return;
      fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        // PricingCard's planWeights is an upgrade/downgrade ordering (1 < 2 < 3), not a facility limit.
        if (line.includes("planWeights")) return;
        if (/\b(TIER_[ABC]|NONE)\s*:\s*\d/.test(line) || /\bmaxFacilities\s*:\s*\d/.test(line)) {
          offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      });
    };
    scan(path.join(root, "src"));
    check(path.join(root, "prisma", "seed.ts"));
    expect(offenders).toEqual([]);
  });
});
