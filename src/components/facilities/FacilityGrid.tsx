"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { FacilityListItem } from "@/types/facility.types";
import { FacilityCard } from "@/components/facilities/FacilityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { NoResultsEmptyState } from "@/components/ui/NoResultsEmptyState";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FacilityGridProps {
  /** Pre-filtered, pre-paginated facilities from the server */
  facilities: FacilityListItem[];
  /** Total matching facilities (before pagination) */
  total: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
}

export function FacilityGrid({ facilities, total, page, pageSize }: FacilityGridProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = searchParams.get("q") ?? "";
  const totalPages = Math.ceil(total / pageSize);

  // Range display
  const rangeStart = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, total);

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(p));
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: true });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Result count */}
      <p className="text-sm text-[var(--color-muted)]">
        Showing{" "}
        <span className="font-semibold text-[var(--color-text)]">
          {rangeStart}–{rangeEnd}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-[var(--color-text)]">{total}</span>{" "}
        facilities
      </p>

      {/* Grid */}
      {facilities.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {facilities.map((facility) => (
            <FacilityCard key={facility.id} facility={facility} />
          ))}
        </div>
      ) : q ? (
        <NoResultsEmptyState
          query={q}
          onClear={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("q");
            params.delete("page");
            router.replace(`${pathname}?${params.toString()}`);
          }}
        />
      ) : (
        <EmptyState
          variant="no-results"
          action={{
            label: "Clear all filters",
            onClick: () => router.replace(pathname),
          }}
        />
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
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-sm font-medium transition ${
                p === page
                  ? "bg-[var(--color-primary)] text-[var(--color-surface)] shadow-sm"
                  : "border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-bg)]"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
