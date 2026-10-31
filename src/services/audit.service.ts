import { prisma } from "@/lib/prisma";
import { getClientIp, UNKNOWN_CLIENT_IP } from "@/lib/client-ip";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";

/**
 * General audit log (SOW 3E.5).
 *
 * Rules:
 * - Append-only. This module only ever INSERTs. The database rejects UPDATE,
 *   DELETE and TRUNCATE on "AuditLog" with a trigger (migration
 *   20261031120000_add_audit_log), so no role can edit or remove a row.
 * - No email addresses, passwords, OTP codes, tokens or document contents go
 *   into a row. Use ids. `metadata` is for small, non-personal facts
 *   (old/new plan, status, count).
 * - A failed audit write is logged and does not fail the user's request.
 */
export const AUDIT_ACTIONS = [
  // Authentication
  "AUTH_SIGNUP",
  "AUTH_LOGIN_PASSWORD_OK",
  "AUTH_LOGIN_FAILED",
  "AUTH_LOGIN_LOCKED",
  "AUTH_MFA_FAILED",
  "AUTH_LOGIN_SUCCESS",
  "AUTH_LOGOUT",
  "AUTH_SESSIONS_REVOKED",
  // Facilities
  "FACILITY_CREATED",
  "FACILITY_CLAIMED",
  "FACILITY_DELETED",
  // Rebuttals
  "REBUTTAL_SUBMITTED",
  "REBUTTAL_UPDATED",
  "REBUTTAL_DELETED",
  "REBUTTAL_APPROVED",
  "REBUTTAL_REJECTED",
  "REBUTTAL_FIX_REQUESTED",
  "REBUTTAL_WATERMARK_FAILED",
  // Files and sharing
  "FILE_UPLOADED",
  "FILE_UPDATED",
  "FILE_DELETED",
  "FILE_DOWNLOADED",
  "SHARE_LINK_CREATED",
  "SHARE_LINK_REVOKED",
  "SHARE_LINK_FILE_DOWNLOADED",
  // Membership, billing, accounts
  "MEMBERSHIP_ADMIN_OVERRIDE",
  "MEMBERSHIP_STRIPE_UPDATE",
  "SEAT_LINKED",
  "ACCESS_REVIEWED",
  // Incidents and templates
  "TAKEDOWN_SUBMITTED",
  "TAKEDOWN_RESOLVED",
  "TAKEDOWN_REJECTED",
  "TAKEDOWN_ASSIGNED",
  "TAKEDOWN_EMERGENCY_UNPUBLISH",
  "TEMPLATE_CREATED",
  "TEMPLATE_DELETED",
  // Admin
  "MODERATION_LOGS_ARCHIVED",
  "AUDIT_LOG_EXPORTED",
  "ACCESS_REVIEW_EXPORTED",
  "REPORT_EXPORTED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditEntry = AuditContext & {
  action: AuditAction;
  actorId?: string | null;
  actorRole?: Role | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

const MAX_USER_AGENT = 512;

/** IP + user agent from a route handler request. */
export function auditContextFromRequest(req: { headers: Headers }): AuditContext {
  const ip = getClientIp(req);
  return {
    ipAddress: ip === UNKNOWN_CLIENT_IP ? null : ip,
    userAgent: req.headers.get("user-agent")?.slice(0, MAX_USER_AGENT) ?? null,
  };
}

/** IP + user agent inside a server action (reads next/headers). */
export async function auditContextFromHeaders(): Promise<AuditContext> {
  try {
    const { headers } = await import("next/headers");
    return auditContextFromRequest({ headers: await headers() });
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Appends one row. Never throws: a failed write is logged (action name only)
 * so the caller's request still completes.
 */
export async function recordAudit(
  entry: AuditEntry,
  client: Pick<Prisma.TransactionClient, "auditLog"> = prisma
): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        actorRole: entry.actorRole ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent?.slice(0, MAX_USER_AGENT) ?? null,
        metadata: entry.metadata,
      },
    });
  } catch (err) {
    console.error(`[audit] Failed to write ${entry.action}:`, err instanceof Error ? err.message : err);
  }
}

// ── Export ──────────────────────────────────────────────────────────────────

export type AuditQuery = {
  from?: Date;
  to?: Date;
  action?: AuditAction;
  actorId?: string;
  limit?: number;
};

export const AUDIT_EXPORT_MAX_ROWS = 50_000;

export async function queryAuditLog(q: AuditQuery) {
  return prisma.auditLog.findMany({
    where: {
      ...(q.from || q.to
        ? { createdAt: { ...(q.from && { gte: q.from }), ...(q.to && { lte: q.to }) } }
        : {}),
      ...(q.action && { action: q.action }),
      ...(q.actorId && { actorId: q.actorId }),
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(q.limit ?? AUDIT_EXPORT_MAX_ROWS, AUDIT_EXPORT_MAX_ROWS),
  });
}

/** RFC 4180 CSV cell. Also neutralises spreadsheet formulas (=, +, -, @). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const AUDIT_CSV_HEADER = [
  "id",
  "createdAt",
  "actorId",
  "actorRole",
  "action",
  "targetType",
  "targetId",
  "ipAddress",
  "userAgent",
  "metadata",
];

export function auditRowsToCsv(rows: Awaited<ReturnType<typeof queryAuditLog>>): string {
  return toCsv(
    AUDIT_CSV_HEADER,
    rows.map((r) => [
      r.id,
      r.createdAt,
      r.actorId,
      r.actorRole,
      r.action,
      r.targetType,
      r.targetId,
      r.ipAddress,
      r.userAgent,
      r.metadata,
    ])
  );
}
