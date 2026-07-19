import { NextRequest, NextResponse } from "next/server";
import { createFacility, getFacilities } from "@/services/facility.service";
import { verifyToken } from "@/lib/jwt";
import { hasPermission, canClaimFacility } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

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

    // PERMISSION CHECK — MEMBERs may claim; ADMINs use manage_facilities
    if (!hasPermission(user.role, "claim_facility")) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    // TIER CHECK — look up membership by org, not by user
    const membership = await prisma.membership.findUnique({
      where: { organizationId: user.orgId },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 403 }
      );
    }

    // Quota scoped to org (not individual user)
    const currentCount = await prisma.facility.count({
      where: { organizationId: user.orgId },
    });

    if (!canClaimFacility(membership.plan, currentCount)) {
      return NextResponse.json(
        { error: "Facility limit reached — upgrade your plan to claim more facilities." },
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

    // CREATE FACILITY — audit trail (createdById) + quota scope (organizationId)
    const facility = await createFacility({
      name: body.name,
      address: body.address,
      description: body.description,
      createdById: user.userId,
      organizationId: user.orgId,
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