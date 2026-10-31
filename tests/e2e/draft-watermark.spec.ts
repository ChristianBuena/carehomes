/**
 * SOW 11.2 in the running app. Documents are stored as data: URLs here, which
 * the app reads locally, so no storage provider is contacted.
 */
import { test, expect } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  resetDb, createOrg, createMembership, createUser, createFacility, createRebuttal, setRebuttalDocs,
  setRebuttalStatus, setRebuttalWatermark, getRebuttalWatermark, loginAs,
} from "./fixtures";

async function pdfDataUrl(): Promise<string> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([400, 400]).drawText("E2E draft", { x: 40, y: 300, size: 14, font });
  return `data:application/pdf;base64,${Buffer.from(await doc.save()).toString("base64")}`;
}

async function world() {
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
  const member = await createUser({ organizationId: org.id });
  const facility = await createFacility({ organizationId: org.id, createdById: member.id });
  const rebuttal = await createRebuttal({ userId: member.id, facilityId: facility.id, title: "Draft with document" });
  await setRebuttalDocs(rebuttal.id, await pdfDataUrl(), null);
  const moderator = await createUser({ role: "MODERATOR" });
  return { member, moderator, rebuttal };
}

test.beforeEach(async () => {
  await resetDb();
});

test("a draft document opened from the moderation queue is a PDF marked FOR ATTORNEY REVIEW ONLY", async ({ page }) => {
  test.setTimeout(90000);
  const { moderator, rebuttal } = await world();
  await loginAs(page, moderator);
  await page.goto("/dashboard/moderation");
  const href = await page.getByRole("link", { name: "View supporting document" }).filter({ visible: true }).getAttribute("href");
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect(res.headers()["content-disposition"]).toContain(`rebuttal-${rebuttal.id}-FOR-ATTORNEY-REVIEW-ONLY.pdf`);
  const doc = await PDFDocument.load(await res.body());
  expect(doc.getPageCount()).toBe(1);
});

test("a FAILED approved copy is listed on the moderation page and the retry fixes it", async ({ page }) => {
  test.setTimeout(90000);
  const { moderator, rebuttal } = await world();
  await setRebuttalStatus(rebuttal.id, "APPROVED");
  await setRebuttalWatermark(rebuttal.id, "FAILED", "STORAGE_UNAVAILABLE");

  await loginAs(page, moderator);
  await page.goto("/dashboard/moderation");
  const visible = { visible: true } as const;
  await expect(page.getByRole("heading", { name: "Approved copies that need attention (1)" }).filter(visible)).toBeVisible();
  await expect(page.getByText("Reason: STORAGE_UNAVAILABLE").filter(visible)).toBeVisible();

  await page.getByRole("button", { name: "Retry approved copy" }).filter(visible).click();
  await expect(page.getByRole("heading", { name: /Approved copies that need attention/ })).toHaveCount(0);
  expect(await getRebuttalWatermark(rebuttal.id)).toEqual({ watermarkStatus: "APPLIED", watermarkError: null });
});
