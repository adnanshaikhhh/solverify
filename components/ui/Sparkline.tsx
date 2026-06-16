"use client";

import { cn } from "@/lib/utils";

interface SparklineProps {
  /** Array of numeric prices (in any consistent unit). */
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  positive?: boolean;
  /** Show area fill below the line. */
  filled?: boolean;
}

export function Sparkline({ data, width = 80, height = 32, className, positive, filled = true }: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className={cn("text-text-muted text-xs", className)} style={{ width, height }}>—</div>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const up = positive ?? data[data.length - 1] >= data[0];
  const color = up ? "#10B981" : "#EF4444";
  const fillColor = up ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)";

  const points = data.map((p, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const pathD = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const areaD = pathD + ` L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("block", className)} aria-hidden>
      {filled && <path d={areaD} fill={fillColor} />}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
