import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; positive?: boolean };
  className?: string;
  mono?: boolean;
}

export function StatCard({ label, value, icon, trend, className, mono = false }: StatCardProps) {
  return (
    <div className={cn("glass-card p-4", className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
          <div className={cn("mt-1.5 text-2xl font-semibold", mono && "font-mono")}>{value}</div>
          {trend && (
            <div
              className={cn(
                "mt-1 text-xs",
                trend.positive ? "text-safu" : "text-danger"
              )}
            >
              {trend.positive ? "▲" : "▼"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        {icon && <div className="text-text-muted">{icon}</div>}
      </div>
    </div>
  );
}
