"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

const COUNTIES = [
  "Alameda", "Contra Costa", "Fresno", "Los Angeles", "Monterey",
  "Orange", "Placer", "Riverside", "Sacramento", "San Bernardino",
  "San Diego", "San Francisco", "Santa Barbara", "Santa Clara", "Ventura",
];

const CAPACITY_RANGES = [
  { label: "Small (≤ 6)", value: "small" },
  { label: "Medium (7–30)", value: "medium" },
  { label: "Large (31+)", value: "large" },
];

export function FacilityFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCounty = searchParams.get("county") ?? "";
  const activeStatus = searchParams.get("status") ?? "";
  const activeCapacity = searchParams.get("capacity") ?? "";
  const hasRebuttals = searchParams.get("rebuttals") === "1";

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function clearAll() {
    router.replace(pathname, { scroll: false });
  }

  const hasActiveFilters = activeCounty || activeStatus || activeCapacity || hasRebuttals;

  return (
    <aside className="w-full space-y-6" aria-label="Facility filters">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors font-medium"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Status */}
      <div>
        <h3 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider mb-3">
          Status
        </h3>
        <div className="space-y-2">
          {[
            { label: "All", value: "" },
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="status"
                value={opt.value}
                checked={activeStatus === opt.value}
                onChange={() => updateParam("status", opt.value || null)}
                className="accent-[var(--color-primary)] h-4 w-4"
              />
              <span className="text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* County */}
      <div>
        <h3 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider mb-3">
          County
        </h3>
        <select
          value={activeCounty}
          onChange={(e) => updateParam("county", e.target.value || null)}
          className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition"
          aria-label="Filter by county"
        >
          <option value="">All Counties</option>
          {COUNTIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Capacity */}
      <div>
        <h3 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider mb-3">
          Capacity
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name="capacity"
              value=""
              checked={activeCapacity === ""}
              onChange={() => updateParam("capacity", null)}
              className="accent-[var(--color-primary)] h-4 w-4"
            />
            <span className="text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
              All sizes
            </span>
          </label>
          {CAPACITY_RANGES.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="capacity"
                value={opt.value}
                checked={activeCapacity === opt.value}
                onChange={() => updateParam("capacity", opt.value)}
                className="accent-[var(--color-primary)] h-4 w-4"
              />
              <span className="text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Has Rebuttals */}
      <div>
        <h3 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider mb-3">
          Rebuttals
        </h3>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={hasRebuttals}
            onChange={(e) => updateParam("rebuttals", e.target.checked ? "1" : null)}
            className="accent-[var(--color-secondary)] h-4 w-4 rounded"
          />
          <span className="text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
            Has published rebuttals
          </span>
        </label>
      </div>
    </aside>
  );
}
