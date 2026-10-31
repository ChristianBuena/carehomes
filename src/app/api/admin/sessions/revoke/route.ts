import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/roleGuard";
import { revokeUserSessions } from "@/lib/auth";
import { auditContextFromRequest, recordAudit } from "@/services/audit.service";

/**
 * POST /api/admin/sessions/revoke — ADMIN only (SOW 11.1a).
 * Body: { userId: string }
 * Signs the user out everywhere: every token issued so far stops working on
 * the next request. Use after a role change, a suspected compromise, or when
 * someone leaves.
 */
export async function POST(req: NextRequest) {
  const guard = await requirePermission("manage_users");
  if (guard.error || !guard.user) {
    return guard.error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: unknown;
  try {
    ({ userId } = (await req.json()) as { userId?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (!(await revokeUserSessions(userId))) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await recordAudit({
    action: "AUTH_SESSIONS_REVOKED",
    actorId: guard.user.userId,
    actorRole: guard.user.role,
    targetType: "User",
    targetId: userId,
    ...auditContextFromRequest(req),
  });

  return NextResponse.json({ success: true });
}
