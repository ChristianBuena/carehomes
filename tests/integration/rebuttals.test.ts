import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

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
import { buildRequest, authCookie } from "../helpers/http";
import { POST as submitViaApi } from "@/app/api/rebuttal/route";
import { GET as getRebuttalById } from "@/app/api/rebuttal/[id]/route";
import { GET as getPublished } from "@/app/api/rebuttal/published/route";
import { POST as moderate } from "@/app/api/moderation/route";

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});
afterAll(disconnectDb);

describe("POST /api/rebuttal — ownership check is per-user, not per-org (CONFIRMED BUG)", () => {
  it("the user who physically claimed the facility CAN submit a rebuttal for it", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
    const claimant = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: claimant.id });

    const res = await submitViaApi(
      buildRequest("http://localhost/api/rebuttal", {
        method: "POST",
        body: { title: "T", content: "C", facilityId: facility.id },
        cookies: await authCookie(claimant),
      })
    );
    expect(res.status).toBe(200);
  });

  it("CONFIRMED BUG: a DIFFERENT member of the SAME org (who did not personally claim the " +
     "facility) is wrongly blocked with 403 — the route checks facility.createdById === user.userId " +
     "instead of facility.organizationId === user.orgId (src/app/api/rebuttal/route.ts:51)", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
    const claimant = await createUser({ organizationId: org.id, role: "MEMBER", email: "claimant@example.com" });
    const teammate = await createUser({ organizationId: org.id, role: "MEMBER", email: "teammate@example.com" });
    const facility = await createFacility({ organizationId: org.id, createdById: claimant.id });

    const res = await submitViaApi(
      buildRequest("http://localhost/api/rebuttal", {
        method: "POST",
        body: { title: "T", content: "C", facilityId: facility.id },
        cookies: await authCookie(teammate),
      })
    );
    // Task requirement F says this should be allowed (org owns the facility).
    // Actual behavior: it is forbidden.
    expect(res.status).toBe(403);
  });

  it("a user from a genuinely different org is correctly blocked (403)", async () => {
    const orgA = await createOrg();
    await createMembership({ organizationId: orgA.id, plan: "TIER_B", status: "ACTIVE" });
    const owner = await createUser({ organizationId: orgA.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: orgA.id, createdById: owner.id });

    const orgB = await createOrg();
    await createMembership({ organizationId: orgB.id, plan: "TIER_B", status: "ACTIVE" });
    const outsider = await createUser({ organizationId: orgB.id, role: "MEMBER" });

    const res = await submitViaApi(
      buildRequest("http://localhost/api/rebuttal", {
        method: "POST",
        body: { title: "T", content: "C", facilityId: facility.id },
        cookies: await authCookie(outsider),
      })
    );
    expect(res.status).toBe(403);
  });

  it("MODERATOR cannot submit rebuttals (submit_rebuttal is not in MODERATOR's permission list)", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
    const moderator = await createUser({ organizationId: org.id, role: "MODERATOR" });
    const facility = await createFacility({ organizationId: org.id, createdById: moderator.id });

    const res = await submitViaApi(
      buildRequest("http://localhost/api/rebuttal", {
        method: "POST",
        body: { title: "T", content: "C", facilityId: facility.id },
        cookies: await authCookie(moderator),
      })
    );
    expect(res.status).toBe(403);
  });

  it("MINOR INCONSISTENCY: ADMIN CAN submit rebuttals via this route (200), contradicting both " +
     "the route's own inline comment ('only MEMBERs may submit rebuttals') and its 403 error " +
     "copy ('Admins and moderators cannot submit rebuttals') — permissions.ts actually grants " +
     "ADMIN the submit_rebuttal permission, so hasPermission() returns true for ADMIN. The " +
     "dashboard page /dashboard/rebuttals/new separately blocks ADMIN by an explicit role check, " +
     "so the UI and this API route disagree.", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
    const admin = await createUser({ organizationId: org.id, role: "ADMIN" });
    const facility = await createFacility({ organizationId: org.id, createdById: admin.id });

    const res = await submitViaApi(
      buildRequest("http://localhost/api/rebuttal", {
        method: "POST",
        body: { title: "T", content: "C", facilityId: facility.id },
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(200);
  });

  it("missing title returns 400", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });

    const res = await submitViaApi(
      buildRequest("http://localhost/api/rebuttal", {
        method: "POST",
        body: { content: "C", facilityId: facility.id },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(400);
  });

  it("missing content returns 400", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });

    const res = await submitViaApi(
      buildRequest("http://localhost/api/rebuttal", {
        method: "POST",
        body: { title: "T", facilityId: facility.id },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(400);
  });

  it("nonexistent facilityId returns 404", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });

    const res = await submitViaApi(
      buildRequest("http://localhost/api/rebuttal", {
        method: "POST",
        body: { title: "T", content: "C", facilityId: "does-not-exist" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/rebuttal/[id] — IDOR / missing auth (CONFIRMED BUG)", () => {
  it("CONFIRMED BUG: a PENDING rebuttal (not yet approved) is readable with NO authentication " +
     "at all, exposing its content, document URL, and the submitting member's name/email " +
     "(src/app/api/rebuttal/[id]/route.ts GET has no auth check; getRebuttalById does not filter by status)", async () => {
    const org = await createOrg();
    const author = await createUser({ organizationId: org.id, role: "MEMBER", email: "author@example.com" });
    const facility = await createFacility({ organizationId: org.id, createdById: author.id });
    const rebuttal = await createRebuttal({
      userId: author.id,
      facilityId: facility.id,
      status: "PENDING",
      content: "Confidential pending rebuttal content",
    });

    // No cookies at all — a fully anonymous request.
    const res = await getRebuttalById(
      buildRequest(`http://localhost/api/rebuttal/${rebuttal.id}`),
      { params: Promise.resolve({ id: rebuttal.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe("Confidential pending rebuttal content");
    expect(body.user.email).toBe("author@example.com");
  });

  it("CONFIRMED BUG: a REJECTED rebuttal is also publicly readable by ID", async () => {
    const org = await createOrg();
    const author = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: author.id });
    const rebuttal = await createRebuttal({ userId: author.id, facilityId: facility.id, status: "REJECTED" });

    const res = await getRebuttalById(
      buildRequest(`http://localhost/api/rebuttal/${rebuttal.id}`),
      { params: Promise.resolve({ id: rebuttal.id }) }
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/rebuttal/published only ever returns APPROVED rebuttals (the safe public endpoint)", async () => {
    const org = await createOrg();
    const author = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: author.id });
    await createRebuttal({ userId: author.id, facilityId: facility.id, status: "PENDING", title: "Pending One" });
    await createRebuttal({ userId: author.id, facilityId: facility.id, status: "APPROVED", title: "Approved One" });

    const res = await getPublished();
    const body = await res.json();
    const titles = body.map((r: { title: string }) => r.title);
    expect(titles).toContain("Approved One");
    expect(titles).not.toContain("Pending One");
  });
});

describe("Moderation flow — PENDING to APPROVED/REJECTED/REQUEST_FIX", () => {
  async function setupPendingRebuttal() {
    const org = await createOrg();
    const author = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: author.id });
    const rebuttal = await createRebuttal({ userId: author.id, facilityId: facility.id, status: "PENDING" });
    return { org, author, facility, rebuttal };
  }

  it("ADMIN can approve a PENDING rebuttal and a ModerationLog is created", async () => {
    const { rebuttal } = await setupPendingRebuttal();
    const admin = await createUser({ role: "ADMIN", organizationId: null });

    const res = await moderate(
      buildRequest("http://localhost/api/moderation", {
        method: "POST",
        body: { id: rebuttal.id, action: "approve" },
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(200);

    const reread = await testDb.rebuttal.findUnique({ where: { id: rebuttal.id } });
    expect(reread!.status).toBe("APPROVED");

    const logs = await testDb.moderationLog.findMany({ where: { rebuttalId: rebuttal.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].toStatus).toBe("APPROVED");
    expect(logs[0].fromStatus).toBe("PENDING");
  });

  it("MODERATOR can reject a PENDING rebuttal", async () => {
    const { rebuttal } = await setupPendingRebuttal();
    const moderator = await createUser({ role: "MODERATOR", organizationId: null });

    const res = await moderate(
      buildRequest("http://localhost/api/moderation", {
        method: "POST",
        body: { id: rebuttal.id, action: "reject", reason: "Not enough evidence" },
        cookies: await authCookie(moderator),
      })
    );
    expect(res.status).toBe(200);
    const reread = await testDb.rebuttal.findUnique({ where: { id: rebuttal.id } });
    expect(reread!.status).toBe("REJECTED");
  });

  it("MODERATOR can request_fix on a PENDING rebuttal", async () => {
    const { rebuttal } = await setupPendingRebuttal();
    const moderator = await createUser({ role: "MODERATOR", organizationId: null });

    const res = await moderate(
      buildRequest("http://localhost/api/moderation", {
        method: "POST",
        body: { id: rebuttal.id, action: "request_fix", notes: "Please clarify dates" },
        cookies: await authCookie(moderator),
      })
    );
    expect(res.status).toBe(200);
    const reread = await testDb.rebuttal.findUnique({ where: { id: rebuttal.id } });
    expect(reread!.status).toBe("REQUEST_FIX");
  });

  it("MEMBER cannot moderate — 403 on all three actions", async () => {
    const { rebuttal } = await setupPendingRebuttal();
    const org = await createOrg();
    const member = await createUser({ role: "MEMBER", organizationId: org.id });

    for (const action of ["approve", "reject", "request_fix"]) {
      const res = await moderate(
        buildRequest("http://localhost/api/moderation", {
          method: "POST",
          body: { id: rebuttal.id, action },
          cookies: await authCookie(member),
        })
      );
      expect(res.status).toBe(403);
    }
  });

  it("no token: 401", async () => {
    const { rebuttal } = await setupPendingRebuttal();
    const res = await moderate(
      buildRequest("http://localhost/api/moderation", {
        method: "POST",
        body: { id: rebuttal.id, action: "approve" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("invalid action string returns 400", async () => {
    const { rebuttal } = await setupPendingRebuttal();
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const res = await moderate(
      buildRequest("http://localhost/api/moderation", {
        method: "POST",
        body: { id: rebuttal.id, action: "delete_forever" },
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(400);
  });

  it("nonexistent rebuttal id returns 404", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const res = await moderate(
      buildRequest("http://localhost/api/moderation", {
        method: "POST",
        body: { id: "does-not-exist", action: "approve" },
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(404);
  });
});
