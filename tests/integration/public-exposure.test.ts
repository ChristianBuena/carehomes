/**
 * Release blockers S-1 and S-2 (docs/RELEASE_READINESS.md): every PUBLIC
 * (no login) API route is called anonymously against a world seeded with
 * sentinel values, and the raw response text must contain none of them:
 *
 *   - a user email address
 *   - a password hash
 *   - an original document URL (rebuttal.documentUrl)
 *   - a watermarked document (rebuttal.watermarkedUrl)
 *   - internal owner ids (user id, organization id)
 *
 * Public pages are covered by tests/e2e/public-exposure.spec.ts.
 *
 * Deliberately not in this list: GET /api/share/[token]. It is public, but
 * its purpose is to hand a member's chosen files to the attorney who holds
 * the link, so it must return file URLs. It is checked here for emails and
 * password hashes only.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  resetDb,
  testDb,
  disconnectDb,
  createOrg,
  createMembership,
  createUser,
  createFacility,
  createRebuttal,
  createMemberFile,
  createShareLink,
} from "../helpers/db";
import { buildRequest } from "../helpers/http";
import { GET as listFacilities } from "@/app/api/facility/route";
import { GET as getFacility } from "@/app/api/facility/[id]/route";
import { GET as getPublished } from "@/app/api/rebuttal/published/route";
import { GET as getRebuttal } from "@/app/api/rebuttal/[id]/route";
import { GET as getWatermark } from "@/app/api/rebuttal/watermark/route";
import { GET as getShare } from "@/app/api/share/[token]/route";
import { POST as postTakedown } from "@/app/api/takedown/route";

const EMAIL = "sentinel-claimant@private.example";
const PASSWORD_HASH = "$2b$10$SENTINELPASSWORDHASHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const ORIGINAL_URL = "https://res.cloudinary.test/carehomes_rebuttals/SENTINEL-ORIGINAL.pdf";
const WATERMARKED_URL = "data:application/pdf;base64,SENTINELWATERMARK";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

async function world() {
  const org = await createOrg({ name: "Sentinel Org" });
  await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
  const user = await createUser({
    organizationId: org.id,
    role: "MEMBER",
    email: EMAIL,
    name: "Sentinel Claimant",
    password: PASSWORD_HASH,
  });
  const facility = await createFacility({ organizationId: org.id, createdById: user.id });
  const approved = await createRebuttal({ userId: user.id, facilityId: facility.id, status: "APPROVED", title: "Approved sentinel rebuttal" });
  const pending = await createRebuttal({ userId: user.id, facilityId: facility.id, status: "PENDING" });
  for (const r of [approved, pending]) {
    await testDb.rebuttal.update({
      where: { id: r.id },
      data: { documentUrl: ORIGINAL_URL, watermarkedUrl: WATERMARKED_URL },
    });
  }
  return { org, user, facility, approved, pending };
}

type World = Awaited<ReturnType<typeof world>>;

function expectClean(text: string, w: World, opts: { allowIds?: boolean } = {}) {
  expect(text).not.toContain(EMAIL);
  expect(text).not.toContain(PASSWORD_HASH);
  expect(text).not.toContain("SENTINELPASSWORDHASH");
  expect(text).not.toContain(ORIGINAL_URL);
  expect(text).not.toContain("SENTINEL-ORIGINAL");
  expect(text).not.toContain("SENTINELWATERMARK");
  expect(text).not.toContain("data:application/pdf");
  if (!opts.allowIds) {
    expect(text).not.toContain(w.user.id);
    expect(text).not.toContain(w.org.id);
  }
}

describe("Public API routes leak no email, password hash, document URL or owner id (release blockers S-1, S-2)", () => {
  it("GET /api/facility (directory list)", async () => {
    const w = await world();
    const res = await listFacilities();
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain(w.facility.id);
    expectClean(text, w);
    expect(text).not.toContain("Sentinel Claimant");
  });

  it("GET /api/facility/[id]", async () => {
    const w = await world();
    const res = await getFacility(buildRequest(`http://localhost/api/facility/${w.facility.id}`), {
      params: Promise.resolve({ id: w.facility.id }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain(w.facility.id);
    expectClean(text, w);
    expect(text).not.toContain("Sentinel Claimant");
  });

  it("GET /api/rebuttal/published returns approved TEXT only", async () => {
    const w = await world();
    const res = await getPublished();
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain(w.approved.id);
    expect(text).toContain("Approved sentinel rebuttal");
    expect(text).not.toContain(w.pending.id);
    expectClean(text, w);
    const [row] = JSON.parse(text) as Array<Record<string, unknown>>;
    expect(Object.keys(row).sort()).toEqual(["content", "createdAt", "facility", "id", "title", "updatedAt"]);
  });

  it("GET /api/rebuttal/[id] refuses anonymous callers for approved and pending rebuttals", async () => {
    const w = await world();
    for (const r of [w.approved, w.pending]) {
      const res = await getRebuttal(buildRequest(`http://localhost/api/rebuttal/${r.id}`), {
        params: Promise.resolve({ id: r.id }),
      });
      expect(res.status).toBe(401);
      expectClean(await res.text(), w);
    }
  });

  it("GET /api/rebuttal/watermark refuses anonymous callers for approved and pending rebuttals", async () => {
    const w = await world();
    for (const r of [w.approved, w.pending]) {
      const res = await getWatermark(buildRequest(`http://localhost/api/rebuttal/watermark?rebuttalId=${r.id}`));
      expect(res.status).toBe(403);
      expectClean(await res.text(), w);
    }
  });

  it("POST /api/takedown (public intake form) echoes no account data", async () => {
    const w = await world();
    const res = await postTakedown(
      buildRequest("http://localhost/api/takedown", {
        method: "POST",
        body: {
          requesterName: "Concerned Person",
          requesterEmail: "requester@example.com",
          facilityOrRebuttal: w.facility.name,
          reason: "PRIVACY_PII_PHI",
          supportingInfo: "This rebuttal mentions a resident by name.",
          rebuttalId: w.approved.id,
        },
      })
    );
    expect([200, 201]).toContain(res.status);
    expectClean(await res.text(), w);
  });

  it("GET /api/share/[token] (attorney link) returns the shared file but no email or password hash", async () => {
    const w = await world();
    const file = await createMemberFile({ userId: w.user.id, filename: "shared.pdf" });
    const link = await createShareLink({ userId: w.user.id, fileIds: [file.id] });
    const res = await getShare(buildRequest(`http://localhost/api/share/${link.token}`), {
      params: Promise.resolve({ token: link.token }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("shared.pdf");
    expect(text).not.toContain(EMAIL);
    expect(text).not.toContain("SENTINELPASSWORDHASH");
    expect(text).not.toContain(ORIGINAL_URL);
  });
});
