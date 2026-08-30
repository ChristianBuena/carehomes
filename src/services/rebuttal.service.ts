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
    where: { deletedAt: null },
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
 * Fetch a single rebuttal by ID. Returns null if deleted or not found.
 */
export async function getRebuttalById(id: string) {
  return prisma.rebuttal.findFirst({
    where: { id, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true } },
      facility: { select: { id: true, name: true, slug: true } },
    },
  });
}

/**
 * Fetch approved rebuttals for a specific facility with React per-request cache memoization.
 * Excludes soft-deleted rebuttals.
 */
export const getApprovedRebuttalsByFacilityId = cache(async (facilityId: string) => {
  return prisma.rebuttal.findMany({
    where: {
      facilityId,
      status: "APPROVED",
      deletedAt: null,
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

/**
 * Soft-delete a rebuttal by setting `deletedAt` timestamp.
 * This preserves the record and all associated moderation logs for audit.
 * Hard deletes are prohibited — use this instead.
 */
export async function softDeleteRebuttal(id: string) {
  return prisma.rebuttal.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}