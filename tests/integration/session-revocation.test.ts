/**
 * SOW 11.1a — least privilege.
 *
 * Sessions are checked against the database on every request:
 * - logout and the admin "revoke sessions" action invalidate every token the
 *   user already holds (token version);
 * - the role used for authorization is the CURRENT role, not the one baked
 *   into a 7-day token;
 * - the Proxy (src/proxy.ts) applies the same check to page and admin routes.
 * Also: a moderator cannot mark an ADMIN account (or their own) as reviewed.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import { resetDb, testDb, disconnectDb, createOrgWithUser, createUser } from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { signToken } from "@/lib/jwt";
import { getSessionUser } from "@/lib/auth";
import { proxy } from "@/proxy";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { GET as listFiles } from "@/app/api/files/route";
import { GET as auditExport } from "@/app/api/admin/audit-log/route";
import { POST as revoke } from "@/app/api/admin/sessions/revoke/route";
import { POST as markReviewed } from "@/app/api/admin/access-review/route";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

function proxyRequest(path: string, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: token ? { cookie: `auth-token=${token}` } : {},
  });
}

describe("logout revokes the session server-side", () => {
  it("the same cookie is rejected after logout, by routes, getSessionUser and the proxy", async () => {
    const { user } = await createOrgWithUser({});
    const cookies = await authCookie(user);
    const token = cookies["auth-token"];

    expect((await listFiles(buildRequest("http://localhost/api/files", { cookies }))).status).toBe(200);

    const out = await logout(buildRequest("http://localhost/api/auth/logout", { method: "POST", cookies }));
    expect(out.status).toBe(200);
    expect(out.cookies.get("auth-token")?.value).toBe("");

    expect((await listFiles(buildRequest("http://localhost/api/files", { cookies }))).status).toBe(401);
    expect((await me(buildRequest("http://localhost/api/auth/me", { cookies }))).status).toBe(401);
    expect(await getSessionUser(token)).toBeNull();

    const page = await proxy(proxyRequest("/dashboard", token));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toMatch(/\/login$/);
  });

  it("a token issued after logout (new version) works", async () => {
    const { user } = await createOrgWithUser({});
    await logout(buildRequest("http://localhost/api/auth/logout", { method: "POST", cookies: await authCookie(user) }));
    const fresh = await testDb.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh.tokenVersion).toBe(1);
    const token = await signToken({ userId: user.id, email: user.email, role: user.role, orgId: user.organizationId ?? "", tv: 1 });
    expect((await listFiles(buildRequest("http://localhost/api/files", { cookies: { "auth-token": token } }))).status).toBe(200);
  });

  it("tokens issued before the version claim existed still work until revoked (no forced logout on deploy)", async () => {
    const { user } = await createOrgWithUser({});
    const legacy = await signToken({ userId: user.id, email: user.email, role: user.role, orgId: user.organizationId ?? "" });
    expect(await getSessionUser(legacy)).not.toBeNull();
    await testDb.user.update({ where: { id: user.id }, data: { tokenVersion: 1 } });
    expect(await getSessionUser(legacy)).toBeNull();
  });

  it("logout with no or an invalid cookie still succeeds and changes nothing", async () => {
    const { user } = await createOrgWithUser({});
    expect((await logout(buildRequest("http://localhost/api/auth/logout", { method: "POST" }))).status).toBe(200);
    expect((await logout(buildRequest("http://localhost/api/auth/logout", { method: "POST", cookies: { "auth-token": "garbage" } }))).status).toBe(200);
    expect((await testDb.user.findUniqueOrThrow({ where: { id: user.id } })).tokenVersion).toBe(0);
  });
});

describe("role comes from the database, not the token", () => {
  it("an ADMIN demoted to MEMBER loses admin access immediately, with the old token", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const cookies = await authCookie(admin);
    expect((await auditExport(buildRequest("http://localhost/api/admin/audit-log", { cookies }))).status).toBe(200);

    await testDb.user.update({ where: { id: admin.id }, data: { role: "MEMBER" } });

    expect((await auditExport(buildRequest("http://localhost/api/admin/audit-log", { cookies }))).status).toBe(403);
    const viaProxy = await proxy(proxyRequest("/api/admin/audit-log", cookies["auth-token"]));
    expect(viaProxy.status).toBe(403);
    expect((await getSessionUser(cookies["auth-token"]))?.role).toBe("MEMBER");
  });

  it("a token claiming ADMIN for a MEMBER account gets MEMBER rights", async () => {
    const member = await createUser({ role: "MEMBER" });
    const forged = await signToken({ userId: member.id, email: member.email, role: "ADMIN", orgId: "" });
    expect((await auditExport(buildRequest("http://localhost/api/admin/audit-log", { cookies: { "auth-token": forged } }))).status).toBe(403);
  });

  it("a deleted user's token is rejected", async () => {
    const user = await createUser({});
    const cookies = await authCookie(user);
    await testDb.user.delete({ where: { id: user.id } });
    expect((await listFiles(buildRequest("http://localhost/api/files", { cookies }))).status).toBe(401);
  });
});

describe("POST /api/admin/sessions/revoke", () => {
  it("ADMIN signs a user out everywhere, and it is audited", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { user } = await createOrgWithUser({});
    const victim = await authCookie(user);

    const res = await revoke(buildRequest("http://localhost/api/admin/sessions/revoke", {
      method: "POST",
      body: { userId: user.id },
      cookies: await authCookie(admin),
    }));
    expect(res.status).toBe(200);
    expect((await listFiles(buildRequest("http://localhost/api/files", { cookies: victim }))).status).toBe(401);

    const audit = await testDb.auditLog.findFirstOrThrow({ where: { action: "AUTH_SESSIONS_REVOKED" } });
    expect(audit).toMatchObject({ actorId: admin.id, targetId: user.id });
  });

  it("MODERATOR and MEMBER are forbidden; bad input is 400; unknown user is 404", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const moderator = await createUser({ role: "MODERATOR" });
    const member = await createUser({ role: "MEMBER" });
    for (const u of [moderator, member]) {
      const r = await revoke(buildRequest("http://localhost/api/admin/sessions/revoke", { method: "POST", body: { userId: admin.id }, cookies: await authCookie(u) }));
      expect(r.status).toBe(403);
    }
    const adminCookies = await authCookie(admin);
    expect((await revoke(buildRequest("http://localhost/api/admin/sessions/revoke", { method: "POST", body: {}, cookies: adminCookies }))).status).toBe(400);
    expect((await revoke(buildRequest("http://localhost/api/admin/sessions/revoke", { method: "POST", body: { userId: "nope" }, cookies: adminCookies }))).status).toBe(404);
    expect((await testDb.user.findUniqueOrThrow({ where: { id: admin.id } })).tokenVersion).toBe(0);
  });
});

describe("access review: moderators cannot sign off on admin accounts", () => {
  async function mark(caller: { id: string; email: string; role: "MEMBER" | "MODERATOR" | "ADMIN"; organizationId: string | null }, userId: string) {
    return markReviewed(buildRequest("http://localhost/api/admin/access-review", {
      method: "POST",
      body: { userId },
      cookies: await authCookie(caller),
    }));
  }

  it("MODERATOR -> ADMIN is 403 and lastReviewedAt stays empty", async () => {
    const moderator = await createUser({ role: "MODERATOR" });
    const admin = await createUser({ role: "ADMIN" });
    expect((await mark(moderator, admin.id)).status).toBe(403);
    expect((await testDb.user.findUniqueOrThrow({ where: { id: admin.id } })).lastReviewedAt).toBeNull();
  });

  it("MODERATOR cannot review their own account", async () => {
    const moderator = await createUser({ role: "MODERATOR" });
    expect((await mark(moderator, moderator.id)).status).toBe(403);
  });

  it("MODERATOR can review a MEMBER or another MODERATOR; ADMIN can review an ADMIN", async () => {
    const moderator = await createUser({ role: "MODERATOR" });
    const other = await createUser({ role: "MODERATOR" });
    const member = await createUser({ role: "MEMBER" });
    const admin = await createUser({ role: "ADMIN" });
    const admin2 = await createUser({ role: "ADMIN" });
    expect((await mark(moderator, member.id)).status).toBe(200);
    expect((await mark(moderator, other.id)).status).toBe(200);
    expect((await mark(admin, admin2.id)).status).toBe(200);
  });

  it("unknown user is 404", async () => {
    const admin = await createUser({ role: "ADMIN" });
    expect((await mark(admin, "missing")).status).toBe(404);
  });
});
