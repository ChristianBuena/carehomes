/**
 * SOW 11.3 — limit personal data.
 * 1. The print form's signer name, signing date and visit date are stored in
 *    private columns and never written into the published rebuttal text.
 * 2. No form keeps drafts in browser storage.
 * 3. Email addresses are not written to server logs (success or failure).
 * 4. The read-only script lists old rebuttals whose text still holds signer
 *    lines, without printing the text.
 * (GA consent is covered by tests/e2e/analytics-consent.spec.ts.)
 */
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth")>();
  return { ...mod, getUserFromRequest: vi.fn(mod.getUserFromRequest) };
});

import { resetDb, testDb, disconnectDb, createOrgWithUser, createFacility, createUser, createRebuttal } from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { getUserFromRequest } from "@/lib/auth";
import { submitRebuttal } from "@/app/actions/rebuttals";
import { POST as moderate } from "@/app/api/moderation/route";
import { GET as published } from "@/app/api/rebuttal/published/route";
import { sendEmail } from "@/lib/mailer";
import { createMfaOtp } from "@/services/mfa.service";
import { findRebuttalsWithSignerText } from "../../scripts/list-rebuttals-with-signer-text";

const ROOT = path.resolve(__dirname, "..", "..");
let logged: string[];
let spies: ReturnType<typeof vi.spyOn>[];

beforeEach(async () => {
  await resetDb();
  sendMail.mockReset().mockResolvedValue({ messageId: "x" });
  logged = [];
  spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation((...args: unknown[]) => {
      logged.push(args.map((a) => (a instanceof Error ? `${a.message} ${JSON.stringify(a)}` : typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    })
  );
});
afterEach(() => spies.forEach((s) => s.mockRestore()));
afterAll(disconnectDb);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "generated" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });
}

async function memberWithFacility() {
  const { user, org } = await createOrgWithUser({});
  const facility = await createFacility({ organizationId: org.id, createdById: user.id });
  vi.mocked(getUserFromRequest).mockResolvedValue({ userId: user.id, email: user.email, role: "MEMBER", orgId: org.id });
  return { user, org, facility };
}

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("signer details are private", () => {
  it("are stored in their own columns and are not in the text; after approval the public API has no trace of them", async () => {
    const { facility } = await memberWithFacility();
    const res = await submitRebuttal(form({
      title: "Response to Citation 123",
      facilityId: facility.id,
      content: "Citation Number: 123\n\nThe facts are as follows.",
      redactionAcknowledged: "on",
      signerName: "Maria Operator",
      signedOn: "2026-10-30",
      visitDate: "2026-10-01",
    }));
    expect(res).toEqual({ success: true });

    const row = await testDb.rebuttal.findFirstOrThrow({});
    expect(row.signerName).toBe("Maria Operator");
    expect(row.signedOn?.toISOString().slice(0, 10)).toBe("2026-10-30");
    expect(row.visitDate?.toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(row.content).not.toMatch(/Maria|Signed:|Date of Visit/);

    const moderator = await createUser({ role: "MODERATOR" });
    await moderate(buildRequest("http://localhost/api/moderation", { method: "POST", body: { id: row.id, action: "approve" }, cookies: await authCookie(moderator) }));
    const text = await (await published()).text();
    expect(text).toContain("The facts are as follows.");
    expect(text).not.toMatch(/Maria Operator|2026-10-01|2026-10-30|signerName|visitDate/);
  });

  it("invalid dates and over-long names are refused with a readable error; nothing is stored", async () => {
    const { facility } = await memberWithFacility();
    const base = { title: "T", facilityId: facility.id, content: "Body", redactionAcknowledged: "on" };
    const extras: Record<string, string>[] = [{ visitDate: "2026-02-30" }, { signedOn: "yesterday" }, { signerName: "x".repeat(121) }];
    for (const extra of extras) {
      const res = await submitRebuttal(form({ ...base, ...extra }));
      expect(res.success).toBe(false);
    }
    expect(await testDb.rebuttal.count()).toBe(0);
  });

  it("the print form no longer writes the signer or visit date into the text", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/app/dashboard/forms/rebuttal/RebuttalPrintForm.tsx"), "utf8");
    const contentCall = /fd\.append\(\s*"content",[\s\S]*?\);/.exec(src)?.[0] ?? "";
    expect(contentCall).not.toBe("");
    expect(contentCall).not.toMatch(/signature|dateOfVisit|Signed:|Date of Visit/);
    expect(src).toMatch(/fd\.append\("signerName"/);
  });
});

describe("no drafts in browser storage", () => {
  it("no source file saves a draft to localStorage or sessionStorage", () => {
    const offenders = walk(path.join(ROOT, "src")).filter((f) =>
      /(localStorage|sessionStorage)\.setItem\(\s*["'`][^"'`]*draft/i.test(fs.readFileSync(f, "utf8"))
    );
    expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it("both print forms remove any draft an older version left behind", () => {
    for (const [file, key] of [
      ["src/app/dashboard/forms/rebuttal/RebuttalPrintForm.tsx", "rebuttal_form_draft"],
      ["src/app/dashboard/forms/redaction/RedactionPrintForm.tsx", "redaction_form_draft"],
    ]) {
      const src = fs.readFileSync(path.join(ROOT, file), "utf8");
      expect(src).toContain(`localStorage.removeItem("${key}")`);
      expect(src).not.toMatch(/localStorage\.(getItem|setItem)/);
    }
  });
});

describe("email addresses are not logged", () => {
  const EMAIL = "private.person@example.com";

  it("sendEmail: success logs nothing with the address; failure logs a summary without it", async () => {
    await sendEmail({ to: EMAIL, subject: "s", text: "t", html: "h" });
    const smtpError = Object.assign(new Error(`Recipient address rejected: <${EMAIL}>`), { code: "EENVELOPE", responseCode: 550, command: "RCPT TO" });
    sendMail.mockRejectedValueOnce(smtpError);
    await expect(sendEmail({ to: EMAIL, subject: "s", text: "t", html: "h" })).rejects.toThrow();
    expect(logged.join("\n")).not.toContain(EMAIL);
    expect(logged.join("\n")).toContain("EENVELOPE");
  });

  it("OTP emails: neither success nor failure logs the address (or the code)", async () => {
    await createUser({ email: EMAIL });
    await createMfaOtp(EMAIL);
    sendMail.mockRejectedValueOnce(new Error(`550 <${EMAIL}> unknown`));
    await createMfaOtp(EMAIL).catch(() => undefined);
    const codes = (await testDb.mfaOtp.findMany({ where: { email: EMAIL } })).map((o) => o.code);
    const out = logged.join("\n");
    expect(out).not.toContain(EMAIL);
    for (const c of codes) expect(out).not.toContain(c);
  });

  it("moderation notifications: the member's address is not logged", async () => {
    const { user, org } = await createOrgWithUser({});
    await testDb.user.update({ where: { id: user.id }, data: { email: EMAIL } });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });
    const rebuttal = await createRebuttal({ userId: user.id, facilityId: facility.id });
    const moderator = await createUser({ role: "MODERATOR" });
    await moderate(buildRequest("http://localhost/api/moderation", { method: "POST", body: { id: rebuttal.id, action: "approve" }, cookies: await authCookie(moderator) }));
    sendMail.mockRejectedValueOnce(new Error(`550 <${EMAIL}>`));
    await moderate(buildRequest("http://localhost/api/moderation", { method: "POST", body: { id: rebuttal.id, action: "reject", reason: "x" }, cookies: await authCookie(moderator) }));
    expect(sendMail).toHaveBeenCalled();
    expect(logged.join("\n")).not.toContain(EMAIL);
  });

  it("no console call in src/ logs an email variable directly", () => {
    const pattern = /console\.(log|info|warn|error|debug)\([^;]*?(\$\{\s*(to|email|memberEmail|requesterEmail|user\.email)\s*\}|[,(]\s*(to|email|memberEmail|requesterEmail|user\.email)\s*[,)])/;
    const offenders = walk(path.join(ROOT, "src")).filter((f) => pattern.test(fs.readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
});

describe("scripts/list-rebuttals-with-signer-text.ts (read-only)", () => {
  it("finds old rebuttals with Signed: / Date of Visit: lines and returns no text", async () => {
    const { user } = await createOrgWithUser({});
    const old = await createRebuttal({ userId: user.id, status: "APPROVED", content: "Date of Visit: 2026-01-01\nCitation Number: 9\n\nBody\n\nSigned: Old Name (2026-01-02)" });
    const visitOnly = await createRebuttal({ userId: user.id, content: "Date of Visit: 2026-01-01\n\nBody" });
    await createRebuttal({ userId: user.id, content: "Nothing private here. The word Signed: appears mid-line only" });
    const before = await testDb.rebuttal.findMany({ orderBy: { id: "asc" } });

    const hits = await findRebuttalsWithSignerText(testDb);
    expect(hits.map((h) => h.id).sort()).toEqual([old.id, visitOnly.id].sort());
    expect(hits.find((h) => h.id === old.id)).toMatchObject({ status: "APPROVED", hasSignedLine: true, hasVisitDateLine: true });
    expect(JSON.stringify(hits)).not.toMatch(/Old Name|Body/);
    expect(await testDb.rebuttal.findMany({ orderBy: { id: "asc" } })).toEqual(before);
  });
});
