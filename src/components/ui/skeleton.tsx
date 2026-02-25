import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-lg border-2 border-gray-100 flex flex-col h-full">
      <Skeleton className="h-64 w-full rounded-none" />
      <div className="p-5 flex-1 flex flex-col gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-1 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-3.5 rounded-full" />
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-gray-100 space-y-3">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
