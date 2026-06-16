import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { isValidSolanaAddress } from "@/lib/solana";
import { handleError, jsonError } from "@/lib/utils";
import { getTrustGrade } from "@/lib/trust-score";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens")
      .select("contract_address, name, symbol, logo_url, verification_tier, trust_score, links_safety_status, community_vouches, view_count")
      .eq("contract_address", params.address)
      .eq("is_active", true)
      .maybeSingle();
    if (!token) return jsonError("Not found", 404, "NOT_FOUND");

    return Response.json({
      ...token,
      grade: getTrustGrade(token.trust_score),
      widget: true,
    });
  } catch (e) {
    return handleError(e);
  }
}
