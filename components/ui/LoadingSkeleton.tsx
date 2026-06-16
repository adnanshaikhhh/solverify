import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
}

export function LoadingSkeleton({ className, count = 1 }: LoadingSkeletonProps) {
  if (count > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={cn("h-24 animate-pulse rounded-2xl bg-bg-card", className)} />
        ))}
      </div>
    );
  }
  return <div className={cn("animate-pulse rounded-2xl bg-bg-card", className)} />;
}

export function TokenCardSkeleton() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 animate-pulse rounded-full bg-bg-elevated" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-bg-elevated" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-bg-elevated" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-full bg-bg-elevated" />
      </div>
    </div>
  );
}
