"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { FacilityFilters } from "@/components/facilities/FacilityFilters";

export function FacilityFiltersDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Toggle button — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] shadow-sm hover:bg-[var(--color-bg)] transition"
        aria-expanded={open}
        aria-controls="filters-drawer"
        aria-label="Open filters"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filters
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        id="filters-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Facility filters"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[var(--color-surface)] shadow-xl p-6 flex flex-col gap-6 overflow-y-auto transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-primary)]">Filters</h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close filters"
            className="p-1 rounded-md text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <FacilityFilters />
      </div>
    </>
  );
}
