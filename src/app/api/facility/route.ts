import { NextRequest, NextResponse } from "next/server";
import { createFacility, getFacilities } from "@/services/facility.service";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { canCreateFacility } from "@/config/tiers";

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
    const userId = user.userId;

    // ROLE PERMISSION CHECK
    if (!hasPermission(user.role, "manage_facilities")) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    // TIER CHECK 
    const membership = await prisma.membership.findUnique({
      where: { userId },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 403 }
      );
    }

    const currentCount = await prisma.facility.count({
      where: { createdById: userId },
    });

    if (!canCreateFacility(membership.plan, currentCount)) {
      return NextResponse.json(
        { error: "Tier limit reached" },
        { status: 403 }
      );
    }

    // VALIDATION
    const body = await req.json();

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
      createdById: userId,
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