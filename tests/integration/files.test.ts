/**
 * Round 3, area A — member file storage and attorney share links.
 *
 * Intended rule (confirmed with the project owner): a file is PRIVATE TO THE
 * UPLOADER. Only the uploader and an ADMIN can see or delete it; a colleague
 * in the same organization has no access.
 *
 * Tests named "FAILS [severity]" assert the EXPECTED behaviour and are marked
 * `it.fails`: they document a defect that is reported in docs/TEST_REPORT.md
 * and not fixed in this pass. When the defect is fixed the test will start
 * failing as an unexpected pass — remove `.fails` then.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

const { mockDeleteFiles } = vi.hoisted(() => ({ mockDeleteFiles: vi.fn() }));

// DELETE /api/files removes the blob from UploadThing — never call the real service.
vi.mock("uploadthing/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("uploadthing/server")>();
  return {
    ...mod,
    UTApi: class {
      deleteFiles = mockDeleteFiles;
    },
  };
});

import {
  resetDb,
  testDb,
  disconnectDb,
  createOrg,
  createMembership,
  createUser,
  createMemberFile,
  createShareLink,
} from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { GET as listFiles, DELETE as deleteFile, PATCH as patchFile } from "@/app/api/files/route";
import { POST as createShare, GET as listShares } from "@/app/api/files/share/route";
import { DELETE as revokeShare } from "@/app/api/files/share/[id]/route";
import { GET as openShare } from "@/app/api/share/[token]/route";

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });
});
afterAll(disconnectDb);

type Cookies = Record<string, string>;

async function world() {
  const orgA = await createOrg({ name: "Org A" });
  const orgB = await createOrg({ name: "Org B" });
  await createMembership({ organizationId: orgA.id, plan: "TIER_B", status: "ACTIVE" });
  await createMembership({ organizationId: orgB.id, plan: "TIER_B", status: "ACTIVE" });

  const owner = await createUser({ organizationId: orgA.id, role: "MEMBER", name: "Owner" });
  const colleague = await createUser({ organizationId: orgA.id, role: "MEMBER", name: "Colleague" });
  const outsider = await createUser({ organizationId: orgB.id, role: "MEMBER", name: "Outsider" });
  const moderator = await createUser({ organizationId: null, role: "MODERATOR" });
  const admin = await createUser({ organizationId: null, role: "ADMIN" });

  const file = await createMemberFile({ userId: owner.id, filename: "owner-plan.pdf" });

  return {
    orgA, orgB, owner, colleague, outsider, moderator, admin, file,
    cookies: {
      owner: await authCookie(owner),
      colleague: await authCookie(colleague),
      outsider: await authCookie(outsider),
      moderator: await authCookie(moderator),
      admin: await authCookie(admin),
    },
  };
}

const list = (cookies?: Cookies, query = "") =>
  listFiles(buildRequest(`http://localhost/api/files${query}`, { cookies }));
const del = (cookies: Cookies | undefined, id?: string) =>
  deleteFile(buildRequest(`http://localhost/api/files${id === undefined ? "" : `?id=${id}`}`, { method: "DELETE", cookies }));
const patch = (cookies: Cookies | undefined, body: unknown) =>
  patchFile(buildRequest("http://localhost/api/files", { method: "PATCH", body, cookies }));
const share = (cookies: Cookies | undefined, body: unknown) =>
  createShare(buildRequest("http://localhost/api/files/share", { method: "POST", body, cookies }));
const shares = (cookies?: Cookies) => listShares(buildRequest("http://localhost/api/files/share", { cookies }));
const revoke = (cookies: Cookies | undefined, id: string) =>
  revokeShare(buildRequest(`http://localhost/api/files/share/${id}`, { method: "DELETE", cookies }), {
    params: Promise.resolve({ id }),
  });
const open = (token: string, headers?: Record<string, string>) =>
  openShare(buildRequest(`http://localhost/api/share/${token}`, { headers }), { params: Promise.resolve({ token }) });

const filenames = async (res: Response) => ((await res.json()) as { filename: string }[]).map((f) => f.filename);

// ─────────────────────────────────────────────────────────────────────────────

describe("A. Files — who can VIEW (GET /api/files)", () => {
  it("no session: 401", async () => {
    await world();
    expect((await list()).status).toBe(401);
  });

  it("the uploader sees their own files (and the file URL used to download them)", async () => {
    const w = await world();
    const res = await list(w.cookies.owner);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; filename: string; fileUrl: string }[];
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: w.file.id, filename: "owner-plan.pdf", fileUrl: w.file.fileUrl });
  });

  it("the listing does not expose the storage key or the owner id", async () => {
    const w = await world();
    const [row] = (await (await list(w.cookies.owner)).json()) as Record<string, unknown>[];
    expect(row).not.toHaveProperty("fileKey");
    expect(row).not.toHaveProperty("userId");
  });

  it("a colleague in the SAME organization sees none of the uploader's files (private to the uploader)", async () => {
    const w = await world();
    expect(await filenames(await list(w.cookies.colleague))).toEqual([]);
  });

  it("a member of ANOTHER organization sees none of them", async () => {
    const w = await world();
    expect(await filenames(await list(w.cookies.outsider))).toEqual([]);
  });

  it("IDOR: ?userId=<victim> is ignored for a MEMBER (same org or another org) — they still get only their own files", async () => {
    const w = await world();
    await createMemberFile({ userId: w.outsider.id, filename: "outsider-own.pdf" });

    expect(await filenames(await list(w.cookies.colleague, `?userId=${w.owner.id}`))).toEqual([]);
    expect(await filenames(await list(w.cookies.outsider, `?userId=${w.owner.id}`))).toEqual(["outsider-own.pdf"]);
  });

  it("IDOR: ?userId=<victim> is ignored for a MODERATOR too", async () => {
    const w = await world();
    expect(await filenames(await list(w.cookies.moderator, `?userId=${w.owner.id}`))).toEqual([]);
  });

  it("an ADMIN can list any member's files with ?userId=", async () => {
    const w = await world();
    expect(await filenames(await list(w.cookies.admin, `?userId=${w.owner.id}`))).toEqual(["owner-plan.pdf"]);
    // Without ?userId= an admin sees only their own (none).
    expect(await filenames(await list(w.cookies.admin))).toEqual([]);
  });

  it("soft-deleted files are never listed, not even for an ADMIN", async () => {
    const w = await world();
    await createMemberFile({ userId: w.owner.id, filename: "gone.pdf", deletedAt: new Date() });
    expect(await filenames(await list(w.cookies.owner))).toEqual(["owner-plan.pdf"]);
    expect(await filenames(await list(w.cookies.admin, `?userId=${w.owner.id}`))).toEqual(["owner-plan.pdf"]);
  });

  it("files are listed newest first", async () => {
    const w = await world();
    await testDb.memberFile.update({ where: { id: w.file.id }, data: { uploadedAt: new Date(Date.now() - 60_000) } });
    await createMemberFile({ userId: w.owner.id, filename: "newer.pdf" });
    expect(await filenames(await list(w.cookies.owner))).toEqual(["newer.pdf", "owner-plan.pdf"]);
  });
});

describe("A. Files — who can DELETE (DELETE /api/files)", () => {
  it("no session: 401; missing id: 400; unknown id: 404", async () => {
    const w = await world();
    expect((await del(undefined, w.file.id)).status).toBe(401);
    expect((await del(w.cookies.owner)).status).toBe(400);
    expect((await del(w.cookies.owner, "no-such-file")).status).toBe(404);
  });

  it("the uploader can delete: the row is soft-deleted and the blob is removed from storage by its key", async () => {
    const w = await world();
    expect((await del(w.cookies.owner, w.file.id)).status).toBe(200);

    const row = await testDb.memberFile.findUnique({ where: { id: w.file.id } });
    expect(row).not.toBeNull();
    expect(row!.deletedAt).not.toBeNull();
    expect(mockDeleteFiles).toHaveBeenCalledTimes(1);
    expect(mockDeleteFiles).toHaveBeenCalledWith(w.file.fileKey);
  });

  it("IDOR: a member of ANOTHER org who knows the id gets 403 and nothing is deleted", async () => {
    const w = await world();
    expect((await del(w.cookies.outsider, w.file.id)).status).toBe(403);
    expect((await testDb.memberFile.findUnique({ where: { id: w.file.id } }))!.deletedAt).toBeNull();
    expect(mockDeleteFiles).not.toHaveBeenCalled();
  });

  it("a colleague in the SAME org gets 403 and nothing is deleted", async () => {
    const w = await world();
    expect((await del(w.cookies.colleague, w.file.id)).status).toBe(403);
    expect((await testDb.memberFile.findUnique({ where: { id: w.file.id } }))!.deletedAt).toBeNull();
    expect(mockDeleteFiles).not.toHaveBeenCalled();
  });

  it("a MODERATOR gets 403", async () => {
    const w = await world();
    expect((await del(w.cookies.moderator, w.file.id)).status).toBe(403);
    expect(mockDeleteFiles).not.toHaveBeenCalled();
  });

  it("an ADMIN can delete any member's file", async () => {
    const w = await world();
    expect((await del(w.cookies.admin, w.file.id)).status).toBe(200);
    expect((await testDb.memberFile.findUnique({ where: { id: w.file.id } }))!.deletedAt).not.toBeNull();
  });

  it("deleting twice: the second call is 404 and storage is not called again", async () => {
    const w = await world();
    await del(w.cookies.owner, w.file.id);
    expect((await del(w.cookies.owner, w.file.id)).status).toBe(404);
    expect(mockDeleteFiles).toHaveBeenCalledTimes(1);
  });

  it("a storage failure does not fail the request or undo the soft delete", async () => {
    const w = await world();
    mockDeleteFiles.mockRejectedValue(new Error("UploadThing is down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await del(w.cookies.owner, w.file.id)).status).toBe(200);
    expect((await testDb.memberFile.findUnique({ where: { id: w.file.id } }))!.deletedAt).not.toBeNull();
    consoleError.mockRestore();
  });
});

describe("A. Files — who can EDIT the label / QSF flag (PATCH /api/files)", () => {
  it("no session: 401; missing id: 400; unknown id: 404", async () => {
    const w = await world();
    expect((await patch(undefined, { id: w.file.id, label: "x" })).status).toBe(401);
    expect((await patch(w.cookies.owner, { label: "x" })).status).toBe(400);
    expect((await patch(w.cookies.owner, { id: "no-such-file", label: "x" })).status).toBe(404);
  });

  it("the uploader can set a label and the QSF flag", async () => {
    const w = await world();
    const res = await patch(w.cookies.owner, { id: w.file.id, label: "Plan of correction", isQsfDoc: true });
    expect(res.status).toBe(200);
    expect(await testDb.memberFile.findUnique({ where: { id: w.file.id } })).toMatchObject({
      label: "Plan of correction",
      isQsfDoc: true,
    });
  });

  it("IDOR: another org's member, a same-org colleague and a MODERATOR all get 403 and the file is unchanged", async () => {
    const w = await world();
    for (const who of [w.cookies.outsider, w.cookies.colleague, w.cookies.moderator]) {
      expect((await patch(who, { id: w.file.id, label: "hijacked" })).status).toBe(403);
    }
    expect((await testDb.memberFile.findUnique({ where: { id: w.file.id } }))!.label).toBeNull();
  });

  it("an ADMIN can edit any member's file", async () => {
    const w = await world();
    expect((await patch(w.cookies.admin, { id: w.file.id, label: "Reviewed" })).status).toBe(200);
  });

  it("a soft-deleted file cannot be edited (404)", async () => {
    const w = await world();
    await del(w.cookies.owner, w.file.id);
    expect((await patch(w.cookies.owner, { id: w.file.id, label: "x" })).status).toBe(404);
  });

  it("PATCH cannot change who owns a file or where it points (only label and isQsfDoc are applied)", async () => {
    const w = await world();
    const res = await patch(w.cookies.owner, {
      id: w.file.id,
      userId: w.outsider.id,
      fileUrl: "https://evil.test/x",
      filename: "renamed.pdf",
      deletedAt: null,
    });
    expect(res.status).toBe(200);
    expect(await testDb.memberFile.findUnique({ where: { id: w.file.id } })).toMatchObject({
      userId: w.owner.id,
      fileUrl: w.file.fileUrl,
      filename: "owner-plan.pdf",
    });
  });

  it("unicode and a very long label are stored as given", async () => {
    const w = await world();
    const label = "計画 📄 " + "x".repeat(5000);
    expect((await patch(w.cookies.owner, { id: w.file.id, label })).status).toBe(200);
    expect((await testDb.memberFile.findUnique({ where: { id: w.file.id } }))!.label).toBe(label);
  });

  it.fails("FAILS [Low]: a non-string label is rejected with 400 (actual: 500 from an unhandled Prisma validation error)", async () => {
    const w = await world();
    expect((await patch(w.cookies.owner, { id: w.file.id, label: { nested: true } })).status).toBe(400);
  });
});

describe("A. Files — invalid session token", () => {
  it.fails("FAILS [Low]: a garbage auth-token is answered with 401 on every file route (actual: 500 — the catch-all swallows the verification error)", async () => {
    const w = await world();
    const bad = { "auth-token": "not-a-jwt" };
    const statuses = [
      (await list(bad)).status,
      (await del(bad, w.file.id)).status,
      (await patch(bad, { id: w.file.id, label: "x" })).status,
      (await share(bad, { shareAll: true, expiry: null })).status,
      (await shares(bad)).status,
      (await revoke(bad, "any")).status,
    ];
    expect(statuses).toEqual([401, 401, 401, 401, 401, 401]);
  });

  it("a garbage auth-token never succeeds and never touches data (whatever the status code)", async () => {
    const w = await world();
    const bad = { "auth-token": "not-a-jwt" };
    for (const res of [await list(bad), await del(bad, w.file.id), await patch(bad, { id: w.file.id, label: "x" }), await share(bad, { shareAll: true, expiry: null })]) {
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
    expect((await testDb.memberFile.findUnique({ where: { id: w.file.id } }))!.deletedAt).toBeNull();
    expect(await testDb.fileShareLink.count()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("A. Share links — who can CREATE (POST /api/files/share)", () => {
  it("no session: 401; MODERATOR (no manage_file_shares): 403", async () => {
    const w = await world();
    expect((await share(undefined, { shareAll: true, expiry: null })).status).toBe(401);
    expect((await share(w.cookies.moderator, { shareAll: true, expiry: null })).status).toBe(403);
    expect(await testDb.fileShareLink.count()).toBe(0);
  });

  it("a MEMBER can share selected files; the token is 64 hex characters and the URL points at /share/<token>", async () => {
    const w = await world();
    const res = await share(w.cookies.owner, { shareAll: false, fileIds: [w.file.id], expiry: "7d" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; token: string; shareUrl: string; fileCount: number; expiry: string };
    expect(body.token).toMatch(/^[0-9a-f]{64}$/);
    expect(body.shareUrl).toBe(`http://localhost/share/${body.token}`);
    expect(body).toMatchObject({ fileCount: 1, expiry: "DAYS_7" });

    const link = await testDb.fileShareLink.findUnique({ where: { id: body.id }, include: { selectedFiles: true } });
    expect(link!.userId).toBe(w.owner.id);
    expect(link!.selectedFiles.map((f) => f.fileId)).toEqual([w.file.id]);
  });

  it("two links never share a token", async () => {
    const w = await world();
    const a = (await (await share(w.cookies.owner, { shareAll: true, expiry: null })).json()) as { token: string };
    const b = (await (await share(w.cookies.owner, { shareAll: true, expiry: null })).json()) as { token: string };
    expect(a.token).not.toBe(b.token);
  });

  it("an ADMIN can create a share link for their own files", async () => {
    const w = await world();
    expect((await share(w.cookies.admin, { shareAll: true, expiry: null })).status).toBe(200);
  });

  it("expiry: '7d' and '30d' set expiresAt 7 and 30 days ahead; null means never", async () => {
    const w = await world();
    const day = 24 * 60 * 60 * 1000;
    const make = async (expiry: string | null) =>
      (await (await share(w.cookies.owner, { shareAll: true, expiry })).json()) as { expiry: string; expiresAt: string | null };

    const seven = await make("7d");
    const thirty = await make("30d");
    const never = await make(null);

    expect(seven.expiry).toBe("DAYS_7");
    expect(Math.abs(new Date(seven.expiresAt!).getTime() - (Date.now() + 7 * day))).toBeLessThan(5 * 60 * 1000);
    expect(thirty.expiry).toBe("DAYS_30");
    expect(Math.abs(new Date(thirty.expiresAt!).getTime() - (Date.now() + 30 * day))).toBeLessThan(2 * 60 * 60 * 1000);
    expect(never).toMatchObject({ expiry: "NEVER", expiresAt: null });
  });

  it("selected-files mode with no files: 400", async () => {
    const w = await world();
    expect((await share(w.cookies.owner, { shareAll: false, fileIds: [], expiry: null })).status).toBe(400);
    expect((await share(w.cookies.owner, { shareAll: false, expiry: null })).status).toBe(400);
  });

  it("IDOR: a member cannot attach ANOTHER org's file to their own link (403, no link created)", async () => {
    const w = await world();
    const res = await share(w.cookies.outsider, { shareAll: false, fileIds: [w.file.id], expiry: null });
    expect(res.status).toBe(403);
    expect(await testDb.fileShareLink.count()).toBe(0);
  });

  it("IDOR: a same-org colleague cannot attach the uploader's file either, even mixed in with their own", async () => {
    const w = await world();
    const mine = await createMemberFile({ userId: w.colleague.id });
    const res = await share(w.cookies.colleague, { shareAll: false, fileIds: [mine.id, w.file.id], expiry: null });
    expect(res.status).toBe(403);
    expect(await testDb.fileShareLink.count()).toBe(0);
  });

  it("an ADMIN cannot attach a member's file to a link either (admin override covers view/delete, not sharing)", async () => {
    const w = await world();
    expect((await share(w.cookies.admin, { shareAll: false, fileIds: [w.file.id], expiry: null })).status).toBe(403);
  });

  it("a soft-deleted file cannot be shared (403)", async () => {
    const w = await world();
    await del(w.cookies.owner, w.file.id);
    expect((await share(w.cookies.owner, { shareAll: false, fileIds: [w.file.id], expiry: null })).status).toBe(403);
  });

  it.fails("FAILS [Medium]: an unrecognised expiry value is rejected with 400 (actual: 200 and a link that NEVER expires)", async () => {
    const w = await world();
    const res = await share(w.cookies.owner, { shareAll: true, expiry: "1h" });
    expect(res.status).toBe(400);
  });

  it("…and what actually happens today: expiry '1h', '7 days' and 7 all silently create a never-expiring link", async () => {
    const w = await world();
    for (const expiry of ["1h", "7 days", 7]) {
      const body = (await (await share(w.cookies.owner, { shareAll: true, expiry })).json()) as { expiry: string; expiresAt: string | null };
      expect(body).toMatchObject({ expiry: "NEVER", expiresAt: null });
    }
  });

  it.fails("FAILS [Low]: listing the same file twice is accepted or rejected as a bad request (actual: 403 'not owned by you')", async () => {
    const w = await world();
    const res = await share(w.cookies.owner, { shareAll: false, fileIds: [w.file.id, w.file.id], expiry: null });
    expect([200, 400]).toContain(res.status);
  });

  it.fails("FAILS [Low]: a malformed fileIds value is rejected with 400 (actual: 500)", async () => {
    const w = await world();
    const res = await share(w.cookies.owner, { shareAll: false, fileIds: "not-an-array", expiry: null });
    expect(res.status).toBe(400);
  });
});

describe("A. Share links — LIST and REVOKE", () => {
  it("GET /api/files/share returns only the caller's own, non-revoked links", async () => {
    const w = await world();
    const mine = await createShareLink({ userId: w.owner.id, shareAll: true });
    await createShareLink({ userId: w.owner.id, shareAll: true, revokedAt: new Date() });
    await createShareLink({ userId: w.outsider.id, shareAll: true });
    await createShareLink({ userId: w.colleague.id, shareAll: true });

    const body = (await (await shares(w.cookies.owner)).json()) as { id: string }[];
    expect(body.map((l) => l.id)).toEqual([mine.id]);
  });

  it("GET /api/files/share: no session 401, MODERATOR 403", async () => {
    const w = await world();
    expect((await shares()).status).toBe(401);
    expect((await shares(w.cookies.moderator)).status).toBe(403);
  });

  it("an ADMIN's listing does not include members' links (it is not an admin overview)", async () => {
    const w = await world();
    await createShareLink({ userId: w.owner.id, shareAll: true });
    expect((await (await shares(w.cookies.admin)).json()) as unknown[]).toEqual([]);
  });

  it("the owner can revoke; revoking twice is 409; an unknown id is 404", async () => {
    const w = await world();
    const link = await createShareLink({ userId: w.owner.id, shareAll: true });

    expect((await revoke(w.cookies.owner, link.id)).status).toBe(200);
    expect((await testDb.fileShareLink.findUnique({ where: { id: link.id } }))!.revokedAt).not.toBeNull();
    expect((await revoke(w.cookies.owner, link.id)).status).toBe(409);
    expect((await revoke(w.cookies.owner, "no-such-link")).status).toBe(404);
  });

  it("IDOR: another org's member and a same-org colleague cannot revoke the owner's link (403, still active)", async () => {
    const w = await world();
    const link = await createShareLink({ userId: w.owner.id, shareAll: true });

    expect((await revoke(w.cookies.outsider, link.id)).status).toBe(403);
    expect((await revoke(w.cookies.colleague, link.id)).status).toBe(403);
    expect((await testDb.fileShareLink.findUnique({ where: { id: link.id } }))!.revokedAt).toBeNull();
  });

  it("no session 401; MODERATOR 403; an ADMIN can revoke any link", async () => {
    const w = await world();
    const link = await createShareLink({ userId: w.owner.id, shareAll: true });

    expect((await revoke(undefined, link.id)).status).toBe(401);
    expect((await revoke(w.cookies.moderator, link.id)).status).toBe(403);
    expect((await revoke(w.cookies.admin, link.id)).status).toBe(200);
  });
});

describe("A. Share links — public access (GET /api/share/[token])", () => {
  it("a valid link needs no session and returns the selected files and the owner's organization name", async () => {
    const w = await world();
    const other = await createMemberFile({ userId: w.owner.id, filename: "not-shared.pdf" });
    const link = await createShareLink({ userId: w.owner.id, fileIds: [w.file.id] });

    const res = await open(link.token);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { orgName: string; files: Record<string, unknown>[] };
    expect(body.orgName).toBe("Org A");
    expect(body.files).toEqual([
      { filename: "owner-plan.pdf", fileUrl: w.file.fileUrl, fileSize: 1024, fileType: "PDF", mimeType: "application/pdf" },
    ]);
    expect(JSON.stringify(body)).not.toContain(other.fileUrl);
  });

  it("the public response carries no internal ids, owner id or email", async () => {
    const w = await world();
    const link = await createShareLink({ userId: w.owner.id, fileIds: [w.file.id] });
    const text = await (await open(link.token)).text();

    // (The storage key is not checked: an UploadThing file URL contains it by design.)
    for (const secret of [w.file.id, w.owner.id, w.owner.email, link.id]) {
      expect(text.includes(secret)).toBe(false);
    }
  });

  it("an unknown or guessed token is 404", async () => {
    await world();
    expect((await open("0".repeat(64))).status).toBe(404);
    expect((await open("../../etc/passwd")).status).toBe(404);
  });

  it("EXPIRY: a link past its expiresAt is 410 and returns no files", async () => {
    const w = await world();
    const link = await createShareLink({
      userId: w.owner.id, fileIds: [w.file.id], expiry: "DAYS_7", expiresAt: new Date(Date.now() - 1000),
    });
    const res = await open(link.token);
    expect(res.status).toBe(410);
    expect(await res.text()).not.toContain(w.file.fileUrl);
  });

  it("EXPIRY: a link that expires in the future still works", async () => {
    const w = await world();
    const link = await createShareLink({
      userId: w.owner.id, fileIds: [w.file.id], expiry: "DAYS_7", expiresAt: new Date(Date.now() + 60_000),
    });
    expect((await open(link.token)).status).toBe(200);
  });

  it("REVOCATION: access stops immediately after the owner revokes (200, then 410 with no files)", async () => {
    const w = await world();
    const link = await createShareLink({ userId: w.owner.id, fileIds: [w.file.id] });

    expect((await open(link.token)).status).toBe(200);
    expect((await revoke(w.cookies.owner, link.id)).status).toBe(200);

    const after = await open(link.token);
    expect(after.status).toBe(410);
    expect(await after.text()).not.toContain(w.file.fileUrl);
  });

  it("AFTER THE SHARE IS REMOVED: when the link row is gone (owner account deleted) the token is 404", async () => {
    const w = await world();
    const link = await createShareLink({ userId: w.owner.id, fileIds: [w.file.id] });
    await testDb.user.delete({ where: { id: w.owner.id } });

    expect(await testDb.fileShareLink.count()).toBe(0);
    expect((await open(link.token)).status).toBe(404);
  });

  it("a file deleted after it was shared disappears from the link", async () => {
    const w = await world();
    const second = await createMemberFile({ userId: w.owner.id, filename: "second.pdf" });
    const link = await createShareLink({ userId: w.owner.id, fileIds: [w.file.id, second.id] });

    await del(w.cookies.owner, w.file.id);

    const body = (await (await open(link.token)).json()) as { files: { filename: string }[] };
    expect(body.files.map((f) => f.filename)).toEqual(["second.pdf"]);
  });

  it("a share-all link shows the owner's CURRENT files only — including ones uploaded later, never another user's", async () => {
    const w = await world();
    await createMemberFile({ userId: w.colleague.id, filename: "colleague.pdf" });
    await createMemberFile({ userId: w.outsider.id, filename: "outsider.pdf" });
    const link = await createShareLink({ userId: w.owner.id, shareAll: true });
    await createMemberFile({ userId: w.owner.id, filename: "uploaded-later.pdf" });

    const body = (await (await open(link.token)).json()) as { files: { filename: string }[] };
    expect(body.files.map((f) => f.filename).sort()).toEqual(["owner-plan.pdf", "uploaded-later.pdf"]);
  });

  it("every successful view is logged with the visitor's address and user agent; refused views are not", async () => {
    const w = await world();
    const link = await createShareLink({ userId: w.owner.id, fileIds: [w.file.id] });
    const revoked = await createShareLink({ userId: w.owner.id, fileIds: [w.file.id], revokedAt: new Date() });

    await open(link.token, { "x-forwarded-for": "203.0.113.9, 10.0.0.1", "user-agent": "AttorneyBrowser/1.0" });
    await open(revoked.token, { "x-forwarded-for": "203.0.113.9" });

    // The log row is written without awaiting; give it a moment.
    await vi.waitFor(async () => expect(await testDb.fileShareAccessLog.count()).toBe(1), { timeout: 3000 });
    const log = await testDb.fileShareAccessLog.findFirst();
    expect(log).toMatchObject({ shareLinkId: link.id, ipAddress: "203.0.113.9", userAgent: "AttorneyBrowser/1.0" });

    const listed = (await (await shares(w.cookies.owner)).json()) as { id: string; accessCount: number; lastAccessedAt: string | null }[];
    expect(listed.find((l) => l.id === link.id)).toMatchObject({ accessCount: 1 });
  });
});
