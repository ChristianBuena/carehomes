/**
 * SOW 11.3 secure sharing: a new attorney share link always expires.
 * The dialog offers 7 or 30 days only (no "No expiry"), and the created link
 * has an expiry date at most 30 days ahead.
 */
import { test, expect } from "@playwright/test";
import { resetDb, createOrg, createMembership, createUser, createMemberFile, loginAs, listShareLinks } from "./fixtures";

test.beforeEach(async () => {
  await resetDb();
});

test("the share dialog offers 7 and 30 days only, and the link it creates expires", async ({ page }) => {
  test.setTimeout(120000);
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
  const member = await createUser({ organizationId: org.id, role: "MEMBER" });
  await createMemberFile({ userId: member.id, filename: "inspection.pdf" });

  await loginAs(page, member);
  await page.goto("/dashboard/files");
  const visible = { visible: true } as const;
  await page.getByRole("button", { name: "Share all files" }).filter(visible).click();

  await expect(page.getByRole("button", { name: "7 days" })).toBeVisible();
  await expect(page.getByRole("button", { name: "30 days" })).toBeVisible();
  await expect(page.getByRole("button", { name: "No expiry" })).toHaveCount(0);

  await page.getByRole("button", { name: "30 days" }).click();
  await page.getByRole("button", { name: "Generate Link" }).click();
  await expect(page.getByText("Share Link Created!")).toBeVisible();

  const links = await listShareLinks(member.id);
  expect(links).toHaveLength(1);
  expect(links[0].expiry).toBe("DAYS_30");
  const days = (new Date(links[0].expiresAt!).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  expect(days).toBeGreaterThan(29);
  expect(days).toBeLessThanOrEqual(30.1);
});
