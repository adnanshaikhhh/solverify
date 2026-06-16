import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { handleError, jsonError } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens").select("id").eq("contract_address", params.address).maybeSingle();
    if (!token) return Response.json({ history: [] });
    const { data, error } = await db
      .from("trust_score_history")
      .select("id, score, reason, created_at")
      .eq("token_id", token.id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) return jsonError("Query failed", 500, "DB_ERROR");
    return Response.json({
      history: (data ?? []).map((d) => ({
        score: d.score,
        reason: d.reason,
        at: d.created_at,
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}
