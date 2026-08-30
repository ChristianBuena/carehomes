import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { MembershipPlan } from "@/generated/prisma/enums";
import { TIER_LIMITS } from "@/config/tiers";

export async function POST(req: NextRequest) {
  try {
    //  AUTH
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    const userId = user.userId;

    //  BODY
    const body = await req.json();
    const plan = body.plan as MembershipPlan;

    // VALIDATE PLAN
    if (!Object.values(MembershipPlan).includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    //  ensure TS understands key safety
    const maxFacilities =
      TIER_LIMITS[plan as keyof typeof TIER_LIMITS];

    //  UPSERT MEMBERSHIP
    const membership = await prisma.membership.upsert({
      where: { organizationId: user.orgId },
      update: {
        plan,
        status: "ACTIVE",
        maxFacilities,
      },
      create: {
        organizationId: user.orgId,
        plan,
        status: "ACTIVE",
        maxFacilities,
      },
    });

    return NextResponse.json({
      success: true,
      membership,
    });
  } catch (error) {
    console.error("Membership update error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}