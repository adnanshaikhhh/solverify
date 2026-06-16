import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { TokensListQuery } from "@/lib/validators";
import { handleError, jsonError } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

export const runtime = "nodejs";

const SORT_MAP: Record<string, { column: string; ascending: boolean }> = {
  score:   { column: "trust_score", ascending: false },
  trust:   { column: "trust_score", ascending: false },
  recent:  { column: "updated_at", ascending: false },
  views:   { column: "view_count", ascending: false },
  vouches: { column: "community_vouches", ascending: false },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());
    const parsed = TokensListQuery.safeParse(params);
    if (!parsed.success) {
      return jsonError("Invalid query", 400, "VALIDATION", parsed.error.format());
    }
    const { search, tier, status, sort, min_score, page, limit } = parsed.data;
    const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
    const from = (page - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const db = getSupabaseService();
    let q = db.from("tokens").select(
      "id, contract_address, name, symbol, logo_url, description, verification_tier, claim_status, trust_score, links_safety_status, community_vouches, view_count, updated_at",
      { count: "estimated" }
    ).eq("is_active", true);

    if (search) {
      const s = search.replace(/[%_]/g, (m) => `\\${m}`);
      q = q.or(`name.ilike.%${s}%,symbol.ilike.%${s}%,contract_address.ilike.%${s}%`);
    }
    if (tier) q = q.eq("verification_tier", tier);
    if (status) q = q.eq("claim_status", status);
    if (typeof min_score === "number") q = q.gte("trust_score", min_score);

    const s = SORT_MAP[sort] ?? SORT_MAP.score;
    q = q.order(s.column, { ascending: s.ascending }).range(from, to);

    const { data, count, error } = await q;
    if (error) {
      console.error("[tokens] query error", error);
      return jsonError("Query failed", 500, "DB_ERROR");
    }
    return Response.json({
      data: data ?? [],
      total: count ?? (data?.length ?? 0),
      page,
      limit: safeLimit,
    });
  } catch (e) {
    return handleError(e);
  }
}
