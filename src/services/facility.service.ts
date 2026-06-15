import { prisma } from "@/lib/prisma";

export async function createFacility(data: {
  name: string;
  address: string;
  description?: string;
  createdById?: string;
}) {
  return prisma.facility.create({
    data: {
      name: data.name,
      address: data.address,
      description: data.description,
      createdById: data.createdById,
    },
  });
}

export async function getFacilities(filters?: { query?: string }) {
  return prisma.facility.findMany({
    where: filters?.query ? {
      OR: [
        { name: { contains: filters.query, mode: "insensitive" } },
        { address: { contains: filters.query, mode: "insensitive" } },
      ],
    } : undefined,
    include: {
      createdBy: true, // optional but useful for admin panels
    },
  });
}

export async function getFacilityById(id: string) {
  return prisma.facility.findUnique({
    where: { id },
    include: {
      createdBy: true,
    },
  });
}