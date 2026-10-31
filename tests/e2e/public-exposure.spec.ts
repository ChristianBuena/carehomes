/**
 * Release blockers S-1 and S-2 (docs/RELEASE_READINESS.md), page level.
 *
 * Every public page is fetched logged-out and the RAW HTML is checked. The raw
 * HTML includes the serialized React Server Component payload, so a value
 * passed to a client component (even one that is never displayed) shows up
 * here. The API routes are covered in tests/integration/public-exposure.test.ts.
 */
import { test, expect } from "@playwright/test";
import {
  resetDb,
  createOrg,
  createMembership,
  createUser,
  createFacility,
  createRebuttal,
  setRebuttalDocs,
} from "./fixtures";

test.describe.configure({ timeout: 180000 });

const EMAIL = "sentinel-claimant@private.example";
const PASSWORD_HASH = "$2b$10$SENTINELPASSWORDHASHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const ORIGINAL_URL = "https://res.cloudinary.test/carehomes_rebuttals/SENTINEL-ORIGINAL.pdf";
const WATERMARKED_URL = "data:application/pdf;base64,SENTINELWATERMARK";

const STATIC_PUBLIC_PAGES = [
  "/",
  "/facilities",
  "/providers",
  "/providers/independent",
  "/independent-providers",
  "/pricing",
  "/how-it-works",
  "/membership-guide",
  "/sow-guide",
  "/planned-ai-support",
  "/contact",
  "/about",
  "/about/logo",
  "/logo",
  "/disclaimer",
  "/privacy",
  "/terms",
  "/takedown-policy",
  "/redaction-policy",
];

function expectClean(html: string, ids: string[]) {
  expect(html).not.toContain(EMAIL);
  expect(html).not.toContain("SENTINELPASSWORDHASH");
  expect(html).not.toContain("SENTINEL-ORIGINAL");
  expect(html).not.toContain("SENTINELWATERMARK");
  for (const id of ids) expect(html).not.toContain(id);
}

test("no public page leaks an email, password hash, document URL or owner id", async ({ request }) => {
  await resetDb();
  const org = await createOrg({ name: "Sentinel Org" });
  await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
  const user = await createUser({
    organizationId: org.id,
    role: "MEMBER",
    email: EMAIL,
    name: "Sentinel Claimant",
    password: PASSWORD_HASH,
  });
  // "AAA" so it sorts onto the first directory page.
  const facility = await createFacility({ organizationId: org.id, createdById: user.id, name: "AAA Sentinel Facility" });
  const rebuttal = await createRebuttal({ userId: user.id, facilityId: facility.id, status: "APPROVED", title: "Approved sentinel rebuttal" });
  await setRebuttalDocs(rebuttal.id, ORIGINAL_URL, WATERMARKED_URL);

  const ownerIds = [user.id, org.id];

  // The facility page must still show the approved TEXT, just no document.
  const detail = await request.get(`/facilities/${facility.slug}`);
  expect(detail.status()).toBe(200);
  const detailHtml = await detail.text();
  expect(detailHtml).toContain("Approved sentinel rebuttal");
  expect(detailHtml).not.toContain("View Redacted Document");
  expectClean(detailHtml, ownerIds);

  const directory = await request.get("/facilities");
  expect(directory.status()).toBe(200);
  const directoryHtml = await directory.text();
  expect(directoryHtml).toContain("AAA Sentinel Facility");
  expectClean(directoryHtml, ownerIds);

  for (const path of STATIC_PUBLIC_PAGES) {
    const res = await request.get(path);
    expect(res.status(), path).toBeLessThan(400);
    expectClean(await res.text(), ownerIds);
  }
});
