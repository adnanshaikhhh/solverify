"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import type { ScoreBreakdown } from "@/lib/trust-score";
import { Shield, Lock, Link2, Users, FileText, TrendingUp, TrendingDown } from "lucide-react";

interface TrustBreakdownProps {
  breakdown: ScoreBreakdown;
  compact?: boolean;
}

const SECTIONS = [
  { key: "ownership" as const, label: "Ownership", max: 30, icon: Shield },
  { key: "safety"    as const, label: "Token Safety", max: 25, icon: Lock },
  { key: "links"     as const, label: "Link Safety", max: 20, icon: Link2 },
  { key: "community" as const, label: "Community", max: 15, icon: Users },
  { key: "metadata"  as const, label: "Metadata", max: 10, icon: FileText },
];

export function TrustBreakdown({ breakdown, compact = false }: TrustBreakdownProps) {
  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Trust Score Breakdown</h3>
        <div className="font-mono text-2xl font-bold">{breakdown.total}<span className="text-sm text-text-muted">/100</span></div>
      </div>

      {SECTIONS.map(({ key, label, max, icon: Icon }) => {
        const value = breakdown[key];
        const pct = (value / max) * 100;
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
              <div className="flex items-center gap-1 font-mono">
                {value > 0 && breakdown.details[`${key}_vouches_100`] === undefined && <span className="text-safu"><TrendingUp className="inline h-3 w-3" /></span>}
                {value < 0 && <span className="text-danger"><TrendingDown className="inline h-3 w-3" /></span>}
                <span className={value > 0 ? "text-safu" : value < 0 ? "text-danger" : "text-text-primary"}>
                  {value}
                </span>
                <span className="text-text-muted">/{max}</span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
              <div
                className={`h-full transition-all duration-700 ${
                  pct >= 80 ? "bg-safu" :
                  pct >= 50 ? "bg-trusted" :
                  pct >= 25 ? "bg-caution" : "bg-danger"
                }`}
                style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
              />
            </div>
          </div>
        );
      })}

      {!compact && Object.keys(breakdown.details).length > 0 && (
        <details className="text-xs text-text-muted">
          <summary className="cursor-pointer text-text-secondary">Detail</summary>
          <ul className="mt-2 space-y-1 pl-4">
            {Object.entries(breakdown.details).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span>{k.replace(/_/g, " ")}</span>
                <span className={`font-mono ${v >= 0 ? "text-safu" : "text-danger"}`}>
                  {v >= 0 ? "+" : ""}{v}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </GlassCard>
  );
}
