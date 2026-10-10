/**
 * Route smoke test — calls EVERY API route handler on its happy path against
 * the real test database.
 *
 * Why this exists: `npx tsc --noEmit` does not reject unknown fields in a
 * Prisma `select`/`include`/`where`/`data` object (see docs/KNOWN_ISSUES.md),
 * so a query that references a field the schema no longer has compiles cleanly
 * and only fails when it runs. That is exactly how GET /api/admin/access-review
 * shipped broken (TEST_REPORT.md #1). This suite makes that bug class fail CI:
 *
 *  1. every exported HTTP method of every src/app/api/**\/route.ts must have a
 *     case below (or an explicit, reasoned exemption) — adding a route without
 *     one fails the "coverage" test;
 *  2. each case must return 2xx, must actually reach Prisma (so it cannot pass
 *     by bouncing off a 401/403/400), and must produce ZERO Prisma errors —
 *     including ones a route swallows in a bare `catch {}`;
 *  3. no response may contain a stored password hash.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";

vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { prismaLog, mockSubscriptionsRetrieve, mockCheckoutCreate, mockPortalCreate } = vi.hoisted(() => ({
  prismaLog: {
    ops: [] as string[],
    errors: [] as { op: string; name: string; message: string }[],
  },
  mockSubscriptionsRetrieve: vi.fn(),
  mockCheckoutCreate: vi.fn(),
  mockPortalCreate: vi.fn(),
}));

// Wrap the app's real Prisma client so every operation (and every error, even
// one the calling route catches and discards) is recorded.
vi.mock("@/lib/prisma", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/prisma")>();
  const prisma = mod.prisma.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        const op = `${model ?? "$raw"}.${operation}`;
        prismaLog.ops.push(op);
        try {
          return await query(args);
        } catch (err) {
          const e = err as Error;
          prismaLog.errors.push({ op, name: e?.constructor?.name ?? "Error", message: String(e?.message ?? e) });
          throw err;
        }
      },
    },
  });
  return { prisma };
});

// Same partial Stripe mock as billing.test.ts: real local signature
// verification, mocked network calls.
vi.mock("@/lib/stripe", async () => {
  const Stripe = (await import("stripe")).default;
  const real = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return {
    stripe: {
      webhooks: real.webhooks,
      subscriptions: { retrieve: mockSubscriptionsRetrieve },
      checkout: { sessions: { create: mockCheckoutCreate } },
      billingPortal: { sessions: { create: mockPortalCreate } },
    },
  };
});

// DELETE /api/files removes the blob from UploadThing after the DB write.
vi.mock("uploadthing/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("uploadthing/server")>();
  return {
    ...mod,
    UTApi: class {
      deleteFiles = vi.fn().mockResolvedValue({ success: true, deletedCount: 1 });
    },
  };
});

import Stripe from "stripe";
import { PDFDocument, StandardFonts } from "pdf-lib";
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
import { setRequestHeaders, clearRequestContext } from "../helpers/nextRequestContext";

const ROOT = path.resolve(__dirname, "..", "..");
const API_DIR = path.join(ROOT, "src", "app", "api");
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (req: NextRequest | Request, ctx: RouteContext) => Promise<Response>;

function listRouteFiles(dir: string = API_DIR): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listRouteFiles(full);
      return entry.name === "route.ts" ? [path.relative(ROOT, full).split(path.sep).join("/")] : [];
    })
    .sort();
}

async function loadRoute(file: string): Promise<Record<string, Handler>> {
  return (await import(/* @vite-ignore */ path.join(ROOT, file))) as Record<string, Handler>;
}

const noParams: RouteContext = { params: Promise.resolve({}) };
const withParams = (params: Record<string, string>): RouteContext => ({ params: Promise.resolve(params) });

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seedWorld() {
  const org = await createOrg({ name: "Smoke Org" });
  await createMembership({
    organizationId: org.id,
    plan: "TIER_C",
    status: "ACTIVE",
    stripeCustomerId: "cus_smoke",
    stripeSubscriptionId: "sub_smoke",
  });
  const member = await createUser({ organizationId: org.id, role: "MEMBER", email: "member@example.com" });
  const admin = await createUser({ organizationId: null, role: "ADMIN", email: "admin@example.com" });
  const moderator = await createUser({ organizationId: null, role: "MODERATOR", email: "moderator@example.com" });
  const facility = await createFacility({ organizationId: org.id, createdById: member.id, name: "Smoke Facility" });
  const pending = await createRebuttal({ userId: member.id, facilityId: facility.id, status: "PENDING", title: "Pending Smoke" });
  const approved = await createRebuttal({ userId: member.id, facilityId: facility.id, status: "APPROVED", title: "Approved Smoke" });

  return {
    org,
    member,
    admin,
    moderator,
    facility,
    pending,
    approved,
    memberCookies: await authCookie(member),
    adminCookies: await authCookie(admin),
    moderatorCookies: await authCookie(moderator),
  };
}
type World = Awaited<ReturnType<typeof seedWorld>>;

async function seedMemberFile(world: World, key: string) {
  return testDb.memberFile.create({
    data: {
      filename: `${key}.pdf`,
      fileKey: key,
      fileUrl: `https://files.test/${key}.pdf`,
      fileSize: 1234,
      fileType: "PDF",
      mimeType: "application/pdf",
      userId: world.member.id,
    },
  });
}

async function seedShareLink(world: World, token: string, fileIds: string[]) {
  return testDb.fileShareLink.create({
    data: {
      token,
      shareAll: false,
      expiry: "DAYS_7",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userId: world.member.id,
      selectedFiles: { create: fileIds.map((fileId) => ({ fileId })) },
    },
  });
}

async function seedTakedown(world: World, ticketNumber: string) {
  return testDb.takedownRequest.create({
    data: {
      ticketNumber,
      requesterName: "Requester",
      requesterEmail: "requester@example.com",
      facilityOrRebuttal: "Smoke Facility",
      reason: "OTHER",
      supportingInfo: "Supporting information for the smoke test.",
      slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
      rebuttalId: world.approved.id,
    },
  });
}

async function seedTemplate(world: World) {
  return testDb.template.create({
    data: {
      title: "Smoke Template",
      description: "A template",
      category: "REBUTTAL",
      fileFormat: "PDF",
      fileUrl: "https://files.test/template.pdf",
      uploadedById: world.admin.id,
    },
  });
}

/** Signs up + logs in through the real routes; returns the mfa-pending cookie and the emailed OTP. */
async function signupAndLogin(email: string) {
  const password = "password123";
  const signup = await loadRoute("src/app/api/auth/signup/route.ts");
  const login = await loadRoute("src/app/api/auth/login/route.ts");
  const signupRes = await signup.POST(
    buildRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: { name: "Smoke Signup", email, password, confirmPassword: password },
    }),
    noParams
  );
  const loginRes = await login.POST(
    buildRequest("http://localhost/api/auth/login", { method: "POST", body: { email, password } }),
    noParams
  );
  const setCookie = loginRes.headers.get("set-cookie") ?? "";
  const pending = /mfa-pending=([^;]+)/.exec(setCookie)?.[1] ?? "";
  const otp = await testDb.mfaOtp.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
  return { signupRes, loginRes, pending, otp: otp?.code ?? "" };
}

function signedWebhookRequest(payload: object) {
  const body = JSON.stringify(payload);
  const header = Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  const headers = { "stripe-signature": header, "content-type": "application/json" };
  setRequestHeaders(headers); // the route reads this via next/headers headers()
  return new Request("http://localhost/api/stripe/webhook", { method: "POST", headers, body });
}

/** A real, uncompressed-enough PDF that the watermark service accepts as text-searchable. */
async function buildTextPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([400, 400]).drawText("Smoke test rebuttal document", { x: 40, y: 300, size: 14, font });
  // isPdfTextSearchable() looks for the BT/ET text operators in the raw bytes;
  // pdf-lib deflates content streams, so add them as a trailing PDF comment.
  return Buffer.concat([Buffer.from(await doc.save()), Buffer.from("\n% BT ET\n")]);
}

// ── Cases ────────────────────────────────────────────────────────────────────

type SmokeCase = {
  /** `<route file>#<METHOD>` */
  id: string;
  /** The handler legitimately performs no Prisma operation. */
  noPrisma?: string;
  run: (world: World, route: Record<string, Handler>) => Promise<Response | Response[]>;
};

const CASES: SmokeCase[] = [
  // ── admin ──
  {
    id: "src/app/api/admin/access-review/route.ts#GET",
    run: (w, r) => r.GET(buildRequest("http://localhost/api/admin/access-review", { cookies: w.adminCookies }), noParams),
  },
  {
    id: "src/app/api/admin/access-review/route.ts#POST",
    run: (w, r) =>
      r.POST(
        buildRequest("http://localhost/api/admin/access-review", {
          method: "POST",
          body: { userId: w.member.id },
          cookies: w.adminCookies,
        }),
        noParams
      ),
  },
  {
    id: "src/app/api/admin/archive-moderation-logs/route.ts#POST",
    run: async (w, r) => {
      // One log older than the default 1-year cutoff, so the archive transaction really runs.
      await testDb.moderationLog.create({
        data: {
          fromStatus: "PENDING",
          toStatus: "APPROVED",
          moderatorId: w.admin.id,
          rebuttalId: w.approved.id,
          createdAt: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
        },
      });
      const res = await r.POST(
        buildRequest("http://localhost/api/admin/archive-moderation-logs", { method: "POST", cookies: w.adminCookies }),
        noParams
      );
      expect((await res.clone().json()).archivedCount).toBe(1);
      return res;
    },
  },
  {
    id: "src/app/api/admin/route.ts#GET",
    // Was `noPrisma`: the session lookup now reads User.organizationId (stale-orgId fix).
    run: (w, r) => r.GET(buildRequest("http://localhost/api/admin", { cookies: w.adminCookies }), noParams),
  },

  // ── auth / mfa ──
  {
    id: "src/app/api/auth/signup/route.ts#POST",
    run: async () => (await signupAndLogin("signup-smoke@example.com")).signupRes,
  },
  {
    id: "src/app/api/auth/login/route.ts#POST",
    run: async () => (await signupAndLogin("login-smoke@example.com")).loginRes,
  },
  {
    id: "src/app/api/auth/verify/route.ts#POST",
    run: async (_w, r) => {
      const { pending, otp } = await signupAndLogin("verify-smoke@example.com");
      return r.POST(
        buildRequest("http://localhost/api/auth/verify", { method: "POST", body: { otp }, cookies: { "mfa-pending": pending } }),
        noParams
      );
    },
  },
  {
    id: "src/app/api/mfa/verify/route.ts#POST",
    run: async (_w, r) => {
      const { pending, otp } = await signupAndLogin("mfa-verify-smoke@example.com");
      return r.POST(
        buildRequest("http://localhost/api/mfa/verify", { method: "POST", body: { otp }, cookies: { "mfa-pending": pending } }),
        noParams
      );
    },
  },
  {
    id: "src/app/api/mfa/generate/route.ts#POST",
    run: async (_w, r) => {
      const email = "mfa-generate-smoke@example.com";
      const { pending } = await signupAndLogin(email);
      await testDb.mfaOtp.deleteMany({ where: { email } }); // clear the 60s resend cooldown
      return r.POST(
        buildRequest("http://localhost/api/mfa/generate", { method: "POST", cookies: { "mfa-pending": pending } }),
        noParams
      );
    },
  },
  {
    id: "src/app/api/auth/me/route.ts#GET",
    run: (w, r) => r.GET(buildRequest("http://localhost/api/auth/me", { cookies: w.memberCookies }), noParams),
  },
  {
    id: "src/app/api/auth/logout/route.ts#POST",
    noPrisma: "only clears the auth cookie",
    run: (w, r) =>
      r.POST(buildRequest("http://localhost/api/auth/logout", { method: "POST", cookies: w.memberCookies }), noParams),
  },

  // ── deadlines ──
  {
    id: "src/app/api/deadlines/route.ts#GET",
    run: (w, r) => r.GET(buildRequest("http://localhost/api/deadlines", { cookies: w.memberCookies }), noParams),
  },
  {
    id: "src/app/api/deadlines/route.ts#POST",
    run: (w, r) =>
      r.POST(
        buildRequest("http://localhost/api/deadlines", {
          method: "POST",
          body: { citationId: "CIT-1", dueDate: "2030-01-01", notes: "n" },
          cookies: w.memberCookies,
        }),
        noParams
      ),
  },
  {
    id: "src/app/api/deadlines/route.ts#PUT",
    run: async (w, r) => {
      const d = await testDb.citationDeadline.create({
        data: { citationId: "CIT-2", dueDate: new Date("2030-01-01"), userId: w.member.id },
      });
      return r.PUT(
        buildRequest("http://localhost/api/deadlines", {
          method: "PUT",
          body: { id: d.id, citationId: "CIT-2b", dueDate: "2030-02-01" },
          cookies: w.memberCookies,
        }),
        noParams
      );
    },
  },
  {
    id: "src/app/api/deadlines/route.ts#DELETE",
    run: async (w, r) => {
      const d = await testDb.citationDeadline.create({
        data: { citationId: "CIT-3", dueDate: new Date("2030-01-01"), userId: w.member.id },
      });
      return r.DELETE(
        buildRequest(`http://localhost/api/deadlines?id=${d.id}`, { method: "DELETE", cookies: w.memberCookies }),
        noParams
      );
    },
  },

  // ── facility ──
  {
    id: "src/app/api/facility/route.ts#GET",
    run: (_w, r) => r.GET(buildRequest("http://localhost/api/facility"), noParams),
  },
  {
    id: "src/app/api/facility/route.ts#POST",
    run: (w, r) =>
      r.POST(
        buildRequest("http://localhost/api/facility", {
          method: "POST",
          body: { name: "New Smoke Facility", address: "1 Main St" },
          cookies: w.memberCookies,
        }),
        noParams
      ),
  },
  {
    id: "src/app/api/facility/[id]/route.ts#GET",
    run: (w, r) =>
      r.GET(buildRequest(`http://localhost/api/facility/${w.facility.id}`), withParams({ id: w.facility.id })),
  },
  {
    id: "src/app/api/facility/[id]/route.ts#DELETE",
    run: (w, r) =>
      r.DELETE(
        buildRequest(`http://localhost/api/facility/${w.facility.id}`, { method: "DELETE", cookies: w.adminCookies }),
        withParams({ id: w.facility.id })
      ),
  },

  // ── member files + share links ──
  {
    id: "src/app/api/files/route.ts#GET",
    run: async (w, r) => {
      await seedMemberFile(w, "file-get");
      return r.GET(buildRequest("http://localhost/api/files", { cookies: w.memberCookies }), noParams);
    },
  },
  {
    id: "src/app/api/files/route.ts#PATCH",
    run: async (w, r) => {
      const f = await seedMemberFile(w, "file-patch");
      return r.PATCH(
        buildRequest("http://localhost/api/files", {
          method: "PATCH",
          body: { id: f.id, label: "Renamed", isQsfDoc: true },
          cookies: w.memberCookies,
        }),
        noParams
      );
    },
  },
  {
    id: "src/app/api/files/route.ts#DELETE",
    run: async (w, r) => {
      const f = await seedMemberFile(w, "file-delete");
      return r.DELETE(
        buildRequest(`http://localhost/api/files?id=${f.id}`, { method: "DELETE", cookies: w.memberCookies }),
        noParams
      );
    },
  },
  {
    id: "src/app/api/files/share/route.ts#POST",
    run: async (w, r) => {
      const f = await seedMemberFile(w, "share-post");
      return r.POST(
        buildRequest("http://localhost/api/files/share", {
          method: "POST",
          body: { shareAll: false, fileIds: [f.id], expiry: "7d" },
          cookies: w.memberCookies,
        }),
        noParams
      );
    },
  },
  {
    id: "src/app/api/files/share/route.ts#GET",
    run: async (w, r) => {
      const f = await seedMemberFile(w, "share-get");
      await seedShareLink(w, "tok-share-get", [f.id]);
      return r.GET(buildRequest("http://localhost/api/files/share", { cookies: w.memberCookies }), noParams);
    },
  },
  {
    id: "src/app/api/files/share/[id]/route.ts#DELETE",
    run: async (w, r) => {
      const f = await seedMemberFile(w, "share-revoke");
      const link = await seedShareLink(w, "tok-share-revoke", [f.id]);
      return r.DELETE(
        buildRequest(`http://localhost/api/files/share/${link.id}`, { method: "DELETE", cookies: w.memberCookies }),
        withParams({ id: link.id })
      );
    },
  },
  {
    id: "src/app/api/share/[token]/route.ts#GET",
    run: async (w, r) => {
      const f = await seedMemberFile(w, "public-share");
      const link = await seedShareLink(w, "tok-public-share", [f.id]);
      const responses = [
        await r.GET(buildRequest("http://localhost/api/share/tok-public-share"), withParams({ token: "tok-public-share" })),
      ];
      // Also exercise the shareAll branch (a different query).
      await testDb.fileShareLink.create({ data: { token: "tok-public-all", shareAll: true, userId: w.member.id } });
      responses.push(
        await r.GET(buildRequest("http://localhost/api/share/tok-public-all"), withParams({ token: "tok-public-all" }))
      );
      // The access log is written fire-and-forget; wait for it so its query is checked too.
      await expect.poll(() => testDb.fileShareAccessLog.count({ where: { shareLinkId: link.id } })).toBe(1);
      await expect.poll(() => testDb.fileShareAccessLog.count()).toBe(2);
      return responses;
    },
  },

  // ── membership / stripe ──
  {
    id: "src/app/api/membership/update/route.ts#POST",
    run: (w, r) =>
      r.POST(
        buildRequest("http://localhost/api/membership/update", {
          method: "POST",
          body: { organizationId: w.org.id, plan: "TIER_B" },
          cookies: w.adminCookies,
        }),
        noParams
      ),
  },
  {
    id: "src/app/api/stripe/checkout/route.ts#POST",
    // Was `noPrisma`: the session lookup now reads User.organizationId (stale-orgId fix).
    run: (w, r) => {
      mockCheckoutCreate.mockResolvedValue({ url: "https://stripe.test/session/smoke" });
      return r.POST(
        buildRequest("http://localhost/api/stripe/checkout", {
          method: "POST",
          body: { plan: "TIER_B" },
          cookies: w.memberCookies,
        }),
        noParams
      );
    },
  },
  {
    id: "src/app/api/stripe/portal/route.ts#POST",
    run: (w, r) => {
      mockPortalCreate.mockResolvedValue({ url: "https://stripe.test/portal/smoke" });
      return r.POST(
        buildRequest("http://localhost/api/stripe/portal", { method: "POST", cookies: w.memberCookies }),
        noParams
      );
    },
  },
  {
    id: "src/app/api/stripe/webhook/route.ts#POST",
    run: async (w, r) => {
      const periodEnd = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      mockSubscriptionsRetrieve.mockResolvedValue({ id: "sub_smoke", current_period_end: periodEnd });
      const events = [
        {
          id: "evt_smoke_checkout",
          type: "checkout.session.completed",
          data: {
            object: {
              metadata: { orgId: w.org.id, priceId: process.env.STRIPE_PRICE_C },
              customer: "cus_smoke",
              subscription: "sub_smoke",
            },
          },
        },
        { id: "evt_smoke_paid", type: "invoice.payment_succeeded", data: { object: { subscription: "sub_smoke" } } },
        {
          id: "evt_smoke_failed",
          type: "invoice.payment_failed",
          data: { object: { subscription: "sub_smoke", attempt_count: 1 } },
        },
        { id: "evt_smoke_deleted", type: "customer.subscription.deleted", data: { object: { id: "sub_smoke" } } },
      ];
      const responses: Response[] = [];
      for (const event of events) responses.push(await r.POST(signedWebhookRequest(event), noParams));
      return responses;
    },
  },

  // ── moderation ──
  {
    id: "src/app/api/moderation/route.ts#GET",
    run: (w, r) =>
      r.GET(
        buildRequest(`http://localhost/api/moderation?rebuttalId=${w.pending.id}`, { cookies: w.moderatorCookies }),
        noParams
      ),
  },
  {
    id: "src/app/api/moderation/route.ts#POST",
    run: async (w, r) => {
      const fix = await createRebuttal({ userId: w.member.id, facilityId: w.facility.id, status: "PENDING" });
      const reject = await createRebuttal({ userId: w.member.id, facilityId: w.facility.id, status: "PENDING" });
      const post = (body: object) =>
        r.POST(buildRequest("http://localhost/api/moderation", { method: "POST", body, cookies: w.moderatorCookies }), noParams);
      return [
        await post({ id: w.pending.id, action: "approve" }),
        await post({ id: fix.id, action: "request_fix", notes: "Please clarify the dates" }),
        await post({ id: reject.id, action: "reject", reason: "Insufficient evidence" }),
      ];
    },
  },

  // ── rebuttals ──
  {
    id: "src/app/api/rebuttal/route.ts#POST",
    run: (w, r) =>
      r.POST(
        buildRequest("http://localhost/api/rebuttal", {
          method: "POST",
          body: { title: "Smoke", content: "Smoke content", facilityId: w.facility.id },
          cookies: w.memberCookies,
        }),
        noParams
      ),
  },
  {
    id: "src/app/api/rebuttal/[id]/route.ts#GET",
    run: (w, r) =>
      r.GET(
        buildRequest(`http://localhost/api/rebuttal/${w.pending.id}`, { cookies: w.memberCookies }),
        withParams({ id: w.pending.id })
      ),
  },
  {
    id: "src/app/api/rebuttal/[id]/route.ts#DELETE",
    run: (w, r) =>
      r.DELETE(
        buildRequest(`http://localhost/api/rebuttal/${w.pending.id}`, { method: "DELETE", cookies: w.memberCookies }),
        withParams({ id: w.pending.id })
      ),
  },
  {
    id: "src/app/api/rebuttal/published/route.ts#GET",
    run: (_w, r) => r.GET(buildRequest("http://localhost/api/rebuttal/published"), noParams),
  },
  {
    id: "src/app/api/rebuttal/watermark/route.ts#GET",
    run: (w, r) =>
      r.GET(buildRequest(`http://localhost/api/rebuttal/watermark?rebuttalId=${w.approved.id}`), noParams),
  },
  {
    id: "src/app/api/rebuttal/watermark/route.ts#POST",
    run: async (w, r) => {
      await testDb.rebuttal.update({
        where: { id: w.approved.id },
        data: { documentUrl: "https://files.test/rebuttal.pdf" },
      });
      const pdf = await buildTextPdf();
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(new Uint8Array(pdf), { status: 200, headers: { "content-type": "application/pdf" } }));
      try {
        const res = await r.POST(
          buildRequest("http://localhost/api/rebuttal/watermark", {
            method: "POST",
            body: { rebuttalId: w.approved.id },
            cookies: w.moderatorCookies,
          }),
          noParams
        );
        const reread = await testDb.rebuttal.findUnique({ where: { id: w.approved.id } });
        expect(reread?.watermarkedUrl).toMatch(/^data:application\/pdf;base64,/);
        return res;
      } finally {
        fetchSpy.mockRestore();
      }
    },
  },

  // ── takedowns ──
  {
    id: "src/app/api/takedown/route.ts#POST",
    run: (w, r) =>
      r.POST(
        buildRequest("http://localhost/api/takedown", {
          method: "POST",
          body: {
            requesterName: "Jane Requester",
            requesterEmail: "jane.requester@example.com",
            facilityOrRebuttal: "Smoke Facility",
            reason: "PRIVACY_PII_PHI",
            supportingInfo: "This content contains resident-identifying information.",
            rebuttalId: w.approved.id,
          },
        }),
        noParams
      ),
  },
  {
    id: "src/app/api/takedown/route.ts#GET",
    run: async (w, r) => {
      await seedTakedown(w, "TDR-SMOKE-LIST");
      return [
        await r.GET(buildRequest("http://localhost/api/takedown", { cookies: w.adminCookies }), noParams),
        // status + free-text search exercise the dynamically built `where`
        await r.GET(buildRequest("http://localhost/api/takedown?status=PENDING&q=smoke", { cookies: w.adminCookies }), noParams),
      ];
    },
  },
  {
    id: "src/app/api/takedown/[id]/route.ts#GET",
    run: async (w, r) => {
      const t = await seedTakedown(w, "TDR-SMOKE-GET");
      return r.GET(buildRequest(`http://localhost/api/takedown/${t.id}`, { cookies: w.adminCookies }), withParams({ id: t.id }));
    },
  },
  {
    id: "src/app/api/takedown/[id]/route.ts#PATCH",
    run: async (w, r) => {
      const t = await seedTakedown(w, "TDR-SMOKE-PATCH");
      const patch = (body: object) =>
        r.PATCH(
          buildRequest(`http://localhost/api/takedown/${t.id}`, { method: "PATCH", body, cookies: w.adminCookies }),
          withParams({ id: t.id })
        );
      // Every action branch issues a different query.
      return [
        await patch({ action: "in_review" }),
        await patch({ action: "assign", assignedToId: w.moderator.id }),
        await patch({ action: "emergency_takedown", emergencyReason: "Resident PII exposed" }),
        await patch({ action: "resolve", resolutionNotes: "Content removed." }),
      ];
    },
  },

  // ── templates ──
  {
    id: "src/app/api/templates/route.ts#GET",
    run: async (w, r) => {
      await seedTemplate(w);
      return r.GET(buildRequest("http://localhost/api/templates?category=REBUTTAL", { cookies: w.memberCookies }), noParams);
    },
  },
  {
    id: "src/app/api/templates/route.ts#POST",
    run: (w, r) =>
      r.POST(
        buildRequest("http://localhost/api/templates", {
          method: "POST",
          body: {
            title: "New Template",
            description: "Desc",
            category: "GUIDE",
            fileFormat: "PDF",
            fileUrl: "https://files.test/new-template.pdf",
          },
          cookies: w.adminCookies,
        }),
        noParams
      ),
  },
  {
    id: "src/app/api/templates/[id]/route.ts#DELETE",
    run: async (w, r) => {
      const t = await seedTemplate(w);
      return r.DELETE(
        buildRequest(`http://localhost/api/templates/${t.id}`, { method: "DELETE", cookies: w.adminCookies }),
        withParams({ id: t.id })
      );
    },
  },
  {
    id: "src/app/api/templates/[id]/download/route.ts#POST",
    run: async (w, r) => {
      const t = await seedTemplate(w);
      return r.POST(
        buildRequest(`http://localhost/api/templates/${t.id}/download`, { method: "POST", cookies: w.memberCookies }),
        withParams({ id: t.id })
      );
    },
  },
];

/**
 * Handlers that cannot be driven in-process. Their Prisma queries are still
 * checked statically by tests/unit/prisma-query-shape.test.ts.
 */
const EXEMPT: Record<string, string> = {
  "src/app/api/uploadthing/route.ts#GET":
    "UploadThing's own generated handler (createRouteHandler); needs a live UploadThing token/ingest server",
  "src/app/api/uploadthing/route.ts#POST":
    "UploadThing's own generated handler; its Prisma write lives in src/lib/uploadthing.ts onUploadComplete, " +
    "which only runs on a signed callback from UploadThing's servers",
};

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  clearRequestContext();
  prismaLog.ops.length = 0;
  prismaLog.errors.length = 0;
});
afterAll(disconnectDb);

describe("route smoke — coverage of src/app/api/**/route.ts", () => {
  it("every exported HTTP method of every route file has a smoke case or a reasoned exemption", async () => {
    const exported: string[] = [];
    for (const file of listRouteFiles()) {
      const mod = await loadRoute(file);
      for (const method of HTTP_METHODS) {
        if (typeof mod[method] === "function") exported.push(`${file}#${method}`);
      }
    }
    expect(exported.length).toBeGreaterThan(0);

    const covered = new Set([...CASES.map((c) => c.id), ...Object.keys(EXEMPT)]);
    expect(exported.filter((id) => !covered.has(id))).toEqual([]);
    // ...and no stale entry points at a handler that no longer exists.
    expect([...covered].filter((id) => !exported.includes(id))).toEqual([]);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
  });
});

describe("route smoke — every route's happy path runs its Prisma queries without error", () => {
  for (const c of CASES) {
    it(c.id.replace("src/app/api", "").replace("/route.ts#", " ") + (c.noPrisma ? " (no Prisma)" : ""), async () => {
      const [file, method] = c.id.split("#");
      const world = await seedWorld();
      const route = await loadRoute(file);
      expect(typeof route[method]).toBe("function");

      prismaLog.ops.length = 0;
      prismaLog.errors.length = 0;

      const result = await c.run(world, route);
      const responses = Array.isArray(result) ? result : [result];

      // No Prisma operation may have failed — not even one the route swallowed.
      expect(prismaLog.errors).toEqual([]);

      const passwordHashes = (await testDb.user.findMany({ select: { password: true } })).map((u) => u.password);
      for (const res of responses) {
        const text = await res.text();
        expect(res.status, `${c.id} -> ${res.status} ${text.slice(0, 300)}`).toBeGreaterThanOrEqual(200);
        expect(res.status, `${c.id} -> ${res.status} ${text.slice(0, 300)}`).toBeLessThan(300);
        for (const hash of passwordHashes) {
          expect(text.includes(hash), `${c.id} leaked a stored password hash in its response`).toBe(false);
        }
      }

      // The case must really have reached the database (not bounced off a guard).
      if (c.noPrisma) {
        expect(prismaLog.ops).toEqual([]);
      } else {
        expect(prismaLog.ops.length, `${c.id} executed no Prisma operation`).toBeGreaterThan(0);
      }
    });
  }
});
