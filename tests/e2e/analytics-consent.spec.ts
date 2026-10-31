/**
 * SOW 11.3: Google Analytics loads only after the visitor allows it.
 * .env.test sets NEXT_PUBLIC_GA_MEASUREMENT_ID, so the banner is active.
 * Requests to Google are intercepted and aborted: nothing leaves the machine.
 */
import { test, expect, type Page } from "@playwright/test";

function trackGoogle(page: Page): string[] {
  const hits: string[] = [];
  page.on("request", (r) => {
    if (/googletagmanager\.com|google-analytics\.com/.test(r.url())) hits.push(r.url());
  });
  return hits;
}

test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort());
});

test("no GA before a choice; 'No thanks' keeps it off across reloads", async ({ page }) => {
  test.setTimeout(90000);
  const hits = trackGoogle(page);
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Analytics choice" });
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);

  await banner.getByRole("button", { name: "No thanks" }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Analytics choice" })).toHaveCount(0);
  expect(hits).toEqual([]);
});

test("'Allow analytics' loads GA; the footer control lets the visitor change their answer", async ({ page }) => {
  test.setTimeout(90000);
  const hits = trackGoogle(page);
  await page.goto("/");
  await page.getByRole("region", { name: "Analytics choice" }).getByRole("button", { name: "Allow analytics" }).click();
  await expect.poll(() => hits.length).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Analytics choice" }).click();
  await expect(page.getByRole("region", { name: "Analytics choice" })).toBeVisible();
});
