import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { archiveOldModerationLogs } from "@/services/moderation.service";

// POST /api/admin/archive-moderation-logs
// Triggers archival of moderation logs older than 1 year (or a custom cutoff).
// ADMIN-only. Intended to be called on a schedule (e.g. monthly cron) or manually.
//
// Request body (optional):
//   { "cutoffDate": "2025-01-01T00:00:00.000Z" }
//   If omitted, defaults to 1 year ago from now.
export async function POST(req: NextRequest) {
  try {
    // AUTH CHECK
    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);

    // PERMISSION CHECK — ADMIN only
    if (!hasPermission(user.role, "manage_facilities")) {
      return NextResponse.json(
        { error: "Forbidden: admin access required" },
        { status: 403 }
      );
    }

    // Parse optional cutoff date from body
    let cutoffDate: Date | undefined;
    try {
      const body = await req.json() as { cutoffDate?: string };
      if (body.cutoffDate) {
        cutoffDate = new Date(body.cutoffDate);
        if (isNaN(cutoffDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid cutoffDate — must be a valid ISO 8601 date string" },
            { status: 400 }
          );
        }
      }
    } catch {
      // No body or empty body — use default cutoff (1 year ago)
    }

    const archivedCount = await archiveOldModerationLogs(cutoffDate);

    return NextResponse.json({
      success: true,
      archivedCount,
      cutoffDate: (cutoffDate ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)).toISOString(),
      message: `${archivedCount} moderation log(s) archived successfully.`,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to archive moderation logs" },
      { status: 500 }
    );
  }
}
