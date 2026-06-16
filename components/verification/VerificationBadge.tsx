"use client";

import { Shield, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationTier, ClaimStatus } from "@/lib/types";

interface VerificationBadgeProps {
  tier: VerificationTier;
  status: ClaimStatus;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showLabel?: boolean;
}

const SIZE_CLASSES = {
  sm: { wrap: "h-6 w-6", icon: "h-3.5 w-3.5", text: "text-xs" },
  md: { wrap: "h-8 w-8", icon: "h-4 w-4", text: "text-sm" },
  lg: { wrap: "h-12 w-12", icon: "h-6 w-6", text: "text-base" },
  xl: { wrap: "h-16 w-16", icon: "h-8 w-8", text: "text-lg" },
};

export function VerificationBadge({ tier, status, size = "md", className, showLabel = false }: VerificationBadgeProps) {
  const sz = SIZE_CLASSES[size];

  if (status === "suspended") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className={cn("flex items-center justify-center rounded-full bg-danger/20 text-danger", sz.wrap)}>
          <ShieldX className={sz.icon} />
        </span>
        {showLabel && <span className={cn("font-medium text-danger", sz.text)}>Suspended</span>}
      </span>
    );
  }

  if (tier === "none" || status === "unclaimed") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className={cn("flex items-center justify-center rounded-full border border-dashed border-text-muted text-text-muted", sz.wrap)}>
          <Shield className={sz.icon} />
        </span>
        {showLabel && <span className={cn("font-medium text-text-muted", sz.text)}>Unclaimed</span>}
      </span>
    );
  }

  if (tier === "bronze") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className={cn("flex items-center justify-center rounded-full bg-bronze/20 text-bronze", sz.wrap)}>
          <Shield className={sz.icon} />
        </span>
        {showLabel && <span className={cn("font-semibold text-bronze", sz.text)}>Bronze</span>}
      </span>
    );
  }

  if (tier === "silver") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className={cn("flex items-center justify-center rounded-full bg-silver/20 text-silver shadow-inner", sz.wrap)}>
          <ShieldCheck className={sz.icon} />
        </span>
        {showLabel && <span className={cn("font-semibold text-silver", sz.text)}>Silver</span>}
      </span>
    );
  }

  // Gold
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full shadow-gold-glow",
          sz.wrap
        )}
        style={{ background: "linear-gradient(135deg, #F59E0B, #FCD34D, #F59E0B)" }}
      >
        <ShieldCheck className={cn(sz.icon, "text-bg-base")} />
        <span
          className="pointer-events-none absolute inset-0 rounded-full opacity-50"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(252,211,77,0.4), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmerGold 3s linear infinite",
          }}
        />
      </span>
      {showLabel && <span className={cn("font-bold gold-shimmer", sz.text)}>Gold</span>}
    </span>
  );
}
