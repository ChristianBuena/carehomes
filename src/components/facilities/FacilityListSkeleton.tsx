import { FacilityCardSkeleton } from "./FacilityCardSkeleton";

export function FacilityListSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="h-5 w-48 bg-[var(--color-border)]/50 rounded-md animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <FacilityCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
