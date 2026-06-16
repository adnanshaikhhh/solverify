import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { SearchQuery } from "@/lib/validators";
import { handleError, jsonError, getClientIp, rateLimit } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";

export const runtime = "nodejs";

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
    if (q.length === 0) return Response.json({ results: [] });

    const db = getSupabaseService();
    const isAddr = isValidSolanaAddress(q);
    let query = db
      .from("tokens")
      .select("id, contract_address, name, symbol, logo_url, verification_tier, claim_status, trust_score, links_safety_status, community_vouches, updated_at")
      .eq("is_active", true)
      .limit(10);
    if (isAddr) {
      query = query.eq("contract_address", q);
    } else {
      const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
      query = query.or(`name.ilike.%${safe}%,symbol.ilike.%${safe}%`);
    }
    const { data, error } = await query;
    if (error) return jsonError("Query failed", 500, "DB_ERROR");
    return Response.json({ results: data ?? [] });
  } catch (e) {
    return handleError(e);
  }
}
