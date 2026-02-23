import { Skeleton } from './Skeleton';

export function StoreCardSkeleton() {
  return (
    <div className="flex items-center gap-3 bg-surface rounded-2xl border border-border overflow-hidden mb-3">
      <Skeleton className="w-22 h-22 min-w-[88px] min-h-[88px] rounded-none" />
      <div className="flex-1 py-3 pr-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-full mt-2" />
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 space-y-3 mb-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between items-center pt-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 space-y-2">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-7 w-3/4" />
    </div>
  );
}
