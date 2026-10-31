/** SOW 12.2 / 12.3: the admin reports page renders the KPIs; others are sent away. */
import { test, expect } from "@playwright/test";
import { resetDb, createOrg, createMembership, createUser, createFacility, createRebuttal, loginAs } from "./fixtures";

test.beforeEach(async () => {
  await resetDb();
});

test("an ADMIN sees turnaround and revision-cycle figures with CSV downloads", async ({ page }) => {
  test.setTimeout(90000);
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
  const member = await createUser({ organizationId: org.id });
  const facility = await createFacility({ organizationId: org.id, createdById: member.id });
  await createRebuttal({ userId: member.id, facilityId: facility.id });
  await createRebuttal({ userId: member.id, facilityId: facility.id });
  const admin = await createUser({ role: "ADMIN" });

  await loginAs(page, admin);
  await page.goto("/dashboard/reports");
  const visible = { visible: true } as const;
  await expect(page.getByRole("heading", { name: "Turnaround (SOW 12.2)" }).filter(visible)).toBeVisible();
  const submitted = page.locator("dt", { hasText: /^Submitted$/ }).filter(visible).locator("xpath=following-sibling::dd");
  await expect(submitted).toHaveText("2");
  await expect(page.getByRole("link", { name: "Download revision-cycle CSV" }).filter(visible)).toHaveAttribute(
    "href",
    "/api/admin/reports/kpi?report=revisions&format=csv"
  );
  const csv = await page.request.get("/api/admin/reports/kpi?report=revisions&format=csv");
  expect(csv.status()).toBe(200);
});

test("a MODERATOR is redirected away from reports", async ({ page }) => {
  const moderator = await createUser({ role: "MODERATOR" });
  await loginAs(page, moderator);
  await page.goto("/dashboard/reports");
  await expect(page).toHaveURL(/\/dashboard$/);
});
