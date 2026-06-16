"use client";

import { cn } from "@/lib/utils";
import { Check, AlertTriangle, X, Minus } from "lucide-react";

export type SafetyLevel = "clean" | "suspicious" | "flagged" | "blocked" | "unchecked";

interface SafetyIndicatorProps {
  level: SafetyLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const CONFIG = {
  clean: { color: "text-safu bg-safu/10 border-safu/30", icon: Check, label: "Clean" },
  flagged: { color: "text-caution bg-caution/10 border-caution/30", icon: AlertTriangle, label: "Flagged" },
  suspicious: { color: "text-caution bg-caution/10 border-caution/30", icon: AlertTriangle, label: "Suspicious" },
  blocked: { color: "text-danger bg-danger/10 border-danger/30", icon: X, label: "Blocked" },
  unchecked: { color: "text-text-muted bg-bg-elevated border-border-subtle", icon: Minus, label: "Unchecked" },
} as const;

const SIZES = {
  sm: { pill: "px-2 py-0.5 text-xs", icon: "h-3 w-3" },
  md: { pill: "px-2.5 py-1 text-sm", icon: "h-3.5 w-3.5" },
  lg: { pill: "px-3 py-1.5 text-base", icon: "h-4 w-4" },
};

export function SafetyIndicator({ level, size = "md", className, label }: SafetyIndicatorProps) {
  const cfg = CONFIG[level];
  const sz = SIZES[size];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border font-medium", sz.pill, cfg.color, className)}>
      <Icon className={sz.icon} />
      {label ?? cfg.label}
    </span>
  );
}
