import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createApprovedCopy } from "@/services/approved-copy.service";
import { auditContextFromRequest } from "@/services/audit.service";

/**
 * POST /api/rebuttal/[id]/approved-copy — MODERATOR and ADMIN.
 * Retries the "PUBLIC REDACTED VERSION" copy for an APPROVED rebuttal whose
 * copy failed at approval time (watermarkStatus = FAILED).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req.cookies.get("auth-token")?.value);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, "moderate_rebuttals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const rebuttal = await prisma.rebuttal.findFirst({ where: { id, deletedAt: null }, select: { status: true } });
  if (!rebuttal) return NextResponse.json({ error: "Rebuttal not found" }, { status: 404 });
  if (rebuttal.status !== "APPROVED") {
    return NextResponse.json({ error: "Only approved rebuttals have an approved copy" }, { status: 409 });
  }

  const result = await createApprovedCopy(id, { userId: user.userId, role: user.role }, auditContextFromRequest(req));
  if (result.status === "NO_DOCUMENT") {
    return NextResponse.json({ error: "This rebuttal has no document" }, { status: 400 });
  }
  return NextResponse.json({ success: result.status === "APPLIED", approvedCopy: result }, { status: result.status === "APPLIED" ? 200 : 502 });
}
