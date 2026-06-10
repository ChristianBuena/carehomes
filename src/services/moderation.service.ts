import { prisma } from "@/lib/prisma";
import { RebuttalStatus } from "@prisma/client";

export async function approveRebuttal(id: string) {
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

export async function rejectRebuttal(id: string) {
  try {
    return await prisma.rebuttal.update({
      where: { id },
      data: {
        status: RebuttalStatus.REJECTED,
      },
    });
  } catch (error) {
    throw new Error("Rebuttal not found or update failed");
  }
}

// OPTIONAL (because your schema supports it)
export async function requestFixRebuttal(id: string) {
  try {
    return await prisma.rebuttal.update({
      where: { id },
      data: {
        status: RebuttalStatus.REQUEST_FIX,
      },
    });
  } catch (error) {
    throw new Error("Rebuttal not found or update failed");
  }
}