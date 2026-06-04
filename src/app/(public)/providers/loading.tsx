import { Skeleton } from "@/components/ui/skeleton";

export default function ProvidersLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-full max-w-3xl" />
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>

      <Skeleton className="h-24 w-full mb-8 rounded-xl" />

      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
