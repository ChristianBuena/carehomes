import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { getRebuttalById, softDeleteRebuttal } from "@/services/rebuttal.service";

// GET /api/rebuttal/[id] — fetch a single rebuttal by ID (active only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rebuttal = await getRebuttalById(id);

    if (!rebuttal) {
      return NextResponse.json({ error: "Rebuttal not found" }, { status: 404 });
    }

    return NextResponse.json(rebuttal);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rebuttal" }, { status: 500 });
  }
}

// DELETE /api/rebuttal/[id] — soft-delete a rebuttal (owner or ADMIN)
// Sets deletedAt timestamp instead of removing the row.
// All associated moderation logs and takedown records are preserved.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // AUTH CHECK
    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);

    // Fetch the rebuttal to verify existence and ownership
    const rebuttal = await getRebuttalById(id);
    if (!rebuttal) {
      return NextResponse.json({ error: "Rebuttal not found" }, { status: 404 });
    }

    // AUTHORIZATION — owner can delete their own; ADMIN can delete any
    const isOwner = rebuttal.user.id === user.userId;
    const isAdmin = hasPermission(user.role, "manage_facilities"); // ADMINs have full access

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: you do not have permission to delete this rebuttal" },
        { status: 403 }
      );
    }

    // SOFT DELETE — sets deletedAt, does NOT remove row
    await softDeleteRebuttal(id);

    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: "Failed to delete rebuttal" }, { status: 500 });
  }
}
