// =============================================================================
// SolVerify — lib/constants.ts
// Static config, network constants, env readers
// =============================================================================

export const APP_NAME = "SolVerify";
export const APP_TAGLINE = "The Trust Layer for Solana Tokens";
export const APP_DESCRIPTION = "Verified ownership. Secure metadata. Community trust.";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

export const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
export const HELIUS_RPC = HELIUS_API_KEY
  ? `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`
  : SOLANA_RPC;

export const PAYMENT_WALLET =
  process.env.PAYMENT_WALLET || "11111111111111111111111111111111";

export const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || "")
  .split(",")
  .map((w) => w.trim())
  .filter(Boolean);

export const SILVER_PRICE_USD = Number(process.env.SILVER_PRICE_USD || 30);
export const GOLD_PRICE_USD = Number(process.env.GOLD_PRICE_USD || 60);

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const CRON_SECRET = process.env.CRON_SECRET || "dev-cron-secret";

export const GOOGLE_SAFE_BROWSING_KEY =
  process.env.GOOGLE_SAFE_BROWSING_KEY || "";

// Trust grades (used in UI + lib)
export type TrustGrade = "SAFU" | "Trusted" | "Caution" | "Risky" | "Danger";

export const TRUST_GRADE_COLORS: Record<TrustGrade, string> = {
  SAFU: "#10B981",
  Trusted: "#3B82F6",
  Caution: "#F59E0B",
  Risky: "#F97316",
  Danger: "#EF4444",
};

export const TIER_COLORS = {
  none: "#475569",
  bronze: "#CD7F32",
  silver: "#94A3B8",
  gold: "#F59E0B",
} as const;

export const REPORT_TYPES = [
  "scam_link",
  "drainer",
  "fake_social",
  "impersonation",
  "rug_pull",
  "bundle_detected",
  "other",
] as const;

export const SEVERITY_LEVELS = ["low", "medium", "high", "critical"] as const;

// Rate limit windows
export const RATE_LIMITS = {
  search: 30, // per minute
  authChallenge: 10, // per minute
  reports: 5, // per day per wallet
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
