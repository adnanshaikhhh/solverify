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

    if (feedCache && feedCache.expires > Date.now() && limit === 50) {
      return Response.json(feedCache.value);
    }

    // 1) Top pools
    const pools = await getTopPools(limit);
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
    const top25 = tokens.slice(0, 25).map((t) => t.address);
    const riskMap = await scanRiskBatch(top25);
    for (const t of tokens.slice(0, 25)) {
      const r = riskMap.get(t.address);
      if (r) (t as any).risk = r;
    }

    const response: FeedResponse = {
      data: tokens,
      fetched_at: Date.now(),
      source: "geckoterminal",
    };
    if (limit === 50) feedCache = { value: response, expires: Date.now() + FEED_TTL_MS };
    return Response.json(response);
  } catch (e) {
    return handleError(e);
  }
}
