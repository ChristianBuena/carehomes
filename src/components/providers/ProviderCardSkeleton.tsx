import { Skeleton } from "@/components/ui/skeleton";

export function ProviderCardSkeleton() {
  return (
    <article className="flex flex-col md:flex-row gap-6 p-6 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] shadow-sm">
      <div className="flex-1 space-y-4 w-full">
        <header className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-2 w-full max-w-sm">
            <Skeleton variant="text" className="h-7 w-3/4" />
            <Skeleton variant="text" className="h-5 w-1/2" />
            <Skeleton variant="text" className="h-4 w-1/3 mt-2" />
          </div>
          <Skeleton variant="button" className="h-7 w-24 shrink-0" />
        </header>

        <div className="space-y-2 pt-2">
          <Skeleton variant="text" className="h-4 w-full" />
          <Skeleton variant="text" className="h-4 w-[90%]" />
          <Skeleton variant="text" className="h-4 w-[80%]" />
        </div>

        <Skeleton variant="text" className="h-8 w-64 mt-2" />
      </div>

      <div className="md:w-56 flex flex-col justify-center shrink-0 border-t md:border-t-0 md:border-l border-[var(--color-border)] pt-4 md:pt-0 md:pl-6">
        <Skeleton variant="button" className="h-10 w-full" />
      </div>
    </article>
  );
}
