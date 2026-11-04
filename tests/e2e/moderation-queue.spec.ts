/**
 * SOW 11.3: the moderation queue passes rebuttal rows to a client component,
 * so every selected field is serialized into the page. No storage URL may be
 * among them; the document opens through the app route instead.
 */
import { test, expect } from "@playwright/test";
import { resetDb, createOrg, createMembership, createUser, createFacility, createRebuttal, setRebuttalDocs, loginAs } from "./fixtures";

const ORIGINAL = "https://res.cloudinary.com/demo/image/authenticated/v1/carehomes_rebuttals/queue-secret-doc.pdf";
const WATERMARKED = "data:application/pdf;base64,UVVFVUVTRUNSRVQ=";

test.beforeEach(async () => {
  await resetDb();
});

test("the moderation queue shows a document link through the app and no storage URL anywhere in the page", async ({ page }) => {
  test.setTimeout(90000);
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan: "TIER_B", status: "ACTIVE" });
  const member = await createUser({ organizationId: org.id });
  const facility = await createFacility({ organizationId: org.id, createdById: member.id });
  const rebuttal = await createRebuttal({ userId: member.id, facilityId: facility.id, title: "Queue item" });
  await setRebuttalDocs(rebuttal.id, ORIGINAL, WATERMARKED);
  const moderator = await createUser({ role: "MODERATOR" });

  await loginAs(page, moderator);
  await page.goto("/dashboard/moderation");
  const visible = { visible: true } as const;
  await expect(page.getByText("Queue item").filter(visible)).toBeVisible();

  const link = page.getByRole("link", { name: "View supporting document" }).filter(visible);
  await expect(link).toHaveAttribute("href", `/api/rebuttal/${rebuttal.id}/document`);

  const html = await page.content();
  expect(html).not.toContain("queue-secret-doc");
  expect(html).not.toContain("cloudinary.com");
  expect(html).not.toContain("UVVFVUVTRUNSRVQ");
});
