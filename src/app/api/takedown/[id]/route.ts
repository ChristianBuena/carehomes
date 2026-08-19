import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import {
  getTakedownById,
  resolveTakedownRequest,
  emergencyUnpublishRebuttal,
} from "@/services/takedown.service";
import { prisma } from "@/lib/prisma";

const takedownDelegate = (prisma as any).takedownRequest;

const updateTakedownSchema = z.object({
  action: z.enum(["resolve", "reject", "emergency_takedown", "assign", "in_review"]),
  resolutionNotes: z.string().optional(),
  rebuttalId: z.string().optional(),
  assignedToId: z.string().optional(),
  emergencyReason: z.string().optional(),
});

/**
 * Protected GET: Fetch single incident detail by ID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);
    if (!hasPermission(user.role, "manage_incidents")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    const request = await getTakedownById(id);

    if (!request) {
      return NextResponse.json({ error: "Takedown request not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, request });
  } catch (error) {
    console.error("Error fetching takedown request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Protected PATCH: Perform actions on an incident (resolve, reject, emergency unpublish, assign).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);
    if (!hasPermission(user.role, "manage_incidents")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = updateTakedownSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action, resolutionNotes, rebuttalId, assignedToId, emergencyReason } = validated.data;

    // Check request exists
    const existing = await takedownDelegate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Takedown request not found" }, { status: 404 });
    }

    if (action === "resolve" || action === "reject") {
      if (!resolutionNotes || resolutionNotes.trim().length < 5) {
        return NextResponse.json(
          { error: "Resolution notes are required (min 5 characters)" },
          { status: 400 }
        );
      }

      const status = action === "resolve" ? "RESOLVED" : "REJECTED";
      const updated = await resolveTakedownRequest({
        id,
        adminUserId: user.userId,
        status,
        resolutionNotes: resolutionNotes.trim(),
      });

      return NextResponse.json({
        success: true,
        message: `Incident marked as ${status}`,
        request: updated,
      });
    }

    if (action === "emergency_takedown") {
      const targetRebuttalId = rebuttalId || existing.rebuttalId;
      if (!targetRebuttalId) {
        return NextResponse.json(
          { error: "No associated rebuttal ID provided for emergency unpublish." },
          { status: 400 }
        );
      }

      const result = await emergencyUnpublishRebuttal({
        takedownId: id,
        rebuttalId: targetRebuttalId,
        adminUserId: user.userId,
        reason: emergencyReason || resolutionNotes || "Emergency takedown executed by moderation board.",
      });

      return NextResponse.json({
        success: true,
        message: "Emergency takedown executed. Rebuttal has been unpublished immediately.",
        result,
      });
    }

    if (action === "assign") {
      const updated = await takedownDelegate.update({
        where: { id },
        data: {
          assignedToId: assignedToId || null,
          status: "IN_REVIEW",
        },
      });

      return NextResponse.json({ success: true, request: updated });
    }

    if (action === "in_review") {
      const updated = await takedownDelegate.update({
        where: { id },
        data: { status: "IN_REVIEW" },
      });

      return NextResponse.json({ success: true, request: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating takedown request:", error);
    return NextResponse.json({ error: "Failed to update takedown request" }, { status: 500 });
  }
}
