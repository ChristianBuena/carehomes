/**
 * Server-action errors must be READABLE in the browser.
 *
 * submitRebuttal() / updateRebuttal() used to throw their messages. Next.js
 * replaces a thrown server-action message with a generic one in a production
 * build, so they now return { success: false, error }. This spec runs against
 * the dev server (playwright.config.ts) AND against a real `next build` +
 * `next start` (playwright.prod.config.ts, `npm run test:e2e:prod`) — the
 * production run is the one that proves the fix.
 *
 * Each test loads a form in a valid state, then changes the database behind
 * the page's back so the SERVER (not browser validation) rejects the submit.
 */
import { test, expect } from "@playwright/test";
import {
  resetDb,
  createOrg,
  createMembership,
  createUser,
  createFacility,
  createRebuttal,
  softDeleteFacility,
  setRebuttalStatus,
  countRebuttals,
  loginAs,
} from "./fixtures";

// Next's production replacement for a thrown server-action message.
const GENERIC_PRODUCTION_ERROR = /An error occurred in the Server Components render|digest/i;

// Each test compiles a dashboard route on first visit and makes several
// database round-trips through a tsx subprocess; 30s is too tight for a cold
// dev server.
test.describe.configure({ timeout: 90000 });

test.beforeEach(async () => {
  await resetDb();
});

async function memberWithFacility() {
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
  const user = await createUser({ organizationId: org.id, role: "MEMBER" });
  const facility = await createFacility({ organizationId: org.id, createdById: user.id, name: "Action Error Home" });
  return { org, user, facility };
}

test("new rebuttal form shows the server's specific message ('Facility not found.') when the action rejects the submit", async ({ page }) => {
  const { user, facility } = await memberWithFacility();
  await loginAs(page, user);
  await page.goto("/dashboard/rebuttals/new");

  await page.getByLabel("Rebuttal Title").fill("Response to Citation 1");
  await page.locator("select[name='facilityId']").selectOption(facility.id);
  await page.getByLabel("Rebuttal Content").fill("Our response.");
  await page.locator("input[name='redactionAcknowledged']").check();

  // The facility disappears after the page rendered its picker.
  await softDeleteFacility(facility.id);
  await page.getByRole("button", { name: /submit for review/i }).click();

  const alert = page.getByRole("alert").filter({ hasText: "Facility not found." });
  await expect(alert).toBeVisible({ timeout: 15000 });
  await expect(alert).not.toContainText(GENERIC_PRODUCTION_ERROR);
  await expect(page).toHaveURL(/\/dashboard\/rebuttals\/new$/);
  // The submit button is usable again and nothing was stored.
  await expect(page.getByRole("button", { name: /submit for review/i })).toBeEnabled();
  expect(await countRebuttals()).toBe(0);
});

test("new rebuttal form still succeeds and redirects when the action accepts the submit", async ({ page }) => {
  const { user, facility } = await memberWithFacility();
  await loginAs(page, user);
  await page.goto("/dashboard/rebuttals/new");

  await page.getByLabel("Rebuttal Title").fill("Response to Citation 2");
  await page.locator("select[name='facilityId']").selectOption(facility.id);
  await page.getByLabel("Rebuttal Content").fill("Our response.");
  await page.locator("input[name='redactionAcknowledged']").check();
  await page.getByRole("button", { name: /submit for review/i }).click();

  await expect(page).toHaveURL(/\/dashboard\/rebuttals\?success=true/, { timeout: 15000 });
  expect(await countRebuttals()).toBe(1);
});

test("edit rebuttal form shows the server's specific message when the rebuttal is no longer in 'Fix Required'", async ({ page }) => {
  const { user, facility } = await memberWithFacility();
  const rebuttal = await createRebuttal({ userId: user.id, facilityId: facility.id, status: "REQUEST_FIX", title: "Needs a fix" });
  await loginAs(page, user);
  await page.goto(`/dashboard/rebuttals/${rebuttal.id}/edit`);

  await page.getByLabel("Rebuttal Title").fill("Fixed title");
  await page.locator("input[name='redactionAcknowledged']").check();

  // A moderator acts on it while the member still has the edit form open.
  await setRebuttalStatus(rebuttal.id, "APPROVED");
  await page.getByRole("button", { name: /resubmit for review/i }).click();

  const alert = page.getByRole("alert").filter({ hasText: 'Only rebuttals with "Fix Required" status can be edited.' });
  await expect(alert).toBeVisible({ timeout: 15000 });
  await expect(alert).not.toContainText(GENERIC_PRODUCTION_ERROR);
  await expect(page).toHaveURL(new RegExp(`/dashboard/rebuttals/${rebuttal.id}/edit$`));
});

test("fillable rebuttal form shows the server's specific message inline when the action rejects the submit", async ({ page }) => {
  const { user, facility } = await memberWithFacility();
  await loginAs(page, user);
  await page.goto("/dashboard/forms/rebuttal");

  await page.locator("select[name='facilityId']").selectOption(facility.id);
  await page.locator("[name='content']").fill("Our response.");
  await page.locator("input[name='redactionAcknowledged']").check();
  await page.locator("input[name='signature']").fill("Test Member");

  await softDeleteFacility(facility.id);
  await page.getByRole("button", { name: /submit to db/i }).click();

  const alert = page.getByRole("alert").filter({ hasText: "Facility not found." });
  await expect(alert).toBeVisible({ timeout: 15000 });
  await expect(alert).not.toContainText(GENERIC_PRODUCTION_ERROR);
  expect(await countRebuttals()).toBe(0);
});
