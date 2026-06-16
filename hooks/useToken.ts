// =============================================================================
// SolVerify — hooks/useToken.ts
// Fetch a single token by address
// =============================================================================

"use client";

import useSWR from "swr";

export interface TokenDetail {
  id: string;
  contract_address: string;
  name: string | null;
  symbol: string | null;
  description: string | null;
  decimals: number;
  total_supply: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  twitter_url: string | null;
  telegram_url: string | null;
  discord_url: string | null;
  github_url: string | null;
  whitepaper_url: string | null;
  claim_status: "unclaimed" | "pending" | "claimed" | "suspended";
  verification_tier: "none" | "bronze" | "silver" | "gold";
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
  links_safety_status: "unchecked" | "clean" | "flagged" | "blocked";
  community_vouches: number;
  report_count: number;
  view_count: number;
  dexscreener_url: string | null;
  created_at: string;
  updated_at: string;
}

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`Failed: ${r.status}`);
  return r.json();
});

export function useToken(address: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ token: TokenDetail }>(
    address ? `/api/tokens/${address}` : null,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );
  return { token: data?.token ?? null, error, isLoading, mutate };
}
