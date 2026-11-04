import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/roleGuard";
import { revisionCyclesReport, turnaroundReport } from "@/services/kpi-report.service";
import { auditContextFromRequest, recordAudit, toCsv } from "@/services/audit.service";

/**
 * GET /api/admin/reports/kpi — ADMIN only (SOW 12.2, 12.3).
 * Query: report = turnaround | revisions (required),
 *        from, to (ISO 8601; default = last 90 days), format = json (default) | csv.
 */
export async function GET(req: NextRequest) {
  const guard = await requirePermission("manage_users");
  if (guard.error || !guard.user) {
    return guard.error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const report = params.get("report");
  if (report !== "turnaround" && report !== "revisions") {
    return NextResponse.json({ error: "report must be turnaround or revisions" }, { status: 400 });
  }
  const format = params.get("format") ?? "json";
  if (format !== "json" && format !== "csv") {
    return NextResponse.json({ error: "format must be json or csv" }, { status: 400 });
  }

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 90);
  const from = params.get("from") ? new Date(params.get("from")!) : defaultFrom;
  const to = params.get("to") ? new Date(params.get("to")!) : now;
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: "from and to must be ISO 8601 dates, from <= to" }, { status: 400 });
  }

  await recordAudit({
    action: "REPORT_EXPORTED",
    actorId: guard.user.userId,
    actorRole: guard.user.role,
    metadata: { report, format, from: from.toISOString(), to: to.toISOString() },
    ...auditContextFromRequest(req),
  });

  const stamp = now.toISOString().slice(0, 10);
  const csvResponse = (name: string, body: string) =>
    new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });

  if (report === "turnaround") {
    const data = await turnaroundReport({ from, to });
    if (format === "json") return NextResponse.json(data);
    return csvResponse(
      "kpi-turnaround",
      toCsv(
        ["rebuttalId", "title", "facility", "matterType", "currentStatus", "deleted", "submittedAt", "firstDecision", "firstDecisionAt", "hoursToFirstDecision", "approvedAt", "hoursToApproval"],
        data.rows.map((r) => [r.rebuttalId, r.title, r.facility, r.matterType, r.currentStatus, r.deleted, r.submittedAt, r.firstDecision, r.firstDecisionAt, r.hoursToFirstDecision, r.approvedAt, r.hoursToApproval])
      )
    );
  }

  const data = await revisionCyclesReport({ from, to });
  if (format === "json") return NextResponse.json(data);
  return csvResponse(
    "kpi-revision-cycles",
    toCsv(
      ["rebuttalId", "title", "facility", "currentStatus", "deleted", "submittedAt", "revisionCycles", "withinTarget", "approved"],
      data.rows.map((r) => [r.rebuttalId, r.title, r.facility, r.currentStatus, r.deleted, r.submittedAt, r.revisionCycles, r.withinTarget, r.approved])
    )
  );
}
