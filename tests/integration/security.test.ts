import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import {
  resetDb,
  testDb,
  disconnectDb,
  createOrg,
  createMembership,
  createUser,
  createFacility,
} from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as claimViaApi } from "@/app/api/facility/route";
import { GET as getFacility, DELETE as deleteFacility } from "@/app/api/facility/[id]/route";
import {
  GET as getDeadlines,
  POST as postDeadline,
  PUT as putDeadline,
  DELETE as deleteDeadline,
} from "@/app/api/deadlines/route";

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});
afterAll(disconnectDb);

describe("Injection-style strings are stored literally, never executed (Prisma parameterizes queries)", () => {
  const payloads = [
    "'; DROP TABLE \"User\"; --",
    "' OR '1'='1",
    "{ \"$ne\": null }",
    "<script>alert(1)</script>",
    "Robert'); DROP TABLE Facility;--",
  ];

  for (const payload of payloads) {
    it(`facility name containing ${JSON.stringify(payload)} is stored as plain text, DB survives`, async () => {
      const org = await createOrg();
      await createMembership({ organizationId: org.id, plan: "TIER_C", status: "ACTIVE" });
      const user = await createUser({ organizationId: org.id, role: "MEMBER" });

      const res = await claimViaApi(
        buildRequest("http://localhost/api/facility", {
          method: "POST",
          body: { name: payload, address: "1 Main St" },
          cookies: await authCookie(user),
        })
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe(payload);

      // Table still exists and is queryable — nothing was executed as SQL.
      const stillThere = await testDb.facility.findUnique({ where: { id: body.id } });
      expect(stillThere).not.toBeNull();
      expect(stillThere!.name).toBe(payload);
    });
  }

  it("login email field containing an injection-style payload is rejected as 'Invalid credentials', not a 500 or a bypass", async () => {
    const res = await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "' OR '1'='1", password: "anything" },
      })
    );
    expect(res.status).toBe(401);
  });
});

describe("Long / empty / unicode input handling", () => {
  it("accepts a very long facility name (10,000 chars) without crashing", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_C", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const longName = "A".repeat(10000);

    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: longName, address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    // No length validation exists on the server for facility name — this
    // documents that an unbounded string is currently accepted (201), not a
    // guess: Postgres TEXT/VARCHAR(unbounded per schema) + no Zod validation here.
    expect(res.status).toBe(201);
  });

  it("empty-string name is rejected with 400 (falsy check catches it)", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_C", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });

    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "", address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(400);
  });

  it("unicode (emoji, RTL, CJK) in facility name round-trips correctly", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_C", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const unicodeName = "お花畑ケアホーム 🌸 مرحبا";

    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: unicodeName, address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe(unicodeName);
  });

  it("signup rejects an empty name with 400", async () => {
    const res = await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { name: "", email: "empty-name@example.com", password: "password123", confirmPassword: "password123" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("signup accepts unicode in the name field", async () => {
    const res = await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { name: "José Müller 李明", email: "unicode@example.com", password: "password123", confirmPassword: "password123" },
      })
    );
    expect(res.status).toBe(201);
  });
});

describe("IDOR — accessing another org's/user's records by ID", () => {
  it("CitationDeadline: user A cannot update user B's deadline via PUT (returns 404, not leaked)", async () => {
    const userA = await createUser({ organizationId: null, role: "MEMBER" });
    const userB = await createUser({ organizationId: null, role: "MEMBER" });
    const deadline = await testDb.citationDeadline.create({
      data: { citationId: "CIT-1", dueDate: new Date(), userId: userB.id },
    });

    const res = await putDeadline(
      buildRequest("http://localhost/api/deadlines", {
        method: "PUT",
        body: { id: deadline.id, citationId: "HACKED", dueDate: new Date().toISOString() },
        cookies: await authCookie(userA),
      })
    );
    expect(res.status).toBe(404);

    const reread = await testDb.citationDeadline.findUnique({ where: { id: deadline.id } });
    expect(reread!.citationId).toBe("CIT-1"); // unchanged
  });

  it("CitationDeadline: user A cannot delete user B's deadline (returns 404, row survives)", async () => {
    const userA = await createUser({ organizationId: null, role: "MEMBER" });
    const userB = await createUser({ organizationId: null, role: "MEMBER" });
    const deadline = await testDb.citationDeadline.create({
      data: { citationId: "CIT-2", dueDate: new Date(), userId: userB.id },
    });

    const res = await deleteDeadline(
      buildRequest(`http://localhost/api/deadlines?id=${deadline.id}`, {
        method: "DELETE",
        cookies: await authCookie(userA),
      })
    );
    expect(res.status).toBe(404);

    const reread = await testDb.citationDeadline.findUnique({ where: { id: deadline.id } });
    expect(reread).not.toBeNull();
  });

  it("CitationDeadline: GET only returns the caller's own deadlines, never another user's", async () => {
    const userA = await createUser({ organizationId: null, role: "MEMBER" });
    const userB = await createUser({ organizationId: null, role: "MEMBER" });
    await testDb.citationDeadline.create({ data: { citationId: "MINE", dueDate: new Date(), userId: userA.id } });
    await testDb.citationDeadline.create({ data: { citationId: "NOT-MINE", dueDate: new Date(), userId: userB.id } });

    const res = await getDeadlines(
      buildRequest("http://localhost/api/deadlines", { cookies: await authCookie(userA) })
    );
    const body = await res.json();
    const citationIds = body.map((d: { citationId: string }) => d.citationId);
    expect(citationIds).toContain("MINE");
    expect(citationIds).not.toContain("NOT-MINE");
  });

  it("Facility DELETE by a MEMBER of a DIFFERENT org than the one that owns it is forbidden (403), not just 'not found'", async () => {
    const ownerOrg = await createOrg();
    const owner = await createUser({ organizationId: ownerOrg.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: ownerOrg.id, createdById: owner.id });

    const otherOrg = await createOrg();
    const outsider = await createUser({ organizationId: otherOrg.id, role: "MEMBER" });

    const res = await deleteFacility(
      buildRequest(`http://localhost/api/facility/${facility.id}`, {
        method: "DELETE",
        cookies: await authCookie(outsider),
      }),
      { params: Promise.resolve({ id: facility.id }) }
    );
    expect(res.status).toBe(403); // manage_facilities is ADMIN-only, correctly blocks any MEMBER

    const reread = await testDb.facility.findUnique({ where: { id: facility.id } });
    expect(reread!.deletedAt).toBeNull();
  });

  it("GET /api/facility/[id] leaks facility details with NO auth required at all (by design — public directory), " +
     "confirmed as intentional since the public facility pages rely on this", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });

    const res = await getFacility(
      buildRequest(`http://localhost/api/facility/${facility.id}`),
      { params: Promise.resolve({ id: facility.id }) }
    );
    expect(res.status).toBe(200);
  });
});

describe("Rate limiting on login (CONFIRMED GAP: none exists)", () => {
  it("CONFIRMED GAP: 10 consecutive wrong-password attempts against the same account all return " +
     "401 with no lockout, delay, or CAPTCHA — only the post-password OTP step rate-limits " +
     "(5 attempts) and resend cooldown (60s) exist; the password step itself is unprotected " +
     "against brute force", async () => {
    await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { name: "Target", email: "bruteforce@example.com", password: "correct-password-123", confirmPassword: "correct-password-123" },
      })
    );

    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await login(
        buildRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: { email: "bruteforce@example.com", password: `wrong-guess-${i}` },
        })
      );
      statuses.push(res.status);
    }
    // Every single attempt behaves identically — no escalating lockout.
    expect(statuses.every((s) => s === 401)).toBe(true);
  });
});
