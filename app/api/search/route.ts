// =============================================================================
// SolVerify — app/api/search/route.ts (REPLACE existing)
// Hybrid: DB first → GeckoTerminal search → DexScreener fallback
// =============================================================================

import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { searchTokens, dexScreenerSearch, normalizePool, type FeedToken } from "@/lib/feed";
import { SearchQuery } from "@/lib/validators";
import { handleError, jsonError, getClientIp, rateLimit } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(`search:${ip}`, 30, 60_000)) {
      return jsonError("Rate limit exceeded", 429, "RATE_LIMITED");
    }
    const { searchParams } = new URL(req.url);
    const parsed = SearchQuery.safeParse({ q: searchParams.get("q") || "" });
    if (!parsed.success) return jsonError("Missing q", 400, "VALIDATION");
    const q = parsed.data.q.trim();
    if (q.length === 0) return Response.json({ results: [], live: [] });

    const db = getSupabaseService();

    // 1) DB results
    let dbResults: any[] = [];
    if (isValidSolanaAddress(q)) {
      const { data } = await db
        .from("tokens")
        .select("id, contract_address, name, symbol, logo_url, verification_tier, claim_status, trust_score, links_safety_status, community_vouches, updated_at")
        .eq("contract_address", q)
        .limit(10);
      dbResults = data || [];
    } else {
      const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
      const { data } = await db
        .from("tokens")
        .select("id, contract_address, name, symbol, logo_url, verification_tier, claim_status, trust_score, links_safety_status, community_vouches, updated_at")
        .eq("is_active", true)
        .or(`name.ilike.%${safe}%,symbol.ilike.%${safe}%`)
        .limit(10);
      dbResults = data || [];
    }

    // 2) GeckoTerminal search (live tokens)
    let liveResults: FeedToken[] = [];
    try {
      const pools = await searchTokens(q, 10);
      liveResults = pools.map(normalizePool);
      // Cross-reference addresses that match the DB
      const dbAddrs = new Set(dbResults.map((r) => r.contract_address));
      for (const t of liveResults) {
        if (dbAddrs.has(t.address)) {
          const row = dbResults.find((r) => r.contract_address === t.address);
          if (row) {
            t.solverify = {
              in_db: true,
              claim_status: row.claim_status,
              verification_tier: row.verification_tier,
              trust_score: row.trust_score,
              grade: row.trust_score != null
                ? (row.trust_score >= 90 ? "SAFU" :
                   row.trust_score >= 75 ? "Trusted" :
                   row.trust_score >= 55 ? "Caution" :
                   row.trust_score >= 35 ? "Risky" : "Danger")
                : null,
            };
          }
        }
      }
    } catch (e) {
      // GeckoTerminal failed — try DexScreener
      try {
        const pairs = await dexScreenerSearch(q);
        liveResults = pairs.slice(0, 10).map((p: any) => {
          const base = p.baseToken || {};
          return {
            address: base.address || "",
            name: base.name || null,
            symbol: base.symbol || null,
            logo_url: p.info?.imageUrl || null,
            price_usd: p.priceUsd ? Number(p.priceUsd) : null,
            price_native: p.priceNative ? Number(p.priceNative) : null,
            change_24h: p.priceChange?.h24 != null ? Number(p.priceChange.h24) : null,
            change_1h: p.priceChange?.h1 != null ? Number(p.priceChange.h1) : null,
            change_6h: p.priceChange?.h6 != null ? Number(p.priceChange.h6) : null,
            volume_24h: p.volume?.h24 != null ? Number(p.volume.h24) : null,
            liquidity_usd: p.liquidity?.usd != null ? Number(p.liquidity.usd) : null,
            market_cap: p.marketCap != null ? Number(p.marketCap) : null,
            fdv: p.fdv != null ? Number(p.fdv) : null,
            pair_address: p.pairAddress || null,
            dex_id: p.dexId || null,
            pair_created_at: p.pairCreatedAt ? Number(p.pairCreatedAt) : null,
            sparkline_7d: null,
            solverify: { in_db: false, claim_status: null, verification_tier: null, trust_score: null, grade: null },
          };
        });
      } catch {
        liveResults = [];
      }
    }

    return Response.json({
      results: dbResults,
      live: liveResults,
      query: q,
    });
  } catch (e) {
    return handleError(e);
  }
}
