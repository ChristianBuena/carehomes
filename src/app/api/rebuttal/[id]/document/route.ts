import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  fileResponse,
  readStoredBytes,
  rebuttalDocumentFetchUrl,
  storageErrorResponse,
  StoredFileUnavailableError,
} from "@/services/file-storage.service";
import { auditContextFromRequest, recordAudit } from "@/services/audit.service";

/**
 * GET /api/rebuttal/[id]/document — the rebuttal's supporting document.
 * Allowed: the author, members of the facility's organization, MODERATOR and
 * ADMIN. Never public (release decision 0c). The Cloudinary URL is never sent
 * to the browser (SOW 11.3).
 * ?download=1 forces "save as".
 * ?version=approved-copy serves the stored "PUBLIC REDACTED VERSION" copy of
 * an approved rebuttal (MODERATOR and ADMIN only).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req.cookies.get("auth-token")?.value);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rebuttal = await prisma.rebuttal.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      userId: true,
      documentUrl: true,
      watermarkedUrl: true,
      facility: { select: { organizationId: true } },
    },
  });

  const allowed =
    !!rebuttal &&
    (rebuttal.userId === user.userId ||
      (!!user.orgId && rebuttal.facility?.organizationId === user.orgId) ||
      hasPermission(user.role, "moderate_rebuttals"));
  // Same answer for "missing" and "not yours", so ids cannot be probed.
  if (!rebuttal || !allowed || !rebuttal.documentUrl) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const wantsApprovedCopy = req.nextUrl.searchParams.get("version") === "approved-copy";
  if (wantsApprovedCopy && (!hasPermission(user.role, "moderate_rebuttals") || !rebuttal.watermarkedUrl)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  let bytes: Uint8Array;
  try {
    bytes = await readStoredBytes(
      wantsApprovedCopy ? rebuttal.watermarkedUrl! : rebuttalDocumentFetchUrl(rebuttal.documentUrl)
    );
  } catch (err) {
    if (err instanceof StoredFileUnavailableError) return storageErrorResponse();
    throw err;
  }

  await recordAudit({
    action: "FILE_DOWNLOADED",
    actorId: user.userId,
    actorRole: user.role,
    targetType: "Rebuttal",
    targetId: rebuttal.id,
    metadata: { status: rebuttal.status, version: wantsApprovedCopy ? "approved-copy" : "original" },
    ...auditContextFromRequest(req),
  });

  const ext = wantsApprovedCopy
    ? "pdf"
    : /\.([a-z0-9]{2,5})(?:$|\?)/i.exec(rebuttal.documentUrl)?.[1]?.toLowerCase() ?? "pdf";
  const mimeType =
    ext === "pdf"
      ? "application/pdf"
      : ext === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : ext === "png"
          ? "image/png"
          : ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : "application/octet-stream";

  return fileResponse(bytes, {
    filename: `rebuttal-${rebuttal.id}.${ext}`,
    mimeType,
    download: req.nextUrl.searchParams.get("download") === "1",
  });
}
