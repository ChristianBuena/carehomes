import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import {
  approveRebuttal,
  rejectRebuttal,
  requestFixRebuttal,
} from "@/services/moderation.service";

export async function POST(req: NextRequest) {
  try {
    // AUTH CHECK
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);

    // PERMISSION CHECK (UPDATED)
    if (!hasPermission(user.role, "moderate_rebuttals")) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const { id, action } = body;

    // VALIDATION
    if (!id || !action) {
      return NextResponse.json(
        { error: "id and action are required" },
        { status: 400 }
      );
    }

    let rebuttal;

    // ACTION HANDLER
    if (action === "approve") {
      rebuttal = await approveRebuttal(id);
    } else if (action === "reject") {
      rebuttal = await rejectRebuttal(id);
    } else if (action === "request_fix") {
      rebuttal = await requestFixRebuttal(id);
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use approve, reject, or request_fix." },
        { status: 400 }
      );
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
  } catch (error) {
    console.error("Moderation error:", error);

    return NextResponse.json(
      { error: "Moderation failed" },
      { status: 500 }
    );
  }
}