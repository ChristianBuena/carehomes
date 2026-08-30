import type { Metadata } from "next";
import { Suspense } from "react";
import { getFacilities } from "@/services/facility.service";
import { FacilitySearch } from "@/components/facilities/FacilitySearch";
import { FacilityFilters } from "@/components/facilities/FacilityFilters";
import { FacilityFiltersDrawer } from "@/components/facilities/FacilityFiltersDrawerLazy";
import { FacilityGrid } from "@/components/facilities/FacilityGrid";
import { AlertCircle } from "lucide-react";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { buildMetadata } from "@/lib/metadata";
import type { FacilityListItem } from "@/types/facility.types";

const PAGE_SIZE = 9;

export const metadata: Metadata = buildMetadata({
  title: "Facility Directory",
  description:
    "Browse licensed California care facilities. All listings include deep links to official CCLD records and any published member rebuttals.",
});

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    county?: string | string[];
    status?: string;
    capacity?: string;
    rebuttals?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  // Normalise county — can be a single string or an array
  const counties = params.county
    ? Array.isArray(params.county)
      ? params.county
      : [params.county]
    : [];

  const rawStatus = params.status;
  const status =
    rawStatus === "active" || rawStatus === "inactive" ? rawStatus : "all";

  const rawCapacity = params.capacity;
  const capacity =
    rawCapacity === "lt10" ||
      rawCapacity === "10-25" ||
      rawCapacity === "26-50" ||
      rawCapacity === "50plus"
      ? rawCapacity
      : "any";

  const page = Math.max(1, Number(params.page ?? "1"));

  const { facilities: dbFacilities, total } = await getFacilities({
    query: params.q,
    counties,
    status,
    capacity,
    hasRebuttals: params.rebuttals === "1",
    page,
    pageSize: PAGE_SIZE,
  });

  const facilities: FacilityListItem[] = dbFacilities.map((f) => ({
    id: f.id,
    slug: f.slug,
    facilityNumber: f.facilityNumber ?? "N/A",
    name: f.name,
    city: f.city ?? f.address.split(",")[1]?.trim() ?? f.address,
    county: f.county ?? "Unknown",
    capacity: f.capacity ?? 0,
    ccldLink: f.ccldLink ?? "",
    status: "active" as const,
    rebuttalsCount: f.rebuttalsCount,
    lastUpdated: f.updatedAt.toISOString(),
  }));

  return (
    <div className="bg-[var(--color-bg)] min-h-screen pb-24">
      {/* Page Header */}
      <header className="bg-[var(--color-primary)] text-[var(--color-surface)] py-12 md:py-16 lg:py-24">
        <ResponsiveContainer>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
            Facility Directory
          </h1>
          <p className="text-lg text-[var(--color-surface)]/80 max-w-2xl">
            Browse licensed California care facilities. All listings include
            deep links to official CCLD records.
          </p>
        </ResponsiveContainer>
      </header>

      {/* Disclaimer */}
      <ResponsiveContainer className="mt-6">
        <div className="flex items-start gap-3 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 text-[var(--color-text)] px-4 py-3 rounded-lg text-sm">
          <AlertCircle
            className="h-4 w-4 text-[var(--color-warning)] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>
            Data may not be current. Always verify facility status at{" "}
            <a
              href="https://www.ccld.dss.ca.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium hover:text-[var(--color-primary)]"
            >
              official CCLD sources
            </a>
            .
          </span>
        </div>
      </ResponsiveContainer>

      <ResponsiveContainer className="mt-8">
        {/* Search + mobile filter toggle row */}
        <div className="flex gap-3 mb-8">
          <div className="flex-1">
            <Suspense
              fallback={
                <div className="h-12 w-full rounded-xl bg-[var(--color-border)]/50 animate-pulse" />
              }
            >
              <FacilitySearch />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <FacilityFiltersDrawer />
          </Suspense>
        </div>

        {/* Two-column layout: sidebar + grid */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 xl:w-64 shrink-0">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm sticky top-24">
              <Suspense fallback={null}>
                <FacilityFilters />
              </Suspense>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            <Suspense fallback={<GridSkeleton />}>
              <FacilityGrid
                facilities={facilities}
                total={total}
                page={page}
                pageSize={PAGE_SIZE}
              />
            </Suspense>
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="h-64 rounded-xl bg-[var(--color-border)]/40 animate-pulse"
        />
      ))}
    </div>
  );
}
