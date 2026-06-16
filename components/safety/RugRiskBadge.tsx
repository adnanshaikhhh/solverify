"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck, ShieldX, Loader2 } from "lucide-react";

export type RugLevel = "low" | "caution" | "high" | "unknown";

interface RugRiskBadgeProps {
  level: RugLevel;
  reasons?: string[];
  className?: string;
  size?: "sm" | "md";
}

const CONFIG = {
  low: { color: "text-safu border-safu/40 bg-safu/10", icon: ShieldCheck, label: "Safe" },
  caution: { color: "text-caution border-caution/40 bg-caution/10", icon: AlertTriangle, label: "Caution" },
  high: { color: "text-danger border-danger/40 bg-danger/10", icon: ShieldX, label: "High Risk" },
  unknown: { color: "text-text-muted border-border-subtle bg-bg-elevated", icon: Shield, label: "Unscanned" },
} as const;

export function RugRiskBadge({ level, reasons, className, size = "sm" }: RugRiskBadgeProps) {
  const cfg = CONFIG[level];
  const Icon = cfg.icon;
  const sz = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <div className={cn("group relative inline-block", className)}>
      <span className={cn("inline-flex items-center gap-1 rounded-full border font-medium", sz, cfg.color)}>
        <Icon className="h-3 w-3" />
        {cfg.label}
      </span>
      {reasons && reasons.length > 0 && (
        <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-64 rounded-lg border border-border-subtle bg-bg-card p-3 text-xs text-text-secondary shadow-xl group-hover:block">
          <div className="mb-1 font-semibold text-text-primary">Risk factors</div>
          <ul className="space-y-1">
            {reasons.map((r, i) => <li key={i} className="flex items-start gap-1.5"><span>•</span><span>{r}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function RugRiskLoading({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-elevated px-2 py-0.5 text-xs text-text-muted", className)}>
      <Loader2 className="h-3 w-3 animate-spin" /> Scanning
    </span>
  );
}
