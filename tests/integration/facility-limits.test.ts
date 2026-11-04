import { describe, it, expect, beforeEach, afterAll } from "vitest";
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
import { POST as claimViaApi } from "@/app/api/facility/route";

beforeEach(resetDb);
afterAll(disconnectDb);

// The claimFacility SERVER ACTION is exercised for real (with @/lib/auth mocked)
// in tests/integration/claim-action.test.ts. This file covers the API route
// (/api/facility POST), which is a *different* operation — it creates a new
// Facility row rather than claiming an existing public one — see TEST_REPORT.md.

describe("API route POST /api/facility — tier boundary (claim = create a facility)", () => {
  async function setup(plan: "NONE" | "TIER_A" | "TIER_B" | "TIER_C", existingFacilities: number) {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan, status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    for (let i = 0; i < existingFacilities; i++) {
      await createFacility({ organizationId: org.id, createdById: user.id });
    }
    return { org, user };
  }

  it("TIER_A at count 0 (limit 1): allowed", async () => {
    const { user } = await setup("TIER_A", 0);
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "New Facility", address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(201);
  });

  it("TIER_A at count 1 (at limit): blocked with 403 'Facility limit reached'", async () => {
    const { user } = await setup("TIER_A", 1);
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "New Facility", address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/Facility limit reached/);
  });

  it("TIER_B at count 2 (limit 3): allowed", async () => {
    const { user } = await setup("TIER_B", 2);
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "New Facility", address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(201);
  });

  it("TIER_B at count 3 (at limit): blocked", async () => {
    const { user } = await setup("TIER_B", 3);
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "New Facility", address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(403);
  });

  it("TIER_C at count 9 (limit 10): allowed; at count 10: blocked", async () => {
    const { user: userBelow } = await setup("TIER_C", 9);
    const allowed = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "New Facility", address: "1 Main St" },
        cookies: await authCookie(userBelow),
      })
    );
    expect(allowed.status).toBe(201);

    const { user: userAt } = await setup("TIER_C", 10);
    const blocked = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "New Facility", address: "1 Main St" },
        cookies: await authCookie(userAt),
      })
    );
    expect(blocked.status).toBe(403);
  });

  it("NONE plan: always blocked even at count 0", async () => {
    const { user } = await setup("NONE", 0);
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "New Facility", address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(403);
  });

  it("no membership row at all: blocked with 403, not a crash", async () => {
    const org = await createOrg();
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "New Facility", address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(403);
  });

  for (const status of ["INACTIVE", "PAST_DUE", "CANCELED"] as const) {
    it(`membership status ${status} (non-ACTIVE): blocked with 403`, async () => {
      const org = await createOrg();
      await createMembership({ organizationId: org.id, plan: "TIER_C", status });
      const user = await createUser({ organizationId: org.id, role: "MEMBER" });
      const res = await claimViaApi(
        buildRequest("http://localhost/api/facility", {
          method: "POST",
          body: { name: "New Facility", address: "1 Main St" },
          cookies: await authCookie(user),
        })
      );
      expect(res.status).toBe(403);
    });
  }

  it("missing name returns 400", async () => {
    const { user } = await setup("TIER_C", 0);
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(400);
  });

  it("missing address returns 400", async () => {
    const { user } = await setup("TIER_C", 0);
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "No Address Facility" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(400);
  });

  it("MODERATOR role lacks claim_facility permission: 403", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_C", status: "ACTIVE" });
    const mod = await createUser({ organizationId: org.id, role: "MODERATOR" });
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "X", address: "Y" },
        cookies: await authCookie(mod),
      })
    );
    expect(res.status).toBe(403);
  });

  it("no token at all: 401", async () => {
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "X", address: "Y" },
      })
    );
    expect(res.status).toBe(401);
  });
});

describe("Organization / multi-seat facility quota sharing", () => {
  it("two users in the same org share one facility count: after org is at its TIER_A limit of 1, a SECOND user in that org is also blocked", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
    const userA = await createUser({ organizationId: org.id, role: "MEMBER", email: "a@org.com" });
    const userB = await createUser({ organizationId: org.id, role: "MEMBER", email: "b@org.com" });

    const firstClaim = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "Facility One", address: "1 Main St" },
        cookies: await authCookie(userA),
      })
    );
    expect(firstClaim.status).toBe(201);

    // userB is a DIFFERENT person in the SAME org — the org is now at its limit of 1.
    const secondClaim = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "Facility Two", address: "2 Main St" },
        cookies: await authCookie(userB),
      })
    );
    expect(secondClaim.status).toBe(403);
  });

  it("a user in a DIFFERENT org is not affected by the first org's count", async () => {
    const orgA = await createOrg();
    await createMembership({ organizationId: orgA.id, plan: "TIER_A", status: "ACTIVE" });
    const userA = await createUser({ organizationId: orgA.id, role: "MEMBER" });
    await createFacility({ organizationId: orgA.id, createdById: userA.id }); // orgA now at its limit of 1

    const orgB = await createOrg();
    await createMembership({ organizationId: orgB.id, plan: "TIER_A", status: "ACTIVE" });
    const userB = await createUser({ organizationId: orgB.id, role: "MEMBER" });

    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "Org B Facility", address: "1 Elsewhere St" },
        cookies: await authCookie(userB),
      })
    );
    expect(res.status).toBe(201); // orgB's own (empty) count, unaffected by orgA
  });

  it("a user with no organizationId does not crash the route and is cleanly denied", async () => {
    const user = await createUser({ organizationId: null, role: "MEMBER" });
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "X", address: "Y" },
        cookies: await authCookie(user),
      })
    );
    // prisma.membership.findUnique({ where: { organizationId: "" } }) finds nothing -> 403, not a 500.
    expect(res.status).toBe(403);
    expect(res.status).not.toBe(500);
  });

  it("Facility stores both createdById (who physically claimed) and organizationId (quota owner)", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "Attributed Facility", address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    expect(res.status).toBe(201);
    const facility = await res.json();
    expect(facility.createdById).toBe(user.id);
    expect(facility.organizationId).toBe(org.id);
  });
});

describe("Soft-deleted facilities excluded from the API route's quota count", () => {
  it("API route /api/facility excludes soft-deleted facilities from the quota count", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });
    // One facility already claimed, then soft-deleted.
    await createFacility({ organizationId: org.id, createdById: user.id, deletedAt: new Date() });

    const res = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "Replacement Facility", address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    // The API route filters deletedAt: null in its count, so this org is still at 0/1 and allowed.
    expect(res.status).toBe(201);
  });
});

describe("Unique slug behavior", () => {
  it("createFacility() generates distinct slugs for facilities with the same name", async () => {
    const org = await createOrg();
    await createMembership({ organizationId: org.id, plan: "TIER_C", status: "ACTIVE" });
    const user = await createUser({ organizationId: org.id, role: "MEMBER" });

    const res1 = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "Same Name Facility", address: "1 Main St" },
        cookies: await authCookie(user),
      })
    );
    const res2 = await claimViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "Same Name Facility", address: "2 Main St" },
        cookies: await authCookie(user),
      })
    );
    // Second claim is blocked by the TIER_C limit? No — TIER_C allows up to 10, so both succeed.
    const f1 = await res1.json();
    const f2 = await res2.json();
    expect(f1.slug).not.toBe(f2.slug);
  });
});

describe("Race condition: concurrent claims when org is one slot below its limit (FIXED)", () => {
  it("FIXED (was CONFIRMED BUG, 13/15 trials over limit): across 20 trials, two concurrent requests from " +
     "the same TIER_A (limit 1) org NEVER both succeed — the limit check and the insert in " +
     "/api/facility POST now run under a SELECT ... FOR UPDATE lock on the Organization row, so " +
     "exactly one request gets 201 and the other gets 403 'Facility limit reached'.", async () => {
    const TRIALS = 20;
    let overrunCount = 0;
    const outcomes: { statuses: number[]; finalCount: number }[] = [];

    for (let i = 0; i < TRIALS; i++) {
      const org = await createOrg();
      await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
      const userA = await createUser({ organizationId: org.id, role: "MEMBER", email: `race-a-${i}@example.com` });
      const userB = await createUser({ organizationId: org.id, role: "MEMBER", email: `race-b-${i}@example.com` });

      const [resA, resB] = await Promise.all([
        claimViaApi(
          buildRequest("http://localhost/api/facility", {
            method: "POST",
            body: { name: `Race Facility A ${i}`, address: "1 Main St" },
            cookies: await authCookie(userA),
          })
        ),
        claimViaApi(
          buildRequest("http://localhost/api/facility", {
            method: "POST",
            body: { name: `Race Facility B ${i}`, address: "2 Main St" },
            cookies: await authCookie(userB),
          })
        ),
      ]);

      const finalCount = await testDb.facility.count({ where: { organizationId: org.id, deletedAt: null } });
      const statuses = [resA.status, resB.status].sort();
      outcomes.push({ statuses, finalCount });
      if (finalCount > 1) overrunCount += 1;

      const loser = resA.status === 403 ? resA : resB;
      expect((await loser.json()).error).toMatch(/limit reached/i);
    }

    // Print the result so it shows up in CI logs.
    console.log(
      `[race-condition] org limit exceeded in ${overrunCount}/${TRIALS} trials. ` +
        `Sample outcomes: ${JSON.stringify(outcomes.slice(0, 5))}`
    );

    // Every trial must end at exactly 1 facility: never 2 (over-admitted) and
    // never 0 (both rejected / a write lost), with one 201 and one 403.
    for (const o of outcomes) {
      expect(o.finalCount).toBe(1);
      expect(o.statuses).toEqual([201, 403]);
    }
    expect(overrunCount).toBe(0);
  }, 60000);

  it("8 concurrent requests against a TIER_B org (limit 3) with 1 facility already claimed: " +
     "exactly 2 succeed, 6 are rejected, final count is exactly 3 — across 15 trials", async () => {
    const TRIALS = 15;
    const CONCURRENCY = 8;
    let overrunCount = 0;
    const finalCounts: number[] = [];

    for (let i = 0; i < TRIALS; i++) {
      const org = await createOrg();
      await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
      const users = await Promise.all(
        Array.from({ length: CONCURRENCY }, (_, n) =>
          createUser({ organizationId: org.id, role: "MEMBER", email: `burst-${i}-${n}@example.com` })
        )
      );
      await createFacility({ organizationId: org.id, createdById: users[0].id });
      const cookies = await Promise.all(users.map((u) => authCookie(u)));

      const responses = await Promise.all(
        users.map((_, n) =>
          claimViaApi(
            buildRequest("http://localhost/api/facility", {
              method: "POST",
              body: { name: `Burst Facility ${i}-${n}`, address: `${n} Main St` },
              cookies: cookies[n],
            })
          )
        )
      );

      const finalCount = await testDb.facility.count({ where: { organizationId: org.id, deletedAt: null } });
      finalCounts.push(finalCount);
      if (finalCount > 3) overrunCount += 1;

      const statuses = responses.map((r) => r.status);
      expect(statuses.filter((st) => st === 201)).toHaveLength(2);
      expect(statuses.filter((st) => st === 403)).toHaveLength(CONCURRENCY - 2);
      expect(finalCount).toBe(3);
    }

    console.log(
      `[race-condition] ${CONCURRENCY}-way burst: org limit exceeded in ${overrunCount}/${TRIALS} trials. ` +
        `Final counts: ${JSON.stringify(finalCounts)}`
    );
    expect(overrunCount).toBe(0);
  }, 60000);

  it("the lock is per-organization: two DIFFERENT orgs claiming concurrently both succeed", async () => {
    const setups = await Promise.all(
      [0, 1].map(async (n) => {
        const org = await createOrg();
        await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
        const user = await createUser({ organizationId: org.id, role: "MEMBER", email: `iso-${n}@example.com` });
        return { org, cookies: await authCookie(user) };
      })
    );

    const responses = await Promise.all(
      setups.map((st, n) =>
        claimViaApi(
          buildRequest("http://localhost/api/facility", {
            method: "POST",
            body: { name: `Independent Facility ${n}`, address: "1 Main St" },
            cookies: st.cookies,
          })
        )
      )
    );
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
  });
});
