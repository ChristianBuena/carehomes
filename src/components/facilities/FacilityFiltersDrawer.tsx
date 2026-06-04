"use client";

import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FacilityFilters, readFiltersFromParams, activeFilterCount } from "@/components/facilities/FacilityFilters";

export function FacilityFiltersDrawer() {
  const searchParams = useSearchParams();
  const filters = readFiltersFromParams(searchParams);
  const count = activeFilterCount(filters);

  return (
    <Sheet>
      {/* Trigger button — visible on mobile only */}
      <SheetTrigger asChild>
        <button
          type="button"
          className="lg:hidden inline-flex items-center gap-2 h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] shadow-sm hover:bg-[var(--color-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition whitespace-nowrap"
          aria-label={`Open filters${count > 0 ? `, ${count} active` : ""}`}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Filters
            {count > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--color-primary)] text-[var(--color-surface)] text-[10px] font-bold">
                {count}
              </span>
            )}
          </span>
        </button>
      </SheetTrigger>

      {/* Sheet panel */}
      <SheetContent
        side="left"
        className="flex flex-col overflow-hidden"
        aria-label="Facility filters panel"
      >
        <SheetHeader>
          <SheetTitle>
            Filters
            {count > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[var(--color-primary)] text-[var(--color-surface)] text-[10px] font-bold">
                {count}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable filter body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <FacilityFilters />
        </div>
      </SheetContent>
    </Sheet>
  );
}
