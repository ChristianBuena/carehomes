import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/roleGuard";
import { MembershipPlan } from "@/generated/prisma/enums";
import { TIER_LIMITS } from "@/config/tiers";

/**
 * POST /api/membership/update — ADMIN-ONLY manual membership override.
 *
 * Members activate/upgrade ONLY through Stripe Checkout → webhook.
 * This endpoint previously let any logged-in user set their own org to an
 * ACTIVE paid plan for free; it is now restricted to `manage_memberships`.
 *
 * Body: { organizationId: string, plan: MembershipPlan }
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requirePermission("manage_memberships");
    if (guard.error || !guard.user) {
      return guard.error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const admin = guard.user;

    const body = (await req.json()) as {
      organizationId?: unknown;
      plan?: unknown;
    };

    if (typeof body.organizationId !== "string" || !body.organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    const plan = body.plan as MembershipPlan;
    if (!Object.values(MembershipPlan).includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: body.organizationId },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const maxFacilities = TIER_LIMITS[plan as keyof typeof TIER_LIMITS];
    const status = plan === "NONE" ? "INACTIVE" : "ACTIVE";

    const membership = await prisma.membership.upsert({
      where: { organizationId: org.id },
      update: { plan, status, maxFacilities },
      create: { organizationId: org.id, plan, status, maxFacilities },
    });

    console.log(
      `[membership] Admin ${admin.userId} set org ${org.id} to ${plan}/${status}`
    );

    return NextResponse.json({ success: true, membership });
  } catch (error) {
    console.error("Membership update error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}