import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="w-full space-y-12 py-12 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
      {/* Hero Skeleton */}
      <div className="flex flex-col items-center justify-center space-y-6 pt-10">
        <Skeleton className="h-12 w-3/4 max-w-3xl rounded-lg" />
        <Skeleton className="h-6 w-full max-w-2xl rounded-md" />
        <Skeleton className="h-6 w-5/6 max-w-2xl rounded-md" />
        <div className="flex gap-4 pt-4">
          <Skeleton className="h-12 w-32 rounded-md" />
          <Skeleton className="h-12 w-32 rounded-md" />
        </div>
      </div>
      
      {/* Section Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      
      {/* Content Skeleton */}
      <div className="space-y-4 pt-16">
        <Skeleton className="h-8 w-1/3 rounded-md mx-auto" />
        <Skeleton className="h-4 w-2/3 rounded-md mx-auto" />
      </div>
    </div>
  );
}
