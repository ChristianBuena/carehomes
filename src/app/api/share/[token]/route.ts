import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── GET — public, unauthenticated endpoint for attorneys ─────────────────────
// Returns file metadata for a valid, non-expired, non-revoked share link.
// Also writes an access log row for audit purposes.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Look up the share link by token
  const link = await prisma.fileShareLink.findUnique({
    where: { token },
    include: {
      selectedFiles: {
        include: {
          file: {
            select: {
              id: true,
              filename: true,
              fileUrl: true,
              fileSize: true,
              fileType: true,
              mimeType: true,
              deletedAt: true,
            },
          },
        },
      },
      user: {
        select: {
          organization: { select: { name: true } },
        },
      },
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Share link not found" }, { status: 404 });
  }

  // Revoked → 410 Gone
  if (link.revokedAt) {
    return NextResponse.json({ error: "This share link has been revoked" }, { status: 410 });
  }

  // Expired → 410 Gone
  if (link.expiresAt && link.expiresAt < new Date()) {
    return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
  }

  // Determine which files to serve
  let files: Array<{
    filename: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    mimeType: string;
  }>;

  if (link.shareAll) {
    // Dynamic: fetch all non-deleted files for the owner right now
    const allFiles = await prisma.memberFile.findMany({
      where: { userId: link.userId, deletedAt: null },
      orderBy: { uploadedAt: "desc" },
      select: {
        filename: true,
        fileUrl: true,
        fileSize: true,
        fileType: true,
        mimeType: true,
      },
    });
    files = allFiles.map((f) => ({
      ...f,
      fileType: f.fileType as string,
    }));
  } else {
    // Only selected, non-deleted files
    files = link.selectedFiles
      .filter((sf) => !sf.file.deletedAt)
      .map((sf) => ({
        filename: sf.file.filename,
        fileUrl: sf.file.fileUrl,
        fileSize: sf.file.fileSize,
        fileType: sf.file.fileType as string,
        mimeType: sf.file.mimeType,
      }));
  }

  // Log this access (fire-and-forget — don't block the response)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  prisma.fileShareAccessLog
    .create({
      data: {
        shareLinkId: link.id,
        ipAddress: ip,
        userAgent,
      },
    })
    .catch((err: unknown) => {
      console.error("[share] Failed to write access log:", err);
    });

  return NextResponse.json({
    shareAll: link.shareAll,
    expiry: link.expiry,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    createdAt: link.createdAt.toISOString(),
    orgName: link.user.organization?.name ?? null,
    files,
  });
}
