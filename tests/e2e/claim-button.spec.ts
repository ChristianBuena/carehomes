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
});

test("CONFIRMS BUG LIVE IN THE BROWSER: a TEAMMATE in the SAME org as the claimant sees " +
  "'Already Claimed' (disabled) instead of being able to submit a rebuttal for their own org's facility " +
  "— isClaimedByCurrentUser/isClaimedByOther in facilities/[slug]/page.tsx compare against the " +
  "individual user id, not the org id", async ({ page }) => {
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
  const claimant = await createUser({ organizationId: org.id, role: "MEMBER", email: "claimant@example.com" });
  const teammate = await createUser({ organizationId: org.id, role: "MEMBER", email: "teammate@example.com" });
  const facility = await createFacility({ organizationId: org.id, createdById: claimant.id });

  await loginAs(page, teammate);
  await page.goto(`/facilities/${facility.slug}`);

  const already = page.getByRole("button", { name: /already claimed/i });
  await expect(already).toBeVisible();
  await expect(already).toBeDisabled();
  // The header's "Submit Rebuttal" CTA (gated by canSubmit, which requires
  // isClaimedByCurrentUser) must be absent for this teammate.
  await expect(page.locator("header").getByRole("link", { name: /submit rebuttal/i })).toHaveCount(0);

  // MINOR SEPARATE FINDING: the published-rebuttals EmptyState section has its
  // own "Submit Rebuttal" CTA gated ONLY by hasActiveMembership (not
  // ownership) — see src/components/facilities/ApprovedRebuttalsSection.tsx:152.
  // It is misleading copy ("Are you the operator of this facility?") shown to
  // non-owners, but not independently exploitable: it links to
  // /dashboard/rebuttals/new, which re-scopes its facility picker to the
  // user's OWN claimed facilities (src/app/dashboard/rebuttals/new/page.tsx:24-28),
  // not the facility being viewed. Documented here, not asserted as a defect.
  await expect(page.getByRole("link", { name: /submit rebuttal/i })).toHaveCount(1);
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
