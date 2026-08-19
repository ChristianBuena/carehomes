import { cache } from "react";
import { prisma } from "@/lib/prisma";

export async function createRebuttal(data: {
  title: string;
  content: string;
  userId: string;
  facilityId: string;
}) {
  return prisma.rebuttal.create({
    data,
  });
}

export async function getAllRebuttals() {
  return prisma.rebuttal.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Fetch approved rebuttals for a specific facility with React per-request cache memoization.
 */
export const getApprovedRebuttalsByFacilityId = cache(async (facilityId: string) => {
  return prisma.rebuttal.findMany({
    where: {
      facilityId,
      status: "APPROVED",
    },
    select: {
      id: true,
      title: true,
      content: true,
      documentUrl: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
});