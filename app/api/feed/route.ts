// =============================================================================
// SolVerify — app/api/feed/route.ts
// Top tokens by 24h volume, merged with SolVerify DB, with rug risk
// =============================================================================

import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import {
  getTopPools,
  normalizePool,
  mergeSolverifyData,
  type FeedToken,
} from "@/lib/feed";
import { scanRiskBatch } from "@/lib/rug-scanner";
import { handleError, jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FeedResponse {
  data: FeedToken[];
  fetched_at: number;
  source: string;
}

let feedCache: { value: FeedResponse; expires: number } | null = null;
const FEED_TTL_MS = 60_000; // 60s

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    // Only serve cache if it's a healthy (non-empty) result
    if (feedCache && feedCache.expires > Date.now() && limit === 50 && feedCache.value.data.length > 0) {
      return Response.json(feedCache.value);
    }

    // 1) Top pools — retry once on empty
    let pools = await getTopPools(limit);
    if (pools.length === 0) {
      await new Promise((r) => setTimeout(r, 500));
      pools = await getTopPools(limit);
    }
    let tokens: FeedToken[] = pools.map(normalizePool);

    // 2) Merge SolVerify DB data (batch single query)
    const db = getSupabaseService();
    const addrs = tokens.map((t) => t.address).filter(Boolean);
    let dbRows: any[] = [];
    if (addrs.length > 0) {
      const { data } = await db
        .from("tokens")
        .select("contract_address, name, symbol, logo_url, claim_status, verification_tier, trust_score")
        .in("contract_address", addrs);
      dbRows = data || [];
    }
    tokens = mergeSolverifyData(tokens, dbRows);

    // 3) Rug risk (top 25 only to keep API fast)
    if (tokens.length > 0) {
      const top25 = tokens.slice(0, 25).map((t) => t.address);
      try {
        const riskMap = await scanRiskBatch(top25);
        for (const t of tokens.slice(0, 25)) {
          const r = riskMap.get(t.address);
          if (r) (t as any).risk = r;
        }
      } catch (e) {
        // Don't fail the whole feed on risk scan error
        console.error("[feed] risk scan failed", e);
      }
    }

    const response: FeedResponse = {
      data: tokens,
      fetched_at: Date.now(),
      source: "geckoterminal",
    };
    // Cache only healthy results
    if (limit === 50 && tokens.length > 0) {
      feedCache = { value: response, expires: Date.now() + FEED_TTL_MS };
    }
    return Response.json(response);
  } catch (e) {
    // If we have stale cache, return it instead of 500
    if (feedCache) return Response.json(feedCache.value);
    return handleError(e);
  }
}
