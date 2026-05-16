import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roleGuard";
import {
  approveRebuttal,
  rejectRebuttal,
} from "@/services/moderation.service";

export async function POST(req: NextRequest) {
  try {
    // RBAC CHECK
    const result = await requireRole(["ADMIN", "MODERATOR"]);

    if (result.error) {
      return result.error;
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
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use approve or reject only." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? "Rebuttal approved successfully"
          : "Rebuttal rejected successfully",
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