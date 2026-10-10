/**
 * Round 3, area F — UploadThing.
 *
 * Nothing here talks to UploadThing. The upload router's two callbacks are
 * called directly, the way UploadThing's handler calls them:
 *   - `middleware`        runs BEFORE a file is accepted (the authorization step)
 *   - `onUploadComplete`  runs on UploadThing's signed callback after the upload
 *
 * File type, size and count limits are router CONFIGURATION that UploadThing's
 * servers enforce; this suite can only assert the configuration itself.
 *
 * "FAILS [severity]" tests assert expected behaviour and are marked `it.fails`
 * (reported in docs/TEST_REPORT.md, not fixed in this pass).
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

import { resetDb, testDb, disconnectDb, createOrg, createMembership, createUser } from "../helpers/db";
import { authCookie } from "../helpers/http";
import { setRequestCookies, clearRequestContext } from "../helpers/nextRequestContext";
import { ourFileRouter } from "@/lib/uploadthing";
import { signMfaPendingToken } from "@/lib/jwt";
import { SignJWT } from "jose";

type UploadedFile = { name: string; key: string; ufsUrl: string; size: number; type: string };
type Route = {
  routerConfig: Record<string, { maxFileSize: string; maxFileCount: number }>;
  middleware: (opts: Record<string, unknown>) => Promise<{ userId: string }>;
  onUploadComplete: (opts: { metadata: { userId: string }; file: UploadedFile }) => Promise<unknown>;
};
const route = ourFileRouter.memberFileUploader as unknown as Route;

let keyCounter = 0;
function uploaded(overrides: Partial<UploadedFile> = {}): UploadedFile {
  keyCounter += 1;
  const key = `utkey-${Date.now()}-${keyCounter}`;
  return { name: "plan.pdf", key, ufsUrl: `https://app.ufs.test/f/${key}`, size: 2048, type: "application/pdf", ...overrides };
}

/** Run the pre-upload authorization step as the given session cookies. */
function authorize(cookies: Record<string, string>, extra: Record<string, unknown> = {}) {
  setRequestCookies(cookies);
  return route.middleware({ req: new Request("http://localhost/api/uploadthing"), files: [], input: undefined, ...extra });
}

beforeEach(async () => {
  await resetDb();
  clearRequestContext();
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterAll(disconnectDb);

describe("F. UploadThing — authorization runs BEFORE a file is accepted (middleware)", () => {
  it("no session cookie: rejected with 'Unauthorized'", async () => {
    await expect(authorize({})).rejects.toThrow("Unauthorized");
  });

  it("a garbage token is rejected", async () => {
    await expect(authorize({ "auth-token": "not-a-jwt" })).rejects.toThrow();
  });

  it("a token signed with a different secret is rejected", async () => {
    const forged = await new SignJWT({ userId: "attacker", email: "a@example.com", role: "ADMIN", orgId: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("some-other-secret"));
    await expect(authorize({ "auth-token": forged })).rejects.toThrow();
  });

  it("an expired session token is rejected", async () => {
    const expired = await new SignJWT({ userId: "u", email: "u@example.com", role: "MEMBER", orgId: "o" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
    await expect(authorize({ "auth-token": expired })).rejects.toThrow();
  });

  it("an MFA-pending token (password step only) cannot be used to upload", async () => {
    const pending = await signMfaPendingToken("half-logged-in@example.com");
    await expect(authorize({ "auth-token": pending })).rejects.toThrow();
  });

  it("a signed-in MEMBER is accepted and the upload is bound to THEIR user id", async () => {
    const org = await createOrg();
    const member = await createUser({ organizationId: org.id, role: "MEMBER" });
    expect(await authorize(await authCookie(member))).toEqual({ userId: member.id });
  });

  it("the user id comes from the session only: a client-supplied userId in the upload input is ignored", async () => {
    const org = await createOrg();
    const member = await createUser({ organizationId: org.id, role: "MEMBER" });
    const victim = await createUser({ organizationId: org.id, role: "MEMBER" });

    const metadata = await authorize(await authCookie(member), {
      input: { userId: victim.id },
      files: [{ name: "x.pdf", size: 1, type: "application/pdf", customId: victim.id }],
    });
    expect(metadata).toEqual({ userId: member.id });
  });

  it("role and membership are NOT checked: MODERATOR, ADMIN, and a MEMBER with no active membership are all accepted (current behaviour — see report)", async () => {
    const lapsed = await createOrg();
    await createMembership({ organizationId: lapsed.id, plan: "NONE", status: "INACTIVE" });
    const lapsedMember = await createUser({ organizationId: lapsed.id, role: "MEMBER" });
    const moderator = await createUser({ organizationId: null, role: "MODERATOR" });
    const admin = await createUser({ organizationId: null, role: "ADMIN" });

    for (const user of [lapsedMember, moderator, admin]) {
      expect(await authorize(await authCookie(user))).toEqual({ userId: user.id });
    }
  });

  it.fails("FAILS [Low]: a valid token for a user that no longer exists is rejected before the upload (actual: accepted — the file is stored at UploadThing and only the later database write fails)", async () => {
    const ghost = await createUser({ organizationId: null, role: "MEMBER" });
    const cookies = await authCookie(ghost);
    await testDb.user.delete({ where: { id: ghost.id } });

    await expect(authorize(cookies)).rejects.toThrow();
  });

  it("…and for that deleted user the completion callback then fails, leaving no file record", async () => {
    const ghost = await createUser({ organizationId: null, role: "MEMBER" });
    const cookies = await authCookie(ghost);
    await testDb.user.delete({ where: { id: ghost.id } });

    const metadata = await authorize(cookies);
    await expect(route.onUploadComplete({ metadata, file: uploaded() })).rejects.toThrow();
    expect(await testDb.memberFile.count()).toBe(0);
  });
});

describe("F. UploadThing — the file record is tied to the right user and organization (onUploadComplete)", () => {
  async function memberInOrg(name: string) {
    const org = await createOrg({ name });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    return { org, user };
  }

  it("stores the record under the user from the authorization step, with the uploaded file's key, URL, size and type", async () => {
    const { org, user } = await memberInOrg("Upload Org");
    const metadata = await authorize(await authCookie(user));
    const file = uploaded({ name: "plan-of-correction.pdf", size: 4321 });

    await route.onUploadComplete({ metadata, file });

    const row = await testDb.memberFile.findUnique({ where: { fileKey: file.key }, include: { user: true } });
    expect(row).toMatchObject({
      userId: user.id,
      filename: "plan-of-correction.pdf",
      fileUrl: file.ufsUrl,
      fileSize: 4321,
      fileType: "PDF",
      mimeType: "application/pdf",
      deletedAt: null,
    });
    // MemberFile has no organization column; the organization is the uploader's.
    expect(row!.user.organizationId).toBe(org.id);
  });

  it("two users uploading at the same time each get their own record; neither can see the other's", async () => {
    const a = await memberInOrg("Org A");
    const b = await memberInOrg("Org B");
    const metaA = await authorize(await authCookie(a.user));
    const metaB = await authorize(await authCookie(b.user));

    await Promise.all([
      route.onUploadComplete({ metadata: metaA, file: uploaded({ name: "a.pdf" }) }),
      route.onUploadComplete({ metadata: metaB, file: uploaded({ name: "b.pdf" }) }),
    ]);

    expect((await testDb.memberFile.findMany({ where: { userId: a.user.id } })).map((f) => f.filename)).toEqual(["a.pdf"]);
    expect((await testDb.memberFile.findMany({ where: { userId: b.user.id } })).map((f) => f.filename)).toEqual(["b.pdf"]);
  });

  it("maps MIME types to the stored file type", async () => {
    const { user } = await memberInOrg("Types Org");
    const metadata = { userId: user.id };
    const cases: [string, string][] = [
      ["application/pdf", "PDF"],
      ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "DOCX"],
      ["image/jpeg", "JPG"],
      ["image/jpg", "JPG"],
      ["image/png", "PNG"],
      ["image/gif", "OTHER"],
      ["image/svg+xml", "OTHER"],
    ];
    for (const [type, expected] of cases) {
      const file = uploaded({ type });
      await route.onUploadComplete({ metadata, file });
      expect((await testDb.memberFile.findUnique({ where: { fileKey: file.key } }))!.fileType, type).toBe(expected);
    }
  });

  it("the callback does not re-check the type: anything UploadThing reports is stored (as OTHER)", async () => {
    const { user } = await memberInOrg("Trust Org");
    const file = uploaded({ name: "setup.exe", type: "application/x-msdownload" });
    await route.onUploadComplete({ metadata: { userId: user.id }, file });

    expect(await testDb.memberFile.findUnique({ where: { fileKey: file.key } })).toMatchObject({
      fileType: "OTHER",
      mimeType: "application/x-msdownload",
    });
  });

  it("a replayed callback for the same file key is rejected (unique key) and does not create a second record", async () => {
    const { user } = await memberInOrg("Replay Org");
    const file = uploaded();
    await route.onUploadComplete({ metadata: { userId: user.id }, file });

    await expect(route.onUploadComplete({ metadata: { userId: user.id }, file })).rejects.toThrow();
    expect(await testDb.memberFile.count()).toBe(1);
  });

  it("a replayed callback cannot move a file to another user", async () => {
    const a = await memberInOrg("Org A");
    const b = await memberInOrg("Org B");
    const file = uploaded();
    await route.onUploadComplete({ metadata: { userId: a.user.id }, file });

    await expect(route.onUploadComplete({ metadata: { userId: b.user.id }, file })).rejects.toThrow();
    expect((await testDb.memberFile.findUnique({ where: { fileKey: file.key } }))!.userId).toBe(a.user.id);
  });
});

describe("A/F. Filename edge cases (stored by onUploadComplete)", () => {
  const names: [string, string][] = [
    ["a 5,000-character name", "a".repeat(4996) + ".pdf"],
    ["unicode (CJK, emoji, RTL, combining marks)", "計画書 📄 خطة العلاج é.pdf"],
    ["path traversal characters", "../../../etc/passwd"],
    ["Windows path characters", "C:\\Users\\admin\\..\\secret.pdf"],
    ["HTML/script characters", "<img src=x onerror=alert(1)>.pdf"],
    ["newlines and carriage returns", "line1\nline2\r\n.pdf"],
    ["leading dot and spaces", " .hidden file .pdf "],
    ["an empty name", ""],
  ];

  for (const [label, name] of names) {
    it(`${label} is stored exactly as given and never used as a path`, async () => {
      const org = await createOrg();
      const user = await createUser({ organizationId: org.id, role: "MEMBER" });
      const file = uploaded({ name });

      await route.onUploadComplete({ metadata: { userId: user.id }, file });

      const row = await testDb.memberFile.findUnique({ where: { fileKey: file.key } });
      expect(row!.filename).toBe(name);
      // The storage location is UploadThing's key/URL, never derived from the name.
      expect(row!.fileKey).toBe(file.key);
      expect(row!.fileUrl).toBe(file.ufsUrl);
    });
  }
});

describe("A/F. File type and size limits (router configuration — enforced by UploadThing, not by this app)", () => {
  it("accepts only PDF, DOCX and images", () => {
    expect(Object.keys(route.routerConfig).sort()).toEqual(
      ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image", "pdf"].sort()
    );
  });

  it("limits every type to 16MB per file and 10 files per upload", () => {
    for (const config of Object.values(route.routerConfig)) {
      expect(config).toEqual({ maxFileSize: "16MB", maxFileCount: 10 });
    }
  });

  it("the API route exposes UploadThing's GET and POST handlers", async () => {
    const mod = await import("@/app/api/uploadthing/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
});
