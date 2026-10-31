import { prisma } from "@/lib/prisma";
import type { RebuttalStatus } from "@/generated/prisma/enums";

/**
 * SOW 12 KPI reports built from data the app already records.
 *
 * 12.2 Draft turnaround: submission (Rebuttal.createdAt) to the first
 *      moderation decision, and to approval. Calendar hours, not business
 *      hours. The app has no "matter type" field: every row is a CCLD
 *      citation rebuttal, reported as one type.
 * 12.3 Revision cycles: number of REQUEST_FIX decisions per rebuttal
 *      (SOW target: 2 or fewer). These are MODERATOR fix requests; the app
 *      has no separate attorney review step.
 * Both include moderation logs that were archived after a year.
 */

export const REVISION_CYCLE_TARGET = 2;

export type ReportRange = { from: Date; to: Date };

type Decision = { rebuttalId: string; toStatus: RebuttalStatus; createdAt: Date };

async function rebuttalsInRange(range: ReportRange) {
  return prisma.rebuttal.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: { id: true, title: true, status: true, createdAt: true, deletedAt: true, facility: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

async function decisionsFor(rebuttalIds: string[]): Promise<Map<string, Decision[]>> {
  if (rebuttalIds.length === 0) return new Map();
  const [live, archived] = await Promise.all([
    prisma.moderationLog.findMany({
      where: { rebuttalId: { in: rebuttalIds } },
      select: { rebuttalId: true, toStatus: true, createdAt: true },
    }),
    prisma.archivedModerationLog.findMany({
      where: { rebuttalId: { in: rebuttalIds } },
      select: { rebuttalId: true, toStatus: true, createdAt: true },
    }),
  ]);
  const byRebuttal = new Map<string, Decision[]>();
  for (const d of [...live, ...archived]) {
    const list = byRebuttal.get(d.rebuttalId) ?? [];
    list.push(d);
    byRebuttal.set(d.rebuttalId, list);
  }
  for (const list of byRebuttal.values()) list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return byRebuttal;
}

const hoursBetween = (a: Date, b: Date) => Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 10) / 10;

function stats(values: number[]) {
  if (values.length === 0) return { count: 0, averageHours: null, medianHours: null, p90Hours: null, maxHours: null };
  const sorted = [...values].sort((a, b) => a - b);
  const pick = (q: number) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
  const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  return {
    count: sorted.length,
    averageHours: Math.round(avg * 10) / 10,
    medianHours: pick(0.5),
    p90Hours: pick(0.9),
    maxHours: sorted[sorted.length - 1],
  };
}

export async function turnaroundReport(range: ReportRange) {
  const rebuttals = await rebuttalsInRange(range);
  const decisions = await decisionsFor(rebuttals.map((r) => r.id));

  const rows = rebuttals.map((r) => {
    const list = decisions.get(r.id) ?? [];
    const first = list[0];
    const approval = list.find((d) => d.toStatus === "APPROVED");
    return {
      rebuttalId: r.id,
      title: r.title,
      facility: r.facility?.name ?? null,
      matterType: "CCLD citation rebuttal",
      currentStatus: r.status,
      deleted: r.deletedAt !== null,
      submittedAt: r.createdAt,
      firstDecisionAt: first?.createdAt ?? null,
      firstDecision: first?.toStatus ?? null,
      hoursToFirstDecision: first ? hoursBetween(r.createdAt, first.createdAt) : null,
      approvedAt: approval?.createdAt ?? null,
      hoursToApproval: approval ? hoursBetween(r.createdAt, approval.createdAt) : null,
    };
  });

  return {
    range,
    unit: "calendar hours",
    matterTypes: ["CCLD citation rebuttal"],
    submitted: rows.length,
    awaitingFirstDecision: rows.filter((r) => r.hoursToFirstDecision === null && !r.deleted).length,
    toFirstDecision: stats(rows.flatMap((r) => (r.hoursToFirstDecision === null ? [] : [r.hoursToFirstDecision]))),
    toApproval: stats(rows.flatMap((r) => (r.hoursToApproval === null ? [] : [r.hoursToApproval]))),
    rows,
  };
}

export async function revisionCyclesReport(range: ReportRange) {
  const rebuttals = await rebuttalsInRange(range);
  const decisions = await decisionsFor(rebuttals.map((r) => r.id));

  const rows = rebuttals.map((r) => {
    const list = decisions.get(r.id) ?? [];
    const cycles = list.filter((d) => d.toStatus === "REQUEST_FIX").length;
    return {
      rebuttalId: r.id,
      title: r.title,
      facility: r.facility?.name ?? null,
      currentStatus: r.status,
      deleted: r.deletedAt !== null,
      submittedAt: r.createdAt,
      revisionCycles: cycles,
      withinTarget: cycles <= REVISION_CYCLE_TARGET,
      approved: list.some((d) => d.toStatus === "APPROVED"),
    };
  });

  const counts = rows.map((r) => r.revisionCycles);
  const total = counts.reduce((s, v) => s + v, 0);
  return {
    range,
    target: REVISION_CYCLE_TARGET,
    source: "moderator REQUEST_FIX decisions",
    rebuttals: rows.length,
    averageCycles: rows.length ? Math.round((total / rows.length) * 100) / 100 : null,
    maxCycles: rows.length ? Math.max(...counts) : null,
    withinTarget: rows.filter((r) => r.withinTarget).length,
    overTarget: rows.filter((r) => !r.withinTarget).length,
    rows,
  };
}
