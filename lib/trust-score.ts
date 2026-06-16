// =============================================================================
// SolVerify — lib/trust-score.ts
// Deterministic 0-100 trust score with breakdown
// =============================================================================

import type { VerificationTier, Severity } from "./types";
import { TRUST_GRADE_COLORS, type TrustGrade as _TrustGrade } from "./constants";
export type TrustGrade = _TrustGrade;

export interface TokenData {
  verification_tier: VerificationTier;
  claim_status: "unclaimed" | "pending" | "claimed" | "suspended";
  is_mint_disabled?: boolean | null;
  is_freeze_disabled?: boolean | null;
  liquidity_locked?: boolean | null;
  top10_holder_percent?: number | null;
  links_safety_status?: "unchecked" | "clean" | "flagged" | "blocked" | null;
  community_vouches?: number | null;
  open_reports?: { severity: Severity }[];
  logo_url?: string | null;
  description?: string | null;
  website_url?: string | null;
  twitter_url?: string | null;
  telegram_url?: string | null;
}

export interface ScoreBreakdown {
  ownership: number;
  safety: number;
  links: number;
  community: number;
  metadata: number;
  total: number;
  details: Record<string, number>;
}

export interface TrustScoreResult {
  score: number;
  grade: TrustGrade;
  breakdown: ScoreBreakdown;
}

// =============================================================================
// Grade from score
// =============================================================================
export function getTrustGrade(score: number): TrustGrade {
  if (score >= 90) return "SAFU";
  if (score >= 75) return "Trusted";
  if (score >= 55) return "Caution";
  if (score >= 35) return "Risky";
  return "Danger";
}

// =============================================================================
// Ownership (30 pts)
// =============================================================================
function ownershipScore(t: TokenData): { value: number; reason: string } {
  if (t.claim_status === "suspended") return { value: 0, reason: "suspended" };
  if (t.verification_tier === "gold") return { value: 30, reason: "gold" };
  if (t.verification_tier === "silver") return { value: 20, reason: "silver" };
  if (t.verification_tier === "bronze") return { value: 10, reason: "bronze" };
  if (t.claim_status === "pending") return { value: 5, reason: "pending" };
  return { value: 0, reason: "unclaimed" };
}

// =============================================================================
// Token safety (25 pts)
// =============================================================================
function safetyScore(t: TokenData): { value: number; details: Record<string, number> } {
  const details: Record<string, number> = {};
  let v = 0;
  if (t.is_mint_disabled) { v += 8; details.mint_disabled = 8; }
  if (t.is_freeze_disabled) { v += 7; details.freeze_disabled = 7; }
  if (t.liquidity_locked) { v += 7; details.liquidity_locked = 7; }
  if (typeof t.top10_holder_percent === "number" && t.top10_holder_percent < 30) {
    v += 3;
    details.top10_holder_healthy = 3;
  }
  return { value: Math.min(v, 25), details };
}

// =============================================================================
// Links (20 pts)
// =============================================================================
function linksScore(t: TokenData): { value: number; details: Record<string, number> } {
  const details: Record<string, number> = {};
  const status = t.links_safety_status ?? "unchecked";
  if (status === "blocked") {
    details.blocked_link = -20;
    return { value: 0, details };
  }
  if (status === "flagged") {
    details.suspicious_link = -5;
    return { value: 10, details };
  }
  if (status === "clean") {
    details.all_clean = 20;
    return { value: 20, details };
  }
  // unchecked
  details.unchecked = 10;
  return { value: 10, details };
}

// =============================================================================
// Community (15 pts)
// =============================================================================
function communityScore(t: TokenData): { value: number; details: Record<string, number> } {
  const details: Record<string, number> = {};
  const vouches = t.community_vouches ?? 0;
  let v = 0;
  if (vouches >= 100) { v = 15; details.vouches_100 = 15; }
  else if (vouches >= 50) { v = 12; details.vouches_50 = 12; }
  else if (vouches >= 20) { v = 8;  details.vouches_20 = 8; }
  else if (vouches >= 5)  { v = 4;  details.vouches_5 = 4; }
  else if (vouches >= 1)  { v = 2;  details.vouches_1 = 2; }

  // Penalties for active reports
  for (const r of t.open_reports || []) {
    if (r.severity === "critical") { v -= 15; details.critical_report = -15; }
    else if (r.severity === "high") { v -= 8;  details.high_report = -8; }
    else if (r.severity === "medium") { v -= 3; details.medium_report = -3; }
    else if (r.severity === "low") { /* no penalty */ }
  }
  return { value: Math.max(v, 0), details };
}

// =============================================================================
// Metadata completeness (10 pts)
// =============================================================================
function metadataScore(t: TokenData): { value: number; details: Record<string, number> } {
  const details: Record<string, number> = {};
  let v = 0;
  if (t.logo_url) { v += 2; details.logo = 2; }
  if (t.description && t.description.length > 20) { v += 2; details.description = 2; }
  if (t.website_url) { v += 2; details.website = 2; }
  if (t.twitter_url) { v += 2; details.twitter = 2; }
  if (t.telegram_url) { v += 2; details.telegram = 2; }
  return { value: Math.min(v, 10), details };
}

// =============================================================================
// Main: calculate total
// =============================================================================
export function calculateTrustScore(t: TokenData): TrustScoreResult {
  const ownership = ownershipScore(t);
  const safety    = safetyScore(t);
  const links     = linksScore(t);
  const community = communityScore(t);
  const metadata  = metadataScore(t);

  const details: Record<string, number> = {};
  details[`ownership_${ownership.reason}`] = ownership.value;
  for (const [k, val] of Object.entries(safety.details)) details[k] = val;
  for (const [k, val] of Object.entries(links.details)) details[k] = val;
  for (const [k, val] of Object.entries(community.details)) details[k] = val;
  for (const [k, val] of Object.entries(metadata.details)) details[k] = val;

  const total = Math.max(
    0,
    Math.min(100, ownership.value + safety.value + links.value + community.value + metadata.value)
  );

  const breakdown: ScoreBreakdown = {
    ownership: ownership.value,
    safety: safety.value,
    links: links.value,
    community: community.value,
    metadata: metadata.value,
    total,
    details,
  };

  return {
    score: total,
    grade: getTrustGrade(total),
    breakdown,
  };
}

export function getScoreBreakdown(t: TokenData): ScoreBreakdown {
  return calculateTrustScore(t).breakdown;
}

export function getScoreChangeReason(before: number, after: number): string {
  const diff = after - before;
  if (diff === 0) return "no change";
  return diff > 0 ? `+${diff} (improved)` : `${diff} (declined)`;
}
