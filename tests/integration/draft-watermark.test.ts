/**
 * SOW 11.2 — "FOR ATTORNEY REVIEW ONLY" on drafts, approved copy on approval.
 * - Every view/download of a not-yet-approved rebuttal document is a PDF with
 *   the draft mark on every page; an unmarkable file is never served.
 * - Approval makes the "PUBLIC REDACTED VERSION" copy; if that fails the
 *   approval still succeeds, the error is logged, the rebuttal is flagged and
 *   the failure is audited; a moderator can retry.
 * - New uploads must be PDF, PNG or JPG (by content).
 * Storage is never contacted: fetch is mocked; Cloudinary upload is mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth")>();
  return { ...mod, getUserFromRequest: vi.fn(mod.getUserFromRequest) };
});
vi.mock("cloudinary", async (importOriginal) => {
  const mod = await importOriginal<typeof import("cloudinary")>();
  mod.v2.uploader.upload_stream = ((_o: unknown, cb: (e: unknown, r: unknown) => void) => ({
    end: () => cb(null, { secure_url: "https://res.cloudinary.com/demo/image/authenticated/v1/carehomes_rebuttals/new.pdf" }),
  })) as unknown as typeof mod.v2.uploader.upload_stream;
  return mod;
});

import { resetDb, testDb, disconnectDb, createOrgWithUser, createUser, createFacility, createRebuttal } from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { buildRealTextPdf, pageContents, contentHasText } from "../helpers/pdf";
import { getUserFromRequest } from "@/lib/auth";
import { GET as documentRoute } from "@/app/api/rebuttal/[id]/document/route";
import { POST as retryRoute } from "@/app/api/rebuttal/[id]/approved-copy/route";
import { POST as moderate } from "@/app/api/moderation/route";
import { submitRebuttal, updateRebuttal } from "@/app/actions/rebuttals";
import { DRAFT_MARK, PUBLIC_COPY_MARK } from "@/services/pdf-watermark.service";

const ROOT = path.resolve(__dirname, "..", "..");
const DOC_URL = "https://res.cloudinary.com/demo/image/authenticated/v1/carehomes_rebuttals/doc.pdf";
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const DOCX = Buffer.concat([Buffer.from("PK\u0003\u0004"), Buffer.alloc(64)]);

let stored: Uint8Array;
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  await resetDb();
  stored = await buildRealTextPdf({ pages: 3, text: "Original draft text" });
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(Uint8Array.from(stored), { status: 200 }));
});
afterEach(() => fetchSpy.mockRestore());
afterAll(disconnectDb);

async function world(status: "PENDING" | "APPROVED" | "REJECTED" | "REQUEST_FIX" = "PENDING", documentUrl: string | null = DOC_URL) {
  const { user: author, org } = await createOrgWithUser({});
  const teammate = await createUser({ organizationId: org.id });
  const moderator = await createUser({ role: "MODERATOR" });
  const facility = await createFacility({ organizationId: org.id, createdById: author.id });
  const rebuttal = await createRebuttal({ userId: author.id, facilityId: facility.id, status });
  if (documentUrl) await testDb.rebuttal.update({ where: { id: rebuttal.id }, data: { documentUrl } });
  return { author, teammate, moderator, org, facility, rebuttal };
}

const p = (id: string) => ({ params: Promise.resolve({ id }) });
async function open(id: string, user: Parameters<typeof authCookie>[0], query = "") {
  return documentRoute(buildRequest(`http://localhost/api/rebuttal/${id}/document${query}`, { cookies: await authCookie(user) }), p(id));
}
async function approve(id: string, moderator: Parameters<typeof authCookie>[0]) {
  return moderate(buildRequest("http://localhost/api/moderation", { method: "POST", body: { id, action: "approve" }, cookies: await authCookie(moderator) }));
}

describe("drafts are always marked FOR ATTORNEY REVIEW ONLY", () => {
  for (const status of ["PENDING", "REQUEST_FIX", "REJECTED"] as const) {
    it(`${status}: every page of every view carries the mark, for author, teammate and moderator`, async () => {
      const w = await world(status);
      for (const u of [w.author, w.teammate, w.moderator]) {
        for (const query of ["", "?download=1"]) {
          const res = await open(w.rebuttal.id, u, query);
          expect(res.status).toBe(200);
          expect(res.headers.get("content-type")).toBe("application/pdf");
          expect(res.headers.get("content-disposition")).toContain("FOR-ATTORNEY-REVIEW-ONLY.pdf");
          const pages = await pageContents(new Uint8Array(await res.arrayBuffer()));
          expect(pages).toHaveLength(3);
          for (const c of pages) {
            expect(contentHasText(c, DRAFT_MARK)).toBe(true);
            expect(contentHasText(c, "Original draft text")).toBe(true);
          }
        }
      }
    });
  }

  it("an APPROVED rebuttal's document is served as stored (no draft mark)", async () => {
    const w = await world("APPROVED");
    const res = await open(w.rebuttal.id, w.author);
    expect(Buffer.from(await res.arrayBuffer()).equals(Buffer.from(stored))).toBe(true);
  });

  it("a PNG draft is turned into a marked PDF", async () => {
    stored = PNG_1PX;
    const w = await world("PENDING", "https://res.cloudinary.com/demo/image/authenticated/v1/carehomes_rebuttals/photo.png");
    const res = await open(w.rebuttal.id, w.moderator);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const [page] = await pageContents(new Uint8Array(await res.arrayBuffer()));
    expect(contentHasText(page, DRAFT_MARK)).toBe(true);
  });

  it("a Word draft and a corrupt PDF are NOT served (422), never unmarked", async () => {
    for (const bytes of [DOCX, Buffer.from("%PDF-1.7 this is not really a pdf")]) {
      stored = bytes;
      const w = await world("PENDING", "https://res.cloudinary.com/demo/raw/authenticated/v1/carehomes_rebuttals/d.docx");
      const res = await open(w.rebuttal.id, w.moderator);
      expect(res.status).toBe(422);
      expect(res.headers.get("content-type")).toMatch(/application\/json/);
      expect(await res.text()).toContain("FOR ATTORNEY REVIEW ONLY");
    }
  });
});

describe("approval makes the PUBLIC REDACTED VERSION copy", () => {
  it("on success: copy stored, status APPLIED", async () => {
    const w = await world();
    const res = await approve(w.rebuttal.id, w.moderator);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { approvedCopy: unknown }).approvedCopy).toEqual({ status: "APPLIED" });
    const row = await testDb.rebuttal.findUniqueOrThrow({ where: { id: w.rebuttal.id } });
    expect(row).toMatchObject({ status: "APPROVED", watermarkStatus: "APPLIED", watermarkError: null });
    const copy = Buffer.from(row.watermarkedUrl!.replace(/^data:application\/pdf;base64,/, ""), "base64");
    for (const c of await pageContents(copy)) expect(contentHasText(c, PUBLIC_COPY_MARK)).toBe(true);
  });

  it("FIXED (question 2): storage down -> approval still succeeds, error logged without PII, rebuttal flagged, failure audited", async () => {
    fetchSpy.mockImplementation(async () => new Response("down", { status: 503 }));
    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void errors.push(a.map(String).join(" ")));
    const w = await world();
    const res = await approve(w.rebuttal.id, w.moderator);
    spy.mockRestore();

    expect(res.status).toBe(200);
    const body = (await res.json()) as { message: string; approvedCopy: unknown };
    expect(body.approvedCopy).toEqual({ status: "FAILED", error: "STORAGE_UNAVAILABLE" });
    expect(body.message).toMatch(/could not be made/);
    const row = await testDb.rebuttal.findUniqueOrThrow({ where: { id: w.rebuttal.id } });
    expect(row).toMatchObject({ status: "APPROVED", watermarkStatus: "FAILED", watermarkError: "STORAGE_UNAVAILABLE", watermarkedUrl: null });
    expect(await testDb.moderationLog.count({ where: { rebuttalId: w.rebuttal.id, toStatus: "APPROVED" } })).toBe(1);
    expect(await testDb.auditLog.findFirst({ where: { action: "REBUTTAL_WATERMARK_FAILED", targetId: w.rebuttal.id } })).not.toBeNull();
    expect(errors.join("\n")).toContain("STORAGE_UNAVAILABLE");
    expect(errors.join("\n")).not.toMatch(/@example\.com|cloudinary/);
  });

  it("a Word document: approved, flagged UNSUPPORTED_TYPE", async () => {
    stored = DOCX;
    const w = await world("PENDING", "https://res.cloudinary.com/demo/raw/authenticated/v1/carehomes_rebuttals/d.docx");
    expect((await approve(w.rebuttal.id, w.moderator)).status).toBe(200);
    expect(await testDb.rebuttal.findUniqueOrThrow({ where: { id: w.rebuttal.id } })).toMatchObject({ status: "APPROVED", watermarkStatus: "FAILED", watermarkError: "UNSUPPORTED_TYPE" });
  });

  it("no document: nothing to copy, nothing flagged", async () => {
    const w = await world("PENDING", null);
    const body = (await (await approve(w.rebuttal.id, w.moderator)).json()) as { approvedCopy: unknown };
    expect(body.approvedCopy).toEqual({ status: "NO_DOCUMENT" });
    expect((await testDb.rebuttal.findUniqueOrThrow({ where: { id: w.rebuttal.id } })).watermarkStatus).toBeNull();
  });

  it("the moderation response carries no storage URL", async () => {
    const w = await world();
    expect(await (await approve(w.rebuttal.id, w.moderator)).text()).not.toMatch(/cloudinary|data:application\/pdf/);
  });

  it("retry: a moderator fixes a FAILED copy; members are refused; non-approved is 409", async () => {
    fetchSpy.mockImplementation(async () => new Response("down", { status: 503 }));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = await world();
    await approve(w.rebuttal.id, w.moderator);
    errSpy.mockRestore();
    fetchSpy.mockImplementation(async () => new Response(Uint8Array.from(stored), { status: 200 }));

    const retry = async (u: Parameters<typeof authCookie>[0], id = w.rebuttal.id) =>
      retryRoute(buildRequest(`http://localhost/api/rebuttal/${id}/approved-copy`, { method: "POST", cookies: await authCookie(u) }), p(id));
    expect((await retry(w.author)).status).toBe(403);
    const ok = await retry(w.moderator);
    expect(ok.status).toBe(200);
    expect((await testDb.rebuttal.findUniqueOrThrow({ where: { id: w.rebuttal.id } })).watermarkStatus).toBe("APPLIED");

    const pending = await world();
    expect((await retry(pending.moderator, pending.rebuttal.id)).status).toBe(409);
  });
});

describe("uploads must be markable", () => {
  async function asMember() {
    const { user, org } = await createOrgWithUser({});
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });
    vi.mocked(getUserFromRequest).mockResolvedValue({ userId: user.id, email: user.email, role: "MEMBER", orgId: org.id });
    return { user, facility };
  }
  function fd(facilityId: string, file: File) {
    const f = new FormData();
    f.set("title", "T");
    f.set("facilityId", facilityId);
    f.set("content", "Body");
    f.set("redactionAcknowledged", "on");
    f.set("document", file);
    return f;
  }

  it("a Word file (even renamed .pdf) is refused before upload; a real PDF is accepted", async () => {
    const { facility } = await asMember();
    const prev = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||= "demo";
    try {
      const word = await submitRebuttal(fd(facility.id, new File([DOCX], "renamed.pdf", { type: "application/pdf" })));
      expect(word).toEqual({ success: false, error: expect.stringMatching(/PDF, PNG or JPG/) });
      expect(await testDb.rebuttal.count()).toBe(0);
      const pdf = await submitRebuttal(fd(facility.id, new File([Uint8Array.from(await PDFDocument.create().then((d) => { d.addPage(); return d.save(); }))], "ok.pdf", { type: "application/pdf" })));
      expect(pdf).toEqual({ success: true });
    } finally {
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = prev;
    }
  });

  it("replacing the document on a fix request clears the previous approved-copy state", async () => {
    const { user, facility } = await asMember();
    const r = await createRebuttal({ userId: user.id, facilityId: facility.id, status: "REQUEST_FIX" });
    await testDb.rebuttal.update({ where: { id: r.id }, data: { documentUrl: DOC_URL, watermarkedUrl: "data:application/pdf;base64,AA", watermarkStatus: "FAILED", watermarkError: "CANNOT_MARK" } });
    const f = fd(facility.id, new File([Uint8Array.from(stored)], "new.pdf", { type: "application/pdf" }));
    const prev = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||= "demo";
    try {
      expect(await updateRebuttal(r.id, f)).toEqual({ success: true });
    } finally {
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = prev;
    }
    expect(await testDb.rebuttal.findUniqueOrThrow({ where: { id: r.id } })).toMatchObject({ watermarkedUrl: null, watermarkStatus: null, watermarkError: null });
  });
});

describe("public copy matches what exists", () => {
  it("no 'cryptographically timestamped', 'tamper-evident' or 'verified public record' claims remain", () => {
    for (const f of ["src/app/(public)/membership-guide/page.tsx", "src/app/(public)/pricing/page.tsx"]) {
      const src = fs.readFileSync(path.join(ROOT, f), "utf8");
      expect(src, f).not.toMatch(/cryptographic|tamper-evident|verified public record|authenticated documents|watermarked rebuttal goes live/i);
    }
  });
});
