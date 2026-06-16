// =============================================================================
// SolVerify — hooks/useSearch.ts
// Token search with debounce
// =============================================================================

"use client";

import useSWR from "swr";

export interface SearchHit {
  id: string;
  contract_address: string;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  verification_tier: "none" | "bronze" | "silver" | "gold";
  claim_status: "unclaimed" | "pending" | "claimed" | "suspended";
  trust_score: number;
  links_safety_status: "unchecked" | "clean" | "flagged" | "blocked";
  community_vouches: number;
  updated_at: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
};

export function useSearch(query: string) {
  const q = query.trim();
  const { data, error, isLoading } = useSWR<{ results: SearchHit[] }>(
    q ? `/api/search?q=${encodeURIComponent(q)}` : null,
    fetcher,
    { dedupingInterval: 1000, revalidateOnFocus: false }
  );
  return { results: data?.results ?? [], error, isLoading };
}
