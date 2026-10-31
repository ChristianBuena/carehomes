import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/roleGuard";
import {
  AUDIT_ACTIONS,
  type AuditAction,
  auditContextFromRequest,
  auditRowsToCsv,
  queryAuditLog,
  recordAudit,
} from "@/services/audit.service";

/**
 * GET /api/admin/audit-log — ADMIN-only export of the append-only audit log.
 *
 * Query: from, to (ISO 8601), action (one of AUDIT_ACTIONS), actorId,
 *        format = csv (default) | json.
 * There is deliberately no POST, PATCH or DELETE: no role can edit or remove
 * audit rows (the database rejects it too).
 */
export async function GET(req: NextRequest) {
  const guard = await requirePermission("manage_users");
  if (guard.error || !guard.user) {
    return guard.error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = guard.user;

  const params = req.nextUrl.searchParams;

  const parseDate = (name: string): Date | undefined | "invalid" => {
    const raw = params.get(name);
    if (!raw) return undefined;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "invalid" : d;
  };
  const from = parseDate("from");
  const to = parseDate("to");
  if (from === "invalid" || to === "invalid") {
    return NextResponse.json({ error: "from and to must be ISO 8601 dates" }, { status: 400 });
  }

  const actionParam = params.get("action");
  if (actionParam && !(AUDIT_ACTIONS as readonly string[]).includes(actionParam)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  const action = (actionParam ?? undefined) as AuditAction | undefined;

  const format = params.get("format") ?? "csv";
  if (format !== "csv" && format !== "json") {
    return NextResponse.json({ error: "format must be csv or json" }, { status: 400 });
  }

  const rows = await queryAuditLog({
    from,
    to,
    action,
    actorId: params.get("actorId") ?? undefined,
  });

  await recordAudit({
    action: "AUDIT_LOG_EXPORTED",
    actorId: admin.userId,
    actorRole: admin.role,
    metadata: {
      rowCount: rows.length,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      filterAction: action ?? null,
      format,
    },
    ...auditContextFromRequest(req),
  });

  if (format === "json") {
    return NextResponse.json({ count: rows.length, rows });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(auditRowsToCsv(rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
