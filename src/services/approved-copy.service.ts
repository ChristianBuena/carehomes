import { prisma } from "@/lib/prisma";
import { readStoredBytes, rebuttalDocumentFetchUrl, StoredFileUnavailableError } from "@/services/file-storage.service";
import { markDocument, PUBLIC_COPY_MARK, UnmarkableDocumentError } from "@/services/pdf-watermark.service";
import { recordAudit, type AuditContext } from "@/services/audit.service";

/**
 * Makes the stored "PUBLIC REDACTED VERSION" copy of an approved rebuttal's
 * document (SOW 11.2). Called when a rebuttal is approved and by the retry
 * button. NEVER throws: approval must succeed even if this fails. On failure
 * the error is logged (code only), the rebuttal is flagged
 * (watermarkStatus = FAILED) and the failure is audited.
 */
export type ApprovedCopyResult =
  | { status: "APPLIED" }
  | { status: "NO_DOCUMENT" }
  | { status: "FAILED"; error: ApprovedCopyError };

export type ApprovedCopyError = "STORAGE_UNAVAILABLE" | "UNSUPPORTED_TYPE" | "CANNOT_MARK" | "UNEXPECTED";

export async function createApprovedCopy(
  rebuttalId: string,
  actor: { userId: string; role: "MEMBER" | "MODERATOR" | "ADMIN" } | null,
  ctx: AuditContext = {}
): Promise<ApprovedCopyResult> {
  let error: ApprovedCopyError = "UNEXPECTED";
  try {
    const rebuttal = await prisma.rebuttal.findFirst({
      where: { id: rebuttalId, deletedAt: null },
      select: { id: true, documentUrl: true },
    });
    if (!rebuttal?.documentUrl) return { status: "NO_DOCUMENT" };

    let bytes: Uint8Array;
    try {
      bytes = await readStoredBytes(rebuttalDocumentFetchUrl(rebuttal.documentUrl));
    } catch (err) {
      error = err instanceof StoredFileUnavailableError ? "STORAGE_UNAVAILABLE" : "UNEXPECTED";
      throw err;
    }

    let marked: Buffer;
    try {
      marked = await markDocument(bytes, PUBLIC_COPY_MARK);
    } catch (err) {
      error = err instanceof UnmarkableDocumentError ? "UNSUPPORTED_TYPE" : "CANNOT_MARK";
      throw err;
    }

    await prisma.rebuttal.update({
      where: { id: rebuttal.id },
      data: {
        watermarkedUrl: `data:application/pdf;base64,${marked.toString("base64")}`,
        watermarkStatus: "APPLIED",
        watermarkError: null,
        watermarkUpdatedAt: new Date(),
      },
    });
    return { status: "APPLIED" };
  } catch (err) {
    console.error(`[approved-copy] Rebuttal ${rebuttalId}: ${error}`, err instanceof Error ? err.name : "");
    await prisma.rebuttal
      .update({
        where: { id: rebuttalId },
        data: { watermarkStatus: "FAILED", watermarkError: error, watermarkUpdatedAt: new Date() },
      })
      .catch((flagErr: unknown) => console.error("[approved-copy] Could not flag rebuttal:", flagErr instanceof Error ? flagErr.name : flagErr));
    await recordAudit({
      action: "REBUTTAL_WATERMARK_FAILED",
      actorId: actor?.userId ?? null,
      actorRole: actor?.role ?? null,
      targetType: "Rebuttal",
      targetId: rebuttalId,
      metadata: { error },
      ...ctx,
    });
    return { status: "FAILED", error };
  }
}
