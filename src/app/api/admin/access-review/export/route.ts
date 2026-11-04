import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { auditContextFromRequest, recordAudit, toCsv } from "@/services/audit.service";

/**
 * GET /api/admin/access-review/export — ADMIN and MODERATOR (SOW 11.1).
 * The quarterly permission audit record: every review in the range, with
 * the account, its role at the time, the decision, the notes and the
 * reviewer. Query: from, to (ISO 8601; default = last 90 days),
 * format = csv (default) | json. Each export is audited.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get("auth-token")?.value);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, "moderate_rebuttals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 90);
  const from = params.get("from") ? new Date(params.get("from")!) : defaultFrom;
  const to = params.get("to") ? new Date(params.get("to")!) : now;
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: "from and to must be ISO 8601 dates, from <= to" }, { status: 400 });
  }
  const format = params.get("format") ?? "csv";
  if (format !== "csv" && format !== "json") {
    return NextResponse.json({ error: "format must be csv or json" }, { status: 400 });
  }

  const reviews = await prisma.accessReview.findMany({
    where: { reviewedAt: { gte: from, lte: to } },
    orderBy: { reviewedAt: "asc" },
    select: {
      id: true,
      reviewedAt: true,
      decision: true,
      notes: true,
      roleAtReview: true,
      reviewerRole: true,
      user: { select: { id: true, name: true, email: true, role: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });

  await recordAudit({
    action: "ACCESS_REVIEW_EXPORTED",
    actorId: user.userId,
    actorRole: user.role,
    metadata: { rowCount: reviews.length, from: from.toISOString(), to: to.toISOString(), format },
    ...auditContextFromRequest(req),
  });

  if (format === "json") {
    return NextResponse.json({ from, to, count: reviews.length, reviews });
  }

  const csv = toCsv(
    [
      "reviewId",
      "reviewedAt",
      "accountId",
      "accountName",
      "accountEmail",
      "roleAtReview",
      "currentRole",
      "decision",
      "notes",
      "reviewerId",
      "reviewerName",
      "reviewerRole",
    ],
    reviews.map((r) => [
      r.id,
      r.reviewedAt,
      r.user.id,
      r.user.name,
      r.user.email,
      r.roleAtReview,
      r.user.role,
      r.decision,
      r.notes,
      r.reviewer?.id ?? null,
      r.reviewer?.name ?? null,
      r.reviewerRole,
    ])
  );
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="access-review-${now.toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
