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

  it("CONFIRMED BUG: a soft-deleted facility still counts against the org's quota on this path " +
     "(no deletedAt filter in claimFacility.ts, unlike /api/facility which does filter it)", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    await createFacility({ organizationId: org.id, createdById: user.id, deletedAt: new Date() }); // soft-deleted
    const target = await createFacility({});
    asUser(user);

    const result = await claimFacility(target.id);
    // The org has 0 ACTIVE facilities (the one it "has" is soft-deleted), so a
    // correct implementation would allow this claim. It does not.
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/limit reached/i);
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

  it("CONFIRMED BUG: linking to a nonexistent organizationId is NOT validated up front — " +
     "it falls through to a raw DB foreign-key violation caught by the generic catch block, " +
     "surfacing a vague 'Failed to link seat' error instead of 'Organization not found'", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const target = await createUser({ organizationId: null, role: "MEMBER" });
    asUser(admin);

    const result = await linkSeatToOrg(target.id, "org_does_not_exist");
    expect(result.success).toBe(false);
    // It IS rejected (good), but not with a clear "Organization not found" message —
    // it's the generic catch-all, because there is no upfront existence check.
    expect(result.error).toBe("Failed to link seat to organization");

    // And the user's organizationId must NOT have changed.
    const reread = await testDb.user.findUnique({ where: { id: target.id } });
    expect(reread!.organizationId).toBeNull();
  });

  it("CONFIRMED BUG: a user already belonging to a DIFFERENT org can be silently re-linked " +
     "to a new org with no block and no transfer of their existing facility claims", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });

    const orgA = await createOrg();
    const userInOrgA = await createUser({ organizationId: orgA.id, role: "MEMBER" });
    await createFacility({ organizationId: orgA.id, createdById: userInOrgA.id });

    const orgB = await createOrg();
    asUser(admin);

    const result = await linkSeatToOrg(userInOrgA.id, orgB.id);
    // The task says this should likely be rejected ("if that is the rule"). It is not rejected.
    expect(result.success).toBe(true);

    const reread = await testDb.user.findUnique({ where: { id: userInOrgA.id } });
    expect(reread!.organizationId).toBe(orgB.id);

    // The facility they claimed under orgA is untouched — still points at orgA,
    // now orphaned from the user who is no longer in that org.
    const facilities = await testDb.facility.findMany({ where: { organizationId: orgA.id } });
    expect(facilities).toHaveLength(1);
    expect(facilities[0].createdById).toBe(userInOrgA.id);
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
