import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { SHARE_LINK_EXPIRY_VALUES, SHARE_LINK_MAX_DAYS, type ShareLinkExpiry } from "@/types/share";
import { auditContextFromRequest, recordAudit } from "@/services/audit.service";

// ── helpers ─────────────────────────────────────────────────────────────────

function isShareLinkExpiry(value: unknown): value is ShareLinkExpiry {
  return (SHARE_LINK_EXPIRY_VALUES as readonly unknown[]).includes(value);
}

function expiryToEnum(expiry: ShareLinkExpiry): "DAYS_7" | "DAYS_30" {
  return expiry === "7d" ? "DAYS_7" : "DAYS_30";
}

function expiryToDate(expiry: ShareLinkExpiry): Date {
  const days = expiry === "7d" ? 7 : 30;
  if (days > SHARE_LINK_MAX_DAYS) throw new Error("share link expiry above the maximum");
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function buildShareUrl(req: NextRequest, token: string): string {
  const base = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  return `${base}/share/${token}`;
}

// ── POST — create a new share link ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await getSessionUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.role, "manage_file_shares")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      shareAll: boolean;
      fileIds?: string[];
      expiry: unknown;
    };

    const { shareAll, fileIds, expiry } = body;

    // Validate: selected-files mode requires at least one file
    if (!shareAll) {
      if (!fileIds || fileIds.length === 0) {
        return NextResponse.json(
          { error: "At least one file must be selected when shareAll is false" },
          { status: 400 }
        );
      }

      // Verify ownership of every selected file
      const ownedFiles = await prisma.memberFile.findMany({
        where: { id: { in: fileIds }, userId: user.userId, deletedAt: null },
        select: { id: true },
      });

      if (ownedFiles.length !== fileIds.length) {
        return NextResponse.json(
          { error: "One or more files not found or not owned by you" },
          { status: 403 }
        );
      }
    }

    // Every new link expires: 7 or 30 days. Anything else (including null,
    // "never", "1h" or a number) is refused instead of silently becoming a
    // never-expiring link (A-1).
    if (!isShareLinkExpiry(expiry)) {
      return NextResponse.json(
        { error: `expiry must be one of: ${SHARE_LINK_EXPIRY_VALUES.join(", ")} (maximum ${SHARE_LINK_MAX_DAYS} days)` },
        { status: 400 }
      );
    }

    // Generate cryptographically random token
    const shareToken = randomBytes(32).toString("hex");

    const link = await prisma.fileShareLink.create({
      data: {
        token: shareToken,
        shareAll,
        expiry: expiryToEnum(expiry),
        expiresAt: expiryToDate(expiry),
        userId: user.userId,
        selectedFiles: shareAll
          ? undefined
          : {
              create: fileIds!.map((fileId) => ({ fileId })),
            },
      },
      include: {
        selectedFiles: true,
      },
    });

    await recordAudit({
      action: "SHARE_LINK_CREATED",
      actorId: user.userId,
      actorRole: user.role,
      targetType: "FileShareLink",
      targetId: link.id,
      metadata: { shareAll, fileCount: link.selectedFiles.length, expiry: link.expiry },
      ...auditContextFromRequest(req),
    });

    return NextResponse.json({
      id: link.id,
      token: link.token,
      shareUrl: buildShareUrl(req, link.token),
      shareAll: link.shareAll,
      expiry: link.expiry,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      fileCount: link.selectedFiles.length,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}

// ── GET — list all non-revoked share links for the authenticated member ──────
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await getSessionUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.role, "manage_file_shares")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const links = await prisma.fileShareLink.findMany({
      where: {
        userId: user.userId,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        selectedFiles: { select: { fileId: true } },
        accessLogs: {
          orderBy: { accessedAt: "desc" },
          take: 1,
          select: { accessedAt: true },
        },
        _count: { select: { accessLogs: true } },
      },
    });

    const result = links.map((l) => ({
      id: l.id,
      token: l.token,
      shareAll: l.shareAll,
      expiry: l.expiry,
      expiresAt: l.expiresAt?.toISOString() ?? null,
      revokedAt: l.revokedAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      fileCount: l.shareAll ? 0 : l.selectedFiles.length,
      accessCount: l._count.accessLogs,
      lastAccessedAt: l.accessLogs[0]?.accessedAt.toISOString() ?? null,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch share links" }, { status: 500 });
  }
}
