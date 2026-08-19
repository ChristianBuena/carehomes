import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import { TakedownReason, TakedownStatus } from "@/types/takedown.types";
import { RebuttalStatus } from "@prisma/client";

const takedownDelegate = (prisma as any).takedownRequest;

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateTakedownInput {
  requesterName: string;
  requesterEmail: string;
  facilityOrRebuttal: string;
  reason: TakedownReason;
  reasonDetails?: string;
  supportingInfo: string;
  rebuttalId?: string;
  facilityId?: string;
}

export type SlaUrgency = "HEALTHY" | "WARNING" | "CRITICAL" | "OVERDUE" | "RESOLVED";

export interface TakedownWithSla {
  id: string;
  ticketNumber: string;
  requesterName: string;
  requesterEmail: string;
  facilityOrRebuttal: string;
  reason: TakedownReason;
  reasonDetails: string | null;
  supportingInfo: string;
  status: TakedownStatus;
  submittedAt: Date;
  slaDeadline: Date;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  isEmergencyTakedown: boolean;
  emergencyUnpublishedAt: Date | null;
  rebuttalId: string | null;
  rebuttal?: {
    id: string;
    title: string;
    status: RebuttalStatus;
    facility?: {
      name: string;
      slug: string;
    } | null;
  } | null;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  resolvedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  slaUrgency: SlaUrgency;
  remainingHours: number;
  remainingMinutes: number;
  isOverdue: boolean;
}

// ── Helper: SLA Calculation ──────────────────────────────────────────────────

export function calculateSla(submittedAt: Date, slaDeadline: Date, status: TakedownStatus) {
  if (status === "RESOLVED" || status === "REJECTED") {
    return {
      slaUrgency: "RESOLVED" as SlaUrgency,
      remainingHours: 0,
      remainingMinutes: 0,
      isOverdue: false,
    };
  }

  const now = new Date().getTime();
  const deadline = new Date(slaDeadline).getTime();
  const diffMs = deadline - now;
  const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
  const remainingMinutes = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
  const isOverdue = diffMs <= 0;

  let slaUrgency: SlaUrgency = "HEALTHY";
  if (isOverdue) {
    slaUrgency = "OVERDUE";
  } else if (remainingHours < 24) {
    slaUrgency = "CRITICAL";
  } else if (remainingHours < 48) {
    slaUrgency = "WARNING";
  }

  return {
    slaUrgency,
    remainingHours,
    remainingMinutes,
    isOverdue,
  };
}

// ── Helper: Ticket Number Generation ─────────────────────────────────────────

function generateTicketNumber(): string {
  const year = new Date().getFullYear();
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `TDR-${year}-${randomChars}${randomDigits}`;
}

// ── Email Templates ──────────────────────────────────────────────────────────

function getAcknowledgmentEmailHtml(ticketNumber: string, requesterName: string, facilityOrRebuttal: string, reason: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Takedown Request Acknowledgment</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F4FF;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1B3A6B;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#93C5FD;letter-spacing:1px;text-transform:uppercase;">CareHomesSupportDocs.org</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Takedown Request Received</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#0F1F3D;">Hello <strong>${requesterName}</strong>,</p>
              <p style="margin:0 0 20px;font-size:15px;color:#3B5080;line-height:1.6;">
                We have received your content takedown / privacy request. Our moderation team has been notified and will investigate this matter in accordance with our <strong>72-Hour Response Target</strong>.
              </p>
              
              <div style="background:#F0F4FF;border:1px solid #C7D4F0;border-radius:10px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:12px;color:#6B7FA3;text-transform:uppercase;letter-spacing:0.5px;">Ticket Reference</p>
                <p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#1B3A6B;letter-spacing:1px;">${ticketNumber}</p>
                <p style="margin:0 0 6px;font-size:14px;color:#0F1F3D;"><strong>Target Content:</strong> ${facilityOrRebuttal}</p>
                <p style="margin:0;font-size:14px;color:#0F1F3D;"><strong>Reported Reason:</strong> ${reason}</p>
              </div>

              <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;font-size:14px;color:#92400E;line-height:1.5;">
                  <strong>Our 72-Hour SLA Commitment:</strong> You will receive a formal determination and update via this email within 72 hours of submission.
                </p>
              </div>

              <p style="margin:0;font-size:13px;color:#6B7FA3;line-height:1.6;">
                If you have additional supporting documentation, please reply directly to this email with your ticket number in the subject line.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;text-align:center;border-top:1px solid #E8EFFE;">
              <p style="margin:0 0 4px;font-size:12px;color:#6B7FA3;">CareHomesSupportDocs.org — Compliance & Moderation</p>
              <p style="margin:0;font-size:11px;color:#9DB0CC;">This is an automated acknowledgment. Permanent Incident Record ID: ${ticketNumber}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getResolutionEmailHtml(ticketNumber: string, requesterName: string, status: string, notes: string): string {
  const isApproved = status === "RESOLVED";
  const badgeColor = isApproved ? "#15803D" : "#DC2626";
  const statusLabel = isApproved ? "Resolved / Content Removed" : "Request Denied / Retained";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Takedown Request Resolution</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F4FF;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1B3A6B;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#93C5FD;letter-spacing:1px;text-transform:uppercase;">CareHomesSupportDocs.org</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Takedown Request Decision</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#0F1F3D;">Hello <strong>${requesterName}</strong>,</p>
              <p style="margin:0 0 20px;font-size:15px;color:#3B5080;line-height:1.6;">
                Our moderation board has completed review of your takedown request <strong>${ticketNumber}</strong>.
              </p>

              <div style="background:#F0F4FF;border:1px solid #C7D4F0;border-radius:10px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:12px;color:#6B7FA3;text-transform:uppercase;">Status Determination</p>
                <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:${badgeColor};">${statusLabel}</p>
                ${notes ? `<p style="margin:0;font-size:14px;color:#0F1F3D;line-height:1.5;"><strong>Moderator Notes:</strong><br/>${notes}</p>` : ""}
              </div>

              <p style="margin:0;font-size:13px;color:#6B7FA3;line-height:1.6;">
                If you believe this decision was made in error, you may file an appeal within 14 days by replying to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;text-align:center;border-top:1px solid #E8EFFE;">
              <p style="margin:0;font-size:12px;color:#6B7FA3;">CareHomesSupportDocs.org — Compliance & Moderation Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ── Service API ──────────────────────────────────────────────────────────────

/**
 * Public submission of a takedown request.
 * Generates ticket, sets 72h SLA deadline, persists to DB, and sends auto-acknowledgment.
 */
export async function createTakedownRequest(data: CreateTakedownInput) {
  const ticketNumber = generateTicketNumber();
  const submittedAt = new Date();
  const slaDeadline = new Date(submittedAt.getTime() + 72 * 60 * 60 * 1000); // 72-hour SLA

  const request = await takedownDelegate.create({
    data: {
      ticketNumber,
      requesterName: data.requesterName,
      requesterEmail: data.requesterEmail,
      facilityOrRebuttal: data.facilityOrRebuttal,
      reason: data.reason,
      reasonDetails: data.reasonDetails,
      supportingInfo: data.supportingInfo,
      status: "PENDING",
      submittedAt,
      slaDeadline,
      rebuttalId: data.rebuttalId || undefined,
    },
  });

  // Send auto-acknowledgment email (async, safe)
  try {
    await sendEmail({
      to: data.requesterEmail,
      subject: `[${ticketNumber}] CareHomesSupportDocs.org Takedown Request Acknowledgment (72h SLA)`,
      text: `Hello ${data.requesterName},\n\nWe have received your takedown request (${ticketNumber}) regarding "${data.facilityOrRebuttal}". Our moderation board will review this within our 72-hour target SLA.\n\n— CareHomesSupportDocs.org Moderation Team`,
      html: getAcknowledgmentEmailHtml(ticketNumber, data.requesterName, data.facilityOrRebuttal, data.reason),
    });
  } catch (emailErr) {
    console.error("Failed to send requester acknowledgment email:", emailErr);
  }

  // Alert Admins and Moderators
  try {
    const moderators = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "MODERATOR"] } },
      select: { email: true, name: true },
    });

    const alertText = `A new takedown request has been submitted (${ticketNumber}) with 72-hour SLA deadline: ${slaDeadline.toLocaleString()}.\nTarget: ${data.facilityOrRebuttal}\nReason: ${data.reason}\nRequester: ${data.requesterName} (${data.requesterEmail})`;

    await Promise.all(
      moderators.map((m) =>
        sendEmail({
          to: m.email,
          subject: `[URGENT 72h SLA] New Takedown Request ${ticketNumber}`,
          text: alertText,
        })
      )
    );
  } catch (modAlertErr) {
    console.error("Failed to notify moderators of takedown request:", modAlertErr);
  }

  return request;
}

/**
 * Fetch all takedown requests with live SLA calculations and optional status filtering.
 */
export async function getTakedownRequests(options?: {
  status?: TakedownStatus | "ALL";
  query?: string;
}) {
  const where: any = {};

  if (options?.status && options.status !== "ALL") {
    where.status = options.status;
  }

  if (options?.query) {
    where.OR = [
      { ticketNumber: { contains: options.query, mode: "insensitive" } },
      { requesterName: { contains: options.query, mode: "insensitive" } },
      { requesterEmail: { contains: options.query, mode: "insensitive" } },
      { facilityOrRebuttal: { contains: options.query, mode: "insensitive" } },
    ];
  }

  const requests = await takedownDelegate.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
      rebuttal: {
        select: {
          id: true,
          title: true,
          status: true,
          facility: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { slaDeadline: "asc" },
    ],
  });

  return requests.map((req: any) => {
    const sla = calculateSla(req.submittedAt, req.slaDeadline, req.status);
    return {
      ...req,
      ...sla,
    } as TakedownWithSla;
  });
}

/**
 * Fetch a single takedown incident by ID.
 */
export async function getTakedownById(id: string) {
  const req = await takedownDelegate.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
      rebuttal: {
        select: {
          id: true,
          title: true,
          content: true,
          status: true,
          documentUrl: true,
          facility: { select: { id: true, name: true, slug: true } },
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!req) return null;

  const sla = calculateSla(req.submittedAt, req.slaDeadline, req.status);
  return {
    ...req,
    ...sla,
  };
}

/**
 * Resolve or reject a takedown request. Logs resolvedAt, resolvedById, and resolutionNotes.
 */
export async function resolveTakedownRequest(params: {
  id: string;
  adminUserId: string;
  status: "RESOLVED" | "REJECTED";
  resolutionNotes: string;
}) {
  const request = await takedownDelegate.update({
    where: { id: params.id },
    data: {
      status: params.status,
      resolvedAt: new Date(),
      resolvedById: params.adminUserId,
      resolutionNotes: params.resolutionNotes,
    },
  });

  // Notify requester of resolution
  try {
    await sendEmail({
      to: request.requesterEmail,
      subject: `[${request.ticketNumber}] CareHomesSupportDocs.org Takedown Request Status Update`,
      text: `Your takedown request (${request.ticketNumber}) has been updated to: ${params.status}.\n\nNotes: ${params.resolutionNotes}`,
      html: getResolutionEmailHtml(
        request.ticketNumber,
        request.requesterName,
        params.status,
        params.resolutionNotes
      ),
    });
  } catch (err) {
    console.error("Failed to send resolution email:", err);
  }

  return request;
}

/**
 * Emergency Takedown Procedure:
 * Instantly unpublishes a rebuttal, records an emergency ModerationLog audit entry,
 * and updates the incident record.
 */
export async function emergencyUnpublishRebuttal(params: {
  takedownId?: string;
  rebuttalId: string;
  adminUserId: string;
  reason: string;
}) {
  // 1. Fetch current rebuttal status
  const rebuttal = await prisma.rebuttal.findUnique({
    where: { id: params.rebuttalId },
    include: { facility: true, user: true },
  });

  if (!rebuttal) {
    throw new Error("Rebuttal not found");
  }

  // 2. Transaction: Update Rebuttal to REJECTED + create ModerationLog
  const [updatedRebuttal, moderationLog] = await prisma.$transaction([
    prisma.rebuttal.update({
      where: { id: params.rebuttalId },
      data: { status: "REJECTED" },
    }),
    prisma.moderationLog.create({
      data: {
        rebuttalId: params.rebuttalId,
        moderatorId: params.adminUserId,
        fromStatus: rebuttal.status,
        toStatus: "REJECTED",
        notes: `[EMERGENCY TAKEDOWN] Immediately unpublished due to privacy/policy violation: ${params.reason}`,
      },
    }),
  ]);

  // 3. Update associated takedown request if provided
  if (params.takedownId) {
    await takedownDelegate.update({
      where: { id: params.takedownId },
      data: {
        isEmergencyTakedown: true,
        emergencyUnpublishedAt: new Date(),
        status: "IN_REVIEW",
        resolutionNotes: `Emergency takedown executed. Rebuttal ${params.rebuttalId} unpublished immediately.`,
      },
    });
  }

  return {
    rebuttal: updatedRebuttal,
    moderationLog,
  };
}
