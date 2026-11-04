import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { AccessReviewDecision } from "@/generated/prisma/enums";
import { auditContextFromRequest, recordAudit } from "@/services/audit.service";

/**
 * Quarterly access review (SOW 11.1). ADMIN and MODERATOR.
 * src/proxy.ts lets MODERATORs through on this path only; every other
 * /api/admin/* route stays ADMIN-only.
 *
 * GET  /api/admin/access-review
 *   Users whose lastReviewedAt is null or older than 90 days, each with their
 *   most recent review (who, when, decision).
 *
 * POST /api/admin/access-review
 *   Body: { userId, decision?: "KEEP_ACCESS" | "CHANGE_REQUESTED", notes? }
 *   Records a review row (reviewer, date, decision, notes) and refreshes
 *   lastReviewedAt. CHANGE_REQUESTED requires notes. A MODERATOR may not
 *   review an ADMIN account or their own.
 */

const REVIEW_INTERVAL_DAYS = 90;
const MAX_NOTES = 1000;

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req.cookies.get("auth-token")?.value);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.role, "moderate_rebuttals")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - REVIEW_INTERVAL_DAYS);

    const usersNeedingReview = await prisma.user.findMany({
      where: {
        OR: [{ lastReviewedAt: null }, { lastReviewedAt: { lt: cutoff } }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastReviewedAt: true,
        // Membership belongs to the Organization (CH-18), not the User.
        organization: {
          select: {
            membership: {
              select: {
                plan: true,
                status: true,
              },
            },
          },
        },
        accessReviewsReceived: {
          orderBy: { reviewedAt: "desc" },
          take: 1,
          select: {
            reviewedAt: true,
            decision: true,
            reviewer: { select: { id: true, name: true } },
          },
        },
        // `satisfies` makes tsc reject unknown fields here — the generic
        // findMany() signature alone does not (see docs/KNOWN_ISSUES.md).
      } satisfies Prisma.UserSelect,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      count: usersNeedingReview.length,
      users: usersNeedingReview.map(({ accessReviewsReceived, ...u }) => ({
        ...u,
        lastReview: accessReviewsReceived[0] ?? null,
      })),
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
    const caller = await getSessionUser(req.cookies.get("auth-token")?.value);
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(caller.role, "moderate_rebuttals")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: { userId?: unknown; decision?: unknown; notes?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { userId } = body;
    if (typeof userId !== "string" || !userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const decision = body.decision ?? AccessReviewDecision.KEEP_ACCESS;
    if (!Object.values(AccessReviewDecision).includes(decision as AccessReviewDecision)) {
      return NextResponse.json(
        { error: "decision must be KEEP_ACCESS or CHANGE_REQUESTED" },
        { status: 400 }
      );
    }

    if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") {
      return NextResponse.json({ error: "notes must be text" }, { status: 400 });
    }
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (notes.length > MAX_NOTES) {
      return NextResponse.json({ error: `notes must be at most ${MAX_NOTES} characters` }, { status: 400 });
    }
    if (decision === AccessReviewDecision.CHANGE_REQUESTED && !notes) {
      return NextResponse.json(
        { error: "Describe the change needed when requesting a change" },
        { status: 400 }
      );
    }

    // A moderator may not sign off on an ADMIN account (or their own):
    // privileged access must be reviewed by someone with more authority.
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (caller.role !== "ADMIN" && (target.role === "ADMIN" || target.id === caller.userId)) {
      return NextResponse.json(
        { error: "Forbidden: only an admin can review this account" },
        { status: 403 }
      );
    }

    const reviewedAt = new Date();
    const [review, updated] = await prisma.$transaction([
      prisma.accessReview.create({
        data: {
          userId: target.id,
          reviewerId: caller.userId,
          reviewerRole: caller.role,
          roleAtReview: target.role,
          decision: decision as AccessReviewDecision,
          notes: notes || null,
          reviewedAt,
        },
      }),
      prisma.user.update({
        where: { id: target.id },
        data: { lastReviewedAt: reviewedAt },
        select: { id: true, name: true, email: true, lastReviewedAt: true },
      }),
    ]);

    await recordAudit({
      action: "ACCESS_REVIEWED",
      actorId: caller.userId,
      actorRole: caller.role,
      targetType: "User",
      targetId: target.id,
      metadata: { decision, roleAtReview: target.role, reviewId: review.id },
      ...auditContextFromRequest(req),
    });

    return NextResponse.json({
      success: true,
      message: `User ${updated.name || updated.email} marked as reviewed.`,
      user: updated,
      review: {
        id: review.id,
        decision: review.decision,
        reviewedAt: review.reviewedAt,
        reviewerId: review.reviewerId,
      },
    });
  } catch (error) {
    console.error("Access review mark error:", error);
    return NextResponse.json(
      { error: "Failed to mark user as reviewed" },
      { status: 500 }
    );
  }
}
