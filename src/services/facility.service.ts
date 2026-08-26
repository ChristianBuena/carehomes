import { cache } from "react";
import { prisma } from "@/lib/prisma";

// ── Filters ──────────────────────────────────────────────────────────────────

export interface FacilityFilters {
  query?: string;
  counties?: string[];
  status?: "all" | "active" | "inactive";
  capacity?: "any" | "lt10" | "10-25" | "26-50" | "50plus";
  hasRebuttals?: boolean;
  page?: number;
  pageSize?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCapacityFilter(capacity?: FacilityFilters["capacity"]) {
  if (!capacity || capacity === "any") return undefined;
  if (capacity === "lt10") return { lt: 10 };
  if (capacity === "10-25") return { gte: 10, lte: 25 };
  if (capacity === "26-50") return { gte: 26, lte: 50 };
  if (capacity === "50plus") return { gt: 50 };
  return undefined;
}

function buildWhereClause(filters?: FacilityFilters) {
  const capacityFilter = buildCapacityFilter(filters?.capacity);

  const conditions: object[] = [
    // Always exclude soft-deleted records
    { deletedAt: null },
  ];

  if (filters?.query) {
    conditions.push({
      OR: [
        { name: { contains: filters.query, mode: "insensitive" as const } },
        { address: { contains: filters.query, mode: "insensitive" as const } },
        { city: { contains: filters.query, mode: "insensitive" as const } },
        { county: { contains: filters.query, mode: "insensitive" as const } },
        { facilityNumber: { contains: filters.query, mode: "insensitive" as const } },
      ],
    });
  }

  if (filters?.counties && filters.counties.length > 0) {
    conditions.push({ county: { in: filters.counties } });
  }

  if (capacityFilter) {
    conditions.push({ capacity: capacityFilter });
  }

  if (filters?.hasRebuttals) {
    conditions.push({
      rebuttals: { some: { status: "APPROVED", deletedAt: null } },
    });
  }

  return { AND: conditions };
}

// ── Service Functions ─────────────────────────────────────────────────────────

export async function createFacility(data: {
  name: string;
  address: string;
  description?: string;
  createdById?: string;
  organizationId?: string;
}) {
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
      organizationId: data.organizationId,
    },
  });
}

export async function getFacilities(filters?: FacilityFilters) {
  const where = buildWhereClause(filters);
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, filters?.pageSize ?? 9));

  const [facilities, total] = await Promise.all([
    prisma.facility.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        city: true,
        county: true,
        capacity: true,
        facilityNumber: true,
        ccldLink: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { rebuttals: { where: { status: "APPROVED", deletedAt: null } } } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.facility.count({ where }),
  ]);

  return {
    facilities: facilities.map((f) => ({
      ...f,
      rebuttalsCount: f._count.rebuttals,
    })),
    total,
  };
}

/**
 * Fetch a facility by slug with React per-request cache memoization.
 * Only returns non-deleted facilities. Deduplicates calls across
 * generateMetadata and Page rendering.
 */
export const getFacilityBySlug = cache(async (slug: string) => {
  return prisma.facility.findFirst({
    where: { slug, deletedAt: null },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: { select: { rebuttals: { where: { status: "APPROVED", deletedAt: null } } } },
    },
  });
});

/**
 * Fetch recently updated facilities with React per-request cache memoization.
 */
export const getRecentFacilities = cache(async (take: number = 3) => {
  const facilities = await prisma.facility.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      city: true,
      county: true,
      updatedAt: true,
      _count: { select: { rebuttals: { where: { status: "APPROVED", deletedAt: null } } } },
    },
  });

  return facilities.map((f) => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    city: f.city ?? f.address.split(",")[1]?.trim() ?? f.address,
    county: f.county ?? "Unknown",
    status: "active" as const,
    rebuttalsCount: f._count.rebuttals,
    lastUpdated: f.updatedAt.toISOString(),
  }));
});

/** @deprecated Use getFacilityBySlug for public-facing pages */
export async function getFacilityById(id: string) {
  return prisma.facility.findFirst({
    where: { id, deletedAt: null },
    include: {
      createdBy: true,
    },
  });
}

/**
 * Soft-delete a facility by setting `deletedAt` timestamp.
 * This preserves the record and all related data for audit purposes.
 * Hard deletes are prohibited — use this instead.
 */
export async function softDeleteFacility(id: string) {
  return prisma.facility.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}