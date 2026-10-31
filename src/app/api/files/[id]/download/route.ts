import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  fileResponse,
  memberFileFetchUrl,
  readStoredBytes,
  storageErrorResponse,
  StoredFileUnavailableError,
} from "@/services/file-storage.service";
import { auditContextFromRequest, recordAudit } from "@/services/audit.service";

/**
 * GET /api/files/[id]/download — the owner (or an ADMIN) downloads a member
 * file. The storage URL never reaches the browser (SOW 11.3).
 * ?download=1 forces "save as" instead of opening in the browser.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req.cookies.get("auth-token")?.value);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const file = await prisma.memberFile.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, userId: true, filename: true, fileKey: true, fileUrl: true, mimeType: true },
  });
  // Same answer for "missing" and "not yours", so ids cannot be probed.
  if (!file || (file.userId !== user.userId && !hasPermission(user.role, "manage_users"))) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  let bytes: Uint8Array;
  try {
    bytes = await readStoredBytes(await memberFileFetchUrl(file));
  } catch (err) {
    if (err instanceof StoredFileUnavailableError) return storageErrorResponse();
    throw err;
  }

  await recordAudit({
    action: "FILE_DOWNLOADED",
    actorId: user.userId,
    actorRole: user.role,
    targetType: "MemberFile",
    targetId: file.id,
    metadata: { ownerId: file.userId },
    ...auditContextFromRequest(req),
  });

  return fileResponse(bytes, {
    filename: file.filename,
    mimeType: file.mimeType,
    download: req.nextUrl.searchParams.get("download") === "1",
  });
}
