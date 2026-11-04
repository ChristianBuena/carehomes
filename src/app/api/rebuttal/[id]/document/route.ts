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
import { DRAFT_MARK, markDocument, UnmarkableDocumentError } from "@/services/pdf-watermark.service";
import { auditContextFromRequest, recordAudit } from "@/services/audit.service";

/**
 * GET /api/rebuttal/[id]/document — the rebuttal's supporting document.
 * Allowed: the author, members of the facility's organization, MODERATOR and
 * ADMIN. Never public (release decision 0c). The Cloudinary URL is never sent
 * to the browser (SOW 11.3).
 *
 * Until the rebuttal is APPROVED the document is a draft: every view and
 * download is a PDF stamped "FOR ATTORNEY REVIEW ONLY" on every page
 * (SOW 11.2). If the file cannot be stamped (Word, encrypted or corrupt
 * PDF), it is NOT served.
 *
 * ?download=1 forces "save as".
 * ?version=approved-copy serves the stored "PUBLIC REDACTED VERSION" copy of
 * an approved rebuttal (MODERATOR and ADMIN only).
 */
const EXT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req.cookies.get("auth-token")?.value);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rebuttal = await prisma.rebuttal.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
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

  const isDraft = !wantsApprovedCopy && rebuttal.status !== "APPROVED";
  const ext = wantsApprovedCopy
    ? "pdf"
    : /\.([a-z0-9]{2,5})(?:$|\?)/i.exec(rebuttal.documentUrl)?.[1]?.toLowerCase() ?? "pdf";

  let body: Uint8Array = bytes;
  let mimeType = EXT_TYPES[ext] ?? "application/octet-stream";
  let filename = `rebuttal-${rebuttal.id}.${ext}`;

  if (isDraft) {
    try {
      body = new Uint8Array(await markDocument(bytes, DRAFT_MARK));
    } catch (err) {
      const unsupported = err instanceof UnmarkableDocumentError;
      return NextResponse.json(
        {
          error: unsupported
            ? "This file type cannot be marked FOR ATTORNEY REVIEW ONLY, so it is not shown while the rebuttal is under review. Ask the member to upload a PDF, PNG or JPG."
            : "This document could not be marked FOR ATTORNEY REVIEW ONLY (it may be encrypted or damaged), so it is not shown while the rebuttal is under review.",
        },
        { status: 422 }
      );
    }
    mimeType = "application/pdf";
    filename = `rebuttal-${rebuttal.id}-FOR-ATTORNEY-REVIEW-ONLY.pdf`;
  }

  await recordAudit({
    action: "FILE_DOWNLOADED",
    actorId: user.userId,
    actorRole: user.role,
    targetType: "Rebuttal",
    targetId: rebuttal.id,
    metadata: {
      status: rebuttal.status,
      version: wantsApprovedCopy ? "approved-copy" : isDraft ? "draft-marked" : "original",
    },
    ...auditContextFromRequest(req),
  });

  return fileResponse(body, {
    filename,
    mimeType,
    download: req.nextUrl.searchParams.get("download") === "1",
  });
}
