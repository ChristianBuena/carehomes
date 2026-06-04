import { Skeleton } from "@/components/ui/skeleton";

export default function FacilityDetailLoading() {
  return (
    <div className="bg-[var(--color-bg)] min-h-screen pb-24">
      {/* Breadcrumb */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-[var(--color-primary)] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-28 rounded-full bg-white/20" />
              <Skeleton className="h-12 w-80 bg-white/20" />
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-8 w-44 rounded-lg bg-white/10" />
                <Skeleton className="h-8 w-32 rounded-lg bg-white/10" />
                <Skeleton className="h-8 w-36 rounded-lg bg-white/10" />
              </div>
            </div>
            <Skeleton className="h-12 w-52 rounded-lg bg-white/10" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
        {/* Official Record skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className="bg-[var(--color-bg)] px-6 py-4">
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Rebuttals skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-20" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-36 rounded-md" />
                  <Skeleton className="h-6 w-32 rounded-full" />
                </div>
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer skeleton */}
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    </div>
  );
}
