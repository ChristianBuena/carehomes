import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// claimFacility/linkSeatToOrg/submitRebuttal/updateRebuttal all read the session
// via getUserFromRequest() (next/headers cookies()), which throws outside Next's
// request runtime. Mocking @/lib/auth lets us call the REAL action bodies with a
// controlled "logged in as" user, which is the standard way to unit/integration
// test Next.js Server Actions without booting a full Next server.
const mockGetUserFromRequest = vi.fn();
vi.mock("@/lib/auth", () => ({
  getUserFromRequest: () => mockGetUserFromRequest(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  resetDb,
  testDb,
  disconnectDb,
  createOrg,
  createMembership,
  createUser,
  createFacility,
} from "../helpers/db";
import { claimFacility } from "@/app/actions/claimFacility";
import { linkSeatToOrg } from "@/app/actions/linkSeatToOrg";

function asUser(user: { id: string; email: string; role: "MEMBER" | "MODERATOR" | "ADMIN"; organizationId: string | null }) {
  mockGetUserFromRequest.mockResolvedValue({
    userId: user.id,
    email: user.email,
    role: user.role,
    orgId: user.organizationId ?? "",
  });
}

beforeEach(async () => {
  await resetDb();
  mockGetUserFromRequest.mockReset();
});
afterAll(disconnectDb);

describe("claimFacility() server action — real code path", () => {
  it("claims an unclaimed facility and sets both createdById and organizationId", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({});
    asUser(user);

    const result = await claimFacility(facility.id);
    expect(result.success).toBe(true);

    const reread = await testDb.facility.findUnique({ where: { id: facility.id } });
    expect(reread!.createdById).toBe(user.id);
    expect(reread!.organizationId).toBe(org.id);
  });

  it("blocks claiming at the tier limit (TIER_A, count already 1)", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    await createFacility({ organizationId: org.id, createdById: user.id }); // org at limit
    const target = await createFacility({});
    asUser(user);

    const result = await claimFacility(target.id);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/limit reached/i);
  });

  it("FIXED (was CONFIRMED BUG): a soft-deleted facility does NOT count against the org's quota on this path " +
     "any more — claimFacility and /api/facility now share one quota check that filters deletedAt: null", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    await createFacility({ organizationId: org.id, createdById: user.id, deletedAt: new Date() }); // soft-deleted
    const target = await createFacility({});
    asUser(user);

    // The org has 0 ACTIVE facilities (the one it "has" is soft-deleted), so
    // the claim is allowed.
    const result = await claimFacility(target.id);
    expect(result.success).toBe(true);

    const reread = await testDb.facility.findUnique({ where: { id: target.id } });
    expect(reread!.organizationId).toBe(org.id);
  });

  it("a soft-deleted facility cannot be claimed — it is reported as not found and left untouched", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_C", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const deleted = await createFacility({ deletedAt: new Date() });
    asUser(user);

    const result = await claimFacility(deleted.id);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/facility not found/i);

    const reread = await testDb.facility.findUnique({ where: { id: deleted.id } });
    expect(reread!.organizationId).toBeNull();
    expect(reread!.createdById).toBeNull();
  });

  it("blocks with no active membership", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_A", status: "INACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({});
    asUser(user);

    const result = await claimFacility(facility.id);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/active membership/i);
  });

  it("rejects claiming a facility already claimed by the same user with a clear message", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_C", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });
    asUser(user);

    const result = await claimFacility(facility.id);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already claimed this facility/i);
  });

  it("rejects claiming a facility already claimed by ANOTHER org/user", async () => {
    const orgA = await createOrg();
    await createMembership({ organizationId: orgA.id, plan: "TIER_C", status: "ACTIVE" });
    const owner = await createUser({ organizationId: orgA.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: orgA.id, createdById: owner.id });

    const orgB = await createOrg();
    await createMembership({ organizationId: orgB.id, plan: "TIER_C", status: "ACTIVE" });
    const otherUser = await createUser({ organizationId: orgB.id, role: "MEMBER" });
    asUser(otherUser);

    const result = await claimFacility(facility.id);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already been claimed by another user/i);

    // Confirm it truly was not reassigned.
    const reread = await testDb.facility.findUnique({ where: { id: facility.id } });
    expect(reread!.createdById).toBe(owner.id);
    expect(reread!.organizationId).toBe(orgA.id);
  });

  it("returns an error (not a throw) when not logged in", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);
    const facility = await createFacility({});
    const result = await claimFacility(facility.id);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("multi-seat: a SECOND user in the same org is blocked once the org's limit is reached by the FIRST user", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
    const userA = await createUser({ organizationId: org.id, role: "MEMBER", email: "seat-a@example.com" });
    const userB = await createUser({ organizationId: org.id, role: "MEMBER", email: "seat-b@example.com" });
    const facility1 = await createFacility({});
    const facility2 = await createFacility({});

    asUser(userA);
    const r1 = await claimFacility(facility1.id);
    expect(r1.success).toBe(true);

    asUser(userB);
    const r2 = await claimFacility(facility2.id);
    expect(r2.success).toBe(false);
    expect(r2.error).toMatch(/limit reached/i);
  });
});

describe("claimFacility() server action — race conditions (FIXED)", () => {
  it("20 trials: the same TIER_A org claiming TWO different unclaimed facilities concurrently " +
     "never ends up with both — exactly one claim succeeds, the other gets 'limit reached'", async () => {
    const TRIALS = 20;
    let overrunCount = 0;

    for (let i = 0; i < TRIALS; i++) {
      const org = await createOrg();
      await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
      const user = await createUser({ organizationId: org.id, role: "MEMBER", email: `action-race-${i}@example.com` });
      const [f1, f2] = await Promise.all([createFacility({}), createFacility({})]);
      asUser(user);

      const results = await Promise.all([claimFacility(f1.id), claimFacility(f2.id)]);

      const finalCount = await testDb.facility.count({ where: { organizationId: org.id, deletedAt: null } });
      if (finalCount > 1) overrunCount += 1;

      expect(results.filter((r) => r.success)).toHaveLength(1);
      expect(results.find((r) => !r.success)!.error).toMatch(/limit reached/i);
      expect(finalCount).toBe(1);
    }

    console.log(`[race-condition] claimFacility action: org limit exceeded in ${overrunCount}/${TRIALS} trials.`);
    expect(overrunCount).toBe(0);
  }, 60000);

  it("20 trials: two DIFFERENT orgs claiming the SAME unclaimed facility concurrently — exactly one wins, " +
     "the loser is told it is already claimed, and the facility ends up owned by the winner only", async () => {
    for (let i = 0; i < 20; i++) {
      const orgA = await createOrg();
      await createMembership({ organizationId: orgA.id, plan: "TIER_C", status: "ACTIVE" });
      const userA = await createUser({ organizationId: orgA.id, role: "MEMBER", email: `same-a-${i}@example.com` });
      const orgB = await createOrg();
      await createMembership({ organizationId: orgB.id, plan: "TIER_C", status: "ACTIVE" });
      const userB = await createUser({ organizationId: orgB.id, role: "MEMBER", email: `same-b-${i}@example.com` });
      const facility = await createFacility({});

      // getUserFromRequest() is the first thing each action call does, so the
      // first call is "logged in" as A and the second as B.
      mockGetUserFromRequest.mockReset();
      mockGetUserFromRequest
        .mockResolvedValueOnce({ userId: userA.id, email: userA.email, role: "MEMBER", orgId: orgA.id })
        .mockResolvedValueOnce({ userId: userB.id, email: userB.email, role: "MEMBER", orgId: orgB.id });

      const [resA, resB] = await Promise.all([claimFacility(facility.id), claimFacility(facility.id)]);

      expect([resA.success, resB.success].filter(Boolean)).toHaveLength(1);
      const loser = resA.success ? resB : resA;
      expect(loser.error).toMatch(/already been claimed/i);

      const reread = await testDb.facility.findUnique({ where: { id: facility.id } });
      const winner = resA.success ? { user: userA, org: orgA } : { user: userB, org: orgB };
      expect(reread!.organizationId).toBe(winner.org.id);
      expect(reread!.createdById).toBe(winner.user.id);
    }
  }, 60000);
});

describe("linkSeatToOrg() server action — real code path", () => {
  it("ADMIN can link a user with no org to an existing org", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const org = await createOrg();
    const target = await createUser({ organizationId: null, role: "MEMBER" });
    asUser(admin);

    const result = await linkSeatToOrg(target.id, org.id);
    expect(result.success).toBe(true);

    const reread = await testDb.user.findUnique({ where: { id: target.id } });
    expect(reread!.organizationId).toBe(org.id);
  });

  it("non-ADMIN (MEMBER) is rejected", async () => {
    const org = await createOrg();
    const member = await createUser({ role: "MEMBER", organizationId: org.id });
    const target = await createUser({ organizationId: null, role: "MEMBER" });
    asUser(member);

    const result = await linkSeatToOrg(target.id, org.id);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("non-ADMIN (MODERATOR) is rejected", async () => {
    const org = await createOrg();
    const moderator = await createUser({ role: "MODERATOR", organizationId: org.id });
    const target = await createUser({ organizationId: null, role: "MEMBER" });
    asUser(moderator);

    const result = await linkSeatToOrg(target.id, org.id);
    expect(result.success).toBe(false);
  });

  it("rejects linking a nonexistent target user", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const org = await createOrg();
    asUser(admin);

    const result = await linkSeatToOrg("does-not-exist", org.id);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Target user not found");
  });

  it("FIXED (was CONFIRMED BUG): linking to a nonexistent organizationId is validated up front and " +
     "rejected with a clear 'Organization not found' (not the generic catch-all from a foreign-key violation)", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const target = await createUser({ organizationId: null, role: "MEMBER" });
    asUser(admin);

    const result = await linkSeatToOrg(target.id, "org_does_not_exist");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Organization not found");

    // And the user's organizationId must NOT have changed.
    const reread = await testDb.user.findUnique({ where: { id: target.id } });
    expect(reread!.organizationId).toBeNull();
  });

  it("an empty orgId is rejected with 'Organization not found'", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const target = await createUser({ organizationId: null, role: "MEMBER" });
    asUser(admin);

    const result = await linkSeatToOrg(target.id, "");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Organization not found");
  });

  it("an empty orgId can never be used to UNLINK a user from their current org", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const org = await createOrg();
    const target = await createUser({ organizationId: org.id, role: "MEMBER" });
    asUser(admin);

    const result = await linkSeatToOrg(target.id, "");
    expect(result.success).toBe(false);

    const reread = await testDb.user.findUnique({ where: { id: target.id } });
    expect(reread!.organizationId).toBe(org.id);
  });

  it("FIXED (was CONFIRMED BUG): a user already belonging to a DIFFERENT org can NOT be re-linked — " +
     "the move is blocked with a clear message, the user stays in their org, and their facility claims are untouched", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });

    const orgA = await createOrg();
    const userInOrgA = await createUser({ organizationId: orgA.id, role: "MEMBER" });
    await createFacility({ organizationId: orgA.id, createdById: userInOrgA.id });

    const orgB = await createOrg();
    asUser(admin);

    const result = await linkSeatToOrg(userInOrgA.id, orgB.id);
    expect(result.success).toBe(false);
    expect(result.error).toBe("User already belongs to another organization");

    const reread = await testDb.user.findUnique({ where: { id: userInOrgA.id } });
    expect(reread!.organizationId).toBe(orgA.id);

    // The facility they claimed under orgA still belongs to orgA, and is still
    // reachable from a user in that org (nothing was orphaned).
    const facilities = await testDb.facility.findMany({ where: { organizationId: orgA.id } });
    expect(facilities).toHaveLength(1);
    expect(facilities[0].createdById).toBe(userInOrgA.id);
    expect(await testDb.facility.count({ where: { organizationId: orgB.id } })).toBe(0);
  });

  it("the block applies even when the user has claimed nothing in their current org", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const orgA = await createOrg();
    const orgB = await createOrg();
    const user = await createUser({ organizationId: orgA.id, role: "MEMBER" });
    asUser(admin);

    const result = await linkSeatToOrg(user.id, orgB.id);
    expect(result.success).toBe(false);
    expect(result.error).toBe("User already belongs to another organization");
  });

  it("already-in-this-org is rejected with a clear message (no-op protection that DOES exist)", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const org = await createOrg();
    const target = await createUser({ organizationId: org.id, role: "MEMBER" });
    asUser(admin);

    const result = await linkSeatToOrg(target.id, org.id);
    expect(result.success).toBe(false);
    expect(result.error).toBe("User is already in this organization");
  });
});
