"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Facility } from "@/lib/mock-data/facilities";
import { FacilityCard } from "@/components/facilities/FacilityCard";
import { readFiltersFromParams } from "@/components/facilities/FacilityFilters";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";

const PAGE_SIZE = 9;

interface FacilityGridProps {
  facilities: Facility[];
}

export function FacilityGrid({ facilities }: FacilityGridProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const filters = readFiltersFromParams(searchParams);

  const filtered = useMemo(() => {
    return facilities.filter((f) => {
      // Text search: name, city, county
      if (q && !f.name.toLowerCase().includes(q) && !f.city.toLowerCase().includes(q) && !f.county.toLowerCase().includes(q)) return false;
      // County — multi-select (any match)
      if (filters.counties.length > 0 && !filters.counties.includes(f.county)) return false;
      // Status
      if (filters.status !== "all" && f.status !== filters.status) return false;
      // Capacity
      if (filters.capacity === "lt10" && f.capacity >= 10) return false;
      if (filters.capacity === "10-25" && (f.capacity < 10 || f.capacity > 25)) return false;
      if (filters.capacity === "26-50" && (f.capacity < 26 || f.capacity > 50)) return false;
      if (filters.capacity === "50plus" && f.capacity <= 50) return false;
      // Has rebuttals
      if (filters.hasRebuttals && f.rebuttalsCount === 0) return false;
      return true;
    });
  }, [facilities, q, filters]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.replace(`${pathname}?${params.toString()}`, { scroll: true });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Result count */}
      <p className="text-sm text-[var(--color-muted)]">
        Showing{" "}
        <span className="font-semibold text-[var(--color-text)]">
          {paginated.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
          {Math.min(page * PAGE_SIZE, filtered.length)}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-[var(--color-text)]">{filtered.length}</span>{" "}
        facilities
      </p>

      {/* Grid */}
      {paginated.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {paginated.map((facility) => (
            <FacilityCard key={facility.id} facility={facility} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <SearchX className="h-12 w-12 text-[var(--color-border)]" aria-hidden="true" />
          <h3 className="text-xl font-semibold text-[var(--color-text)]">No facilities found</h3>
          <p className="text-[var(--color-muted)] max-w-xs">
            Try adjusting your search or filters to find what you&apos;re looking for.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-2 pt-4"
          aria-label="Pagination"
        >
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={`h-9 w-9 flex items-center justify-center rounded-lg text-sm font-medium transition ${
                p === page
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-bg)]"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
