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
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens")
      .select("id")
      .eq("contract_address", params.address)
      .maybeSingle();
    if (!token) return Response.json({ updates: [] });
    const { data, error } = await db
      .from("metadata_updates")
      .select("id, updated_by, field_name, previous_value, new_value, update_category, created_at")
      .eq("token_id", token.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return jsonError("Query failed", 500, "DB_ERROR");
    return Response.json({ updates: data ?? [] });
  } catch (e) {
    return handleError(e);
  }
}
