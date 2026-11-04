import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

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
import { setRequestCookies, clearRequestContext } from "../helpers/nextRequestContext";
import { POST as submitViaApi } from "@/app/api/rebuttal/route";
import { GET as getRebuttalById } from "@/app/api/rebuttal/[id]/route";
import { POST as createFacilityViaApi } from "@/app/api/facility/route";
import { claimFacility } from "@/app/actions/claimFacility";
import { submitRebuttal } from "@/app/actions/rebuttals";
import { getUserFromRequest, resolveSessionUser } from "@/lib/auth";

beforeEach(async () => {
  await resetDb();
  clearRequestContext();
  vi.clearAllMocks();
});
afterAll(disconnectDb);

/**
 * Two orgs, each with an active membership and one facility. `mover` starts in
 * org A and `oldToken` is the session cookie issued while they were there.
 */
async function setup() {
  const orgA = await createOrg({ name: "Org A" });
  const orgB = await createOrg({ name: "Org B" });
  await createMembership({ organizationId: orgA.id, plan: "TIER_B", status: "ACTIVE" });
  await createMembership({ organizationId: orgB.id, plan: "TIER_B", status: "ACTIVE" });

  const colleagueA = await createUser({ organizationId: orgA.id, role: "MEMBER" });
  const mover = await createUser({ organizationId: orgA.id, role: "MEMBER" });
  const facilityA = await createFacility({ organizationId: orgA.id, createdById: colleagueA.id });
  const facilityB = await createFacility({ organizationId: orgB.id });

  // Issued while the user is still in org A — carries orgId = orgA.id for 7 days.
  const oldToken = await authCookie(mover);

  return { orgA, orgB, colleagueA, mover, facilityA, facilityB, oldToken };
}

function submit(cookies: Record<string, string>, facilityId: string) {
  return submitViaApi(
    buildRequest("http://localhost/api/rebuttal", {
      method: "POST",
      body: { title: "T", content: "C", facilityId },
      cookies,
    })
  );
}

describe("Stale orgId — ownership checks use the user's CURRENT organization (FIXED)", () => {
  it("sanity: before the move, the token grants access to org A's facility", async () => {
    const { facilityA, oldToken } = await setup();
    expect((await submit(oldToken, facilityA.id)).status).toBe(200);
  });

  it("after the user is moved to org B, the OLD token no longer lets them submit a rebuttal for org A's facility", async () => {
    const { orgB, mover, facilityA, oldToken } = await setup();
    await testDb.user.update({ where: { id: mover.id }, data: { organizationId: orgB.id } });

    const res = await submit(oldToken, facilityA.id);
    expect(res.status).toBe(403);
    expect(await testDb.rebuttal.count()).toBe(0);
  });

  it("after the move, the OLD token no longer lets them read another seat's rebuttal on org A's facility", async () => {
    const { orgB, colleagueA, mover, facilityA, oldToken } = await setup();
    const rebuttal = await createRebuttal({ userId: colleagueA.id, facilityId: facilityA.id });

    const read = () =>
      getRebuttalById(
        buildRequest(`http://localhost/api/rebuttal/${rebuttal.id}`, { cookies: oldToken }),
        { params: Promise.resolve({ id: rebuttal.id }) }
      );

    expect((await read()).status).toBe(200);
    await testDb.user.update({ where: { id: mover.id }, data: { organizationId: orgB.id } });
    expect((await read()).status).toBe(403);
  });

  it("after the move, the OLD token grants access to the NEW org (no re-login needed)", async () => {
    const { orgB, mover, facilityB, oldToken } = await setup();
    expect((await submit(oldToken, facilityB.id)).status).toBe(403);

    await testDb.user.update({ where: { id: mover.id }, data: { organizationId: orgB.id } });
    expect((await submit(oldToken, facilityB.id)).status).toBe(200);
  });

  it("after the move, POST /api/facility with the OLD token creates the facility under the NEW org", async () => {
    const { orgA, orgB, mover, oldToken } = await setup();
    await testDb.user.update({ where: { id: mover.id }, data: { organizationId: orgB.id } });

    const res = await createFacilityViaApi(
      buildRequest("http://localhost/api/facility", {
        method: "POST",
        body: { name: "Moved Facility", address: "1 New Org Way" },
        cookies: oldToken,
      })
    );
    expect(res.status).toBeLessThan(300);

    const created = await testDb.facility.findFirst({ where: { name: "Moved Facility" } });
    expect(created?.organizationId).toBe(orgB.id);
    expect(created?.organizationId).not.toBe(orgA.id);
  });

  it("after the move, claimFacility() with the OLD token claims for the NEW org, never the old one", async () => {
    const { orgA, orgB, mover, oldToken } = await setup();
    const unclaimed = await createFacility({});
    await testDb.user.update({ where: { id: mover.id }, data: { organizationId: orgB.id } });

    setRequestCookies(oldToken);
    const result = await claimFacility(unclaimed.id);
    expect(result.success).toBe(true);

    const after = await testDb.facility.findUnique({ where: { id: unclaimed.id } });
    expect(after?.organizationId).toBe(orgB.id);
    expect(after?.organizationId).not.toBe(orgA.id);
  });

  it("after the move, submitRebuttal() with the OLD token is refused for org A's facility", async () => {
    const { orgB, mover, facilityA, oldToken } = await setup();
    await testDb.user.update({ where: { id: mover.id }, data: { organizationId: orgB.id } });

    const form = new FormData();
    form.append("title", "T");
    form.append("facilityId", facilityA.id);
    form.append("content", "C");
    form.append("redactionAcknowledged", "on");

    setRequestCookies(oldToken);
    expect(await submitRebuttal(form)).toEqual({
      success: false,
      error: expect.stringMatching(/only submit rebuttals for facilities your organization owns/i),
    });
    expect(await testDb.rebuttal.count()).toBe(0);
  });

  it("a user REMOVED from their org (organizationId = null) loses access with the old token", async () => {
    const { mover, facilityA, oldToken } = await setup();
    await testDb.user.update({ where: { id: mover.id }, data: { organizationId: null } });

    expect((await submit(oldToken, facilityA.id)).status).toBe(403);

    setRequestCookies(oldToken);
    expect((await getUserFromRequest())?.orgId).toBe("");
  });

  it("a user with NO org who is linked to one gets access immediately, with the token issued before the link", async () => {
    const { orgA, facilityA } = await setup();
    const seat = await createUser({ organizationId: null, role: "MEMBER" });
    const tokenBeforeLink = await authCookie(seat); // orgId = ""

    expect((await submit(tokenBeforeLink, facilityA.id)).status).toBe(403);

    await testDb.user.update({ where: { id: seat.id }, data: { organizationId: orgA.id } });
    expect((await submit(tokenBeforeLink, facilityA.id)).status).toBe(200);
  });

  it("a valid token for a user that no longer exists is rejected (401 / null), not treated as org-less", async () => {
    const { mover, facilityA, oldToken } = await setup();
    await testDb.user.delete({ where: { id: mover.id } });

    expect((await submit(oldToken, facilityA.id)).status).toBe(401);
    expect(await resolveSessionUser(oldToken["auth-token"])).toBeNull();

    setRequestCookies(oldToken);
    expect(await getUserFromRequest()).toBeNull();
  });

  it("getUserFromRequest() reports the database orgId, not the one in the token", async () => {
    const { orgA, orgB, mover, oldToken } = await setup();
    setRequestCookies(oldToken);
    expect((await getUserFromRequest())?.orgId).toBe(orgA.id);

    await testDb.user.update({ where: { id: mover.id }, data: { organizationId: orgB.id } });
    expect((await getUserFromRequest())?.orgId).toBe(orgB.id);
  });
});

describe("Stale orgId — static guard", () => {
  // Any file that reads `.orgId` must get its user from "@/lib/auth" (database
  // backed), never straight from verifyToken() (token backed, up to 7 days stale).
  it("no source file reads .orgId off a user obtained from verifyToken()", () => {
    const SRC = path.resolve(__dirname, "..", "..", "src");
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "generated") walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        const rel = path.relative(SRC, full);
        if (rel === path.join("lib", "auth.ts") || rel === path.join("lib", "jwt.ts")) continue;

        const text = fs.readFileSync(full, "utf8");
        if (/\.orgId\b/.test(text) && /\bverifyToken\s*\(/.test(text)) offenders.push(rel);
      }
    };
    walk(SRC);

    expect(offenders).toEqual([]);
  });
});
