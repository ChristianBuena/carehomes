import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

const mockGetUserFromRequest = vi.fn();
vi.mock("@/lib/auth", () => ({
  getUserFromRequest: () => mockGetUserFromRequest(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  resetDb,
  testDb,
  disconnectDb,
  createOrg,
  createMembership,
  createUser,
  createFacility,
  createRebuttal,
} from "../helpers/db";
import { submitRebuttal, updateRebuttal } from "@/app/actions/rebuttals";

function asUser(user: { id: string; email: string; role: "MEMBER" | "MODERATOR" | "ADMIN"; organizationId: string | null }) {
  mockGetUserFromRequest.mockResolvedValue({
    userId: user.id,
    email: user.email,
    role: user.role,
    orgId: user.organizationId ?? "",
  });
}

function fd(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.append(k, v);
  return data;
}

beforeEach(async () => {
  await resetDb();
  mockGetUserFromRequest.mockReset();
});
afterAll(disconnectDb);

describe("submitRebuttal() server action — CRITICAL: no facility-ownership check at all", () => {
  it("CRITICAL CONFIRMED BUG: a user with NO relationship to the facility whatsoever " +
     "(different org, never claimed it) can successfully submit a rebuttal for it " +
     "(src/app/actions/rebuttals.ts:14 — no facility.organizationId / createdById check exists)", async () => {
    const ownerOrg = await createOrg();
    const owner = await createUser({ organizationId: ownerOrg.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: ownerOrg.id, createdById: owner.id });

    const strangerOrg = await createOrg();
    const stranger = await createUser({ organizationId: strangerOrg.id, role: "MEMBER", email: "stranger@example.com" });
    asUser(stranger);

    const result = await submitRebuttal(
      fd({
        title: "Unauthorized Rebuttal",
        facilityId: facility.id,
        content: "I have no relationship to this facility or its org.",
        redactionAcknowledged: "on",
      })
    );
    expect(result.success).toBe(true);

    const created = await testDb.rebuttal.findFirst({ where: { title: "Unauthorized Rebuttal" } });
    expect(created).not.toBeNull();
    expect(created!.userId).toBe(stranger.id);
    expect(created!.facilityId).toBe(facility.id);
  });

  it("CRITICAL CONFIRMED BUG: a rebuttal can even be submitted for a facility that is " +
     "completely unclaimed (organizationId and createdById both null)", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const unclaimedFacility = await createFacility({ organizationId: null, createdById: null });
    asUser(user);

    const result = await submitRebuttal(
      fd({
        title: "Rebuttal For Unclaimed Facility",
        facilityId: unclaimedFacility.id,
        content: "This facility belongs to no one.",
        redactionAcknowledged: "on",
      })
    );
    expect(result.success).toBe(true);
  });

  it("throws when not logged in", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);
    await expect(
      submitRebuttal(fd({ title: "T", facilityId: "x", content: "C", redactionAcknowledged: "on" }))
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when the redaction policy checkbox is not acknowledged", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });
    asUser(user);

    await expect(
      submitRebuttal(fd({ title: "T", facilityId: facility.id, content: "C" }))
    ).rejects.toThrow(/redaction policy/i);
  });

  it("throws on missing title/content/facilityId", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    asUser(user);
    await expect(
      submitRebuttal(fd({ title: "", facilityId: "", content: "", redactionAcknowledged: "on" }))
    ).rejects.toThrow(/missing required fields/i);
  });
});

describe("updateRebuttal() server action", () => {
  it("owner can edit a REQUEST_FIX rebuttal, which re-enters PENDING and clears the moderator", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });
    const rebuttal = await createRebuttal({ userId: user.id, facilityId: facility.id, status: "REQUEST_FIX" });
    await testDb.rebuttal.update({ where: { id: rebuttal.id }, data: { moderatedById: admin.id } });
    asUser(user);

    const result = await updateRebuttal(
      rebuttal.id,
      fd({ title: "Updated Title", content: "Updated content", redactionAcknowledged: "on" })
    );
    expect(result.success).toBe(true);

    const reread = await testDb.rebuttal.findUnique({ where: { id: rebuttal.id } });
    expect(reread!.status).toBe("PENDING");
    expect(reread!.moderatedById).toBeNull();
    expect(reread!.title).toBe("Updated Title");
  });

  it("rejects editing a rebuttal that is not in REQUEST_FIX status", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });
    const rebuttal = await createRebuttal({ userId: user.id, facilityId: facility.id, status: "PENDING" });
    asUser(user);

    await expect(
      updateRebuttal(rebuttal.id, fd({ title: "T", content: "C", redactionAcknowledged: "on" }))
    ).rejects.toThrow(/Fix Required/);
  });

  it("rejects editing someone else's rebuttal (Forbidden)", async () => {
    const org = await createOrg();
    const owner = await createUser({ organizationId: org.id, role: "MEMBER" });
    const other = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: owner.id });
    const rebuttal = await createRebuttal({ userId: owner.id, facilityId: facility.id, status: "REQUEST_FIX" });
    asUser(other);

    await expect(
      updateRebuttal(rebuttal.id, fd({ title: "T", content: "C", redactionAcknowledged: "on" }))
    ).rejects.toThrow("Forbidden.");
  });
});
