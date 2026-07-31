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
  if (!filters) return undefined;

  const capacityFilter = buildCapacityFilter(filters.capacity);

  const conditions = [
    // Text search: name, address, city, county, facilityNumber
    filters.query
      ? {
          OR: [
            { name: { contains: filters.query, mode: "insensitive" as const } },
            { address: { contains: filters.query, mode: "insensitive" as const } },
            { city: { contains: filters.query, mode: "insensitive" as const } },
            { county: { contains: filters.query, mode: "insensitive" as const } },
            { facilityNumber: { contains: filters.query, mode: "insensitive" as const } },
          ],
        }
      : undefined,
    // County multi-select
    filters.counties && filters.counties.length > 0
      ? { county: { in: filters.counties } }
      : undefined,
    // Capacity range
    capacityFilter ? { capacity: capacityFilter } : undefined,
    // Has approved rebuttals
    filters.hasRebuttals
      ? { rebuttals: { some: { status: "APPROVED" } } }
      : undefined,
  ].filter(Boolean) as object[];

  return conditions.length > 0 ? { AND: conditions } : undefined;
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
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { rebuttals: { where: { status: "APPROVED" } } } },
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

export async function getFacilityBySlug(slug: string) {
  return prisma.facility.findUnique({
    where: { slug },
    include: {
      createdBy: true,
      _count: { select: { rebuttals: { where: { status: "APPROVED" } } } },
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