"use client";

import dynamicImport from "next/dynamic";

export const FacilityFiltersDrawer = dynamicImport(
  () =>
    import("@/components/facilities/FacilityFiltersDrawer").then(
      (mod) => mod.FacilityFiltersDrawer
    ),
  {
    ssr: false,
    loading: () => (
      <div className="lg:hidden h-12 w-28 rounded-xl bg-[var(--color-border)]/40 animate-pulse" />
    ),
  }
);
