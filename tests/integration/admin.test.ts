import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { resetDb, testDb, disconnectDb, createUser, createOrg, createMembership } from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { GET as accessReviewGet, POST as accessReviewPost } from "@/app/api/admin/access-review/route";
import { POST as archiveModerationLogs } from "@/app/api/admin/archive-moderation-logs/route";

beforeEach(resetDb);
afterAll(disconnectDb);

describe("GET /api/admin/access-review — FIXED (was CRITICAL CONFIRMED BUG: always 500)", () => {
  it("FIXED: returns 200 for an ADMIN and lists users due for review, with each user's membership " +
     "read through User -> organization -> membership (the pre-CH-18 User.membership relation is gone)", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null, email: "admin@example.com" });
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
    await createUser({ role: "MEMBER", organizationId: org.id, email: "paying@example.com" });
    const bareOrg = await createOrg();
    await createUser({ role: "MEMBER", organizationId: bareOrg.id, email: "nomembership@example.com" });

    const res = await accessReviewGet(
      buildRequest("http://localhost/api/admin/access-review", { cookies: await authCookie(admin) })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.count).toBe(3);
    const byEmail = Object.fromEntries(
      (body.users as Array<{ email: string; organization: unknown }>).map((u) => [u.email, u])
    );
    expect(byEmail["paying@example.com"].organization).toEqual({
      membership: { plan: "TIER_B", status: "ACTIVE" },
    });
    // Org exists but has no Membership row.
    expect(byEmail["nomembership@example.com"].organization).toEqual({ membership: null });
    // No org at all.
    expect(byEmail["admin@example.com"].organization).toBeNull();
    // The password hash must never be part of this payload.
    expect(JSON.stringify(body)).not.toContain("irrelevant-hash");
  });

  it("FIXED: MODERATOR also gets 200 (permission check passes and the query now succeeds)", async () => {
    const moderator = await createUser({ role: "MODERATOR", organizationId: null });
    const res = await accessReviewGet(
      buildRequest("http://localhost/api/admin/access-review", { cookies: await authCookie(moderator) })
    );
    expect(res.status).toBe(200);
  });

  it("users reviewed within the last 90 days are excluded; older reviews are included", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null, email: "admin@example.com" });
    const recent = await createUser({ role: "MEMBER", organizationId: null, email: "recent@example.com" });
    const stale = await createUser({ role: "MEMBER", organizationId: null, email: "stale@example.com" });
    const day = 24 * 60 * 60 * 1000;
    await testDb.user.update({ where: { id: admin.id }, data: { lastReviewedAt: new Date() } });
    await testDb.user.update({ where: { id: recent.id }, data: { lastReviewedAt: new Date(Date.now() - 10 * day) } });
    await testDb.user.update({ where: { id: stale.id }, data: { lastReviewedAt: new Date(Date.now() - 120 * day) } });

    const res = await accessReviewGet(
      buildRequest("http://localhost/api/admin/access-review", { cookies: await authCookie(admin) })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body.users as Array<{ email: string }>).map((u) => u.email)).toEqual(["stale@example.com"]);
  });

  it("MEMBER is still correctly forbidden before the query ever runs (403, not 500)", async () => {
    const member = await createUser({ role: "MEMBER", organizationId: null });
    const res = await accessReviewGet(
      buildRequest("http://localhost/api/admin/access-review", { cookies: await authCookie(member) })
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/access-review — marking a user reviewed works correctly", () => {
  it("ADMIN can mark a user as reviewed (this handler does not touch the broken membership relation)", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const target = await createUser({ role: "MEMBER", organizationId: null });

    const res = await accessReviewPost(
      buildRequest("http://localhost/api/admin/access-review", {
        method: "POST",
        body: { userId: target.id },
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/admin/archive-moderation-logs", () => {
  it("ADMIN can trigger archival with no logs to archive (0, not a crash)", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const res = await archiveModerationLogs(
      buildRequest("http://localhost/api/admin/archive-moderation-logs", {
        method: "POST",
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.archivedCount).toBe(0);
  });

  it("MEMBER is forbidden", async () => {
    const member = await createUser({ role: "MEMBER", organizationId: null });
    const res = await archiveModerationLogs(
      buildRequest("http://localhost/api/admin/archive-moderation-logs", {
        method: "POST",
        cookies: await authCookie(member),
      })
    );
    expect(res.status).toBe(403);
  });
});
