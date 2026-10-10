/**
 * Round 3, area D — PDF watermarking.
 *
 * POST /api/rebuttal/watermark downloads a rebuttal's document with fetch();
 * fetch is replaced here, so nothing leaves the machine.
 *
 * "FAILS [severity]" tests assert expected behaviour and are marked `it.fails`
 * (reported in docs/TEST_REPORT.md, not fixed in this pass).
 */
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { PDFDocument } from "pdf-lib";

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
import { buildAcceptedPdf, buildRealTextPdf, buildNoTextPdf, pageContents, contentHasText } from "../helpers/pdf";
import { GET as getWatermark, POST as postWatermark } from "@/app/api/rebuttal/watermark/route";
import { GET as getPublished } from "@/app/api/rebuttal/published/route";
import { applyWatermark, isPdfFile, isPdfTextSearchable } from "@/services/pdf-watermark.service";

const WATERMARK_TEXT = "PUBLIC REDACTED VERSION";
const ORIGINAL_URL = "https://res.cloudinary.test/carehomes_rebuttals/original-document.pdf";

type Cookies = Record<string, string>;
let fetchSpy: ReturnType<typeof vi.spyOn>;

/** Make the route's fetch() of the original document return these bytes. */
function serveDocument(bytes: Uint8Array | Buffer, init: ResponseInit = { status: 200 }) {
  fetchSpy.mockImplementation(async () => new Response(new Uint8Array(bytes), init));
}

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("unexpected network call in a test"));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(disconnectDb);

async function world(status: "PENDING" | "APPROVED" | "REJECTED" | "REQUEST_FIX" = "APPROVED") {
  const orgA = await createOrg({ name: "Sunrise Care Homes LLC" });
  const orgB = await createOrg({ name: "Other Operator Inc" });
  await createMembership({ organizationId: orgA.id, plan: "TIER_B", status: "ACTIVE" });
  await createMembership({ organizationId: orgB.id, plan: "TIER_B", status: "ACTIVE" });

  const author = await createUser({ organizationId: orgA.id, role: "MEMBER", name: "Jane Operator", email: "jane.operator@example.com" });
  const outsider = await createUser({ organizationId: orgB.id, role: "MEMBER" });
  const moderator = await createUser({ organizationId: null, role: "MODERATOR" });
  const admin = await createUser({ organizationId: null, role: "ADMIN" });

  const facility = await createFacility({ organizationId: orgA.id, createdById: author.id, name: "Sunrise Home" });
  const rebuttal = await testDb.rebuttal.update({
    where: { id: (await createRebuttal({ userId: author.id, facilityId: facility.id, status })).id },
    data: { documentUrl: ORIGINAL_URL },
  });

  return {
    orgA, orgB, author, outsider, moderator, admin, facility, rebuttal,
    cookies: {
      author: await authCookie(author),
      outsider: await authCookie(outsider),
      moderator: await authCookie(moderator),
      admin: await authCookie(admin),
    },
  };
}

const post = (cookies: Cookies | undefined, body: unknown) =>
  postWatermark(buildRequest("http://localhost/api/rebuttal/watermark", { method: "POST", body, cookies }));
const get = (cookies: Cookies | undefined, rebuttalId?: string) =>
  getWatermark(buildRequest(`http://localhost/api/rebuttal/watermark${rebuttalId ? `?rebuttalId=${rebuttalId}` : ""}`, { cookies }));

const decodeDataUrl = (url: string) => Buffer.from(url.replace(/^data:application\/pdf;base64,/, ""), "base64");

// ─────────────────────────────────────────────────────────────────────────────

describe("D. Watermark service — what the watermark contains", () => {
  it("stamps 'PUBLIC REDACTED VERSION' on EVERY page and keeps the original page count and text", async () => {
    const original = await buildAcceptedPdf({ pages: 3, text: "Original rebuttal text" });
    const out = await applyWatermark(original);

    expect(isPdfFile(out)).toBe(true);
    const pages = await pageContents(out);
    expect(pages).toHaveLength(3);
    for (const content of pages) {
      expect(contentHasText(content, WATERMARK_TEXT)).toBe(true);
      expect(contentHasText(content, "Original rebuttal text")).toBe(true);
    }
  });

  it("the original bytes are not modified and did not already contain the watermark", async () => {
    const original = await buildAcceptedPdf({ pages: 1 });
    const copy = Buffer.from(original);
    await applyWatermark(original);

    expect(original.equals(copy)).toBe(true);
    expect((await pageContents(original)).some((c) => contentHasText(c, WATERMARK_TEXT))).toBe(false);
  });

  it("the watermark is drawn semi-transparent and rotated 45 degrees", async () => {
    const out = await applyWatermark(await buildAcceptedPdf({ pages: 1 }));
    const [content] = await pageContents(out);
    // cos(45°) = sin(45°) ≈ 0.7071 in the text matrix; a graphics state sets the opacity.
    expect(content).toMatch(/0\.70710678\d* 0\.70710678\d* -0\.70710678\d* 0\.70710678\d*/);
    expect(content).toMatch(/\/GS-\d+ gs/);
  });

  it.fails("FAILS [Medium]: the watermark contains the correct user or organization information (actual: a fixed text only — applyWatermark() takes no user or organization at all)", async () => {
    const w = await world("APPROVED");
    serveDocument(await buildAcceptedPdf({ pages: 1 }));
    const res = await post(w.cookies.moderator, { rebuttalId: w.rebuttal.id });
    expect(res.status).toBe(200);

    const { watermarkedUrl } = (await res.json()) as { watermarkedUrl: string };
    const [content] = await pageContents(decodeDataUrl(watermarkedUrl));
    const identifies =
      contentHasText(content, w.orgA.name) ||
      contentHasText(content, w.author.name) ||
      contentHasText(content, w.facility.name) ||
      contentHasText(content, w.rebuttal.id);
    expect(identifies).toBe(true);
  });

  it("two different organizations' documents get byte-for-byte the same watermark text (nothing identifies the owner)", async () => {
    const a = (await pageContents(await applyWatermark(await buildAcceptedPdf({ text: "same" }))))[0];
    const b = (await pageContents(await applyWatermark(await buildAcceptedPdf({ text: "same" }))))[0];
    expect(a).toBe(b);
  });
});

describe("D. Watermark route — who can generate one (POST /api/rebuttal/watermark)", () => {
  it("no session: 401, and the document is never fetched", async () => {
    const w = await world();
    expect((await post(undefined, { rebuttalId: w.rebuttal.id })).status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a MEMBER cannot generate a watermark — not for another organization's document, and not for their own (403, nothing fetched or stored)", async () => {
    const w = await world();
    serveDocument(await buildAcceptedPdf());

    expect((await post(w.cookies.outsider, { rebuttalId: w.rebuttal.id })).status).toBe(403);
    expect((await post(w.cookies.author, { rebuttalId: w.rebuttal.id })).status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await testDb.rebuttal.findUnique({ where: { id: w.rebuttal.id } }))!.watermarkedUrl).toBeNull();
  });

  it("MODERATOR and ADMIN can: the stored result is a watermarked PDF of the rebuttal's own document", async () => {
    for (const role of ["moderator", "admin"] as const) {
      const w = await world();
      serveDocument(await buildAcceptedPdf({ pages: 2 }));

      const res = await post(w.cookies[role], { rebuttalId: w.rebuttal.id });
      expect(res.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(ORIGINAL_URL);

      const stored = (await testDb.rebuttal.findUnique({ where: { id: w.rebuttal.id } }))!.watermarkedUrl!;
      expect(stored).toMatch(/^data:application\/pdf;base64,/);
      const pages = await pageContents(decodeDataUrl(stored));
      expect(pages).toHaveLength(2);
      expect(pages.every((c) => contentHasText(c, WATERMARK_TEXT))).toBe(true);
      fetchSpy.mockClear();
      await resetDb();
    }
  });

  it("only the requested rebuttal is touched: another organization's rebuttal keeps no watermark", async () => {
    const w = await world();
    const facilityB = await createFacility({ organizationId: w.orgB.id });
    const other = await createRebuttal({ userId: w.outsider.id, facilityId: facilityB.id, status: "APPROVED" });
    serveDocument(await buildAcceptedPdf());

    await post(w.cookies.moderator, { rebuttalId: w.rebuttal.id });
    expect((await testDb.rebuttal.findUnique({ where: { id: other.id } }))!.watermarkedUrl).toBeNull();
  });

  it("400 without rebuttalId; 404 for an unknown id; 400 when the rebuttal has no document", async () => {
    const w = await world();
    const noDoc = await createRebuttal({ userId: w.author.id, facilityId: w.facility.id, status: "APPROVED" });

    expect((await post(w.cookies.moderator, {})).status).toBe(400);
    expect((await post(w.cookies.moderator, { rebuttalId: "no-such-rebuttal" })).status).toBe(404);
    expect((await post(w.cookies.moderator, { rebuttalId: noDoc.id })).status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("asking twice does not re-fetch or re-stamp: the second call returns the stored watermark", async () => {
    const w = await world();
    serveDocument(await buildAcceptedPdf());
    const first = (await (await post(w.cookies.moderator, { rebuttalId: w.rebuttal.id })).json()) as { watermarkedUrl: string };

    const second = await post(w.cookies.moderator, { rebuttalId: w.rebuttal.id });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ message: "Already watermarked", watermarkedUrl: first.watermarkedUrl });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it.fails("FAILS [Low]: a garbage auth-token is answered with 401 (actual: 500)", async () => {
    const w = await world();
    expect((await post({ "auth-token": "not-a-jwt" }, { rebuttalId: w.rebuttal.id })).status).toBe(401);
  });
});

describe("D. Watermark route — who can request the result (GET /api/rebuttal/watermark)", () => {
  async function watermarked(status: "PENDING" | "APPROVED" | "REJECTED" | "REQUEST_FIX") {
    const w = await world(status);
    await testDb.rebuttal.update({ where: { id: w.rebuttal.id }, data: { watermarkedUrl: "data:application/pdf;base64,AAAA" } });
    return w;
  }

  it("400 without rebuttalId; 404 for an unknown id", async () => {
    await world();
    expect((await get(undefined)).status).toBe(400);
    expect((await get(undefined, "no-such-rebuttal")).status).toBe(404);
  });

  it("APPROVED (published) rebuttal: anyone gets the watermarked version, and nobody outside moderation gets the original", async () => {
    const w = await watermarked("APPROVED");
    for (const cookies of [undefined, w.cookies.outsider, w.cookies.author]) {
      const res = await get(cookies, w.rebuttal.id);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(JSON.parse(text)).toEqual({ watermarkedUrl: "data:application/pdf;base64,AAAA", originalUrl: null });
      expect(text).not.toContain(ORIGINAL_URL);
    }
  });

  for (const status of ["PENDING", "REJECTED", "REQUEST_FIX"] as const) {
    it(`a ${status} rebuttal of ANOTHER organization cannot be requested: 403 with no URLs, for a member of another org and for the public`, async () => {
      const w = await watermarked(status);
      for (const cookies of [undefined, w.cookies.outsider]) {
        const res = await get(cookies, w.rebuttal.id);
        expect(res.status).toBe(403);
        const text = await res.text();
        expect(text).not.toContain(ORIGINAL_URL);
        expect(text).not.toContain("data:application/pdf");
      }
    });
  }

  it("the author gets no special access to their own unpublished rebuttal through this route (403)", async () => {
    const w = await watermarked("PENDING");
    expect((await get(w.cookies.author, w.rebuttal.id)).status).toBe(403);
  });

  it("MODERATOR and ADMIN get both URLs, for any status", async () => {
    const w = await watermarked("PENDING");
    for (const cookies of [w.cookies.moderator, w.cookies.admin]) {
      const res = await get(cookies, w.rebuttal.id);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ watermarkedUrl: "data:application/pdf;base64,AAAA", originalUrl: ORIGINAL_URL });
    }
  });

  it("a garbage token is treated as the public: approved is served without the original, unpublished is refused", async () => {
    const approved = await watermarked("APPROVED");
    const bad = { "auth-token": "not-a-jwt" };
    expect(await (await get(bad, approved.rebuttal.id)).json()).toMatchObject({ originalUrl: null });

    const pending = await createRebuttal({ userId: approved.author.id, facilityId: approved.facility.id, status: "PENDING" });
    expect((await get(bad, pending.id)).status).toBe(403);
  });

  it.fails("FAILS [High]: the ORIGINAL (un-watermarked) document of a published rebuttal is not available to the public (actual: GET /api/rebuttal/published, no login, returns documentUrl for every approved rebuttal)", async () => {
    const w = await watermarked("APPROVED");
    const text = await (await getPublished()).text();
    expect(text).toContain(w.rebuttal.id);
    expect(text).not.toContain(ORIGINAL_URL);
  });

  it.fails("FAILS [Medium]: the public list of published rebuttals does not expose the author's email address (actual: it does)", async () => {
    const w = await watermarked("APPROVED");
    const text = await (await getPublished()).text();
    expect(text).toContain(w.rebuttal.id);
    expect(text).not.toContain(w.author.email);
  });
});

describe("D. Watermark route — corrupt and non-PDF input fails safely", () => {
  async function attempt(bytes: Uint8Array | Buffer, init?: ResponseInit) {
    const w = await world();
    serveDocument(bytes, init);
    const res = await post(w.cookies.moderator, { rebuttalId: w.rebuttal.id });
    const stored = (await testDb.rebuttal.findUnique({ where: { id: w.rebuttal.id } }))!.watermarkedUrl;
    return { res, body: (await res.json()) as { error?: string }, stored };
  }

  it("a PNG is refused with 400 'not a valid PDF' and nothing is stored", async () => {
    const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
    const { res, body, stored } = await attempt(png);
    expect(res.status).toBe(400);
    expect(body.error).toBe("Uploaded file is not a valid PDF");
    expect(stored).toBeNull();
  });

  it("an HTML error page, a DOCX (zip) header and an empty file are refused the same way", async () => {
    for (const bytes of [Buffer.from("<html><body>404 Not Found</body></html>"), Buffer.from("504b0304140006000800", "hex"), Buffer.alloc(0)]) {
      const { res, body, stored } = await attempt(bytes);
      expect(res.status).toBe(400);
      expect(body.error).toBe("Uploaded file is not a valid PDF");
      expect(stored).toBeNull();
      await resetDb();
    }
  });

  it("a file that only STARTS like a PDF (renamed junk) is refused with a 400, not a crash, and nothing is stored", async () => {
    const { res, body, stored } = await attempt(Buffer.from("%PDF-1.7\nthis is not really a pdf BT ET\n%%EOF"));
    expect(res.status).toBe(400);
    expect(typeof body.error).toBe("string");
    expect(stored).toBeNull();
  });

  it("a truncated PDF is refused (4xx/5xx with an error message) and nothing is stored", async () => {
    const whole = await buildAcceptedPdf({ pages: 5 });
    const { res, body, stored } = await attempt(whole.subarray(0, Math.floor(whole.length / 3)));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(typeof body.error).toBe("string");
    expect(stored).toBeNull();
  });

  it.fails("FAILS [Low]: a corrupt PDF gets a clear 'corrupt / unreadable' message (actual: it is told the PDF 'appears to be a scanned image … upload an OCR-processed PDF')", async () => {
    const { body } = await attempt(Buffer.from("%PDF-1.7\nthis is not really a pdf BT ET\n%%EOF"));
    expect(body.error).not.toMatch(/scanned image/i);
  });

  it("when the original cannot be downloaded (storage returns 404) the route answers 500 with an error and stores nothing", async () => {
    const { res, body, stored } = await attempt(Buffer.from("gone"), { status: 404 });
    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch original document");
    expect(stored).toBeNull();
  });

  it("when the download itself throws (network error) the route answers 500 without leaking the cause", async () => {
    const w = await world();
    fetchSpy.mockRejectedValue(new Error("ECONNREFUSED 10.0.0.12:443 secret-internal-host"));

    const res = await post(w.cookies.moderator, { rebuttalId: w.rebuttal.id });
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("secret-internal-host");
    expect(JSON.parse(text)).toEqual({ error: "Failed to apply watermark" });
  });

  it("the error responses never include the original document's URL", async () => {
    const w = await world();
    serveDocument(Buffer.from("not a pdf"));
    const res = await post(w.cookies.moderator, { rebuttalId: w.rebuttal.id });
    expect(res.status).toBe(400);
    expect(await res.text()).not.toContain(ORIGINAL_URL);
  });
});

describe("D. Watermark — the 'text-searchable' check", () => {
  it("isPdfFile() looks only at the first five bytes", () => {
    expect(isPdfFile(Buffer.from("%PDF-1.4 anything"))).toBe(true);
    expect(isPdfFile(Buffer.from(" %PDF-1.4"))).toBe(false);
    expect(isPdfFile(Buffer.alloc(0))).toBe(false);
  });

  it.fails("FAILS [High]: an ordinary text PDF (compressed content streams, as almost every PDF writer produces) is accepted (actual: rejected as 'a scanned image' — the check searches the raw bytes for the letters 'BT' and 'ET')", async () => {
    const real = await buildRealTextPdf({ text: "This PDF has real, selectable text." });
    // Sanity: the text really is in the document.
    expect(contentHasText((await pageContents(real))[0], "This PDF has real, selectable text.")).toBe(true);

    expect(await isPdfTextSearchable(real)).toBe(true);
  });

  it.fails("FAILS [Medium]: a scanned PDF (no text at all, 2 MB of image-like binary data) is rejected (actual: accepted — any file that size contains the byte pairs 'BT' and 'ET' somewhere by chance)", async () => {
    const scan = await buildNoTextPdf({ binaryBytes: 2 * 1024 * 1024 });
    expect((await pageContents(scan))[0]).toBe("");

    expect(await isPdfTextSearchable(scan)).toBe(false);
  });

  it("a PDF with no text and no stray 'BT'/'ET' bytes is rejected by the route with the OCR message", async () => {
    const scan = await buildNoTextPdf();
    // Guard against the two letters appearing by chance in this particular file.
    const raw = scan.toString("binary");
    if (raw.includes("BT") && raw.includes("ET")) return;

    const w = await world();
    serveDocument(scan);
    const res = await post(w.cookies.moderator, { rebuttalId: w.rebuttal.id });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/not text-searchable/i);
  });
});

describe("D. Watermark — large files", () => {
  it("a 200-page document is watermarked on every page", async () => {
    const w = await world();
    serveDocument(await buildAcceptedPdf({ pages: 200 }));

    const res = await post(w.cookies.moderator, { rebuttalId: w.rebuttal.id });
    expect(res.status).toBe(200);
    const stored = (await testDb.rebuttal.findUnique({ where: { id: w.rebuttal.id } }))!.watermarkedUrl!;
    const pages = await pageContents(decodeDataUrl(stored));
    expect(pages).toHaveLength(200);
    expect(pages.every((c) => contentHasText(c, WATERMARK_TEXT))).toBe(true);
  }, 60000);

  it("a 5 MB document succeeds; the whole watermarked file is stored in the database row as base64 (about 1.33x its size) and returned in the response", async () => {
    const w = await world();
    const original = await buildAcceptedPdf({ pages: 2, padBytes: 5 * 1024 * 1024 });
    expect(original.length).toBeGreaterThan(5 * 1024 * 1024);
    serveDocument(original);

    const res = await post(w.cookies.moderator, { rebuttalId: w.rebuttal.id });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { watermarkedUrl: string };
    const stored = (await testDb.rebuttal.findUnique({ where: { id: w.rebuttal.id } }))!.watermarkedUrl!;

    expect(stored.length).toBeGreaterThan(original.length * 1.3);
    expect(body.watermarkedUrl.length).toBe(stored.length);
    expect((await PDFDocument.load(decodeDataUrl(stored))).getPageCount()).toBe(2);
  }, 60000);

  it.fails("FAILS [Medium]: a document larger than the stated 10 MB upload limit is refused (actual: any size is downloaded into memory, stamped and stored in the database — here 12 MB becomes a ~16 MB text value)", async () => {
    const w = await world();
    serveDocument(await buildAcceptedPdf({ pages: 1, padBytes: 12 * 1024 * 1024 }));

    const res = await post(w.cookies.moderator, { rebuttalId: w.rebuttal.id });
    expect([400, 413]).toContain(res.status);
  }, 90000);
});
