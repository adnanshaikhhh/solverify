// =============================================================================
// SolVerify — lib/types.ts
// Database row types, shared across the app
// =============================================================================

export type ClaimStatus = "unclaimed" | "pending" | "claimed" | "suspended";
export type VerificationTier = "none" | "bronze" | "silver" | "gold";
export type LinksSafetyStatus = "unchecked" | "clean" | "flagged" | "blocked";
export type ReportType =
  | "scam_link"
  | "drainer"
  | "fake_social"
  | "impersonation"
  | "rug_pull"
  | "bundle_detected"
  | "other";
export type Severity = "low" | "medium" | "high" | "critical";
export type ClaimMethod = "creator_wallet" | "update_authority" | "largest_holder" | "admin";
export type UpdateCategory = "branding" | "social" | "description" | "links" | "other";
export type TransferType = "initial_claim" | "transfer" | "revoked" | "suspended";
export type WidgetStyle = "mini" | "card" | "full";

export interface TokenRow {
  id: string;
  contract_address: string;
  name: string | null;
  symbol: string | null;
  decimals: number;
  total_supply: string | null;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  website_url: string | null;
  twitter_url: string | null;
  telegram_url: string | null;
  discord_url: string | null;
  github_url: string | null;
  whitepaper_url: string | null;
  claim_status: ClaimStatus;
  verification_tier: VerificationTier;
  trust_score: number;
  trust_score_breakdown: Record<string, number>;
  owner_wallet: string | null;
  creator_wallet: string | null;
  update_authority: string | null;
  is_mint_disabled: boolean;
  is_freeze_disabled: boolean;
  liquidity_locked: boolean;
  liquidity_lock_until: string | null;
  liquidity_lock_source: string | null;
  market_cap_usd: number | null;
  price_usd: number | null;
  volume_24h: number | null;
  holder_count: number | null;
  top10_holder_percent: number | null;
  dexscreener_url: string | null;
  helius_metadata: Record<string, unknown> | null;
  links_safety_status: LinksSafetyStatus;
  community_vouches: number;
  report_count: number;
  view_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenSummary {
  id: string;
  contract_address: string;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  description: string | null;
  verification_tier: VerificationTier;
  claim_status: ClaimStatus;
  trust_score: number;
  links_safety_status: LinksSafetyStatus;
  community_vouches: number;
  view_count: number;
  updated_at: string;
}

export interface ClaimRow {
  id: string;
  token_id: string;
  claimer_wallet: string;
  claim_method: ClaimMethod | null;
  signature: string;
  message_signed: string;
  verified_on_chain: boolean;
  status: "pending" | "approved" | "rejected";
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface VouchRow {
  id: string;
  token_id: string;
  voucher_wallet: string;
  vouch_message: string | null;
  created_at: string;
}

export interface ReportRow {
  id: string;
  token_id: string;
  reporter_wallet: string | null;
  report_type: ReportType;
  description: string;
  evidence_url: string | null;
  severity: Severity;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface MetadataUpdateRow {
  id: string;
  token_id: string;
  updated_by: string;
  field_name: string;
  previous_value: string | null;
  new_value: string | null;
  update_category: UpdateCategory;
  created_at: string;
}

export interface TrustScoreHistoryRow {
  id: string;
  token_id: string;
  score: number;
  breakdown: Record<string, number> | null;
  reason: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  token_id: string | null;
  payer_wallet: string;
  tier_requested: "silver" | "gold";
  amount_sol: number;
  amount_usd: number | null;
  tx_signature: string | null;
  status: "pending" | "confirmed" | "failed" | "refunded";
  tier_granted: boolean;
  created_at: string;
  confirmed_at: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}
