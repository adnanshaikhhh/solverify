// =============================================================================
// SolVerify — app/api/token/[address]/live/route.ts
// Live market data for a token (no DB write, no auth, fully cached)
// =============================================================================

import { NextRequest } from "next/server";
import { getTokenPools, normalizePool, getTokenInfo } from "@/lib/feed";
import { getSupabaseService } from "@/lib/supabase-server";
import { scanRisk } from "@/lib/rug-scanner";
import { isValidSolanaAddress } from "@/lib/solana";
import { handleError, jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }

    const pools = await getTokenPools(params.address);
    let token: any;
    let pairAddress: string | null = null;
    let dexId: string | null = null;

    if (pools && pools.length > 0) {
      const sorted = [...pools].sort((a, b) =>
        Number(b.attributes?.reserve_in_usd || 0) - Number(a.attributes?.reserve_in_usd || 0)
      );
      token = normalizePool(sorted[0]);
      pairAddress = token.pair_address;
      dexId = token.dex_id;
    } else {
      // No live pools — return a stub token with just the address
      token = {
        address: params.address,
        name: null,
        symbol: null,
        logo_url: null,
        description: null,
        price_usd: null,
        change_24h: null, change_1h: null, change_6h: null,
        volume_24h: null, liquidity_usd: null, market_cap: null, fdv: null,
        pair_address: null, dex_id: null, pair_created_at: null,
        sparkline_7d: null,
        solverify: { in_db: false, claim_status: null, verification_tier: null, trust_score: null, grade: null },
      };
    }

    // Always preserve the canonical contract address
    token.address = params.address;

    // Try to enrich with token info (logo, description)
    const info = await getTokenInfo(params.address);
    if (info) {
      token.logo_url = info.logo_url || token.logo_url;
      token.name = info.name || token.name;
      token.symbol = info.symbol || token.symbol;
    }

    // DB merge
    const db = getSupabaseService();
    const { data: dbRows } = await db
      .from("tokens")
      .select("contract_address, name, symbol, logo_url, description, website_url, twitter_url, telegram_url, discord_url, github_url, whitepaper_url, claim_status, verification_tier, trust_score, trust_score_breakdown, owner_wallet, is_mint_disabled, is_freeze_disabled, liquidity_locked, links_safety_status, community_vouches")
      .eq("contract_address", params.address)
      .maybeSingle();

    if (dbRows) {
      token.solverify = {
        in_db: true,
        claim_status: dbRows.claim_status,
        verification_tier: dbRows.verification_tier,
        trust_score: dbRows.trust_score,
        grade: dbRows.trust_score != null
          ? (dbRows.trust_score >= 90 ? "SAFU" :
             dbRows.trust_score >= 75 ? "Trusted" :
             dbRows.trust_score >= 55 ? "Caution" :
             dbRows.trust_score >= 35 ? "Risky" : "Danger")
          : null,
      };
      token.name = dbRows.name || token.name;
      token.symbol = dbRows.symbol || token.symbol;
      token.logo_url = dbRows.logo_url || token.logo_url;
      token.description = dbRows.description || token.description;
      (token as any).website_url = dbRows.website_url;
      (token as any).twitter_url = dbRows.twitter_url;
      (token as any).telegram_url = dbRows.telegram_url;
      (token as any).discord_url = dbRows.discord_url;
      (token as any).github_url = dbRows.github_url;
      (token as any).whitepaper_url = dbRows.whitepaper_url;
      (token as any).is_mint_disabled = dbRows.is_mint_disabled;
      (token as any).is_freeze_disabled = dbRows.is_freeze_disabled;
    } else {
      // Ensure solverify exists in token
      token.solverify = token.solverify || { in_db: false, claim_status: null, verification_tier: null, trust_score: null, grade: null };
    }

    // Risk scan (with timeout-safe fallback)
    let risk;
    try {
      risk = await scanRisk(params.address);
    } catch {
      risk = { level: "unknown" as const, flags: [], positive: [], score: 0 };
    }

    return Response.json({ token, risk, in_db: !!dbRows, fetched_at: Date.now() });
  } catch (e) {
    return handleError(e);
  }
}
