import type { Metadata } from "next";
import { Suspense } from "react";
import { MOCK_FACILITIES } from "@/lib/mock-data/facilities";
import { FacilitySearch } from "@/components/facilities/FacilitySearch";
import { FacilityFilters } from "@/components/facilities/FacilityFilters";
import { FacilityFiltersDrawer } from "@/components/facilities/FacilityFiltersDrawer";
import { FacilityGrid } from "@/components/facilities/FacilityGrid";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Facility Directory | CareHomesSupportDocs.org",
  description: "Browse licensed California care facilities. All listings include deep links to official CCLD records and any published member rebuttals.",
};

export default function FacilitiesPage() {
  // In production this would be an async fetch; for now, use mock data
  const facilities = MOCK_FACILITIES;

  return (
    <div className="bg-[var(--color-bg)] min-h-screen pb-24">
      {/* Page Header */}
      <header className="bg-[var(--color-primary)] text-white py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Facility Directory
          </h1>
          <p className="text-lg text-white/80 max-w-2xl">
            Browse licensed California care facilities. All listings include deep links to official CCLD records.
          </p>
        </div>
      </header>

      {/* Disclaimer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
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
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
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
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-64 rounded-xl bg-[var(--color-border)]/40 animate-pulse" />
      ))}
    </div>
  );
}
