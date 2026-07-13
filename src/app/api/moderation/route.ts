import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission, type Permission } from "@/lib/permissions";
import {
  approveRebuttal,
  rejectRebuttal,
  requestFixRebuttal,
} from "@/services/moderation.service";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";

const ACTION_PERMISSION_MAP: Record<string, Permission> = {
  approve: "approve_rebuttal",
  reject: "reject_rebuttal",
  request_fix: "request_fix_rebuttal",
};

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);

    // ── 2. Top-level queue access ──────────────────────────────────────────
    if (!hasPermission(user.role, "moderate_rebuttals")) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    // ── 3. Parse + validate body ───────────────────────────────────────────
    const body = await req.json();
    const { id, action, notes, reason } = body as {
      id?: string;
      action?: string;
      notes?: string;
      reason?: string;
    };

    if (!id || !action) {
      return NextResponse.json(
        { error: "id and action are required" },
        { status: 400 }
      );
    }

    const requiredPermission = ACTION_PERMISSION_MAP[action];

    if (!requiredPermission) {
      return NextResponse.json(
        { error: "Invalid action. Use approve, reject, or request_fix." },
        { status: 400 }
      );
    }

    // ── 4. Per-action permission check ─────────────────────────────────────
    if (!hasPermission(user.role, requiredPermission)) {
      return NextResponse.json(
        { error: `Forbidden: you lack the '${requiredPermission}' permission` },
        { status: 403 }
      );
    }

    // ── 5. Fetch current rebuttal to check existing status ─────────────────
    const existingRebuttal = await prisma.rebuttal.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
        facility: { select: { name: true, slug: true } },
      },
    });

    if (!existingRebuttal) {
      return NextResponse.json({ error: "Rebuttal not found" }, { status: 404 });
    }

    // ── 6. No email if status is already the same ──────────────────────────
    const statusMap: Record<string, string> = {
      approve: "APPROVED",
      reject: "REJECTED",
      request_fix: "REQUEST_FIX",
    };

    const isSameStatus = existingRebuttal.status === statusMap[action];

    // ── 7. Execute action ──────────────────────────────────────────────────
    let rebuttal;

    if (action === "approve") {
      rebuttal = await approveRebuttal(id);
    } else if (action === "reject") {
      rebuttal = await rejectRebuttal(id);
    } else {
      rebuttal = await requestFixRebuttal(id);
    }

    // ── 8. Send notification email to member ───────────────────────────────
    if (!isSameStatus) {
      try {
        const memberEmail = existingRebuttal.user.email;
        const memberName = existingRebuttal.user.name;
        const facilityName = existingRebuttal.facility?.name ?? "your facility";
        const facilitySlug = existingRebuttal.facility?.slug ?? "";
        const rebuttalTitle = existingRebuttal.title;
        const facilityLink = `${process.env.NEXT_PUBLIC_APP_URL}/facilities/${facilitySlug}`;
        const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/rebuttals`;

        let subject = "";
        let text = "";
        let html = "";

        if (action === "approve") {
          subject = "CareHomesSupportDocs.org — Your Rebuttal Has Been Approved";
          text = `Hi ${memberName},\n\nGreat news! Your rebuttal "${rebuttalTitle}" for ${facilityName} has been APPROVED and is now published.\n\nView it here: ${facilityLink}\n\n— CareHomesSupportDocs Team`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
              <div style="background: #1d3557; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">CareHomesSupportDocs.org</h1>
              </div>
              <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #16a34a; margin-top: 0;">Rebuttal Approved!</h2>
                <p style="color: #374151;">Hi <strong>${memberName}</strong>,</p>
                <p style="color: #374151;">Great news! Your rebuttal has been <strong style="color: #16a34a;">APPROVED</strong> and is now published on the facility page.</p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0;">
                  <p style="margin: 0; color: #166534;"><strong>Facility:</strong> ${facilityName}</p>
                  <p style="margin: 8px 0 0; color: #166534;"><strong>Rebuttal:</strong> ${rebuttalTitle}</p>
                </div>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${facilityLink}" style="background: #16a34a; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View Published Rebuttal</a>
                </div>
                <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">— CareHomesSupportDocs Team</p>
              </div>
            </div>
          `;
        } else if (action === "reject") {
          subject = "CareHomesSupportDocs.org — Your Rebuttal Was Not Approved";
          text = `Hi ${memberName},\n\nUnfortunately, your rebuttal "${rebuttalTitle}" for ${facilityName} has been REJECTED.${reason ? `\n\nReason: ${reason}` : ""}\n\nIf you have questions, please contact our support team.\n\n— CareHomesSupportDocs Team`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
              <div style="background: #1d3557; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">CareHomesSupportDocs.org</h1>
              </div>
              <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #dc2626; margin-top: 0;">Rebuttal Not Approved</h2>
                <p style="color: #374151;">Hi <strong>${memberName}</strong>,</p>
                <p style="color: #374151;">We regret to inform you that your rebuttal has been <strong style="color: #dc2626;">REJECTED</strong> after review.</p>
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 24px 0;">
                  <p style="margin: 0; color: #991b1b;"><strong>Facility:</strong> ${facilityName}</p>
                  <p style="margin: 8px 0 0; color: #991b1b;"><strong>Rebuttal:</strong> ${rebuttalTitle}</p>
                  ${reason ? `<p style="margin: 8px 0 0; color: #991b1b;"><strong>Reason:</strong> ${reason}</p>` : ""}
                </div>
                <p style="color: #374151;">If you have questions, please contact our support team.</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${dashboardLink}" style="background: #1d3557; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Go to My Rebuttals</a>
                </div>
                <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">— CareHomesSupportDocs Team</p>
              </div>
            </div>
          `;
        } else if (action === "request_fix") {
          subject = "CareHomesSupportDocs.org — Revision Needed for Your Rebuttal";
          text = `Hi ${memberName},\n\nYour rebuttal "${rebuttalTitle}" for ${facilityName} requires revision before it can be approved.${notes ? `\n\nModerator Notes: ${notes}` : ""}\n\nPlease update your rebuttal and resubmit: ${dashboardLink}\n\n— CareHomesSupportDocs Team`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
              <div style="background: #1d3557; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">CareHomesSupportDocs.org</h1>
              </div>
              <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #d97706; margin-top: 0;">⚠️ Revision Needed</h2>
                <p style="color: #374151;">Hi <strong>${memberName}</strong>,</p>
                <p style="color: #374151;">Your rebuttal requires <strong style="color: #d97706;">REVISION</strong> before it can be approved. Please review the moderator notes below and resubmit.</p>
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 24px 0;">
                  <p style="margin: 0; color: #92400e;"><strong>Facility:</strong> ${facilityName}</p>
                  <p style="margin: 8px 0 0; color: #92400e;"><strong>Rebuttal:</strong> ${rebuttalTitle}</p>
                  ${notes ? `<p style="margin: 8px 0 0; color: #92400e;"><strong>Moderator Notes:</strong> ${notes}</p>` : ""}
                </div>
                <p style="color: #374151;">Please log in to your dashboard to update and resubmit your rebuttal.</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${dashboardLink}" style="background: #d97706; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Update My Rebuttal</a>
                </div>
                <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">— CareHomesSupportDocs Team</p>
              </div>
            </div>
          `;
        }

        await sendEmail({ to: memberEmail, subject, text, html });
        console.log(`Member notification sent to: ${memberEmail} (${action})`);
      } catch (emailError) {
        console.error("Failed to send member notification:", emailError);
      }
    } else {
      console.log(`Status unchanged (${statusMap[action]}) — no email sent`);
    }

    const messages: Record<string, string> = {
      approve: "Rebuttal approved successfully",
      reject: "Rebuttal rejected successfully",
      request_fix: "Fix requested — member has been notified",
    };

    return NextResponse.json({
      success: true,
      message: messages[action] ?? "Action completed",
      rebuttal,
    });
  } catch (err) {
    console.error("Moderation error:", err);

    return NextResponse.json(
      { error: "Moderation failed" },
      { status: 500 }
    );
  }
}