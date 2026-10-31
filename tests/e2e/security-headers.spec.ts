/**
 * SOW 11 / S-13: security headers on a PRODUCTION build (run with
 * `npm run test:e2e:prod`), and the pages that depend on third parties still
 * work under the CSP: Stripe checkout redirect, the UploadThing button, and
 * self-hosted fonts. No third-party request leaves the machine: Stripe and
 * UploadThing hosts are intercepted.
 */
import { test, expect, type Page } from "@playwright/test";
import { resetDb, createOrg, createMembership, createUser, loginAs } from "./fixtures";

function cspViolations(page: Page): string[] {
  const v: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to (load|execute|connect|apply|frame)/i.test(m.text())) v.push(m.text());
  });
  return v;
}

test.beforeEach(async ({ page }) => {
  await page.route(/stripe\.com|uploadthing\.com|googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
});

test("pages and API responses carry the security headers", async ({ request }) => {
  for (const path of ["/", "/pricing", "/login"]) {
    const res = await request.get(path);
    const h = res.headers();
    expect(h["strict-transport-security"], path).toMatch(/max-age=\d+/);
    expect(h["x-frame-options"], path).toBe("DENY");
    expect(h["x-content-type-options"], path).toBe("nosniff");
    expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"], path).toContain("camera=()");
    expect(h["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"], path).not.toContain("unsafe-eval");
    expect(h["x-powered-by"], path).toBeUndefined();
  }
  const api = await request.get("/api/rebuttal/published");
  expect(api.headers()["x-content-type-options"]).toBe("nosniff");
  expect(api.headers()["strict-transport-security"]).toMatch(/max-age=/);
});

test("public pages render under the CSP; the self-hosted font files load; no violations", async ({ page }) => {
  const violations = cspViolations(page);
  const fontResponses: { url: string; status: number }[] = [];
  page.on("response", (r) => {
    if (/\.woff2?($|\?)/.test(r.url())) fontResponses.push({ url: r.url(), status: r.status() });
  });
  for (const path of ["/", "/pricing", "/membership-guide"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  // next/font serves the files from this origin (font-src 'self').
  expect(fontResponses.length).toBeGreaterThan(0);
  for (const f of fontResponses) {
    expect(new URL(f.url).origin).toBe(new URL(page.url()).origin);
    expect(f.status).toBe(200);
  }
  expect(violations).toEqual([]);
});

test("Stripe checkout: the redirect to checkout.stripe.com is not blocked", async ({ page }) => {
  const violations = cspViolations(page);
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "NONE", status: "INACTIVE" });
  const member = await createUser({ organizationId: org.id });
  await loginAs(page, member);
  // The real routes would call Stripe; answer them in the browser so the
  // server never contacts Stripe. Portal "fails" so the card falls through
  // to checkout, as it does for a member with no plan yet.
  await page.route("**/api/stripe/portal", (r) =>
    r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "No subscription" }) })
  );
  await page.route("**/api/stripe/checkout", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_e2e" }) })
  );
  const navigation = page.waitForRequest((req) => req.url().startsWith("https://checkout.stripe.com/"));
  // The card checks the session (/api/auth/me) before it will start checkout.
  const authChecked = page.waitForResponse((r) => r.url().endsWith("/api/auth/me") && r.status() === 200);
  await page.goto("/pricing");
  await authChecked;
  await page.getByRole("button", { name: /Subscribe Now|Manage Subscription/ }).filter({ visible: true }).first().click();
  await navigation;
  expect(violations).toEqual([]);
});

test("UploadThing: the upload button renders and loads its config under the CSP", async ({ page }) => {
  const violations = cspViolations(page);
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
  const member = await createUser({ organizationId: org.id });
  await loginAs(page, member);
  const config = page.waitForResponse((res) => res.url().includes("/api/uploadthing") && res.request().method() === "GET");
  await page.goto("/dashboard/files");
  expect((await config).status()).toBe(200);
  await expect(page.locator("input[type=file]").first()).toBeAttached();
  expect(violations).toEqual([]);
});

test.afterAll(async () => {
  await resetDb();
});
