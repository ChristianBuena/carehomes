/**
 * Round 3, area B — template library.
 *
 * Access rule in the code (src/services/template.service.ts checkLibraryAccess):
 * ADMIN and MODERATOR always; a MEMBER only while their organization's
 * membership status is ACTIVE. The tier (A/B/C) makes no difference.
 *
 * "FAILS [severity]" tests assert expected behaviour and are marked `it.fails`
 * (reported in docs/TEST_REPORT.md, not fixed in this pass).
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

import {
  resetDb,
  testDb,
  disconnectDb,
  createOrg,
  createMembership,
  createUser,
  createTemplate,
} from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { GET as listTemplates, POST as createTemplateRoute } from "@/app/api/templates/route";
import { DELETE as deleteTemplateRoute } from "@/app/api/templates/[id]/route";
import { POST as downloadTemplate } from "@/app/api/templates/[id]/download/route";

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});
afterAll(disconnectDb);

type Cookies = Record<string, string>;
type Plan = "NONE" | "TIER_A" | "TIER_B" | "TIER_C";
type Status = "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELED";

const SECRET_TITLE = "Confidential Rebuttal Template";
const SECRET_URL = "https://files.test/confidential-template.pdf";

async function memberWith(plan: Plan, status: Status) {
  const org = await createOrg();
  await createMembership({ organizationId: org.id, plan, status });
  const user = await createUser({ organizationId: org.id, role: "MEMBER" });
  return { org, user, cookies: await authCookie(user) };
}

async function staff(role: "ADMIN" | "MODERATOR") {
  const user = await createUser({ organizationId: null, role });
  return { user, cookies: await authCookie(user) };
}

const list = (cookies?: Cookies, query = "") =>
  listTemplates(buildRequest(`http://localhost/api/templates${query}`, { cookies }));
const create = (cookies: Cookies | undefined, body: unknown) =>
  createTemplateRoute(buildRequest("http://localhost/api/templates", { method: "POST", body, cookies }));
const remove = (cookies: Cookies | undefined, id: string) =>
  deleteTemplateRoute(buildRequest(`http://localhost/api/templates/${id}`, { method: "DELETE", cookies }), {
    params: Promise.resolve({ id }),
  });
const download = (cookies: Cookies | undefined, id: string) =>
  downloadTemplate(buildRequest(`http://localhost/api/templates/${id}/download`, { method: "POST", cookies }), {
    params: Promise.resolve({ id }),
  });

const validBody = {
  title: "New Template",
  description: "How to respond",
  category: "REBUTTAL",
  fileFormat: "PDF",
  fileUrl: "https://files.test/new-template.pdf",
};

describe("B. Templates — who can VIEW (GET /api/templates)", () => {
  it("no session: 401, and nothing about the templates is returned", async () => {
    await createTemplate({ title: SECRET_TITLE, fileUrl: SECRET_URL });
    const res = await list();
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).not.toContain(SECRET_TITLE);
    expect(text).not.toContain(SECRET_URL);
  });

  for (const plan of ["TIER_A", "TIER_B", "TIER_C"] as const) {
    it(`a MEMBER with an ACTIVE ${plan} membership can view the library (every paid tier has the same access)`, async () => {
      await createTemplate({ title: SECRET_TITLE, fileUrl: SECRET_URL });
      const { cookies } = await memberWith(plan, "ACTIVE");

      const res = await list(cookies);
      expect(res.status).toBe(200);
      const { templates } = (await res.json()) as { templates: { title: string; fileUrl: string }[] };
      expect(templates).toHaveLength(1);
      expect(templates[0]).toMatchObject({ title: SECRET_TITLE, fileUrl: SECRET_URL });
    });
  }

  const denied: [Plan, Status][] = [
    ["NONE", "INACTIVE"],
    ["TIER_B", "INACTIVE"],
    ["TIER_B", "PAST_DUE"],
    ["TIER_C", "CANCELED"],
  ];
  for (const [plan, status] of denied) {
    it(`a MEMBER whose membership is ${plan}/${status} gets 403 and NO template content`, async () => {
      await createTemplate({ title: SECRET_TITLE, fileUrl: SECRET_URL });
      const { cookies } = await memberWith(plan, status);

      const res = await list(cookies);
      expect(res.status).toBe(403);
      const text = await res.text();
      expect(text).not.toContain(SECRET_TITLE);
      expect(text).not.toContain(SECRET_URL);
      expect(JSON.parse(text)).toEqual({ error: "Active membership required" });
    });
  }

  it("a MEMBER with no organization, and one whose organization has no membership row, get 403", async () => {
    await createTemplate();
    const orphan = await createUser({ organizationId: null, role: "MEMBER" });
    const org = await createOrg();
    const noMembership = await createUser({ organizationId: org.id, role: "MEMBER" });

    expect((await list(await authCookie(orphan))).status).toBe(403);
    expect((await list(await authCookie(noMembership))).status).toBe(403);
  });

  it("MODERATOR and ADMIN can view without any membership", async () => {
    await createTemplate({ title: SECRET_TITLE });
    for (const role of ["MODERATOR", "ADMIN"] as const) {
      const res = await list((await staff(role)).cookies);
      expect(res.status).toBe(200);
      expect(((await res.json()) as { templates: unknown[] }).templates).toHaveLength(1);
    }
  });

  it("access follows the membership in the DATABASE, not the session: it is lost the moment the membership lapses and regained when it is active again", async () => {
    await createTemplate();
    const { org, cookies } = await memberWith("TIER_B", "ACTIVE");
    expect((await list(cookies)).status).toBe(200);

    await testDb.membership.update({ where: { organizationId: org.id }, data: { status: "CANCELED", plan: "NONE" } });
    expect((await list(cookies)).status).toBe(403);

    await testDb.membership.update({ where: { organizationId: org.id }, data: { status: "ACTIVE", plan: "TIER_A" } });
    expect((await list(cookies)).status).toBe(200);
  });

  it("a member moved from an active organization to an inactive one loses access with the same session", async () => {
    await createTemplate();
    const active = await memberWith("TIER_B", "ACTIVE");
    const lapsed = await createOrg();
    await createMembership({ organizationId: lapsed.id, plan: "NONE", status: "INACTIVE" });

    await testDb.user.update({ where: { id: active.user.id }, data: { organizationId: lapsed.id } });
    expect((await list(active.cookies)).status).toBe(403);
  });

  it("a valid session for a deleted user is 401", async () => {
    const { user, cookies } = await memberWith("TIER_B", "ACTIVE");
    await testDb.user.delete({ where: { id: user.id } });
    expect((await list(cookies)).status).toBe(401);
  });

  it("removed (inactive) templates are not listed, for members or for admins", async () => {
    await createTemplate({ title: "Live" });
    await createTemplate({ title: SECRET_TITLE, fileUrl: SECRET_URL, isActive: false });

    for (const cookies of [(await memberWith("TIER_A", "ACTIVE")).cookies, (await staff("ADMIN")).cookies]) {
      const text = await (await list(cookies)).text();
      expect(text).toContain("Live");
      expect(text).not.toContain(SECRET_TITLE);
      expect(text).not.toContain(SECRET_URL);
    }
  });

  it("?category= filters; an unknown category is ignored rather than erroring", async () => {
    await createTemplate({ title: "R", category: "REBUTTAL" });
    await createTemplate({ title: "G", category: "GUIDE" });
    const { cookies } = await memberWith("TIER_A", "ACTIVE");
    const titles = async (query: string) =>
      ((await (await list(cookies, query)).json()) as { templates: { title: string }[] }).templates.map((t) => t.title).sort();

    expect(await titles("?category=GUIDE")).toEqual(["G"]);
    expect(await titles("?category=NOPE")).toEqual(["G", "R"]);
    expect(await titles("?category=' OR 1=1 --")).toEqual(["G", "R"]);
  });

  it("the listing exposes the uploader's name only — never their email, id or password hash", async () => {
    const admin = await createUser({ organizationId: null, role: "ADMIN", name: "Admin Person", email: "admin-secret@example.com" });
    await createTemplate({ uploadedById: admin.id });
    const { cookies } = await memberWith("TIER_A", "ACTIVE");

    const res = await list(cookies);
    const text = await res.text();
    expect(JSON.parse(text).templates[0].uploadedBy).toEqual({ name: "Admin Person" });
    expect(text).not.toContain("admin-secret@example.com");
    expect(text).not.toContain(admin.id);
    expect(text).not.toContain(admin.password);
  });
});

describe("B. Templates — who can USE one (POST /api/templates/[id]/download)", () => {
  it("no session: 401 and no file URL", async () => {
    const t = await createTemplate({ fileUrl: SECRET_URL });
    const res = await download(undefined, t.id);
    expect(res.status).toBe(401);
    expect(await res.text()).not.toContain(SECRET_URL);
  });

  it("an active MEMBER gets the file URL; the download is counted and recorded against that user", async () => {
    const t = await createTemplate({ fileUrl: SECRET_URL });
    const { user, cookies } = await memberWith("TIER_A", "ACTIVE");

    const res = await download(cookies, t.id);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ fileUrl: SECRET_URL });

    expect((await testDb.template.findUnique({ where: { id: t.id } }))!.downloadCount).toBe(1);
    const rows = await testDb.templateDownload.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ templateId: t.id, userId: user.id });
  });

  for (const [plan, status] of [["NONE", "INACTIVE"], ["TIER_B", "PAST_DUE"], ["TIER_C", "CANCELED"]] as [Plan, Status][]) {
    it(`a MEMBER with a ${plan}/${status} membership gets 403: no file URL, no count, no download record`, async () => {
      const t = await createTemplate({ title: SECRET_TITLE, fileUrl: SECRET_URL });
      const { cookies } = await memberWith(plan, status);

      const res = await download(cookies, t.id);
      expect(res.status).toBe(403);
      const text = await res.text();
      expect(text).not.toContain(SECRET_URL);
      expect(text).not.toContain(SECRET_TITLE);
      expect((await testDb.template.findUnique({ where: { id: t.id } }))!.downloadCount).toBe(0);
      expect(await testDb.templateDownload.count()).toBe(0);
    });
  }

  it("a member without access cannot tell an existing template id from a missing one (403 for both)", async () => {
    const t = await createTemplate();
    const { cookies } = await memberWith("NONE", "INACTIVE");
    expect((await download(cookies, t.id)).status).toBe(403);
    expect((await download(cookies, "no-such-template")).status).toBe(403);
  });

  it("MODERATOR and ADMIN can download without a membership", async () => {
    const t = await createTemplate();
    expect((await download((await staff("MODERATOR")).cookies, t.id)).status).toBe(200);
    expect((await download((await staff("ADMIN")).cookies, t.id)).status).toBe(200);
  });

  it("an unknown id is 404; a removed template is 404 and its URL is not returned", async () => {
    const removed = await createTemplate({ fileUrl: SECRET_URL, isActive: false });
    const { cookies } = await memberWith("TIER_A", "ACTIVE");

    expect((await download(cookies, "no-such-template")).status).toBe(404);
    const res = await download(cookies, removed.id);
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain(SECRET_URL);
    expect(await testDb.templateDownload.count()).toBe(0);
  });

  it("10 simultaneous downloads are all counted", async () => {
    const t = await createTemplate();
    const { cookies } = await memberWith("TIER_C", "ACTIVE");

    const results = await Promise.all(Array.from({ length: 10 }, () => download(cookies, t.id)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect((await testDb.template.findUnique({ where: { id: t.id } }))!.downloadCount).toBe(10);
    expect(await testDb.templateDownload.count()).toBe(10);
  });
});

describe("B. Templates — who can MANAGE them (POST /api/templates, DELETE /api/templates/[id])", () => {
  it("only an ADMIN can create: no session 401; MEMBER (any tier) and MODERATOR 403; nothing is created", async () => {
    expect((await create(undefined, validBody)).status).toBe(401);
    expect((await create((await memberWith("TIER_C", "ACTIVE")).cookies, validBody)).status).toBe(403);
    expect((await create((await staff("MODERATOR")).cookies, validBody)).status).toBe(403);
    expect(await testDb.template.count()).toBe(0);
  });

  it("an ADMIN creates a template, recorded against that admin", async () => {
    const admin = await staff("ADMIN");
    const res = await create(admin.cookies, { ...validBody, notionUrl: "https://notion.test/page" });
    expect(res.status).toBe(201);

    const row = await testDb.template.findFirst();
    expect(row).toMatchObject({ ...validBody, notionUrl: "https://notion.test/page", uploadedById: admin.user.id, isActive: true, downloadCount: 0 });
  });

  it("required fields and enums are validated (400), and invalid JSON is 400", async () => {
    const { cookies } = await staff("ADMIN");
    for (const field of ["title", "description", "category", "fileFormat", "fileUrl"] as const) {
      const body: Record<string, unknown> = { ...validBody };
      delete body[field];
      expect((await create(cookies, body)).status, `missing ${field}`).toBe(400);
    }
    expect((await create(cookies, { ...validBody, category: "SECRET" })).status).toBe(400);
    expect((await create(cookies, { ...validBody, fileFormat: "EXE" })).status).toBe(400);

    const raw = await createTemplateRoute(
      new Request("http://localhost/api/templates", { method: "POST", body: "{not json", headers: { "content-type": "application/json" } }) as never
    );
    expect(raw.status).toBe(400);
    expect(await testDb.template.count()).toBe(0);
  });

  it("a client cannot set downloadCount, isActive or uploadedById when creating", async () => {
    const admin = await staff("ADMIN");
    const other = await createUser({ organizationId: null, role: "MEMBER" });
    await create(admin.cookies, { ...validBody, downloadCount: 9999, isActive: false, uploadedById: other.id });

    expect(await testDb.template.findFirst()).toMatchObject({ downloadCount: 0, isActive: true, uploadedById: admin.user.id });
  });

  it.fails("FAILS [Low]: a fileUrl that is not an http(s) URL is rejected with 400 (actual: 'javascript:' is stored and later handed to members' browsers to navigate to)", async () => {
    const { cookies } = await staff("ADMIN");
    const res = await create(cookies, { ...validBody, fileUrl: "javascript:alert(document.cookie)" });
    expect(res.status).toBe(400);
  });

  it("only an ADMIN can remove: no session 401; MEMBER and MODERATOR 403; the template stays", async () => {
    const t = await createTemplate();
    expect((await remove(undefined, t.id)).status).toBe(401);
    expect((await remove((await memberWith("TIER_C", "ACTIVE")).cookies, t.id)).status).toBe(403);
    expect((await remove((await staff("MODERATOR")).cookies, t.id)).status).toBe(403);
    expect((await testDb.template.findUnique({ where: { id: t.id } }))!.isActive).toBe(true);
  });

  it("an ADMIN removes a template: it is deactivated (not deleted), its download history survives, and members can no longer list or download it", async () => {
    const t = await createTemplate({ title: SECRET_TITLE, fileUrl: SECRET_URL });
    const member = await memberWith("TIER_A", "ACTIVE");
    await download(member.cookies, t.id);

    expect((await remove((await staff("ADMIN")).cookies, t.id)).status).toBe(200);

    expect((await testDb.template.findUnique({ where: { id: t.id } }))!.isActive).toBe(false);
    expect(await testDb.templateDownload.count()).toBe(1);
    expect(await (await list(member.cookies)).text()).not.toContain(SECRET_TITLE);
    expect((await download(member.cookies, t.id)).status).toBe(404);
  });

  it("removing an unknown id is 404", async () => {
    expect((await remove((await staff("ADMIN")).cookies, "no-such-template")).status).toBe(404);
  });
});
