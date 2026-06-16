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
    if (!token) return Response.json({ reports: [] });
    const { data, error } = await db
      .from("community_reports")
      .select("id, reporter_wallet, report_type, description, evidence_url, severity, status, resolution_note, created_at, resolved_at")
      .eq("token_id", token.id)
      .in("status", ["resolved", "reviewing", "pending"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return jsonError("Query failed", 500, "DB_ERROR");
    return Response.json({ reports: data ?? [] });
  } catch (e) {
    return handleError(e);
  }
}
