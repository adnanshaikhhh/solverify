// =============================================================================
// SolVerify — lib/validators.ts
// Zod schemas for all input validation
// =============================================================================

import { z } from "zod";

// Solana address: 32-44 base58 characters
const solanaAddress = z
  .string()
  .min(32, "Invalid Solana address")
  .max(44, "Invalid Solana address")
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Invalid Solana address format");

export const SolanaAddress = solanaAddress;

// HTTP/HTTPS URL with no localhost/private addresses
const safeUrl = z
  .string()
  .url("Invalid URL")
  .max(2048)
  .refine((u) => /^https?:\/\//i.test(u), "URL must use http or https")
  .refine(
    (u) => {
      try {
        const h = new URL(u).hostname.toLowerCase();
        return !(
          h === "localhost" ||
          h === "127.0.0.1" ||
          h === "0.0.0.0" ||
          h.endsWith(".local") ||
          h.startsWith("192.168.") ||
          h.startsWith("10.")
        );
      } catch {
        return false;
      }
    },
    "URL not allowed"
  );

export const SafeUrl = safeUrl;

// -----------------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------------
export const ChallengeRequest = z.object({
  wallet: SolanaAddress,
});

export const VerifyRequest = z.object({
  wallet: SolanaAddress,
  signature: z.string().min(64).max(256),
  nonce: z.string().uuid(),
});

// -----------------------------------------------------------------------------
// Tokens
// -----------------------------------------------------------------------------
export const TokensListQuery = z.object({
  search: z.string().trim().max(100).optional(),
  tier: z.enum(["none", "bronze", "silver", "gold"]).optional(),
  status: z.enum(["unclaimed", "pending", "claimed", "suspended"]).optional(),
  sort: z.enum(["score", "trust", "recent", "views", "vouches"]).default("score"),
  min_score: z.coerce.number().int().min(0).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const SearchQuery = z.object({
  q: z.string().trim().min(1).max(100),
});

// -----------------------------------------------------------------------------
// Claiming
// -----------------------------------------------------------------------------
export const ClaimRequest = z.object({
  signature: z.string().min(64).max(256),
  message: z.string().min(10).max(2000),
  claim_method: z.enum(["creator_wallet", "update_authority", "largest_holder"]),
  tier: z.enum(["bronze", "silver", "gold"]).default("bronze"),
});

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------
export const MetadataUpdate = z.object({
  name: z.string().max(64).optional(),
  symbol: z.string().max(16).optional(),
  description: z.string().max(2000).optional(),
  website_url: SafeUrl.optional().nullable(),
  twitter_url: SafeUrl.optional().nullable(),
  telegram_url: SafeUrl.optional().nullable(),
  discord_url: SafeUrl.optional().nullable(),
  github_url: SafeUrl.optional().nullable(),
  whitepaper_url: SafeUrl.optional().nullable(),
});

// -----------------------------------------------------------------------------
// Vouches
// -----------------------------------------------------------------------------
export const VouchCreate = z.object({
  message: z.string().trim().max(280).optional(),
});

// -----------------------------------------------------------------------------
// Reports
// -----------------------------------------------------------------------------
export const ReportCreate = z.object({
  report_type: z.enum([
    "scam_link",
    "drainer",
    "fake_social",
    "impersonation",
    "rug_pull",
    "bundle_detected",
    "other",
  ]),
  description: z.string().trim().min(10).max(2000),
  evidence_url: SafeUrl.optional().nullable(),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

// -----------------------------------------------------------------------------
// Payments
// -----------------------------------------------------------------------------
export const PaymentInitiate = z.object({
  token_id: z.string().uuid(),
  tier: z.enum(["silver", "gold"]),
});

// -----------------------------------------------------------------------------
// Widget
// -----------------------------------------------------------------------------
export const WidgetCreate = z.object({
  token_id: z.string().uuid(),
  style: z.enum(["mini", "card", "full"]).default("card"),
});

// -----------------------------------------------------------------------------
// Admin
// -----------------------------------------------------------------------------
export const AdminClaimAction = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

export const AdminReportAction = z.object({
  note: z.string().trim().min(3).max(500).optional(),
});

export const AdminSuspend = z.object({
  reason: z.string().trim().min(5).max(500),
});
