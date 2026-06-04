import { Skeleton } from "@/components/ui/skeleton";
import { ProviderListSkeleton } from "@/components/providers/ProviderListSkeleton";

export default function ProvidersLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 space-y-4">
        <Skeleton variant="text" className="h-10 w-64" />
        <Skeleton variant="text" className="h-6 w-full max-w-3xl" />
        <Skeleton variant="text" className="h-6 w-full max-w-2xl" />
      </div>

      <Skeleton variant="card" className="h-24 w-full mb-8" />

      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <Skeleton variant="button" className="h-10 w-full" />
          </div>
          <div className="md:col-span-3">
            <Skeleton variant="button" className="h-10 w-full" />
          </div>
          <div className="md:col-span-3">
            <Skeleton variant="button" className="h-10 w-full" />
          </div>
        </div>
      </div>

      <ProviderListSkeleton />
    </div>
  );
}
