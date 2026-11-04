/**
 * SOW 12.2 (turnaround) and 12.3 (revision cycles) reports.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { resetDb, testDb, disconnectDb, createOrgWithUser, createUser, createFacility } from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { turnaroundReport, revisionCyclesReport } from "@/services/kpi-report.service";
import { GET as kpi } from "@/app/api/admin/reports/kpi/route";

beforeEach(resetDb);
afterAll(disconnectDb);

const H = 3_600_000;
const T0 = new Date("2026-09-01T00:00:00Z");
const at = (hours: number) => new Date(T0.getTime() + hours * H);
const RANGE = { from: new Date("2026-08-01T00:00:00Z"), to: new Date("2026-10-01T00:00:00Z") };

async function seed() {
  const { user, org } = await createOrgWithUser({});
  const moderator = await createUser({ role: "MODERATOR" });
  const facility = await createFacility({ organizationId: org.id, createdById: user.id, name: "KPI Home" });
  const mk = (title: string, createdAt: Date, status: "PENDING" | "APPROVED" | "REQUEST_FIX" | "REJECTED") =>
    testDb.rebuttal.create({ data: { title, content: "c", userId: user.id, facilityId: facility.id, status, createdAt } });
  const log = (rebuttalId: string, toStatus: "APPROVED" | "REQUEST_FIX" | "REJECTED", createdAt: Date) =>
    testDb.moderationLog.create({ data: { rebuttalId, moderatorId: moderator.id, fromStatus: "PENDING", toStatus, createdAt } });

  // A: approved straight away after 10h.
  const a = await mk("A", at(0), "APPROVED");
  await log(a.id, "APPROVED", at(10));
  // B: fix requested at 5h, fix again at 30h, approved at 50h.
  const b = await mk("B", at(0), "APPROVED");
  await log(b.id, "REQUEST_FIX", at(5));
  await log(b.id, "REQUEST_FIX", at(30));
  await log(b.id, "APPROVED", at(50));
  // C: three fix requests, one of them archived (moved after a year), not approved.
  const c = await mk("C", at(0), "REQUEST_FIX");
  await testDb.archivedModerationLog.create({ data: { originalId: "orig-1", rebuttalId: c.id, moderatorId: moderator.id, fromStatus: "PENDING", toStatus: "REQUEST_FIX", createdAt: at(2) } });
  await log(c.id, "REQUEST_FIX", at(20));
  await log(c.id, "REQUEST_FIX", at(40));
  // D: still waiting.
  await mk("D", at(0), "PENDING");
  // Outside the range.
  const old = await mk("Old", new Date("2026-01-01T00:00:00Z"), "APPROVED");
  await log(old.id, "APPROVED", new Date("2026-01-02T00:00:00Z"));
  return { a, b, c, user, moderator };
}

describe("turnaround (12.2)", () => {
  it("hours from submission to first decision and to approval, archived logs included, range respected", async () => {
    const { a, b, c } = await seed();
    const r = await turnaroundReport(RANGE);
    expect(r.submitted).toBe(4);
    expect(r.awaitingFirstDecision).toBe(1);
    const byId = Object.fromEntries(r.rows.map((x) => [x.rebuttalId, x]));
    expect(byId[a.id]).toMatchObject({ hoursToFirstDecision: 10, hoursToApproval: 10, firstDecision: "APPROVED" });
    expect(byId[b.id]).toMatchObject({ hoursToFirstDecision: 5, hoursToApproval: 50, firstDecision: "REQUEST_FIX" });
    expect(byId[c.id]).toMatchObject({ hoursToFirstDecision: 2, hoursToApproval: null }); // the archived decision came first
    expect(r.toFirstDecision).toMatchObject({ count: 3, medianHours: 5, maxHours: 10 });
    expect(r.toApproval).toMatchObject({ count: 2, averageHours: 30, maxHours: 50 });
    expect(r.rows.map((x) => x.title)).not.toContain("Old");
    expect(r.unit).toBe("calendar hours");
  });
});

describe("revision cycles (12.3)", () => {
  it("counts REQUEST_FIX per rebuttal against the target of 2", async () => {
    const { a, b, c } = await seed();
    const r = await revisionCyclesReport(RANGE);
    const byId = Object.fromEntries(r.rows.map((x) => [x.rebuttalId, x]));
    expect(byId[a.id]).toMatchObject({ revisionCycles: 0, withinTarget: true, approved: true });
    expect(byId[b.id]).toMatchObject({ revisionCycles: 2, withinTarget: true, approved: true });
    expect(byId[c.id]).toMatchObject({ revisionCycles: 3, withinTarget: false, approved: false });
    expect(r).toMatchObject({ target: 2, rebuttals: 4, averageCycles: 1.25, maxCycles: 3, withinTarget: 3, overTarget: 1 });
  });

  it("an empty range gives zeros and nulls, not errors", async () => {
    const r = await revisionCyclesReport({ from: new Date("2020-01-01"), to: new Date("2020-02-01") });
    expect(r).toMatchObject({ rebuttals: 0, averageCycles: null, maxCycles: null });
    const t = await turnaroundReport({ from: new Date("2020-01-01"), to: new Date("2020-02-01") });
    expect(t.toFirstDecision).toMatchObject({ count: 0, medianHours: null });
  });
});

describe("GET /api/admin/reports/kpi", () => {
  const q = "from=2026-08-01T00:00:00Z&to=2026-10-01T00:00:00Z";

  it("ADMIN gets JSON and CSV; the export is audited", async () => {
    await seed();
    const admin = await createUser({ role: "ADMIN" });
    const cookies = await authCookie(admin);
    const json = await kpi(buildRequest(`http://localhost/api/admin/reports/kpi?report=revisions&${q}`, { cookies }));
    expect(json.status).toBe(200);
    expect(((await json.json()) as { overTarget: number }).overTarget).toBe(1);

    const csv = await kpi(buildRequest(`http://localhost/api/admin/reports/kpi?report=turnaround&format=csv&${q}`, { cookies }));
    expect(csv.headers.get("content-type")).toMatch(/text\/csv/);
    const lines = (await csv.text()).trim().split("\r\n");
    expect(lines[0]).toBe("rebuttalId,title,facility,matterType,currentStatus,deleted,submittedAt,firstDecision,firstDecisionAt,hoursToFirstDecision,approvedAt,hoursToApproval");
    expect(lines).toHaveLength(5);

    expect(await testDb.auditLog.count({ where: { action: "REPORT_EXPORTED", actorId: admin.id } })).toBe(2);
  });

  it("MODERATOR and MEMBER 403; no session 401; bad input 400", async () => {
    const { user, moderator } = await seed();
    expect((await kpi(buildRequest(`http://localhost/api/admin/reports/kpi?report=turnaround`))).status).toBe(401);
    for (const u of [moderator, user]) {
      expect((await kpi(buildRequest(`http://localhost/api/admin/reports/kpi?report=turnaround`, { cookies: await authCookie(u) }))).status).toBe(403);
    }
    const cookies = await authCookie(await createUser({ role: "ADMIN" }));
    for (const query of ["", "report=other", "report=turnaround&format=xml", "report=turnaround&from=nope", "report=turnaround&from=2026-12-01&to=2026-01-01"]) {
      expect((await kpi(buildRequest(`http://localhost/api/admin/reports/kpi?${query}`, { cookies }))).status, query).toBe(400);
    }
  });
});
