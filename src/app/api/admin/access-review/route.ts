import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * GET  /api/admin/access-review
 * Returns users whose lastReviewedAt is null or older than 90 days.
 *
 * POST /api/admin/access-review
 * Marks a user as reviewed (updates lastReviewedAt to now).
 */

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!hasPermission(user.role, "moderate_rebuttals")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const usersNeedingReview = await prisma.user.findMany({
      where: {
        OR: [
          { lastReviewedAt: null },
          { lastReviewedAt: { lt: ninetyDaysAgo } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastReviewedAt: true,
        membership: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      count: usersNeedingReview.length,
      users: usersNeedingReview,
    });
  } catch (error) {
    console.error("Access review error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users for review" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const caller = await verifyToken(token);
    if (!hasPermission(caller.role, "moderate_rebuttals")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { lastReviewedAt: new Date() },
      select: { id: true, name: true, email: true, lastReviewedAt: true },
    });

    return NextResponse.json({
      success: true,
      message: `User ${updated.name || updated.email} marked as reviewed.`,
      user: updated,
    });
  } catch (error) {
    console.error("Access review mark error:", error);
    return NextResponse.json(
      { error: "Failed to mark user as reviewed" },
      { status: 500 }
    );
  }
}
