import { getSupabaseService } from "@/lib/supabase-server";
import { handleError, jsonError } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getSupabaseService();
    const { data, error } = await db
      .from("tokens")
      .select("id, contract_address, name, symbol, logo_url, verification_tier, claim_status, trust_score, links_safety_status, community_vouches, view_count, updated_at")
      .eq("is_active", true)
      .in("verification_tier", ["gold", "silver"])
      .order("trust_score", { ascending: false })
      .limit(100);
    if (error) return jsonError("Query failed", 500, "DB_ERROR");
    return Response.json({ data: data ?? [] });
  } catch (e) {
    return handleError(e);
  }
}
