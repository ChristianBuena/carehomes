import { NextRequest, NextResponse } from "next/server";
import {
  createFacility,
  getFacilities,
  withOrgFacilityQuota,
} from "@/services/facility.service";
import { resolveSessionUser } from "@/lib/auth";
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

    // orgId comes from the database, not the token (see resolveSessionUser).
    const user = await resolveSessionUser(token);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // PERMISSION CHECK — MEMBERs may claim; ADMINs use manage_facilities
    if (!hasPermission(user.role, "claim_facility")) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    // Read the body before taking the org lock (never hold a row lock across
    // request I/O). A parse failure is re-thrown at the point it used to occur.
    let body: { name?: string; address?: string; description?: string } | undefined;
    let bodyError: unknown;
    try {
      body = await req.json();
    } catch (err) {
      bodyError = err;
    }

    // TIER CHECK + CREATE — atomic. Membership is looked up by org (not by
    // user), the quota is scoped to the org, soft-deleted facilities do not
    // count, and the Organization row is locked so concurrent claims from the
    // same org cannot both pass the limit check.
    const result = await withOrgFacilityQuota(user.orgId, async (tx) => {
      // VALIDATION
      if (bodyError) throw bodyError;
      if (!body?.name || !body?.address) return null;

      // CREATE FACILITY — audit trail (createdById) + quota scope (organizationId)
      return createFacility(
        {
          name: body.name,
          address: body.address,
          description: body.description,
          createdById: user.userId,
          organizationId: user.orgId,
        },
        tx
      );
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.reason === "LIMIT_REACHED"
              ? "Facility limit reached — upgrade your plan to claim more facilities."
              : "No active subscription",
        },
        { status: 403 }
      );
    }

    const facility = result.value;

    if (!facility) {
      return NextResponse.json(
        { error: "Name and address are required" },
        { status: 400 }
      );
    }

    return NextResponse.json(facility, { status: 201 });

  } catch (error) {
    console.error("Facility API error:", error);

    return NextResponse.json(
      { error: "Failed to create facility" },
      { status: 500 }
    );
  }
}