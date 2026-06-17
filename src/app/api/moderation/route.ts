import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission, type Permission } from "@/lib/permissions";
import {
  approveRebuttal,
  rejectRebuttal,
  requestFixRebuttal,
} from "@/services/moderation.service";

const ACTION_PERMISSION_MAP: Record<string, Permission> = {
  approve: "approve_rebuttal",
  reject: "reject_rebuttal",
  request_fix: "request_fix_rebuttal",
};

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);

    // ── 2. Top-level queue access ──────────────────────────────────────────
    if (!hasPermission(user.role, "moderate_rebuttals")) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    // ── 3. Parse + validate body ───────────────────────────────────────────
    const body = await req.json();
    const { id, action } = body as { id?: string; action?: string };

    if (!id || !action) {
      return NextResponse.json(
        { error: "id and action are required" },
        { status: 400 }
      );
    }

    const requiredPermission = ACTION_PERMISSION_MAP[action];

    if (!requiredPermission) {
      return NextResponse.json(
        { error: "Invalid action. Use approve, reject, or request_fix." },
        { status: 400 }
      );
    }

    // ── 4. Per-action permission check ─────────────────────────────────────
    if (!hasPermission(user.role, requiredPermission)) {
      return NextResponse.json(
        { error: `Forbidden: you lack the '${requiredPermission}' permission` },
        { status: 403 }
      );
    }

    // ── 5. Execute action ──────────────────────────────────────────────────
    let rebuttal;

    if (action === "approve") {
      rebuttal = await approveRebuttal(id);
    } else if (action === "reject") {
      rebuttal = await rejectRebuttal(id);
    } else {
      // action === "request_fix"
      rebuttal = await requestFixRebuttal(id);
    }

    const messages: Record<string, string> = {
      approve: "Rebuttal approved successfully",
      reject: "Rebuttal rejected successfully",
      request_fix: "Fix requested — member has been notified",
    };

    return NextResponse.json({
      success: true,
      message: messages[action] ?? "Action completed",
      rebuttal,
    });
  } catch (err) {
    console.error("Moderation error:", err);

    return NextResponse.json(
      { error: "Moderation failed" },
      { status: 500 }
    );
  }
}