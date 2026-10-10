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
import { GET as getWatermark, POST as applyWatermarkRoute } from "@/app/api/rebuttal/watermark/route";
import { PATCH as patchTakedown } from "@/app/api/takedown/[id]/route";

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});
afterAll(disconnectDb);

describe("POST /api/rebuttal — ownership check is per-ORGANIZATION (FIXED; was per-user)", () => {
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

  it("FIXED (was CONFIRMED BUG): a DIFFERENT member of the SAME org (who did not personally claim the " +
     "facility) CAN submit — the route now checks facility.organizationId === user.orgId, " +
     "not facility.createdById === user.userId", async () => {
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
    expect(res.status).toBe(200);

    const created = await testDb.rebuttal.findFirst({ where: { facilityId: facility.id } });
    expect(created!.userId).toBe(teammate.id);
  });

  it("the original claimant is blocked (403) once they are no longer in the owning org — " +
     "createdById is only an audit trail, it grants nothing", async () => {
    const orgA = await createOrg();
    await createMembership({ organizationId: orgA.id, plan: "TIER_B", status: "ACTIVE" });
    const orgB = await createOrg();
    await createMembership({ organizationId: orgB.id, plan: "TIER_B", status: "ACTIVE" });
    // Physically claimed it for Org A, but now sits in Org B.
    const exClaimant = await createUser({ organizationId: orgB.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: orgA.id, createdById: exClaimant.id });

    const res = await submitViaApi(
      buildRequest("http://localhost/api/rebuttal", {
        method: "POST",
        body: { title: "T", content: "C", facilityId: facility.id },
        cookies: await authCookie(exClaimant),
      })
    );
    expect(res.status).toBe(403);
    expect(await testDb.rebuttal.count()).toBe(0);
  });

  it("an unclaimed facility (organizationId null) is 403 for everyone, including a user with no org " +
     "(empty orgId must never match null)", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
    const member = await createUser({ organizationId: org.id, role: "MEMBER" });
    const orgless = await createUser({ organizationId: null, role: "MEMBER" });
    const unclaimed = await createFacility({ organizationId: null, createdById: null });

    for (const caller of [member, orgless]) {
      const res = await submitViaApi(
        buildRequest("http://localhost/api/rebuttal", {
          method: "POST",
          body: { title: "T", content: "C", facilityId: unclaimed.id },
          cookies: await authCookie(caller),
        })
      );
      expect(res.status).toBe(403);
    }
    expect(await testDb.rebuttal.count()).toBe(0);
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

  it("FIXED (was MINOR INCONSISTENCY, ADMIN got 200): ADMIN can NOT submit rebuttals via this route (403), " +
     "matching the route's own comment ('only MEMBERs may submit rebuttals') and error copy — " +
     "permissions.ts no longer grants ADMIN submit_rebuttal, so the permission table, this API route, the " +
     "server action and the dashboard pages all agree", async () => {
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
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Admins and moderators cannot submit rebuttals");
    expect(await testDb.rebuttal.count()).toBe(0);
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

describe("GET /api/rebuttal/[id] — auth required; author, facility-org members and MODERATOR/ADMIN only (FIXED)", () => {
  async function setup(status: "PENDING" | "APPROVED" | "REJECTED" | "REQUEST_FIX" = "PENDING") {
    const org = await createOrg();
    const author = await createUser({ organizationId: org.id, role: "MEMBER", email: "author@example.com", name: "Author Name" });
    const facility = await createFacility({ organizationId: org.id, createdById: author.id });
    const rebuttal = await createRebuttal({
      userId: author.id,
      facilityId: facility.id,
      status,
      content: "Confidential pending rebuttal content",
    });
    return { org, author, facility, rebuttal };
  }

  function get(id: string, cookies?: Record<string, string>) {
    return getRebuttalById(
      buildRequest(`http://localhost/api/rebuttal/${id}`, { cookies }),
      { params: Promise.resolve({ id }) }
    );
  }

  it("FIXED (was CONFIRMED BUG): a PENDING rebuttal is NOT readable with no authentication — " +
     "401, and the response carries no content, document URL, or author name/email", async () => {
    const { rebuttal } = await setup("PENDING");

    // No cookies at all — a fully anonymous request.
    const res = await get(rebuttal.id);
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "Unauthorized" });
    expect(text).not.toContain("Confidential pending rebuttal content");
    expect(text).not.toContain("author@example.com");
    expect(text).not.toContain("Author Name");
  });

  it("FIXED (was CONFIRMED BUG): a REJECTED rebuttal is no longer publicly readable by ID (401)", async () => {
    const { rebuttal } = await setup("REJECTED");

    const res = await get(rebuttal.id);
    expect(res.status).toBe(401);
  });

  it("an APPROVED rebuttal is not readable anonymously through this endpoint either (401) — " +
     "the public path is /api/rebuttal/published", async () => {
    const { rebuttal } = await setup("APPROVED");

    const res = await get(rebuttal.id);
    expect(res.status).toBe(401);
    expect(await res.text()).not.toContain("author@example.com");
  });

  it("a garbage / tampered auth-token is 401, not 500", async () => {
    const { rebuttal } = await setup();

    const res = await get(rebuttal.id, { "auth-token": "not-a-real-jwt" });
    expect(res.status).toBe(401);
  });

  it("an authenticated MEMBER of a different org gets 403, with no content or author name/email", async () => {
    const { rebuttal } = await setup();
    const otherOrg = await createOrg();
    const outsider = await createUser({ organizationId: otherOrg.id, role: "MEMBER" });

    const res = await get(rebuttal.id, await authCookie(outsider));
    expect(res.status).toBe(403);
    const text = await res.text();
    expect(Object.keys(JSON.parse(text))).toEqual(["error"]);
    expect(text).not.toContain("Confidential pending rebuttal content");
    expect(text).not.toContain("author@example.com");
    expect(text).not.toContain("Author Name");
  });

  it("an authenticated MEMBER with no org at all gets 403, even when the rebuttal's facility is unclaimed " +
     "(empty orgId must never match a null facility.organizationId)", async () => {
    const author = await createUser({ organizationId: null, role: "MEMBER", email: "author@example.com" });
    const unclaimed = await createFacility({ organizationId: null, createdById: null });
    const rebuttal = await createRebuttal({ userId: author.id, facilityId: unclaimed.id });
    const orgless = await createUser({ organizationId: null, role: "MEMBER" });

    const res = await get(rebuttal.id, await authCookie(orgless));
    expect(res.status).toBe(403);
  });

  it("the author can read their own rebuttal (200, full content)", async () => {
    const { rebuttal, author } = await setup();

    const res = await get(rebuttal.id, await authCookie(author));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe("Confidential pending rebuttal content");
    expect(body.user.email).toBe("author@example.com");
  });

  it("the author can still read it after leaving the facility's org (authorship alone is sufficient)", async () => {
    const { rebuttal, author } = await setup();
    const moved = await testDb.user.update({ where: { id: author.id }, data: { organizationId: null } });

    const res = await get(rebuttal.id, await authCookie(moved));
    expect(res.status).toBe(200);
  });

  it("a teammate in the facility's organization (not the author) can read it (200)", async () => {
    const { rebuttal, org } = await setup();
    const teammate = await createUser({ organizationId: org.id, role: "MEMBER" });

    const res = await get(rebuttal.id, await authCookie(teammate));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(rebuttal.id);
  });

  it("MODERATOR and ADMIN (no org relationship) can read it (200)", async () => {
    const { rebuttal } = await setup();
    for (const role of ["MODERATOR", "ADMIN"] as const) {
      const staff = await createUser({ organizationId: null, role });
      const res = await get(rebuttal.id, await authCookie(staff));
      expect(res.status).toBe(200);
    }
  });

  it("an authenticated caller gets 404 for a nonexistent id", async () => {
    const admin = await createUser({ organizationId: null, role: "ADMIN" });
    const res = await get("does-not-exist", await authCookie(admin));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/rebuttal/published — public listing", () => {
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

describe("Soft-deleted rebuttals are treated as not found everywhere (FIXED)", () => {
  async function setupDeleted(status: "PENDING" | "APPROVED") {
    const org = await createOrg();
    const author = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: author.id });
    const rebuttal = await createRebuttal({ userId: author.id, facilityId: facility.id, status });
    await testDb.rebuttal.update({
      where: { id: rebuttal.id },
      data: { deletedAt: new Date(), documentUrl: "https://files.test/doc.pdf", watermarkedUrl: "data:application/pdf;base64,AAAA" },
    });
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    return { rebuttal, admin };
  }

  it("POST /api/moderation on a soft-deleted rebuttal is 404 and leaves it untouched (no status change, no log)", async () => {
    const { rebuttal, admin } = await setupDeleted("PENDING");

    const res = await moderate(
      buildRequest("http://localhost/api/moderation", {
        method: "POST",
        body: { id: rebuttal.id, action: "approve" },
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(404);

    const reread = await testDb.rebuttal.findUnique({ where: { id: rebuttal.id } });
    expect(reread!.status).toBe("PENDING");
    expect(await testDb.moderationLog.count()).toBe(0);
  });

  it("GET /api/rebuttal/watermark for a soft-deleted APPROVED rebuttal is 404 — even for an ADMIN — " +
     "and never returns its document URLs", async () => {
    const { rebuttal, admin } = await setupDeleted("APPROVED");

    for (const cookies of [undefined, await authCookie(admin)]) {
      const res = await getWatermark(
        buildRequest(`http://localhost/api/rebuttal/watermark?rebuttalId=${rebuttal.id}`, { cookies })
      );
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).not.toContain("files.test");
      expect(text).not.toContain("base64");
    }
  });

  it("POST /api/rebuttal/watermark for a soft-deleted rebuttal is 404", async () => {
    const { rebuttal, admin } = await setupDeleted("APPROVED");

    const res = await applyWatermarkRoute(
      buildRequest("http://localhost/api/rebuttal/watermark", {
        method: "POST",
        body: { rebuttalId: rebuttal.id },
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(404);
  });

  it("PATCH /api/takedown/[id] emergency_takedown targeting a soft-deleted rebuttal is 404 (not 500), " +
     "writes no moderation log and does not flag the takedown as executed", async () => {
    const { rebuttal, admin } = await setupDeleted("APPROVED");
    const takedown = await testDb.takedownRequest.create({
      data: {
        ticketNumber: "TDR-DELETED-1",
        requesterName: "Requester",
        requesterEmail: "requester@example.com",
        facilityOrRebuttal: "x",
        reason: "OTHER",
        supportingInfo: "Supporting information.",
        slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
        rebuttalId: rebuttal.id,
      },
    });

    const res = await patchTakedown(
      buildRequest(`http://localhost/api/takedown/${takedown.id}`, {
        method: "PATCH",
        body: { action: "emergency_takedown", emergencyReason: "PII" },
        cookies: await authCookie(admin),
      }),
      { params: Promise.resolve({ id: takedown.id }) }
    );
    expect(res.status).toBe(404);

    expect(await testDb.moderationLog.count()).toBe(0);
    const rereadTakedown = await testDb.takedownRequest.findUnique({ where: { id: takedown.id } });
    expect(rereadTakedown!.isEmergencyTakedown).toBe(false);
    const rereadRebuttal = await testDb.rebuttal.findUnique({ where: { id: rebuttal.id } });
    expect(rereadRebuttal!.status).toBe("APPROVED");
  });

  it("the same emergency_takedown on a LIVE rebuttal still works (200) and unpublishes it", async () => {
    const org = await createOrg();
    const author = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: author.id });
    const rebuttal = await createRebuttal({ userId: author.id, facilityId: facility.id, status: "APPROVED" });
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const takedown = await testDb.takedownRequest.create({
      data: {
        ticketNumber: "TDR-LIVE-1",
        requesterName: "Requester",
        requesterEmail: "requester@example.com",
        facilityOrRebuttal: "x",
        reason: "OTHER",
        supportingInfo: "Supporting information.",
        slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
        rebuttalId: rebuttal.id,
      },
    });

    const res = await patchTakedown(
      buildRequest(`http://localhost/api/takedown/${takedown.id}`, {
        method: "PATCH",
        body: { action: "emergency_takedown", emergencyReason: "PII" },
        cookies: await authCookie(admin),
      }),
      { params: Promise.resolve({ id: takedown.id }) }
    );
    expect(res.status).toBe(200);
    const reread = await testDb.rebuttal.findUnique({ where: { id: rebuttal.id } });
    expect(reread!.status).toBe("REJECTED");
  });
});
