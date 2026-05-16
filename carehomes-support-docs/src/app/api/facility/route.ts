import { NextRequest, NextResponse } from "next/server";
import { createFacility, getFacilities } from "@/services/facility.service";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const facilities = await getFacilities();

    return NextResponse.json(facilities);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch facilities" },
      { status: 500 }
    );
  }
}

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

    // ROLE PERMISSION CHECK (UPDATED)
    if (!hasPermission(user.role, "manage_facilities")) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // VALIDATION
    if (!body.name || !body.address) {
      return NextResponse.json(
        { error: "Name and address are required" },
        { status: 400 }
      );
    }

    // CREATE FACILITY
    const facility = await createFacility({
      name: body.name,
      address: body.address,
      description: body.description,
      createdById: user.userId, // audit trail
    });

    return NextResponse.json(facility, { status: 201 });

  } catch (error) {
    console.error("Facility API error:", error);

    return NextResponse.json(
      { error: "Failed to create facility" },
      { status: 500 }
    );
  }
}