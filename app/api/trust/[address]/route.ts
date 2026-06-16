import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { handleError, jsonError } from "@/lib/utils";
import { calculateTrustScore, getTrustGrade } from "@/lib/trust-score";
import { isValidSolanaAddress } from "@/lib/solana";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const db = getSupabaseService();
    const { data: token, error } = await db
      .from("tokens")
      .select("*")
      .eq("contract_address", params.address)
      .maybeSingle();
    if (error) return jsonError("Query failed", 500, "DB_ERROR");
    if (!token) return jsonError("Not found", 404, "NOT_FOUND");

    // Get active open reports for community score
    const { data: openReports } = await db
      .from("community_reports")
      .select("severity")
      .eq("token_id", token.id)
      .in("status", ["pending", "reviewing"]);

    const result = calculateTrustScore({
      ...token,
      open_reports: openReports || [],
    });

    return Response.json({
      address: params.address,
      score: token.trust_score,
      grade: getTrustGrade(token.trust_score),
      computed: result,
    });
  } catch (e) {
    return handleError(e);
  }
}
