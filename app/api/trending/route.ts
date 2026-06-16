// =============================================================================
// SolVerify — app/api/trending/route.ts
// 3 lists: trending (1h volume), new listings (<7d, >$10k vol), verified (DB)
// =============================================================================

import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import {
  getTrendingPools,
  getNewPools,
  getTokenPools,
  normalizePool,
  mergeSolverifyData,
  type TrendingResponse,
} from "@/lib/feed";
import { handleError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cache: { value: TrendingResponse; expires: number } | null = null;
const TTL = 60_000;

export async function GET(req: NextRequest) {
  try {
    if (cache && cache.expires > Date.now() && cache.value.verified.length > 0) {
      return Response.json(cache.value);
    }

    const db = getSupabaseService();
    const allAddrs = new Set<string>();

    // 1) Trending (1h volume)
    const trendingPools = await getTrendingPools(15);
    const trending = trendingPools.map(normalizePool);
    trending.forEach((t) => allAddrs.add(t.address));

    // 2) New listings
    const newPools = await getNewPools(15);
    const newListings = newPools.map(normalizePool);
    newListings.forEach((t) => allAddrs.add(t.address));

    // 3) Verified from DB — also enrich with live data
    const { data: verifiedRows } = await db
      .from("tokens")
      .select("contract_address, name, symbol, logo_url, claim_status, verification_tier, trust_score")
      .in("verification_tier", ["gold", "silver", "bronze"])
      .order("trust_score", { ascending: false })
      .limit(15);

    // Best-effort live data for verified tokens
    const verifiedEnriched = await Promise.all(
      ((verifiedRows as any[]) || []).map(async (r) => {
        try {
          const pools = await getTokenPools(r.contract_address);
          if (!pools || pools.length === 0) return { r, live: null };
          const sorted = [...pools].sort((a, b) => Number(b.attributes?.reserve_in_usd || 0) - Number(a.attributes?.reserve_in_usd || 0));
          return { r, live: normalizePool(sorted[0]) };
        } catch {
          return { r, live: null };
        }
      })
    );

    const verified = verifiedEnriched.map(({ r, live }) => ({
      address: r.contract_address,
      name: r.name,
      symbol: r.symbol,
      logo_url: r.logo_url,
      price_usd: live?.price_usd ?? null,
      price_native: live?.price_native ?? null,
      change_24h: live?.change_24h ?? null,
      change_1h: live?.change_1h ?? null,
      change_6h: live?.change_6h ?? null,
      volume_24h: live?.volume_24h ?? null,
      liquidity_usd: live?.liquidity_usd ?? null,
      market_cap: live?.market_cap ?? null,
      fdv: live?.fdv ?? null,
      pair_address: live?.pair_address ?? null,
      dex_id: live?.dex_id ?? null,
      pair_created_at: live?.pair_created_at ?? null,
      sparkline_7d: live?.sparkline_7d ?? null,
      solverify: {
        in_db: true,
        claim_status: r.claim_status,
        verification_tier: r.verification_tier,
        trust_score: r.trust_score,
        grade: r.trust_score != null
          ? (r.trust_score >= 90 ? "SAFU" :
             r.trust_score >= 75 ? "Trusted" :
             r.trust_score >= 55 ? "Caution" :
             r.trust_score >= 35 ? "Risky" : "Danger")
          : null,
      },
    }));

    // Merge DB into trending + new for verified badges
    const { data: solverifyRows } = await db
      .from("tokens")
      .select("contract_address, name, symbol, logo_url, claim_status, verification_tier, trust_score")
      .in("contract_address", Array.from(allAddrs));
    if (solverifyRows && solverifyRows.length > 0) {
      const merged = mergeSolverifyData([...trending, ...newListings], solverifyRows);
      const tByAddr = new Map(merged.map((t) => [t.address, t]));
      for (let i = 0; i < trending.length; i++) {
        trending[i] = tByAddr.get(trending[i].address) || trending[i];
      }
      for (let i = 0; i < newListings.length; i++) {
        newListings[i] = tByAddr.get(newListings[i].address) || newListings[i];
      }
    }

    const response: TrendingResponse = {
      trending,
      new_listings: newListings,
      verified,
      fetched_at: Date.now(),
    };
    // Only cache if verified has data (avoids caching empty results)
    if (verified.length > 0) {
      cache = { value: response, expires: Date.now() + TTL };
    }
    return Response.json(response);
  } catch (e) {
    if (cache) return Response.json(cache.value);
    return handleError(e);
  }
}
