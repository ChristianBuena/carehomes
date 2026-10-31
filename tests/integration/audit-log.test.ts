/**
 * SOW 3E.5 — general audit log.
 *
 * 1. The table is append-only at the database level: UPDATE, DELETE and
 *    TRUNCATE are rejected for the application's own connection.
 * 2. No application code updates or deletes audit rows (static check).
 * 3. Security-relevant actions write a row, with no email address in it.
 * 4. The export is ADMIN-only, validates input, escapes CSV formulas, and is
 *    itself audited.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("uploadthing/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("uploadthing/server")>();
  return {
    ...mod,
    UTApi: class {
      deleteFiles = vi.fn().mockResolvedValue({ success: true, deletedCount: 1 });
    },
  };
});

import {
  resetDb,
  testDb,
  disconnectDb,
  createOrgWithUser,
  createUser,
  createMemberFile,
  createFacility,
  createRebuttal,
  createOrg,
  createMembership,
} from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as verify } from "@/app/api/auth/verify/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import * as auditRoute from "@/app/api/admin/audit-log/route";
import { POST as createShare } from "@/app/api/files/share/route";
import { DELETE as revokeShare } from "@/app/api/files/share/[id]/route";
import { DELETE as deleteFile } from "@/app/api/files/route";
import { POST as moderate } from "@/app/api/moderation/route";
import { POST as membershipUpdate } from "@/app/api/membership/update/route";
import { POST as takedown } from "@/app/api/takedown/route";
import { recordAudit, csvCell, AUDIT_ACTIONS } from "@/services/audit.service";

const ROOT = path.resolve(__dirname, "..", "..");

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

async function rows(action?: string) {
  return testDb.auditLog.findMany({ where: action ? { action } : {}, orderBy: { createdAt: "asc" } });
}

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "generated" ? [] : listSourceFiles(full);
    return /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });
}

describe("AuditLog is append-only in the database", () => {
  it("UPDATE is rejected", async () => {
    const row = await testDb.auditLog.create({ data: { action: "AUTH_LOGOUT" } });
    await expect(testDb.auditLog.update({ where: { id: row.id }, data: { action: "TAMPERED" } })).rejects.toThrow(/append-only/);
    expect((await testDb.auditLog.findUnique({ where: { id: row.id } }))?.action).toBe("AUTH_LOGOUT");
  });

  it("DELETE and deleteMany are rejected", async () => {
    const row = await testDb.auditLog.create({ data: { action: "AUTH_LOGOUT" } });
    await expect(testDb.auditLog.delete({ where: { id: row.id } })).rejects.toThrow(/append-only/);
    await expect(testDb.auditLog.deleteMany({})).rejects.toThrow(/append-only/);
    expect(await testDb.auditLog.count()).toBe(1);
  });

  it("raw UPDATE, DELETE and TRUNCATE are rejected", async () => {
    await testDb.auditLog.create({ data: { action: "AUTH_LOGOUT" } });
    await expect(testDb.$executeRawUnsafe(`UPDATE "AuditLog" SET "action" = 'X'`)).rejects.toThrow(/append-only/);
    await expect(testDb.$executeRawUnsafe(`DELETE FROM "AuditLog"`)).rejects.toThrow(/append-only/);
    await expect(testDb.$executeRawUnsafe(`TRUNCATE TABLE "AuditLog"`)).rejects.toThrow(/append-only/);
    expect(await testDb.auditLog.count()).toBe(1);
  });

  it("deleting a user leaves their audit rows intact (no foreign key to rewrite)", async () => {
    const user = await createUser({});
    await testDb.auditLog.create({ data: { action: "AUTH_LOGOUT", actorId: user.id } });
    await testDb.user.delete({ where: { id: user.id } });
    expect((await rows("AUTH_LOGOUT"))[0].actorId).toBe(user.id);
  });
});

describe("no application code edits or removes audit rows", () => {
  it("src/ never calls update/upsert/delete on auditLog", () => {
    const offenders = listSourceFiles(path.join(ROOT, "src")).flatMap((file) => {
      const src = fs.readFileSync(file, "utf8");
      return /auditLog\s*\.\s*(update|updateMany|upsert|delete|deleteMany)\b/.test(src) ? [path.relative(ROOT, file)] : [];
    });
    expect(offenders).toEqual([]);
  });

  it("the export route exposes GET only", () => {
    expect(Object.keys(auditRoute).filter((k) => /^[A-Z]+$/.test(k))).toEqual(["GET"]);
  });

  it("recordAudit never throws, even when the write fails", async () => {
    const failing = { auditLog: { create: vi.fn().mockRejectedValue(new Error("db down")) } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(recordAudit({ action: "AUTH_LOGOUT" }, failing as never)).resolves.toBeUndefined();
    spy.mockRestore();
  });
});

describe("security-relevant actions are recorded, without email addresses", () => {
  it("signup, wrong password, password OK, MFA failure, login success, logout", async () => {
    const email = "audit.flow@example.com";
    const password = "password123";
    await signup(buildRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: { name: "Audit Flow", email, password, confirmPassword: password },
    }));
    const user = await testDb.user.findUniqueOrThrow({ where: { email } });

    await login(buildRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: { email, password: "wrong-password" },
      headers: { "x-forwarded-for": "203.0.113.7", "user-agent": "audit-test" },
    }));
    await login(buildRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: { email: "nobody@example.com", password: "x" },
    }));
    const ok = await login(buildRequest("http://localhost/api/auth/login", { method: "POST", body: { email, password } }));
    const pending = /mfa-pending=([^;]+)/.exec(ok.headers.get("set-cookie") ?? "")?.[1] ?? "";

    await verify(buildRequest("http://localhost/api/auth/verify", {
      method: "POST",
      body: { otp: "000000" },
      cookies: { "mfa-pending": pending },
    }));
    const otp = await testDb.mfaOtp.findFirstOrThrow({ where: { email }, orderBy: { createdAt: "desc" } });
    const verified = await verify(buildRequest("http://localhost/api/auth/verify", {
      method: "POST",
      body: { otp: otp.code },
      cookies: { "mfa-pending": pending },
    }));
    expect(verified.status).toBe(200);
    const session = /auth-token=([^;]+)/.exec(verified.headers.get("set-cookie") ?? "")?.[1] ?? "";
    await logout(buildRequest("http://localhost/api/auth/logout", { method: "POST", cookies: { "auth-token": session } }));

    const all = await rows();
    const actions = all.map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining([
      "AUTH_SIGNUP",
      "AUTH_LOGIN_FAILED",
      "AUTH_LOGIN_PASSWORD_OK",
      "AUTH_LOGIN_SUCCESS",
      "AUTH_LOGOUT",
    ]));
    if (otp.code !== "000000") expect(actions).toContain("AUTH_MFA_FAILED");

    const failed = all.filter((r) => r.action === "AUTH_LOGIN_FAILED");
    expect(failed).toHaveLength(2);
    const known = failed.find((r) => r.actorId === user.id)!;
    expect(known.ipAddress).toBe("203.0.113.7");
    expect(known.userAgent).toBe("audit-test");
    expect(known.metadata).toEqual({ reason: "wrong_password" });
    expect(failed.find((r) => r.actorId === null)?.metadata).toEqual({ reason: "unknown_account" });

    expect(all.find((r) => r.action === "AUTH_LOGIN_SUCCESS")?.actorId).toBe(user.id);
    expect(all.find((r) => r.action === "AUTH_LOGOUT")?.actorId).toBe(user.id);

    // No email address anywhere in the log.
    expect(JSON.stringify(all)).not.toMatch(/@example\.com/);
  });

  it("share link create and revoke, file delete", async () => {
    const { user } = await createOrgWithUser({});
    const cookies = await authCookie(user);
    const file = await createMemberFile({ userId: user.id });

    const created = await createShare(buildRequest("http://localhost/api/files/share", {
      method: "POST",
      body: { shareAll: false, fileIds: [file.id], expiry: "7d" },
      cookies,
    }));
    const { id } = (await created.json()) as { id: string };
    await revokeShare(
      buildRequest(`http://localhost/api/files/share/${id}`, { method: "DELETE", cookies }),
      { params: Promise.resolve({ id }) }
    );
    await deleteFile(buildRequest(`http://localhost/api/files?id=${file.id}`, { method: "DELETE", cookies }));

    expect((await rows("SHARE_LINK_CREATED"))[0]).toMatchObject({ actorId: user.id, targetId: id });
    expect((await rows("SHARE_LINK_REVOKED"))[0]).toMatchObject({ actorId: user.id, targetId: id });
    expect((await rows("FILE_DELETED"))[0]).toMatchObject({ actorId: user.id, targetId: file.id });
  });

  it("moderation decision and admin membership override", async () => {
    const { user: member, org } = await createOrgWithUser({});
    const moderator = await createUser({ role: "MODERATOR" });
    const admin = await createUser({ role: "ADMIN" });
    const facility = await createFacility({ organizationId: org.id, createdById: member.id });
    const rebuttal = await createRebuttal({ userId: member.id, facilityId: facility.id });

    await moderate(buildRequest("http://localhost/api/moderation", {
      method: "POST",
      body: { id: rebuttal.id, action: "approve" },
      cookies: await authCookie(moderator),
    }));
    await membershipUpdate(buildRequest("http://localhost/api/membership/update", {
      method: "POST",
      body: { organizationId: org.id, plan: "TIER_B" },
      cookies: await authCookie(admin),
    }));

    expect((await rows("REBUTTAL_APPROVED"))[0]).toMatchObject({
      actorId: moderator.id,
      actorRole: "MODERATOR",
      targetType: "Rebuttal",
      targetId: rebuttal.id,
    });
    const override = (await rows("MEMBERSHIP_ADMIN_OVERRIDE"))[0];
    expect(override).toMatchObject({ actorId: admin.id, targetId: org.id });
    expect(override.metadata).toMatchObject({ toPlan: "TIER_B", toStatus: "ACTIVE" });
  });

  it("public takedown request is recorded without the requester's name or email", async () => {
    const res = await takedown(buildRequest("http://localhost/api/takedown", {
      method: "POST",
      body: {
        requesterName: "Jane Requester",
        requesterEmail: "jane.requester@example.com",
        facilityOrRebuttal: "Some Facility",
        reason: "OTHER",
        supportingInfo: "Supporting information that is long enough.",
      },
    }));
    expect(res.status).toBe(201);
    const [row] = await rows("TAKEDOWN_SUBMITTED");
    expect(row.actorId).toBeNull();
    expect(JSON.stringify(row)).not.toMatch(/Jane|jane\.requester/);
  });
});

describe("GET /api/admin/audit-log", () => {
  async function seed() {
    const org = await createOrg();
    await createMembership({ organizationId: org.id });
    const admin = await createUser({ role: "ADMIN", organizationId: org.id });
    const moderator = await createUser({ role: "MODERATOR" });
    const member = await createUser({ role: "MEMBER", organizationId: org.id });
    await testDb.auditLog.create({ data: { action: "AUTH_LOGIN_SUCCESS", actorId: member.id, actorRole: "MEMBER", createdAt: new Date("2026-01-01T00:00:00Z") } });
    await testDb.auditLog.create({ data: { action: "FILE_DELETED", actorId: member.id, actorRole: "MEMBER", createdAt: new Date("2026-02-01T00:00:00Z"), metadata: { note: "=HYPERLINK(\"x\")" } } });
    return { admin, moderator, member };
  }

  it("is ADMIN-only: 401 without a session, 403 for MODERATOR and MEMBER", async () => {
    const { moderator, member } = await seed();
    expect((await auditRoute.GET(buildRequest("http://localhost/api/admin/audit-log"))).status).toBe(401);
    expect((await auditRoute.GET(buildRequest("http://localhost/api/admin/audit-log", { cookies: await authCookie(moderator) }))).status).toBe(403);
    expect((await auditRoute.GET(buildRequest("http://localhost/api/admin/audit-log", { cookies: await authCookie(member) }))).status).toBe(403);
  });

  it("returns CSV with a header row and every column, and records the export", async () => {
    const { admin } = await seed();
    const res = await auditRoute.GET(buildRequest("http://localhost/api/admin/audit-log", { cookies: await authCookie(admin) }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="audit-log-/);
    const text = await res.text();
    const lines = text.trim().split("\r\n");
    expect(lines[0]).toBe("id,createdAt,actorId,actorRole,action,targetType,targetId,ipAddress,userAgent,metadata");
    expect(lines).toHaveLength(3);
    expect(text).toContain("AUTH_LOGIN_SUCCESS");

    const exported = await rows("AUDIT_LOG_EXPORTED");
    expect(exported).toHaveLength(1);
    expect(exported[0]).toMatchObject({ actorId: admin.id, actorRole: "ADMIN" });
    expect(exported[0].metadata).toMatchObject({ rowCount: 2, format: "csv" });
  });

  it("filters by date range and action (JSON)", async () => {
    const { admin } = await seed();
    const cookies = await authCookie(admin);
    const byDate = await auditRoute.GET(buildRequest("http://localhost/api/admin/audit-log?format=json&from=2026-01-15T00:00:00Z&to=2026-03-01T00:00:00Z", { cookies }));
    expect(((await byDate.json()) as { rows: { action: string }[] }).rows.map((r) => r.action)).toEqual(["FILE_DELETED"]);
    const byAction = await auditRoute.GET(buildRequest("http://localhost/api/admin/audit-log?format=json&action=AUTH_LOGIN_SUCCESS", { cookies }));
    expect(((await byAction.json()) as { count: number }).count).toBe(1);
  });

  it("rejects bad dates, unknown actions and unknown formats with 400", async () => {
    const { admin } = await seed();
    const cookies = await authCookie(admin);
    for (const q of ["from=not-a-date", "action=DROP_TABLE", "format=xml"]) {
      expect((await auditRoute.GET(buildRequest(`http://localhost/api/admin/audit-log?${q}`, { cookies }))).status).toBe(400);
    }
  });

  it("neutralises spreadsheet formulas in CSV cells", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe("");
  });

  it("every action name is unique", () => {
    expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length);
  });
});
