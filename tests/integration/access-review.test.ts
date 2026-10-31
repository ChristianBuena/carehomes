/**
 * SOW 11.1 — quarterly permission audit.
 * - MODERATORs can reach the access review through the Proxy (was 403 for
 *   every /api/admin/* path); every other /api/admin/* route stays ADMIN-only.
 * - Each review records the reviewer, date, decision and notes.
 * - The review record can be exported (CSV/JSON), and the export is audited.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { resetDb, testDb, disconnectDb, createUser } from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { proxy } from "@/proxy";
import { GET as list, POST as review } from "@/app/api/admin/access-review/route";
import { GET as exportReviews } from "@/app/api/admin/access-review/export/route";

beforeEach(resetDb);
afterAll(disconnectDb);

type U = { id: string; email: string; role: "MEMBER" | "MODERATOR" | "ADMIN"; organizationId: string | null };

async function viaProxy(path: string, user: U) {
  const { "auth-token": token } = await authCookie(user);
  return proxy(new NextRequest(`http://localhost${path}`, { headers: { cookie: `auth-token=${token}` } }));
}
const passedProxy = (res: Response) => res.headers.get("x-middleware-next") === "1";

async function post(caller: U, body: unknown) {
  return review(buildRequest("http://localhost/api/admin/access-review", { method: "POST", body, cookies: await authCookie(caller) }));
}

describe("Proxy: who reaches /api/admin/access-review", () => {
  it("FIXED: a MODERATOR is let through to the review and its export", async () => {
    const moderator = await createUser({ role: "MODERATOR" });
    expect(passedProxy(await viaProxy("/api/admin/access-review", moderator))).toBe(true);
    expect(passedProxy(await viaProxy("/api/admin/access-review/export", moderator))).toBe(true);
  });

  it("a MODERATOR is still blocked from every other /api/admin route", async () => {
    const moderator = await createUser({ role: "MODERATOR" });
    for (const p of ["/api/admin/audit-log", "/api/admin/sessions/revoke", "/api/admin/archive-moderation-logs", "/api/admin", "/api/admin/access-reviewer"]) {
      expect((await viaProxy(p, moderator)).status, p).toBe(403);
    }
  });

  it("a MEMBER is blocked from the review; an ADMIN reaches everything", async () => {
    const member = await createUser({ role: "MEMBER" });
    const admin = await createUser({ role: "ADMIN" });
    expect((await viaProxy("/api/admin/access-review", member)).status).toBe(403);
    expect(passedProxy(await viaProxy("/api/admin/access-review", admin))).toBe(true);
    expect(passedProxy(await viaProxy("/api/admin/audit-log", admin))).toBe(true);
  });
});

describe("POST records reviewer, date, decision and notes", () => {
  it("KEEP_ACCESS (default) writes a review row and refreshes lastReviewedAt", async () => {
    const moderator = await createUser({ role: "MODERATOR", name: "Mo Derator" });
    const member = await createUser({ role: "MEMBER" });
    const before = Date.now();
    const res = await post(moderator, { userId: member.id });
    expect(res.status).toBe(200);

    const rows = await testDb.accessReview.findMany({ where: { userId: member.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reviewerId: moderator.id,
      reviewerRole: "MODERATOR",
      roleAtReview: "MEMBER",
      decision: "KEEP_ACCESS",
      notes: null,
    });
    expect(rows[0].reviewedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    const u = await testDb.user.findUniqueOrThrow({ where: { id: member.id } });
    expect(u.lastReviewedAt?.getTime()).toBe(rows[0].reviewedAt.getTime());

    const audit = await testDb.auditLog.findFirstOrThrow({ where: { action: "ACCESS_REVIEWED" } });
    expect(audit).toMatchObject({ actorId: moderator.id, targetId: member.id });
  });

  it("CHANGE_REQUESTED needs notes, and stores them", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const moderator = await createUser({ role: "MODERATOR" });
    expect((await post(admin, { userId: moderator.id, decision: "CHANGE_REQUESTED" })).status).toBe(400);
    expect((await post(admin, { userId: moderator.id, decision: "CHANGE_REQUESTED", notes: "   " })).status).toBe(400);
    expect((await post(admin, { userId: moderator.id, decision: "CHANGE_REQUESTED", notes: "Left the team; remove moderator role" })).status).toBe(200);
    const [row] = await testDb.accessReview.findMany();
    expect(row).toMatchObject({ decision: "CHANGE_REQUESTED", notes: "Left the team; remove moderator role", roleAtReview: "MODERATOR" });
  });

  it("rejects unknown decisions, non-text or over-long notes, and a missing userId", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const member = await createUser({ role: "MEMBER" });
    for (const body of [
      { userId: member.id, decision: "DELETE_USER" },
      { userId: member.id, notes: { x: 1 } },
      { userId: member.id, notes: "x".repeat(1001) },
      {},
    ]) {
      expect((await post(admin, body)).status).toBe(400);
    }
    expect(await testDb.accessReview.count()).toBe(0);
  });

  it("a rejected review (moderator -> admin) writes nothing", async () => {
    const moderator = await createUser({ role: "MODERATOR" });
    const admin = await createUser({ role: "ADMIN" });
    expect((await post(moderator, { userId: admin.id })).status).toBe(403);
    expect(await testDb.accessReview.count()).toBe(0);
    expect(await testDb.auditLog.count({ where: { action: "ACCESS_REVIEWED" } })).toBe(0);
  });

  it("GET shows the previous review (who and when) for accounts that are due again", async () => {
    const admin = await createUser({ role: "ADMIN", name: "Ada Admin" });
    const member = await createUser({ role: "MEMBER" });
    const old = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
    await testDb.accessReview.create({ data: { userId: member.id, reviewerId: admin.id, reviewerRole: "ADMIN", roleAtReview: "MEMBER", reviewedAt: old } });
    await testDb.user.update({ where: { id: member.id }, data: { lastReviewedAt: old } });

    const body = await (await list(buildRequest("http://localhost/api/admin/access-review", { cookies: await authCookie(admin) }))).json();
    const row = (body.users as Array<{ id: string; lastReview: { reviewer: { name: string } } | null }>).find((u) => u.id === member.id);
    expect(row?.lastReview?.reviewer.name).toBe("Ada Admin");
  });
});

describe("GET /api/admin/access-review/export", () => {
  async function seed() {
    const admin = await createUser({ role: "ADMIN", name: "Ada Admin" });
    const moderator = await createUser({ role: "MODERATOR", name: "Mo Derator" });
    const member = await createUser({ role: "MEMBER", name: "Mem Ber", email: "mem@example.com" });
    await testDb.accessReview.create({ data: { userId: member.id, reviewerId: moderator.id, reviewerRole: "MODERATOR", roleAtReview: "MEMBER", notes: "=cmd()" } });
    await testDb.accessReview.create({
      data: { userId: moderator.id, reviewerId: admin.id, reviewerRole: "ADMIN", roleAtReview: "MODERATOR", reviewedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) },
    });
    return { admin, moderator, member };
  }

  it("CSV of the last 90 days by default, with reviewer and decision; formulas escaped; audited", async () => {
    const { moderator } = await seed();
    const res = await exportReviews(buildRequest("http://localhost/api/admin/access-review/export", { cookies: await authCookie(moderator) }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    const lines = (await res.text()).trim().split("\r\n");
    expect(lines[0]).toBe("reviewId,reviewedAt,accountId,accountName,accountEmail,roleAtReview,currentRole,decision,notes,reviewerId,reviewerName,reviewerRole");
    expect(lines).toHaveLength(2); // the 200-day-old review is outside the default range
    expect(lines[1]).toContain("Mem Ber");
    expect(lines[1]).toContain("Mo Derator");
    expect(lines[1]).toContain("KEEP_ACCESS");
    expect(lines[1]).toContain("'=cmd()");

    const audit = await testDb.auditLog.findFirstOrThrow({ where: { action: "ACCESS_REVIEW_EXPORTED" } });
    expect(audit.actorId).toBe(moderator.id);
    expect(audit.metadata).toMatchObject({ rowCount: 1 });
  });

  it("a custom range includes older reviews (JSON)", async () => {
    const { admin } = await seed();
    const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const res = await exportReviews(buildRequest(`http://localhost/api/admin/access-review/export?format=json&from=${from}`, { cookies: await authCookie(admin) }));
    expect(((await res.json()) as { count: number }).count).toBe(2);
  });

  it("MEMBER 403, no session 401, bad input 400", async () => {
    const { admin, member } = await seed();
    expect((await exportReviews(buildRequest("http://localhost/api/admin/access-review/export"))).status).toBe(401);
    expect((await exportReviews(buildRequest("http://localhost/api/admin/access-review/export", { cookies: await authCookie(member) }))).status).toBe(403);
    const cookies = await authCookie(admin);
    for (const q of ["from=nope", "format=pdf", "from=2026-12-01T00:00:00Z&to=2026-01-01T00:00:00Z"]) {
      expect((await exportReviews(buildRequest(`http://localhost/api/admin/access-review/export?${q}`, { cookies }))).status, q).toBe(400);
    }
  });
});
