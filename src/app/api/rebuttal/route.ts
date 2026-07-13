import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createRebuttal } from "@/services/rebuttal.service";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);

    // ── 2. Permission — only MEMBERs may submit rebuttals ──────────────────
    if (!hasPermission(user.role, "submit_rebuttal")) {
      return NextResponse.json(
        { error: "Admins and moderators cannot submit rebuttals" },
        { status: 403 }
      );
    }

    // ── 3. Parse body ──────────────────────────────────────────────────────
    const body = await req.json();
    const { title, content, facilityId } = body as {
      title?: string;
      content?: string;
      facilityId?: string;
    };

    if (!title || !content || !facilityId) {
      return NextResponse.json(
        { error: "title, content, and facilityId are required" },
        { status: 400 }
      );
    }

    // ── 4. Facility ownership — must own the facility ──────────────────────
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    if (facility.createdById !== user.userId) {
      return NextResponse.json(
        { error: "You can only submit rebuttals for facilities you own" },
        { status: 403 }
      );
    }

    // ── 5. Create rebuttal ─────────────────────────────────────────────────
    const rebuttal = await createRebuttal({
      title,
      content,
      userId: user.userId,
      facilityId,
    });

    // ── 6. Notify ADMIN and MODERATOR accounts ─────────────────────────────
    try {
      const moderators = await prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "MODERATOR"] },
        },
        select: { email: true, name: true },
      });

      const submissionDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const moderationLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/moderation`;

      await Promise.all(
        moderators.map((mod) =>
          sendEmail({
            to: mod.email,
            subject: `CareHomesSupportDocs.org — New Rebuttal Submitted for Review`,
            text: `Hi ${mod.name},\n\nA new rebuttal has been submitted and requires your review.\n\nFacility: ${facility.name}\nRebuttal Title: ${title}\nSubmitted: ${submissionDate}\n\nReview it here: ${moderationLink}\n\n— CareHomesSupportDocs Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
                <div style="background: #1d3557; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px;">CareHomesSupportDocs.org</h1>
                </div>
                <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #1d3557; margin-top: 0;">📋 New Rebuttal Submitted</h2>
                  <p style="color: #374151;">Hi <strong>${mod.name}</strong>,</p>
                  <p style="color: #374151;">A new rebuttal has been submitted and is waiting for your review.</p>
                  <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0; color: #0369a1;"><strong>Facility:</strong> ${facility.name}</p>
                    <p style="margin: 8px 0 0; color: #0369a1;"><strong>Rebuttal Title:</strong> ${title}</p>
                    <p style="margin: 8px 0 0; color: #0369a1;"><strong>Submitted:</strong> ${submissionDate}</p>
                  </div>
                  <p style="color: #374151;">Please log in to the moderation dashboard to review, approve, or reject this submission.</p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${moderationLink}" style="background: #1d3557; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Go to Moderation Dashboard</a>
                  </div>
                  <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">You are receiving this because you are an Admin or Moderator on CareHomesSupportDocs.org.<br/>— CareHomesSupportDocs Team</p>
                </div>
              </div>
            `,
          })
        )
      );

      console.log(`Moderator alert sent to ${moderators.length} recipient(s)`);
    } catch (emailError) {
      // Don't fail the submission if email fails
      console.error("Failed to send moderator alert:", emailError);
    }

    return NextResponse.json(rebuttal);
  } catch {
    return NextResponse.json(
      { error: "Failed to create rebuttal" },
      { status: 500 }
    );
  }
}