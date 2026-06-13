import { Skeleton } from "@/components/ui/skeleton";

export function FacilityDetailSkeleton() {
  return (
    <div className="bg-[var(--color-bg)] min-h-screen pb-24">
      {/* Header Skeleton */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] pt-12 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 max-w-4xl">
            <div className="flex items-center gap-3">
              <Skeleton variant="button" className="h-6 w-20 shrink-0" />
              <Skeleton variant="text" className="h-4 w-32" />
            </div>
            <Skeleton variant="text" className="h-10 sm:h-12 w-3/4" />
            
            <div className="flex flex-wrap items-center gap-y-3 gap-x-6 mt-2">
              <Skeleton variant="text" className="h-5 w-48" />
              <Skeleton variant="text" className="h-5 w-32" />
              <Skeleton variant="text" className="h-5 w-40" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          <div className="lg:col-span-2 space-y-8">
            <Skeleton variant="card" className="h-[400px]" />
          </div>
          
          <div className="space-y-6">
            <Skeleton variant="card" className="h-64" />
            <Skeleton variant="card" className="h-48" />
          </div>

        </div>
      </div>
    </div>
  );
}
