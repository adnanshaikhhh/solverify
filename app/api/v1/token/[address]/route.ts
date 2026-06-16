import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { handleError, jsonError } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
import { createHash } from "crypto";

export const runtime = "nodejs";

async function checkApiKey(req: NextRequest): Promise<{ ok: true; owner: string } | { ok: false; status: number; error: string }> {
  const key = req.headers.get("x-api-key") || "";
  if (!key) return { ok: false, status: 401, error: "Missing X-Api-Key" };
  const hash = createHash("sha256").update(key).digest("hex");
  const db = getSupabaseService();
  const { data } = await db.from("api_keys").select("owner_wallet, is_active, rate_limit_per_hour").eq("key_hash", hash).maybeSingle();
  if (!data || !data.is_active) return { ok: false, status: 401, error: "Invalid API key" };
  // Bump usage
  await db.from("api_keys").update({ usage_count: (await db.from("api_keys").select("usage_count").eq("key_hash", hash).single()).data?.usage_count || 0 + 1, last_used_at: new Date().toISOString() }).eq("key_hash", hash);
  return { ok: true, owner: data.owner_wallet };
}

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    const auth = await checkApiKey(req);
    if (!auth.ok) return jsonError(auth.error, auth.status, "AUTH");
    const db = getSupabaseService();
    const { data, error } = await db
      .from("tokens")
      .select("contract_address, name, symbol, decimals, total_supply, description, website_url, twitter_url, telegram_url, discord_url, github_url, whitepaper_url, claim_status, verification_tier, trust_score, trust_score_breakdown, owner_wallet, is_mint_disabled, is_freeze_disabled, liquidity_locked, market_cap_usd, price_usd, volume_24h, holder_count, top10_holder_percent, links_safety_status, community_vouches, view_count, created_at, updated_at")
      .eq("contract_address", params.address)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return jsonError("DB error", 500, "DB_ERROR");
    if (!data) return jsonError("Not found", 404, "NOT_FOUND");
    return Response.json({ token: data });
  } catch (e) {
    return handleError(e);
  }
}
