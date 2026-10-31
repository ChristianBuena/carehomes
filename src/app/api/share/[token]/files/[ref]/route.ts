import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fileResponse,
  memberFileFetchUrl,
  readStoredBytes,
  shareFileRefMatches,
  storageErrorResponse,
  StoredFileUnavailableError,
} from "@/services/file-storage.service";
import { auditContextFromRequest, recordAudit } from "@/services/audit.service";

/**
 * GET /api/share/[token]/files/[ref] — public (the token is the credential).
 * `ref` is the opaque per-link file reference from GET /api/share/[token].
 * The link is re-checked on EVERY download, so revoking or expiring it stops
 * access at once (SOW 11.3). The storage URL is never sent to the recipient.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; ref: string }> }
) {
  const { token, ref } = await params;

  const link = await prisma.fileShareLink.findUnique({
    where: { token },
    select: {
      id: true,
      userId: true,
      shareAll: true,
      revokedAt: true,
      expiresAt: true,
      selectedFiles: { select: { fileId: true } },
    },
  });

  if (!link) return NextResponse.json({ error: "Share link not found" }, { status: 404 });
  if (link.revokedAt) return NextResponse.json({ error: "This share link has been revoked" }, { status: 410 });
  if (link.expiresAt && link.expiresAt < new Date()) {
    return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
  }

  // Candidate files: everything the link currently covers.
  const candidates = await prisma.memberFile.findMany({
    where: {
      userId: link.userId,
      deletedAt: null,
      ...(link.shareAll ? {} : { id: { in: link.selectedFiles.map((f) => f.fileId) } }),
    },
    select: { id: true, filename: true, fileKey: true, fileUrl: true, mimeType: true },
  });
  const file = candidates.find((f) => shareFileRefMatches(ref, link.id, f.id));
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  let bytes: Uint8Array;
  try {
    bytes = await readStoredBytes(await memberFileFetchUrl(file));
  } catch (err) {
    if (err instanceof StoredFileUnavailableError) return storageErrorResponse();
    throw err;
  }

  const ctx = auditContextFromRequest(req);
  await prisma.fileShareAccessLog
    .create({ data: { shareLinkId: link.id, ipAddress: ctx.ipAddress ?? null, userAgent: ctx.userAgent ?? null } })
    .catch((err: unknown) => console.error("[share] Failed to write access log:", err));
  await recordAudit({
    action: "SHARE_LINK_FILE_DOWNLOADED",
    targetType: "MemberFile",
    targetId: file.id,
    metadata: { shareLinkId: link.id, ownerId: link.userId },
    ...ctx,
  });

  return fileResponse(bytes, {
    filename: file.filename,
    mimeType: file.mimeType,
    download: req.nextUrl.searchParams.get("download") === "1",
  });
}
