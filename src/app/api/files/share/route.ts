import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import type { ShareLinkExpiry } from "@/types/share";

// ── helpers ─────────────────────────────────────────────────────────────────

function expiryToEnum(expiry: ShareLinkExpiry): "DAYS_7" | "DAYS_30" | "NEVER" {
  if (expiry === "7d") return "DAYS_7";
  if (expiry === "30d") return "DAYS_30";
  return "NEVER";
}

function expiryToDate(expiry: ShareLinkExpiry): Date | null {
  if (expiry === "7d") {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (expiry === "30d") {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }
  return null;
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

    const user = await verifyToken(token);
    if (!hasPermission(user.role, "manage_file_shares")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      shareAll: boolean;
      fileIds?: string[];
      expiry: ShareLinkExpiry;
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

    const user = await verifyToken(token);
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
