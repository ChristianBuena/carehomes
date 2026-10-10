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

describe("submitRebuttal() server action — facility-ownership check (FIXED)", () => {
  it("FIXED (was CRITICAL CONFIRMED BUG): a user with NO relationship to the facility " +
     "(different org, never claimed it) is rejected with a clear error and NO rebuttal row is created", async () => {
    const ownerOrg = await createOrg();
    const owner = await createUser({ organizationId: ownerOrg.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: ownerOrg.id, createdById: owner.id });

    const strangerOrg = await createOrg();
    const stranger = await createUser({ organizationId: strangerOrg.id, role: "MEMBER", email: "stranger@example.com" });
    asUser(stranger);

    expect(
      await submitRebuttal(
        fd({
          title: "Unauthorized Rebuttal",
          facilityId: facility.id,
          content: "I have no relationship to this facility or its org.",
          redactionAcknowledged: "on",
        })
      )
    ).toEqual({ success: false, error: expect.stringMatching(/only submit rebuttals for facilities your organization owns/i) });

    expect(await testDb.rebuttal.count()).toBe(0);
  });

  it("FIXED (was CRITICAL CONFIRMED BUG): a rebuttal can NOT be submitted for a facility that is " +
     "completely unclaimed (organizationId and createdById both null) — clear 'not been claimed' error", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const unclaimedFacility = await createFacility({ organizationId: null, createdById: null });
    asUser(user);

    expect(
      await submitRebuttal(
        fd({
          title: "Rebuttal For Unclaimed Facility",
          facilityId: unclaimedFacility.id,
          content: "This facility belongs to no one.",
          redactionAcknowledged: "on",
        })
      )
    ).toEqual({ success: false, error: expect.stringMatching(/has not been claimed/i) });

    expect(await testDb.rebuttal.count()).toBe(0);
  });

  it("a user with NO org (empty orgId) cannot submit for an unclaimed facility either " +
     "(empty orgId must never match a null facility.organizationId)", async () => {
    const user = await createUser({ organizationId: null, role: "MEMBER" });
    const unclaimedFacility = await createFacility({ organizationId: null, createdById: null });
    asUser(user);

    expect(
      await submitRebuttal(fd({ title: "T", facilityId: unclaimedFacility.id, content: "C", redactionAcknowledged: "on" }))
    ).toEqual({ success: false, error: expect.stringMatching(/has not been claimed/i) });
    expect(await testDb.rebuttal.count()).toBe(0);
  });

  it("the claimant can submit for their own org's facility", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });
    asUser(user);

    const result = await submitRebuttal(
      fd({ title: "Owner Rebuttal", facilityId: facility.id, content: "C", redactionAcknowledged: "on" })
    );
    expect(result.success).toBe(true);

    const created = await testDb.rebuttal.findFirst({ where: { title: "Owner Rebuttal" } });
    expect(created!.userId).toBe(user.id);
    expect(created!.facilityId).toBe(facility.id);
    expect(created!.status).toBe("PENDING");
  });

  it("a teammate in the same org (who did not personally claim the facility) can submit", async () => {
    const org = await createOrg();
    const claimant = await createUser({ organizationId: org.id, role: "MEMBER" });
    const teammate = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: claimant.id });
    asUser(teammate);

    const result = await submitRebuttal(
      fd({ title: "Teammate Rebuttal", facilityId: facility.id, content: "C", redactionAcknowledged: "on" })
    );
    expect(result.success).toBe(true);
    const created = await testDb.rebuttal.findFirst({ where: { title: "Teammate Rebuttal" } });
    expect(created!.userId).toBe(teammate.id);
  });

  it("a nonexistent facilityId is rejected with 'Facility not found'", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    asUser(user);

    expect(
      await submitRebuttal(fd({ title: "T", facilityId: "does-not-exist", content: "C", redactionAcknowledged: "on" }))
    ).toEqual({ success: false, error: expect.stringMatching(/facility not found/i) });
  });

  it("a soft-deleted facility is rejected with 'Facility not found', even for its own org", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id, deletedAt: new Date() });
    asUser(user);

    expect(
      await submitRebuttal(fd({ title: "T", facilityId: facility.id, content: "C", redactionAcknowledged: "on" }))
    ).toEqual({ success: false, error: expect.stringMatching(/facility not found/i) });
    expect(await testDb.rebuttal.count()).toBe(0);
  });

  it("MODERATOR is rejected (no submit_rebuttal permission), matching POST /api/rebuttal", async () => {
    const org = await createOrg();
    const moderator = await createUser({ organizationId: org.id, role: "MODERATOR" });
    const facility = await createFacility({ organizationId: org.id, createdById: moderator.id });
    asUser(moderator);

    expect(
      await submitRebuttal(fd({ title: "T", facilityId: facility.id, content: "C", redactionAcknowledged: "on" }))
    ).toEqual({ success: false, error: expect.stringMatching(/cannot submit rebuttals/i) });
    expect(await testDb.rebuttal.count()).toBe(0);
  });

  it("ADMIN is rejected too, even for a facility in their own org — only MEMBERs submit rebuttals", async () => {
    const org = await createOrg();
    const admin = await createUser({ organizationId: org.id, role: "ADMIN" });
    const facility = await createFacility({ organizationId: org.id, createdById: admin.id });
    asUser(admin);

    expect(
      await submitRebuttal(fd({ title: "T", facilityId: facility.id, content: "C", redactionAcknowledged: "on" }))
    ).toEqual({ success: false, error: expect.stringMatching(/cannot submit rebuttals/i) });
    expect(await testDb.rebuttal.count()).toBe(0);
  });

  it("returns an error (does not throw) when not logged in", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);
    expect(
      await submitRebuttal(fd({ title: "T", facilityId: "x", content: "C", redactionAcknowledged: "on" }))
    ).toEqual({ success: false, error: expect.stringMatching("Unauthorized") });
  });

  it("returns an error when the redaction policy checkbox is not acknowledged", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });
    asUser(user);

    expect(
      await submitRebuttal(fd({ title: "T", facilityId: facility.id, content: "C" }))
    ).toEqual({ success: false, error: expect.stringMatching(/redaction policy/i) });
  });

  it("returns an error on missing title/content/facilityId", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    asUser(user);
    expect(
      await submitRebuttal(fd({ title: "", facilityId: "", content: "", redactionAcknowledged: "on" }))
    ).toEqual({ success: false, error: expect.stringMatching(/missing required fields/i) });
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

    expect(
      await updateRebuttal(rebuttal.id, fd({ title: "T", content: "C", redactionAcknowledged: "on" }))
    ).toEqual({ success: false, error: expect.stringMatching(/Fix Required/) });
  });

  it("rejects editing someone else's rebuttal (Forbidden)", async () => {
    const org = await createOrg();
    const owner = await createUser({ organizationId: org.id, role: "MEMBER" });
    const other = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: owner.id });
    const rebuttal = await createRebuttal({ userId: owner.id, facilityId: facility.id, status: "REQUEST_FIX" });
    asUser(other);

    expect(
      await updateRebuttal(rebuttal.id, fd({ title: "T", content: "C", redactionAcknowledged: "on" }))
    ).toEqual({ success: false, error: expect.stringMatching("Forbidden.") });
  });
});

describe("server actions return errors instead of throwing (round 3 — messages must survive a production build)", () => {
  it("neither action source contains a `throw` — every user-facing error is a returned ActionResult", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.resolve(__dirname, "..", "..", "src", "app", "actions");
    for (const file of fs.readdirSync(dir)) {
      const code = fs
        .readFileSync(path.join(dir, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(/\bthrow\b/.test(code), `${file} still throws`).toBe(false);
    }
  });

  it("submitRebuttal: an unexpected failure (database error) is returned as a generic error, not thrown, and leaks no internals", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });
    // A userId that does not exist makes the INSERT fail on its foreign key.
    mockGetUserFromRequest.mockResolvedValue({ userId: "no-such-user", email: "x@example.com", role: "MEMBER", orgId: org.id });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitRebuttal(
      fd({ title: "T", facilityId: facility.id, content: "C", redactionAcknowledged: "on" })
    );

    expect(result).toEqual({ success: false, error: "Something went wrong. Please try again." });
    expect(consoleError).toHaveBeenCalled();
    expect(await testDb.rebuttal.count()).toBe(0);
    consoleError.mockRestore();
  });

  it("updateRebuttal: an unexpected failure is returned as a generic error, not thrown", async () => {
    mockGetUserFromRequest.mockRejectedValue(new Error("connection refused at 10.0.0.5:5432"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await updateRebuttal("any-id", fd({ title: "T", content: "C", redactionAcknowledged: "on" }));

    expect(result).toEqual({ success: false, error: "Something went wrong. Please try again." });
    consoleError.mockRestore();
  });

  it("updateRebuttal: a nonexistent rebuttal returns 'Rebuttal not found.'", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    asUser(user);

    expect(
      await updateRebuttal("does-not-exist", fd({ title: "T", content: "C", redactionAcknowledged: "on" }))
    ).toEqual({ success: false, error: "Rebuttal not found." });
  });

  it("updateRebuttal: not logged in returns 'Unauthorized'", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);
    expect(
      await updateRebuttal("any-id", fd({ title: "T", content: "C", redactionAcknowledged: "on" }))
    ).toEqual({ success: false, error: "Unauthorized" });
  });
});
