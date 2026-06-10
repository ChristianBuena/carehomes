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

export async function getFacilities() {
  return prisma.facility.findMany({
    include: {
      createdBy: true, // optional but useful for admin panels
    },
  });
}