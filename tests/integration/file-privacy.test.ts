/**
 * SOW 11.3 — file privacy in code.
 * - No API response or page hands out a storage (UploadThing/Cloudinary) URL.
 * - Files are streamed through authenticated routes that fetch them
 *   server-side with a signed URL.
 * - A share link is re-checked on every download: revoking or expiring it
 *   stops access immediately.
 * - New rebuttal documents are uploaded to Cloudinary as "authenticated".
 * No real UploadThing or Cloudinary call is made: UTApi and fetch are mocked,
 * and Cloudinary URL signing is local (HMAC with the test secret).
 */
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";

const { signed, uploadStreamOptions } = vi.hoisted(() => ({
  signed: vi.fn(async (key: string) => ({ ufsUrl: `https://signed.utfs.test/f/${key}?signature=abc` })),
  uploadStreamOptions: [] as Record<string, unknown>[],
}));

vi.mock("uploadthing/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("uploadthing/server")>();
  return {
    ...mod,
    UTApi: class {
      deleteFiles = vi.fn().mockResolvedValue({ success: true, deletedCount: 1 });
      generateSignedURL = signed;
    },
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth")>();
  return { ...mod, getUserFromRequest: vi.fn(mod.getUserFromRequest) };
});
vi.mock("cloudinary", async (importOriginal) => {
  const mod = await importOriginal<typeof import("cloudinary")>();
  const v2 = mod.v2;
  // Only the network call is replaced; URL signing stays real.
  v2.uploader.upload_stream = ((options: Record<string, unknown>, cb: (e: unknown, r: unknown) => void) => {
    uploadStreamOptions.push(options);
    return {
      end: () =>
        cb(null, { secure_url: "https://res.cloudinary.com/demo/image/authenticated/v1/carehomes_rebuttals/new-doc.pdf" }),
    };
  }) as unknown as typeof v2.uploader.upload_stream;
  return { ...mod, v2 };
});

import {
  resetDb,
  testDb,
  disconnectDb,
  createOrgWithUser,
  createUser,
  createMemberFile,
  createShareLink,
  createFacility,
  createRebuttal,
} from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { getUserFromRequest } from "@/lib/auth";
import { GET as downloadFile } from "@/app/api/files/[id]/download/route";
import { GET as shareFile } from "@/app/api/share/[token]/files/[ref]/route";
import { GET as openShare } from "@/app/api/share/[token]/route";
import { DELETE as revokeShare } from "@/app/api/files/share/[id]/route";
import { GET as rebuttalDocument } from "@/app/api/rebuttal/[id]/document/route";
import { GET as getRebuttal } from "@/app/api/rebuttal/[id]/route";
import { PATCH as patchFile } from "@/app/api/files/route";
import { submitRebuttal } from "@/app/actions/rebuttals";
import { rebuttalDocumentFetchUrl, shareFileRef, fileResponse } from "@/services/file-storage.service";

const PDF_BYTES = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]); // "%PDF-1.7"
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  await resetDb();
  signed.mockClear();
  uploadStreamOptions.length = 0;
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(PDF_BYTES, { status: 200 }));
});
afterEach(() => fetchSpy.mockRestore());
afterAll(disconnectDb);

const p = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

describe("GET /api/files/[id]/download", () => {
  it("the owner gets the bytes, fetched with a signed URL; headers are locked down; audited", async () => {
    const { user } = await createOrgWithUser({});
    const file = await createMemberFile({ userId: user.id, filename: "plan of care.pdf" });

    const res = await downloadFile(buildRequest(`http://localhost/api/files/${file.id}/download`, { cookies: await authCookie(user) }), p({ id: file.id }));
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PDF_BYTES);
    expect(signed).toHaveBeenCalledWith(file.fileKey, { expiresIn: 60 });
    expect(fetchSpy.mock.calls[0][0]).toBe(`https://signed.utfs.test/f/${file.fileKey}?signature=abc`);

    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toMatch(/^inline; filename="plan of care.pdf"/);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toMatch(/default-src 'none'/);
    // Nothing in the response points at storage.
    expect(JSON.stringify([...res.headers])).not.toContain("utfs.test");

    const audit = await testDb.auditLog.findFirstOrThrow({ where: { action: "FILE_DOWNLOADED" } });
    expect(audit).toMatchObject({ actorId: user.id, targetId: file.id });
  });

  it("?download=1 forces attachment", async () => {
    const { user } = await createOrgWithUser({});
    const file = await createMemberFile({ userId: user.id });
    const res = await downloadFile(buildRequest(`http://localhost/api/files/${file.id}/download?download=1`, { cookies: await authCookie(user) }), p({ id: file.id }));
    expect(res.headers.get("content-disposition")).toMatch(/^attachment;/);
  });

  it("another member gets 404 (same as missing); an ADMIN can download; no session is 401", async () => {
    const { user } = await createOrgWithUser({});
    const { user: other } = await createOrgWithUser({});
    const admin = await createUser({ role: "ADMIN" });
    const file = await createMemberFile({ userId: user.id });
    const url = `http://localhost/api/files/${file.id}/download`;
    expect((await downloadFile(buildRequest(url, { cookies: await authCookie(other) }), p({ id: file.id }))).status).toBe(404);
    expect((await downloadFile(buildRequest(url, { cookies: await authCookie(admin) }), p({ id: file.id }))).status).toBe(200);
    expect((await downloadFile(buildRequest(url), p({ id: file.id }))).status).toBe(401);
    expect((await downloadFile(buildRequest("http://localhost/api/files/missing/download", { cookies: await authCookie(user) }), p({ id: "missing" }))).status).toBe(404);
  });

  it("a deleted file is 404", async () => {
    const { user } = await createOrgWithUser({});
    const file = await createMemberFile({ userId: user.id, deletedAt: new Date() });
    expect((await downloadFile(buildRequest(`http://localhost/api/files/${file.id}/download`, { cookies: await authCookie(user) }), p({ id: file.id }))).status).toBe(404);
  });

  it("when storage fails the answer is 502 and does not leak the storage URL", async () => {
    fetchSpy.mockImplementation(async () => new Response("nope", { status: 403 }));
    const { user } = await createOrgWithUser({});
    const file = await createMemberFile({ userId: user.id });
    const res = await downloadFile(buildRequest(`http://localhost/api/files/${file.id}/download`, { cookies: await authCookie(user) }), p({ id: file.id }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toMatch(/utfs|signature/);
  });

  it("SVG, HTML and unknown types are always served as attachments (never rendered on our origin)", () => {
    for (const mimeType of ["image/svg+xml", "text/html", "application/octet-stream", ""]) {
      const res = fileResponse(PDF_BYTES, { filename: "x", mimeType });
      expect(res.headers.get("content-disposition"), mimeType).toMatch(/^attachment;/);
      expect(res.headers.get("content-security-policy")).toMatch(/sandbox/);
    }
  });

  it("PATCH /api/files does not return the storage URL either", async () => {
    const { user } = await createOrgWithUser({});
    const file = await createMemberFile({ userId: user.id });
    const res = await patchFile(buildRequest("http://localhost/api/files", { method: "PATCH", body: { id: file.id, label: "x" }, cookies: await authCookie(user) }));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).not.toContain(file.fileUrl);
    expect(text).not.toContain(file.fileKey);
  });
});

describe("share links: downloads go through the app and stop when the link is revoked", () => {
  async function sharedFile() {
    const { user } = await createOrgWithUser({});
    const file = await createMemberFile({ userId: user.id, filename: "inspection.pdf" });
    const link = await createShareLink({ userId: user.id, fileIds: [file.id], expiry: "DAYS_7", expiresAt: new Date(Date.now() + 86_400_000) });
    return { user, file, link, ref: shareFileRef(link.id, file.id) };
  }
  const get = (token: string, ref: string) =>
    shareFile(buildRequest(`http://localhost/api/share/${token}/files/${ref}`), p({ token, ref }));

  it("the public share API lists download routes that work, and contains no storage URL", async () => {
    const { file, link } = await sharedFile();
    const body = (await (await openShare(buildRequest(`http://localhost/api/share/${link.token}`), p({ token: link.token }))).json()) as {
      files: { ref: string; downloadUrl: string }[];
    };
    expect(JSON.stringify(body)).not.toContain("utfs.test");
    const [{ ref, downloadUrl }] = body.files;
    expect(downloadUrl).toBe(`/api/share/${link.token}/files/${ref}`);
    const res = await get(link.token, ref);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("inspection.pdf");
    expect(signed).toHaveBeenCalledWith(file.fileKey, { expiresIn: 60 });
  });

  it("FIXED: revoking the link stops downloads immediately (410), even with a reference obtained before", async () => {
    const { user, link, ref } = await sharedFile();
    expect((await get(link.token, ref)).status).toBe(200);
    await revokeShare(buildRequest(`http://localhost/api/files/share/${link.id}`, { method: "DELETE", cookies: await authCookie(user) }), p({ id: link.id }));
    const after = await get(link.token, ref);
    expect(after.status).toBe(410);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // storage was not touched after revocation
  });

  it("an expired link is 410", async () => {
    const { link, ref } = await sharedFile();
    await testDb.fileShareLink.update({ where: { id: link.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await get(link.token, ref)).status).toBe(410);
  });

  it("a file not on the link, a file of another member, a deleted file, a forged ref and an unknown token are all refused", async () => {
    const { user, file, link } = await sharedFile();
    const notShared = await createMemberFile({ userId: user.id });
    const { user: stranger } = await createOrgWithUser({});
    const strangersFile = await createMemberFile({ userId: stranger.id });
    expect((await get(link.token, shareFileRef(link.id, notShared.id))).status).toBe(404);
    expect((await get(link.token, shareFileRef(link.id, strangersFile.id))).status).toBe(404);
    expect((await get(link.token, file.id)).status).toBe(404); // raw id is not a valid ref
    expect((await get(link.token, "A".repeat(32))).status).toBe(404);
    await testDb.memberFile.update({ where: { id: file.id }, data: { deletedAt: new Date() } });
    expect((await get(link.token, shareFileRef(link.id, file.id))).status).toBe(404);
    expect((await get("0".repeat(64), shareFileRef(link.id, file.id))).status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a ref from one link does not work on another link of the same owner", async () => {
    const { user, file, link } = await sharedFile();
    const other = await createShareLink({ userId: user.id, fileIds: [file.id], expiry: "DAYS_7", expiresAt: new Date(Date.now() + 86_400_000) });
    expect((await get(other.token, shareFileRef(link.id, file.id))).status).toBe(404);
  });

  it("each download is logged on the link and in the audit log, with no actor", async () => {
    const { link, ref, file } = await sharedFile();
    await get(link.token, ref);
    expect(await testDb.fileShareAccessLog.count({ where: { shareLinkId: link.id } })).toBe(1);
    const audit = await testDb.auditLog.findFirstOrThrow({ where: { action: "SHARE_LINK_FILE_DOWNLOADED" } });
    expect(audit).toMatchObject({ actorId: null, targetId: file.id });
  });
});

describe("rebuttal documents", () => {
  const SIGNED_HOST = "res.cloudinary.com";
  async function world() {
    const { user: author, org } = await createOrgWithUser({});
    const teammate = await createUser({ organizationId: org.id });
    const { user: outsider } = await createOrgWithUser({});
    const moderator = await createUser({ role: "MODERATOR" });
    const facility = await createFacility({ organizationId: org.id, createdById: author.id });
    const rebuttal = await createRebuttal({ userId: author.id, facilityId: facility.id });
    await testDb.rebuttal.update({
      where: { id: rebuttal.id },
      data: { documentUrl: "https://res.cloudinary.com/demo/image/authenticated/v1700000000/carehomes_rebuttals/abc123.pdf" },
    });
    return { author, teammate, outsider, moderator, rebuttal };
  }
  const get = async (rebuttalId: string, user?: Parameters<typeof authCookie>[0], query = "") =>
    rebuttalDocument(
      buildRequest(`http://localhost/api/rebuttal/${rebuttalId}/document${query}`, user ? { cookies: await authCookie(user) } : {}),
      p({ id: rebuttalId })
    );

  it("author, teammate and moderator can open it; it is fetched with a SIGNED Cloudinary URL", async () => {
    const w = await world();
    for (const u of [w.author, w.teammate, w.moderator]) {
      expect((await get(w.rebuttal.id, u)).status).toBe(200);
    }
    const fetched = String(fetchSpy.mock.calls[0][0]);
    expect(fetched).toContain(SIGNED_HOST);
    expect(fetched).toMatch(/\/image\/authenticated\/s--[A-Za-z0-9_-]{8}--\/v1700000000\/carehomes_rebuttals\/abc123\.pdf$/);
  });

  it("another organization's member gets 404, the public 401", async () => {
    const w = await world();
    expect((await get(w.rebuttal.id, w.outsider)).status).toBe(404);
    expect((await get(w.rebuttal.id)).status).toBe(401);
  });

  it("GET /api/rebuttal/[id] no longer returns documentUrl or watermarkedUrl", async () => {
    const w = await world();
    const res = await getRebuttal(buildRequest(`http://localhost/api/rebuttal/${w.rebuttal.id}`, { cookies: await authCookie(w.author) }), p({ id: w.rebuttal.id }));
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("documentUrl");
    expect(body).not.toHaveProperty("watermarkedUrl");
    expect(body).toMatchObject({ hasDocument: true, documentDownloadUrl: `/api/rebuttal/${w.rebuttal.id}/document` });
    expect(JSON.stringify(body)).not.toContain("cloudinary");
  });

  it("the approved copy (?version=approved-copy) is for moderators only", async () => {
    const w = await world();
    await testDb.rebuttal.update({ where: { id: w.rebuttal.id }, data: { watermarkedUrl: `data:application/pdf;base64,${Buffer.from(PDF_BYTES).toString("base64")}` } });
    expect((await get(w.rebuttal.id, w.author, "?version=approved-copy")).status).toBe(404);
    const res = await get(w.rebuttal.id, w.moderator, "?version=approved-copy");
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PDF_BYTES);
  });

  it("legacy public ('upload') URLs are fetched as stored; authenticated and private ones are signed", () => {
    const legacy = "https://res.cloudinary.com/demo/image/upload/v1/carehomes_rebuttals/old.pdf";
    expect(rebuttalDocumentFetchUrl(legacy)).toBe(legacy);
    expect(rebuttalDocumentFetchUrl("https://res.cloudinary.com/demo/raw/private/v2/carehomes_rebuttals/f.docx")).toMatch(
      /\/raw\/private\/s--[A-Za-z0-9_-]{8}--\/v2\/carehomes_rebuttals\/f\.docx$/
    );
  });

  it("new uploads are stored as Cloudinary 'authenticated' (not public)", async () => {
    const { user, org } = await createOrgWithUser({});
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });
    vi.mocked(getUserFromRequest).mockResolvedValueOnce({ userId: user.id, email: user.email, role: "MEMBER", orgId: org.id });
    const fd = new FormData();
    fd.set("title", "T");
    fd.set("facilityId", facility.id);
    fd.set("content", "Body");
    fd.set("redactionAcknowledged", "on");
    fd.set("document", new File([PDF_BYTES], "doc.pdf", { type: "application/pdf" }));
    const prev = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||= "demo";
    try {
      expect(await submitRebuttal(fd)).toEqual({ success: true });
    } finally {
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = prev;
    }
    expect(uploadStreamOptions).toEqual([expect.objectContaining({ type: "authenticated" })]);
  });
});
