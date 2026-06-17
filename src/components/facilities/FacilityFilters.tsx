"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilterState = {
  counties: string[];
  status: "all" | "active" | "inactive";
  hasRebuttals: boolean;
  capacity: "any" | "lt10" | "10-25" | "26-50" | "50plus";
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const CA_COUNTIES = [
  "Alameda", "Alpine", "Amador", "Butte", "Calaveras", "Colusa",
  "Contra Costa", "Del Norte", "El Dorado", "Fresno", "Glenn",
  "Humboldt", "Imperial", "Inyo", "Kern", "Kings", "Lake", "Lassen",
  "Los Angeles", "Madera", "Marin", "Mariposa", "Mendocino", "Merced",
  "Modoc", "Mono", "Monterey", "Napa", "Nevada", "Orange", "Placer",
  "Plumas", "Riverside", "Sacramento", "San Benito", "San Bernardino",
  "San Diego", "San Francisco", "San Joaquin", "San Luis Obispo",
  "San Mateo", "Santa Barbara", "Santa Clara", "Santa Cruz", "Shasta",
  "Sierra", "Siskiyou", "Solano", "Sonoma", "Stanislaus", "Sutter",
  "Tehama", "Trinity", "Tulare", "Tuolumne", "Ventura", "Yolo", "Yuba",
] as const;

const CAPACITY_OPTIONS = [
  { value: "any", label: "Any size" },
  { value: "lt10", label: "Less than 10" },
  { value: "10-25", label: "10 – 25" },
  { value: "26-50", label: "26 – 50" },
  { value: "50plus", label: "50+" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function readFiltersFromParams(searchParams: URLSearchParams): FilterState {
  const counties = searchParams.getAll("county");
  const rawStatus = searchParams.get("status");
  const status =
    rawStatus === "active" || rawStatus === "inactive" ? rawStatus : "all";
  const rawCapacity = searchParams.get("capacity");
  const capacity =
    rawCapacity === "lt10" ||
    rawCapacity === "10-25" ||
    rawCapacity === "26-50" ||
    rawCapacity === "50plus"
      ? rawCapacity
      : "any";
  return {
    counties,
    status,
    hasRebuttals: searchParams.get("rebuttals") === "1",
    capacity,
  };
}

export function activeFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.counties.length > 0) count += filters.counties.length;
  if (filters.status !== "all") count++;
  if (filters.hasRebuttals) count++;
  if (filters.capacity !== "any") count++;
  return count;
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function FilterSection({
  legend,
  children,
  defaultOpen = true,
}: {
  legend: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <fieldset className="border-0 p-0 m-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
        aria-expanded={open}
      >
        <legend className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider cursor-pointer">
          {legend}
        </legend>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
        )}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </fieldset>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface FacilityFiltersProps {
  /** If provided, will be called after each filter change (e.g. to close a Sheet). */
  onFilterChange?: () => void;
}

export function FacilityFilters({ onFilterChange }: FacilityFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readFiltersFromParams(searchParams);

  // Store searchParams in a ref so pushParams has a stable identity.
  // Reading from the ref inside the callback ensures we always use the latest
  // URL params without listing `searchParams` as a dep (which would recreate
  // the callback on every URL change and cause an infinite re-render loop).
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const pushParams = useCallback(
    (updater: (p: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      updater(params);
      params.delete("page"); // reset pagination on filter change
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      onFilterChange?.();
    },
    [pathname, router, onFilterChange]
  );

  // County multi-select
  function toggleCounty(county: string) {
    pushParams((params) => {
      const existing = params.getAll("county");
      params.delete("county");
      if (existing.includes(county)) {
        existing.filter((c) => c !== county).forEach((c) => params.append("county", c));
      } else {
        [...existing, county].forEach((c) => params.append("county", c));
      }
    });
  }

  // Status radio
  function setStatus(value: FilterState["status"]) {
    pushParams((params) => {
      if (value === "all") params.delete("status");
      else params.set("status", value);
    });
  }

  // Capacity
  function setCapacity(value: FilterState["capacity"]) {
    pushParams((params) => {
      if (value === "any") params.delete("capacity");
      else params.set("capacity", value);
    });
  }

  // Has rebuttals
  function toggleRebuttals(checked: boolean) {
    pushParams((params) => {
      if (checked) params.set("rebuttals", "1");
      else params.delete("rebuttals");
    });
  }

  // Clear all
  function clearAll() {
    router.replace(pathname, { scroll: false });
    onFilterChange?.();
  }

  const count = activeFilterCount(filters);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide">
          Filters
        </span>
        {count > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded px-1"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Status ──────────────────────────────────────────────────────── */}
      <FilterSection legend="Status">
        <div className="space-y-2" role="radiogroup" aria-label="Filter by status">
          {(
            [
              { value: "all", label: "All facilities" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="radio"
                name="status-filter"
                value={opt.value}
                checked={filters.status === opt.value}
                onChange={() => setStatus(opt.value)}
                className="accent-[var(--color-primary)] h-4 w-4 cursor-pointer"
              />
              <span className="text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <hr className="border-[var(--color-border)]" />

      {/* ── County ──────────────────────────────────────────────────────── */}
      <FilterSection legend="County">
        <div
          className="max-h-52 overflow-y-auto space-y-2 pr-1 scrollbar-thin"
          role="group"
          aria-label="Filter by county"
        >
          {CA_COUNTIES.map((county) => (
            <label
              key={county}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                value={county}
                checked={filters.counties.includes(county)}
                onChange={() => toggleCounty(county)}
                className="accent-[var(--color-primary)] h-4 w-4 rounded cursor-pointer"
              />
              <span className="text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                {county}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <hr className="border-[var(--color-border)]" />

      {/* ── Capacity ────────────────────────────────────────────────────── */}
      <FilterSection legend="Capacity">
        <div className="space-y-2" role="radiogroup" aria-label="Filter by capacity">
          {CAPACITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="radio"
                name="capacity-filter"
                value={opt.value}
                checked={filters.capacity === opt.value}
                onChange={() => setCapacity(opt.value)}
                className="accent-[var(--color-primary)] h-4 w-4 cursor-pointer"
              />
              <span className="text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <hr className="border-[var(--color-border)]" />

      {/* ── Has Rebuttals ────────────────────────────────────────────────── */}
      <FilterSection legend="Rebuttals">
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={filters.hasRebuttals}
            onChange={(e) => toggleRebuttals(e.target.checked)}
            className="accent-[var(--color-secondary)] h-4 w-4 rounded cursor-pointer mt-0.5"
            aria-label="Only show facilities with published rebuttals"
          />
          <span className="text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors leading-snug">
            Only show facilities with published rebuttals
          </span>
        </label>
      </FilterSection>
    </div>
  );
}
