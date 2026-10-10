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

  it("FIXED (new finding, TEST_REPORT #16): that public, unauthenticated response must NOT include the claiming " +
     "user's password hash or email — getFacilityById() used `include: { createdBy: true }`, which returned the " +
     "entire User row to anonymous callers", async () => {
    const org = await createOrg();
    const user = await createUser({
      organizationId: org.id,
      role: "MEMBER",
      email: "claimant-private@example.com",
      name: "Claimant Name",
      password: "$2b$10$SENTINEL-PASSWORD-HASH",
    });
    const facility = await createFacility({ organizationId: org.id, createdById: user.id });

    const res = await getFacility(
      buildRequest(`http://localhost/api/facility/${facility.id}`),
      { params: Promise.resolve({ id: facility.id }) }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain("SENTINEL-PASSWORD-HASH");
    expect(text).not.toContain("claimant-private@example.com");

    const body = JSON.parse(text);
    expect(body.createdBy).toEqual({ id: user.id, name: "Claimant Name" });
    expect(body).not.toHaveProperty("createdBy.password");
  });
});

describe("Rate limiting on login — lockout per (email, client IP) (FIXED; was CONFIRMED GAP: none existed)", () => {
  const EMAIL = "bruteforce@example.com";
  const PASSWORD = "correct-password-123";

  async function createTarget() {
    await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { name: "Target", email: EMAIL, password: PASSWORD, confirmPassword: PASSWORD },
      })
    );
  }
  const attempt = (password: string, email: string = EMAIL, ip?: string) =>
    login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email, password },
        headers: ip ? { "x-forwarded-for": ip } : undefined,
      })
    );
  // Requests without a forwarding header share the "unknown" address bucket.
  const attemptRow = (email: string = EMAIL, ipAddress: string = "unknown") =>
    testDb.loginAttempt.findUnique({ where: { email_ipAddress: { email, ipAddress } } });
  const expireLock = (email: string = EMAIL, ipAddress: string = "unknown") =>
    testDb.loginAttempt.update({
      where: { email_ipAddress: { email, ipAddress } },
      data: { lockedUntil: new Date(Date.now() - 1000) },
    });

  it("FIXED (was CONFIRMED GAP, 10x 401 with no escalation): of 10 consecutive wrong-password attempts against " +
     "the same account from the same address, the first 4 return 401 and the 5th locks it — it and every later attempt " +
     "return 429 with a Retry-After header", async () => {
    await createTarget();

    const statuses: number[] = [];
    let lastLocked: Response | undefined;
    for (let i = 0; i < 10; i++) {
      const res = await attempt(`wrong-guess-${i}`);
      statuses.push(res.status);
      if (res.status === 429) lastLocked = res;
    }
    expect(statuses).toEqual([401, 401, 401, 401, 429, 429, 429, 429, 429, 429]);

    const retryAfter = Number(lastLocked!.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(14 * 60);
    expect(retryAfter).toBeLessThanOrEqual(15 * 60);
    expect((await lastLocked!.json()).error).toMatch(/too many failed login attempts/i);

    const row = await attemptRow();
    expect(row!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("while locked, even the CORRECT password is refused (429) and no OTP is issued", async () => {
    await createTarget();
    for (let i = 0; i < 5; i++) await attempt(`wrong-${i}`);
    const otpsBefore = await testDb.mfaOtp.count({ where: { email: EMAIL } });

    const res = await attempt(PASSWORD);
    expect(res.status).toBe(429);
    expect(res.headers.get("set-cookie") ?? "").not.toContain("mfa-pending");
    expect(await testDb.mfaOtp.count({ where: { email: EMAIL } })).toBe(otpsBefore);
  });

  it("once the lock has expired the correct password works again, and the lock + counter are cleared", async () => {
    await createTarget();
    for (let i = 0; i < 5; i++) await attempt(`wrong-${i}`);
    await expireLock();

    const res = await attempt(PASSWORD);
    expect(res.status).toBe(200);

    // Lock and counter are cleared: the row is gone.
    expect(await attemptRow()).toBeNull();
  });

  it("after an expired lock, a wrong password starts a fresh count (401, not an instant re-lock)", async () => {
    await createTarget();
    for (let i = 0; i < 5; i++) await attempt(`wrong-${i}`);
    await expireLock();

    expect((await attempt("still-wrong")).status).toBe(401);
    const row = await attemptRow();
    expect(row!.failedAttempts).toBe(1);
    expect(row!.lockedUntil).toBeNull();
  });

  it("a successful login resets the counter: 4 wrong, 1 right, then 4 more wrong never locks", async () => {
    await createTarget();
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await attempt(`wrong-a-${i}`)).status);
    statuses.push((await attempt(PASSWORD)).status);
    for (let i = 0; i < 4; i++) statuses.push((await attempt(`wrong-b-${i}`)).status);

    expect(statuses).toEqual([401, 401, 401, 401, 200, 401, 401, 401, 401]);
    const row = await attemptRow();
    expect(row!.lockedUntil).toBeNull();
    expect(row!.failedAttempts).toBe(4);
  });

  it("5 CONCURRENT wrong guesses are all counted and lock the account (atomic increment)", async () => {
    await createTarget();
    await Promise.all(Array.from({ length: 5 }, (_, i) => attempt(`concurrent-${i}`)));

    expect((await attempt(PASSWORD)).status).toBe(429);
  });

  // CHANGED in round 3 (KNOWN_ISSUES #6): this used to assert "8x 401, no
  // lockout state" for an unknown email, which made a locked (429) account
  // distinguishable from a non-existent (401) one. Unknown emails are now
  // throttled exactly like real ones.
  it("an unknown email gets exactly the same 401 -> 429 sequence as a real account (lockout does not reveal which emails exist)", async () => {
    await createTarget();

    const real: number[] = [];
    const unknown: number[] = [];
    for (let i = 0; i < 8; i++) {
      real.push((await attempt(`guess-${i}`)).status);
      unknown.push((await attempt(`guess-${i}`, "nobody@example.com")).status);
    }
    expect(unknown).toEqual([401, 401, 401, 401, 429, 429, 429, 429]);
    expect(unknown).toEqual(real);

    const realLocked = await attempt("x");
    const unknownLocked = await attempt("x", "nobody@example.com");
    expect((await unknownLocked.json()).error).toBe((await realLocked.json()).error);
    expect(await testDb.user.count({ where: { email: "nobody@example.com" } })).toBe(0);
  });

  it("locking one account does not affect another account", async () => {
    await createTarget();
    await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { name: "Other", email: "other@example.com", password: PASSWORD, confirmPassword: PASSWORD },
      })
    );
    for (let i = 0; i < 5; i++) await attempt(`wrong-${i}`);

    expect((await attempt(PASSWORD, "other@example.com")).status).toBe(200);
  });
  // ── Round 3: one person cannot lock out another ───────────────────────────
  const ATTACKER_IP = "203.0.113.50";
  const VICTIM_IP = "198.51.100.7";

  it("an attacker who knows the email locks only THEIR OWN address: the real owner still signs in from theirs", async () => {
    await createTarget();

    const attacker: number[] = [];
    for (let i = 0; i < 6; i++) attacker.push((await attempt(`guess-${i}`, EMAIL, ATTACKER_IP)).status);
    expect(attacker).toEqual([401, 401, 401, 401, 429, 429]);

    const victim = await attempt(PASSWORD, EMAIL, VICTIM_IP);
    expect(victim.status).toBe(200);
    expect(victim.headers.get("set-cookie") ?? "").toContain("mfa-pending");
  });

  it("the attacker's address stays locked for that email even with the correct password, and the owner's login does not clear it", async () => {
    await createTarget();
    for (let i = 0; i < 5; i++) await attempt(`guess-${i}`, EMAIL, ATTACKER_IP);

    expect((await attempt(PASSWORD, EMAIL, VICTIM_IP)).status).toBe(200);
    expect((await attempt(PASSWORD, EMAIL, ATTACKER_IP)).status).toBe(429);
    expect((await attemptRow(EMAIL, ATTACKER_IP))!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("failures from different addresses are counted separately: 4 wrong from each of 3 addresses locks none of them", async () => {
    await createTarget();
    const ips = ["203.0.113.1", "203.0.113.2", "203.0.113.3"];
    for (const ip of ips) {
      for (let i = 0; i < 4; i++) expect((await attempt(`guess-${i}`, EMAIL, ip)).status).toBe(401);
    }
    for (const ip of ips) {
      const row = await attemptRow(EMAIL, ip);
      expect(row!.failedAttempts).toBe(4);
      expect(row!.lockedUntil).toBeNull();
    }
    // The real user's own failure history (none) is untouched.
    const failuresBefore = await testDb.user.findUnique({ where: { email: EMAIL }, select: { failedLoginAttempts: true, lockedUntil: true } });
    expect(failuresBefore).toEqual({ failedLoginAttempts: 0, lockedUntil: null });
  });

  it("one address locked for one email can still sign in to a different account", async () => {
    await createTarget();
    await signup(
      buildRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: { name: "Other", email: "other@example.com", password: PASSWORD, confirmPassword: PASSWORD },
      })
    );
    for (let i = 0; i < 5; i++) await attempt(`guess-${i}`, EMAIL, ATTACKER_IP);

    expect((await attempt(PASSWORD, "other@example.com", ATTACKER_IP)).status).toBe(200);
  });

  it("the client address is the FIRST X-Forwarded-For hop; X-Real-IP is the fallback", async () => {
    await createTarget();
    await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: EMAIL, password: "wrong" },
        headers: { "x-forwarded-for": `${ATTACKER_IP}, 10.0.0.1, 10.0.0.2` },
      })
    );
    await login(
      buildRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: EMAIL, password: "wrong" },
        headers: { "x-real-ip": VICTIM_IP },
      })
    );

    expect((await attemptRow(EMAIL, ATTACKER_IP))!.failedAttempts).toBe(1);
    expect((await attemptRow(EMAIL, VICTIM_IP))!.failedAttempts).toBe(1);
    expect(await testDb.loginAttempt.count()).toBe(2);
  });

  it("changing the letter case of the email does not get a fresh set of attempts", async () => {
    await createTarget();
    const statuses: number[] = [];
    for (let i = 0; i < 3; i++) statuses.push((await attempt(`guess-${i}`, EMAIL, ATTACKER_IP)).status);
    for (let i = 0; i < 3; i++) statuses.push((await attempt(`guess-${i}`, EMAIL.toUpperCase(), ATTACKER_IP)).status);

    expect(statuses).toEqual([401, 401, 401, 401, 429, 429]);
    expect(await testDb.loginAttempt.count()).toBe(1);
  });

  it("failures older than the 15-minute window no longer count towards the limit", async () => {
    await createTarget();
    for (let i = 0; i < 4; i++) await attempt(`guess-${i}`, EMAIL, ATTACKER_IP);
    await testDb.loginAttempt.update({
      where: { email_ipAddress: { email: EMAIL, ipAddress: ATTACKER_IP } },
      data: { lastFailedAt: new Date(Date.now() - 16 * 60 * 1000) },
    });

    expect((await attempt("guess-late", EMAIL, ATTACKER_IP)).status).toBe(401);
    expect((await attemptRow(EMAIL, ATTACKER_IP))!.failedAttempts).toBe(1);
  });

  it("a failure that arrives while the pair is locked neither extends nor resets the lock", async () => {
    await createTarget();
    for (let i = 0; i < 5; i++) await attempt(`guess-${i}`, EMAIL, ATTACKER_IP);
    const before = await attemptRow(EMAIL, ATTACKER_IP);

    // Concurrent requests can pass the lock check together; drive the counter directly.
    const { recordLoginFailure, throttleKey } = await import("@/services/login-throttle.service");
    const lockedUntil = await recordLoginFailure(throttleKey(EMAIL, ATTACKER_IP));

    const after = await attemptRow(EMAIL, ATTACKER_IP);
    expect(lockedUntil!.getTime()).toBe(before!.lockedUntil!.getTime());
    expect(after!.lockedUntil!.getTime()).toBe(before!.lockedUntil!.getTime());
    expect(after!.failedAttempts).toBe(before!.failedAttempts);
  });

  it("rows untouched for more than a day are pruned on the next failed attempt; active locks are kept", async () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await testDb.loginAttempt.create({ data: { email: "stale@example.com", ipAddress: "192.0.2.1", failedAttempts: 2, lastFailedAt: old } });
    await testDb.loginAttempt.create({
      data: { email: "stillLocked@example.com", ipAddress: "192.0.2.2", failedAttempts: 5, lastFailedAt: old, lockedUntil: new Date(Date.now() + 60_000) },
    });

    await attempt("wrong", "nobody@example.com", ATTACKER_IP);

    expect(await attemptRow("stale@example.com", "192.0.2.1")).toBeNull();
    expect(await attemptRow("stillLocked@example.com", "192.0.2.2")).not.toBeNull();
  });

  it("a non-string email or password is a 401, not a 500", async () => {
    const res = await login(
      buildRequest("http://localhost/api/auth/login", { method: "POST", body: { email: { not: "a string" }, password: ["x"] } })
    );
    expect(res.status).toBe(401);
  });
});
