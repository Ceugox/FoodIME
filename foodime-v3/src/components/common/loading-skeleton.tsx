export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-surface-2 rounded-xl animate-shimmer ${className}`} />;
}

export function StoreCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border p-3 space-y-2">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
