/**
 * SOW 11.1: a MODERATOR can run the quarterly access review in the real app.
 * Before, the page loaded but its API calls hit the Proxy's /api/admin/* rule
 * (ADMIN only) and the page bounced the moderator back to /dashboard.
 */
import { test, expect } from "@playwright/test";
import { resetDb, createUser, loginAs, listAccessReviews } from "./fixtures";

test.beforeEach(async () => {
  await resetDb();
});

test("a MODERATOR sees the accounts due for review, records a review and a change request; admins are not offered", async ({ page }) => {
  test.setTimeout(120000);
  const moderator = await createUser({ role: "MODERATOR", name: "Mo Derator", email: "mo@example.com" });
  const keep = await createUser({ role: "MEMBER", name: "Keep Member", email: "keep@example.com" });
  const change = await createUser({ role: "MEMBER", name: "Change Member", email: "change@example.com" });
  await createUser({ role: "ADMIN", name: "Ada Admin", email: "ada@example.com" });

  await loginAs(page, moderator);
  await page.goto("/dashboard/moderation/access-review");
  await expect(page).toHaveURL(/\/dashboard\/moderation\/access-review$/);

  const visible = { visible: true } as const;
  const card = (name: string) => page.locator("div.rounded-xl").filter({ hasText: name }).filter(visible);

  await expect(card("Keep Member")).toBeVisible();
  await card("Keep Member").getByRole("button", { name: "Access is correct" }).click();
  await expect(card("Keep Member")).toHaveCount(0);

  await card("Change Member").getByRole("button", { name: "Request a change" }).click();
  await card("Change Member").getByLabel("What needs to change?").fill("No longer runs a licensed facility");
  await card("Change Member").getByRole("button", { name: "Save change request" }).click();
  await expect(card("Change Member")).toHaveCount(0);

  // A moderator may not sign off on an admin: the server refuses and the page says so.
  await card("Ada Admin").getByRole("button", { name: "Access is correct" }).click();
  await expect(page.getByText("only an admin can review this account").filter(visible)).toBeVisible();

  expect(await listAccessReviews(keep.id)).toEqual([{ reviewerId: moderator.id, decision: "KEEP_ACCESS", notes: null }]);
  expect(await listAccessReviews(change.id)).toEqual([
    { reviewerId: moderator.id, decision: "CHANGE_REQUESTED", notes: "No longer runs a licensed facility" },
  ]);

  const exportRes = await page.request.get("/api/admin/access-review/export");
  expect(exportRes.status()).toBe(200);
  expect(await exportRes.text()).toContain("Keep Member");
});

test("a MEMBER is sent away from the access review page", async ({ page }) => {
  const member = await createUser({ role: "MEMBER" });
  await loginAs(page, member);
  await page.goto("/dashboard/moderation/access-review");
  await expect(page).toHaveURL(/\/dashboard$/);
});
