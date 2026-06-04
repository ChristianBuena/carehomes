import { Skeleton } from "@/components/ui/skeleton";

export default function FacilitiesLoading() {
  return (
    <div className="bg-[var(--color-bg)] min-h-screen pb-24">
      {/* Header Skeleton */}
      <div className="bg-[var(--color-primary)] py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
          <Skeleton className="h-12 w-72 bg-white/20" />
          <Skeleton className="h-6 w-96 bg-white/10" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {/* Search bar skeleton */}
        <Skeleton className="h-12 w-full rounded-xl mb-8" />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar skeleton */}
          <div className="hidden lg:block w-56 xl:w-64 shrink-0">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-6">
              <Skeleton className="h-4 w-20" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-4 w-20" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="flex-1 min-w-0">
            <Skeleton className="h-5 w-44 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="space-y-2.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
