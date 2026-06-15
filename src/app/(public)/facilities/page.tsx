import type { Metadata } from "next";
import { Suspense } from "react";
import { getFacilities } from "@/services/facility.service";
import { FacilitySearch } from "@/components/facilities/FacilitySearch";
import { FacilityFilters } from "@/components/facilities/FacilityFilters";
import { FacilityFiltersDrawer } from "@/components/facilities/FacilityFiltersDrawer";
import { FacilityGrid } from "@/components/facilities/FacilityGrid";
import { AlertCircle } from "lucide-react";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Facility Directory",
  description: "Browse licensed California care facilities. All listings include deep links to official CCLD records and any published member rebuttals.",
});

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const dbFacilities = await getFacilities({ query: q });

  const facilities = dbFacilities.map((f: { id: string; name: string; address: string; updatedAt: Date }) => ({
    id: f.id,
    slug: f.id, // Using ID as slug since the schema does not have a slug yet
    facilityNumber: "N/A",
    name: f.name,
    city: f.address.split(",")[1]?.trim() || f.address,
    county: "Unknown",
    capacity: 0,
    ccldLink: "",
    status: "active" as const,
    rebuttalsCount: 0,
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
            Browse licensed California care facilities. All listings include deep links to official CCLD records.
          </p>
        </ResponsiveContainer>
      </header>

      {/* Disclaimer */}
      <ResponsiveContainer className="mt-6">
        <div className="flex items-start gap-3 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 text-[var(--color-text)] px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-[var(--color-warning)] shrink-0 mt-0.5" aria-hidden="true" />
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
            <Suspense fallback={<div className="h-12 w-full rounded-xl bg-[var(--color-border)]/50 animate-pulse" />}>
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
              <FacilityGrid facilities={facilities} />
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
        <div key={i} className="h-64 rounded-xl bg-[var(--color-border)]/40 animate-pulse" />
      ))}
    </div>
  );
}
