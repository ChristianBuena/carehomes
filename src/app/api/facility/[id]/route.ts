import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { getFacilityById, softDeleteFacility } from "@/services/facility.service";

// GET /api/facility/[id] — fetch a single facility by ID (active only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const facility = await getFacilityById(id);

    if (!facility) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    return NextResponse.json(facility);
  } catch {
    return NextResponse.json({ error: "Failed to fetch facility" }, { status: 500 });
  }
}

// DELETE /api/facility/[id] — soft-delete a facility (ADMIN only)
// Sets deletedAt timestamp instead of removing the row.
// Preserves all related rebuttals, audit trails, and org quota history.
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

    // PERMISSION CHECK — only ADMINs may delete facilities
    if (!hasPermission(user.role, "manage_facilities")) {
      return NextResponse.json(
        { error: "Forbidden: only admins can delete facilities" },
        { status: 403 }
      );
    }

    // Verify the facility exists and is not already deleted
    const facility = await getFacilityById(id);
    if (!facility) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    // SOFT DELETE — sets deletedAt, does NOT remove row
    await softDeleteFacility(id);

    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: "Failed to delete facility" }, { status: 500 });
  }
}
