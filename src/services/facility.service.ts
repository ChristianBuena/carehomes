import { prisma } from "@/lib/prisma";

export async function createFacility(data: {
  name: string;
  address: string;
  description?: string;
  createdById?: string;
}) {
  // Auto-generate a slug from name + timestamp suffix for uniqueness
  const baseSlug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${baseSlug}-${Date.now()}`;

  return prisma.facility.create({
    data: {
      slug,
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
        { city: { contains: filters.query, mode: "insensitive" } },
      ],
    } : undefined,
    include: {
      createdBy: true,
    },
  });
}

export async function getFacilityBySlug(slug: string) {
  return prisma.facility.findUnique({
    where: { slug },
    include: {
      createdBy: true,
    },
  });
}

/** @deprecated Use getFacilityBySlug for public-facing pages */
export async function getFacilityById(id: string) {
  return prisma.facility.findUnique({
    where: { id },
    include: {
      createdBy: true,
    },
  });
}