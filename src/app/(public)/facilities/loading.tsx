import { Skeleton } from "@/components/ui/skeleton";
import { FacilityListSkeleton } from "@/components/facilities/FacilityListSkeleton";

export default function FacilitiesLoading() {
  return (
    <div className="bg-[var(--color-bg)] min-h-screen pb-24">
      {/* Header Skeleton */}
      <div className="bg-[var(--color-primary)] py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
          <Skeleton variant="text" className="h-12 w-72 bg-white/20" />
          <Skeleton variant="text" className="h-6 w-96 bg-white/10" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {/* Search bar skeleton */}
        <Skeleton variant="card" className="h-12 w-full mb-8" />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar skeleton */}
          <div className="hidden lg:block w-56 xl:w-64 shrink-0">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-6">
              <Skeleton variant="text" className="h-4 w-20" />
              <div className="space-y-3">
                <Skeleton variant="text" className="h-4 w-full" />
                <Skeleton variant="text" className="h-4 w-3/4" />
                <Skeleton variant="text" className="h-4 w-4/5" />
              </div>
              <Skeleton variant="text" className="h-4 w-20" />
              <Skeleton variant="button" className="h-10 w-full" />
              <Skeleton variant="text" className="h-4 w-20" />
              <div className="space-y-3">
                <Skeleton variant="text" className="h-4 w-full" />
                <Skeleton variant="text" className="h-4 w-4/5" />
                <Skeleton variant="text" className="h-4 w-3/4" />
              </div>
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="flex-1 min-w-0">
            <FacilityListSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
