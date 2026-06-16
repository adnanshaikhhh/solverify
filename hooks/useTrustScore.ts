// =============================================================================
// SolVerify — hooks/useTrustScore.ts
// Compute derived grade from a score
// =============================================================================

"use client";

import { useMemo } from "react";

export type TrustGrade = "SAFU" | "Trusted" | "Caution" | "Risky" | "Danger";

export const GRADE_COLORS: Record<TrustGrade, { text: string; bg: string; glow: string }> = {
  SAFU:    { text: "text-safu",    bg: "bg-safu",    glow: "shadow-safu-glow" },
  Trusted: { text: "text-trusted", bg: "bg-trusted", glow: "shadow-trusted-glow" },
  Caution: { text: "text-caution", bg: "bg-caution", glow: "shadow-caution-glow" },
  Risky:   { text: "text-risky",   bg: "bg-risky",   glow: "shadow-risky-glow" },
  Danger:  { text: "text-danger",  bg: "bg-danger",  glow: "shadow-danger-pulse" },
};

export function getGrade(score: number): TrustGrade {
  if (score >= 90) return "SAFU";
  if (score >= 75) return "Trusted";
  if (score >= 55) return "Caution";
  if (score >= 35) return "Risky";
  return "Danger";
}

export function useTrustScore(score: number) {
  return useMemo(() => {
    const grade = getGrade(score);
    const colors = GRADE_COLORS[grade];
    return { grade, ...colors };
  }, [score]);
}
