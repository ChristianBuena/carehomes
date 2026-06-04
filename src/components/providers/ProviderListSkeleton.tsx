import { ProviderCardSkeleton } from "./ProviderCardSkeleton";

export function ProviderListSkeleton() {
  return (
    <div className="space-y-6 w-full">
      <div className="h-5 w-48 bg-[var(--color-border)]/50 rounded-md animate-pulse border-b border-[var(--color-border)] pb-2" />
      <div className="flex flex-col gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProviderCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
