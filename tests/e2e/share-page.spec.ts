/**
 * The public attorney share page (/share/[token]) is a server component that
 * queries the database itself, separately from GET /api/share/[token]. The
 * API's expiry / revocation rules are covered in tests/integration/files.test.ts;
 * this checks the page applies the same rules.
 */
import { test, expect } from "@playwright/test";
import { resetDb, createOrg, createUser, createMemberFile, createShareLink } from "./fixtures";

test.describe.configure({ timeout: 90000 });

test.beforeEach(async () => {
  await resetDb();
});

async function ownerWithFiles() {
  const org = await createOrg({ name: "Share Page Org" });
  const owner = await createUser({ organizationId: org.id, role: "MEMBER" });
  const shared = await createMemberFile({ userId: owner.id, filename: "shared-plan.pdf" });
  const notShared = await createMemberFile({ userId: owner.id, filename: "private-notes.pdf" });
  return { owner, shared, notShared };
}

test("a valid link shows only the selected files to a logged-out visitor", async ({ page }) => {
  const { owner, shared } = await ownerWithFiles();
  const link = await createShareLink({ userId: owner.id, fileIds: [shared.id] });

  await page.goto(`/share/${link.token}`);

  await expect(page.getByText("shared-plan.pdf")).toBeVisible();
  await expect(page.getByText("private-notes.pdf")).toHaveCount(0);
  await expect(page.locator(`a[href="${shared.fileUrl}"]`)).toHaveCount(1);
});

test("a revoked link shows 'Link Revoked' and no files or file URLs", async ({ page }) => {
  const { owner, shared } = await ownerWithFiles();
  const link = await createShareLink({ userId: owner.id, fileIds: [shared.id], revokedAt: new Date().toISOString() });

  await page.goto(`/share/${link.token}`);

  await expect(page.getByRole("heading", { name: "Link Revoked" })).toBeVisible();
  await expect(page.getByText("shared-plan.pdf")).toHaveCount(0);
  expect(await page.content()).not.toContain(shared.fileUrl);
});

test("an expired link shows 'Link Expired' and no files or file URLs", async ({ page }) => {
  const { owner, shared } = await ownerWithFiles();
  const link = await createShareLink({
    userId: owner.id,
    fileIds: [shared.id],
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
  });

  await page.goto(`/share/${link.token}`);

  await expect(page.getByRole("heading", { name: "Link Expired" })).toBeVisible();
  await expect(page.getByText("shared-plan.pdf")).toHaveCount(0);
  expect(await page.content()).not.toContain(shared.fileUrl);
});

test("an unknown token shows the 'Page Not Found' page and no files", async ({ page }) => {
  const { owner, shared } = await ownerWithFiles();
  await createShareLink({ userId: owner.id, fileIds: [shared.id] });

  await page.goto(`/share/${"0".repeat(64)}`);

  await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
  await expect(page.getByText("shared-plan.pdf")).toHaveCount(0);
});

// Expected behaviour, currently failing (reported in docs/TEST_REPORT.md, not
// fixed in this pass): the page has a loading.tsx, so Next.js starts streaming
// with HTTP 200 before notFound() runs. Remove test.fail() once it returns 404.
test("FAILS [Low]: an unknown token is answered with HTTP 404 (actual: 200 with the not-found content)", async ({ page }) => {
  test.fail();
  const response = await page.goto(`/share/${"0".repeat(64)}`);
  expect(response?.status()).toBe(404);
});
