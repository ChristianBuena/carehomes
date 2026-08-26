import { prisma } from "@/lib/prisma";
import { RebuttalStatus } from "@prisma/client";


// Creation of audit log entry
async function createModerationLog({
  rebuttalId,
  moderatorId,
  fromStatus,
  toStatus,
  notes,
}: {
  rebuttalId: string;
  moderatorId: string;
  fromStatus: RebuttalStatus;
  toStatus: RebuttalStatus;
  notes?: string;
}) {
  return prisma.moderationLog.create({
    data: {
      rebuttalId,
      moderatorId,
      fromStatus,
      toStatus,
      notes,
    },
  });
}


// APPROVE
export async function approveRebuttal(
  id: string,
  moderatorId: string,
  notes?: string
) {
  const existing = await prisma.rebuttal.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  const rebuttal = await prisma.rebuttal.update({
    where: { id },
    data: {
      status: RebuttalStatus.APPROVED,
    },
  });

  await createModerationLog({
    rebuttalId: id,
    moderatorId,
    fromStatus: existing.status,
    toStatus: RebuttalStatus.APPROVED,
    notes,
  });

  return rebuttal;
}

// REJECT
export async function rejectRebuttal(
  id: string,
  moderatorId: string,
  notes?: string
) {
  const existing = await prisma.rebuttal.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  const rebuttal = await prisma.rebuttal.update({
    where: { id },
    data: { status: RebuttalStatus.REJECTED },
  });

  await createModerationLog({
    rebuttalId: id,
    moderatorId,
    fromStatus: existing.status,
    toStatus: RebuttalStatus.REJECTED,
    notes,
  });

  return rebuttal;
}

// REQUEST FIX
export async function requestFixRebuttal(
  id: string,
  moderatorId: string,
  notes?: string
) {
  const existing = await prisma.rebuttal.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  const rebuttal = await prisma.rebuttal.update({
    where: { id },
    data: { status: RebuttalStatus.REQUEST_FIX },
  });

  await createModerationLog({
    rebuttalId: id,
    moderatorId,
    fromStatus: existing.status,
    toStatus: RebuttalStatus.REQUEST_FIX,
    notes,
  });

  return rebuttal;
}

// MODERATION LOGS OF A REBUTTAL
export async function getModerationLogs(rebuttalId: string) {
  return prisma.moderationLog.findMany({
    where: { rebuttalId },
    include: {
      moderator: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Archive moderation logs older than `cutoffDate` (default: 1 year ago).
 *
 * Strategy:
 *  1. SELECT all ModerationLog rows with createdAt < cutoffDate.
 *  2. INSERT them into ArchivedModerationLog (idempotent via originalId unique constraint).
 *  3. DELETE the originals from ModerationLog.
 *
 * Runs inside a transaction to guarantee atomicity — no log is lost or double-counted.
 * Returns the count of archived records.
 */
export async function archiveOldModerationLogs(cutoffDate?: Date): Promise<number> {
  const threshold = cutoffDate ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const logsToArchive = await prisma.moderationLog.findMany({
    where: { createdAt: { lt: threshold } },
  });

  if (logsToArchive.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    // Upsert into archive table (skip already-archived entries via unique originalId)
    await tx.archivedModerationLog.createMany({
      data: logsToArchive.map((log) => ({
        originalId:  log.id,
        fromStatus:  log.fromStatus,
        toStatus:    log.toStatus,
        notes:       log.notes,
        createdAt:   log.createdAt,
        moderatorId: log.moderatorId,
        rebuttalId:  log.rebuttalId,
      })),
      skipDuplicates: true,
    });

    // Remove archived logs from the active table
    await tx.moderationLog.deleteMany({
      where: {
        id: { in: logsToArchive.map((l) => l.id) },
      },
    });
  });

  return logsToArchive.length;
}