import { Skeleton } from "@/components/ui/skeleton";

export default function FacilityDetailLoading() {
  return (
    <div className="bg-[var(--color-bg)] min-h-screen pb-24">
      {/* Breadcrumb */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Header */}
      <div className="bg-[var(--color-primary)] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
          <Skeleton className="h-6 w-20 rounded-full bg-white/20" />
          <Skeleton className="h-12 w-2/3 bg-white/20" />
          <Skeleton className="h-5 w-48 bg-white/10" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        <Skeleton className="h-10 w-full rounded-lg mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
              <Skeleton className="h-4 w-40" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-1.5">
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-8 w-56" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-64" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
