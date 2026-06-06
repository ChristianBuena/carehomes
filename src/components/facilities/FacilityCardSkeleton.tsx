import { Skeleton } from "@/components/ui/skeleton";

export function FacilityCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <Skeleton variant="text" className="h-6 w-2/3" />
        <Skeleton variant="button" className="h-6 w-16 rounded-full shrink-0" />
      </div>

      {/* Meta info */}
      <div className="flex flex-col gap-3 mt-2">
        <Skeleton variant="text" className="h-4 w-1/2" />
        <Skeleton variant="text" className="h-4 w-1/3" />
        <Skeleton variant="text" className="h-4 w-3/4" />
      </div>

      {/* Facility Number */}
      <Skeleton variant="text" className="h-3 w-1/3 mt-2" />

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)] mt-auto">
        <Skeleton variant="text" className="h-4 w-24" />
        <Skeleton variant="text" className="h-4 w-24" />
      </div>
    </div>
  );
}
