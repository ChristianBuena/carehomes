import { prisma } from "@/lib/prisma";
import { RebuttalStatus } from "@prisma/client";


// Creation of audit log entry
async function createModerationLog({
  rebuttalId,
  moderatorId,
  fromStatus,
  toStatus,
  notes,
}:{
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
  try {
    return await prisma.rebuttal.update({
      where: { id },
      data: {
        status: RebuttalStatus.APPROVED,
      },
    });
  } catch (error) {
    throw new Error("Rebuttal not found or update failed");
  }
}

// REJECT
export async function rejectRebuttal(
  id: string,
  moderatorId: string,
  notes?: string
) {
  const existing = await prisma.rebuttal.findUniqueOrThrow({ where : { id } });

  const rebuttal = await prisma.rebuttal.update({
    where: { id },
    data: {status: RebuttalStatus.REJECTED },
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
  const existing = await prisma.rebuttal.findUniqueOrThrow({ where : { id } });

  const rebuttal = await prisma.rebuttal.update({
    where: { id },
    data: {status: RebuttalStatus.REQUEST_FIX },
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
        select: { id : true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}