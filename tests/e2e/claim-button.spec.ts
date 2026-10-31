import { test, expect } from "@playwright/test";
import {
  resetDb,
  createOrg,
  createMembership,
  createUser,
  createFacility,
  loginAs,
} from "./fixtures";

test.beforeEach(async () => {
  await resetDb();
});

test("logged-out visitor sees the public facility page with no claim affordance for a logged-out state (redirect-to-pricing CTA)", async ({ page }) => {
  const facility = await createFacility({});
  await page.goto(`/facilities/${facility.slug}`);
  await expect(page.getByRole("link", { name: /join to claim facility/i })).toBeVisible();
});

test("member WITHOUT an active membership sees 'Join to Claim Facility'", async ({ page }) => {
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "NONE", status: "INACTIVE" });
  const user = await createUser({ organizationId: org.id, role: "MEMBER" });
  const facility = await createFacility({});

  await loginAs(page, user);
  await page.goto(`/facilities/${facility.slug}`);
  await expect(page.getByRole("link", { name: /join to claim facility/i })).toBeVisible();
  // Non-members are still invited to join from the empty rebuttals state.
  await expect(page.getByRole("link", { name: /become a member/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /submit rebuttal/i })).toHaveCount(0);
});

test("member WITH active membership, below limit, sees an enabled 'Claim Facility' button and can claim it", async ({ page }) => {
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
  const user = await createUser({ organizationId: org.id, role: "MEMBER" });
  const facility = await createFacility({});

  await loginAs(page, user);
  await page.goto(`/facilities/${facility.slug}`);
  const claimButton = page.getByRole("button", { name: /claim facility/i });
  await expect(claimButton).toBeVisible();
  await expect(claimButton).toBeEnabled();

  await claimButton.click();
  await expect(page.getByRole("link", { name: /facility claimed/i })).toBeVisible({ timeout: 10000 });
});

test("the user who already claimed the facility sees 'Facility Claimed'", async ({ page }) => {
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
  const user = await createUser({ organizationId: org.id, role: "MEMBER" });
  const facility = await createFacility({ organizationId: org.id, createdById: user.id });

  await loginAs(page, user);
  await page.goto(`/facilities/${facility.slug}`);
  await expect(page.getByRole("link", { name: /facility claimed/i })).toBeVisible();
});

test("a facility claimed by ANOTHER user shows a disabled 'Already Claimed' button", async ({ page }) => {
  const ownerOrg = await createOrg();
  await createMembership({ organizationId: ownerOrg.id, plan: "TIER_A", status: "ACTIVE" });
  const owner = await createUser({ organizationId: ownerOrg.id, role: "MEMBER" });
  const facility = await createFacility({ organizationId: ownerOrg.id, createdById: owner.id });

  const otherOrg = await createOrg();
  await createMembership({ organizationId: otherOrg.id, plan: "TIER_A", status: "ACTIVE" });
  const otherUser = await createUser({ organizationId: otherOrg.id, role: "MEMBER" });

  await loginAs(page, otherUser);
  await page.goto(`/facilities/${facility.slug}`);
  const already = page.getByRole("button", { name: /already claimed/i });
  await expect(already).toBeVisible();
  await expect(already).toBeDisabled();

  // FIXED (TEST_REPORT #12): an active member of ANOTHER org is no longer shown
  // any "Submit Rebuttal" CTA on a facility their org does not own — neither
  // the header CTA nor the published-rebuttals EmptyState CTA.
  await expect(page.getByText(/no published rebuttals for this facility yet/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /submit rebuttal/i })).toHaveCount(0);
});

test("FIXED (was CONFIRMS BUG LIVE IN THE BROWSER): a TEAMMATE in the SAME org as the claimant sees " +
  "'Facility Claimed' and the header 'Submit Rebuttal' CTA for their own org's facility " +
  "— isClaimedByCurrentUser/isClaimedByOther in facilities/[slug]/page.tsx now compare against the " +
  "org id, not the individual user id", async ({ page }) => {
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
  const claimant = await createUser({ organizationId: org.id, role: "MEMBER", email: "claimant@example.com" });
  const teammate = await createUser({ organizationId: org.id, role: "MEMBER", email: "teammate@example.com" });
  const facility = await createFacility({ organizationId: org.id, createdById: claimant.id });

  await loginAs(page, teammate);
  await page.goto(`/facilities/${facility.slug}`);

  // Not locked out any more: no disabled "Already Claimed" button...
  await expect(page.getByRole("button", { name: /already claimed/i })).toHaveCount(0);
  // ...the teammate sees the same owner state as the claimant...
  await expect(page.getByRole("link", { name: /facility claimed/i })).toBeVisible();
  // ...and the header's "Submit Rebuttal" CTA (gated by canSubmit, which
  // requires isClaimedByCurrentUser) is now present.
  const headerCta = page.locator("header").getByRole("link", { name: /submit rebuttal/i });
  await expect(headerCta).toHaveCount(1);
  await expect(headerCta).toHaveAttribute("href", "/dashboard/rebuttals/new");

  // Header CTA + the published-rebuttals EmptyState CTA (see
  // src/components/facilities/ApprovedRebuttalsSection.tsx) — both are gated
  // on the viewer's org owning the facility.
  await expect(page.getByRole("link", { name: /submit rebuttal/i })).toHaveCount(2);

  // The CTA is not a dead end: the new-rebuttal form offers the org's facility
  // to the teammate even though they did not personally claim it.
  await page.goto("/dashboard/rebuttals/new");
  await expect(page.locator("select[name='facilityId'] option", { hasText: facility.name })).toHaveCount(1);
});

test("member at their tier's facility limit sees a disabled 'Limit Reached' button on an unclaimed facility", async ({ page }) => {
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
  const user = await createUser({ organizationId: org.id, role: "MEMBER" });
  await createFacility({ organizationId: org.id, createdById: user.id }); // uses up the TIER_A limit of 1
  const unclaimedFacility = await createFacility({});

  await loginAs(page, user);
  await page.goto(`/facilities/${unclaimedFacility.slug}`);
  const limitReached = page.getByRole("button", { name: /limit reached/i });
  await expect(limitReached).toBeVisible();
  await expect(limitReached).toBeDisabled();
});

test("a SOFT-DELETED facility does not count toward the limit in the UI: a TIER_A org whose only facility " +
  "is soft-deleted sees an enabled 'Claim Facility' button (not 'Limit Reached') and the claim succeeds", async ({ page }) => {
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_A", status: "ACTIVE" });
  const user = await createUser({ organizationId: org.id, role: "MEMBER" });
  await createFacility({ organizationId: org.id, createdById: user.id, deletedAt: new Date().toISOString() });
  const unclaimedFacility = await createFacility({});

  await loginAs(page, user);
  await page.goto(`/facilities/${unclaimedFacility.slug}`);
  await expect(page.getByRole("button", { name: /limit reached/i })).toHaveCount(0);
  const claimButton = page.getByRole("button", { name: /claim facility/i });
  await expect(claimButton).toBeEnabled();

  await claimButton.click();
  await expect(page.getByRole("link", { name: /facility claimed/i })).toBeVisible({ timeout: 10000 });
});

test("a TEAMMATE sees the org's facilities on the dashboard pages too: 'My Facilities' list and quota, " +
  "the dashboard owned-count, and the redaction-form picker are scoped to the organization, not the claiming user", async ({ page }) => {
  // Three dashboard routes compile cold on the dev server in this one test.
  test.setTimeout(120000);
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
  const claimant = await createUser({ organizationId: org.id, role: "MEMBER", email: "claimant@example.com" });
  const teammate = await createUser({ organizationId: org.id, role: "MEMBER", email: "teammate@example.com" });
  const facility = await createFacility({ organizationId: org.id, createdById: claimant.id, name: "Org Owned Home" });
  // Another org's facility must never show up.
  const otherOrg = await createOrg();
  const outsider = await createUser({ organizationId: otherOrg.id, role: "MEMBER" });
  await createFacility({ organizationId: otherOrg.id, createdById: outsider.id, name: "Someone Elses Home" });

  await loginAs(page, teammate);

  await page.goto("/dashboard/facilities");
  await expect(page.getByText(facility.name)).toBeVisible();
  await expect(page.getByText("Someone Elses Home")).toHaveCount(0);
  await expect(page.getByText(/1 of 3 facility slots used/i)).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText(/1 Owned/)).toBeVisible();

  await page.goto("/dashboard/forms/redaction");
  const options = page.locator("select[name='facilityId'] option");
  await expect(options.filter({ hasText: facility.name })).toHaveCount(1);
  await expect(options.filter({ hasText: "Someone Elses Home" })).toHaveCount(0);
});
