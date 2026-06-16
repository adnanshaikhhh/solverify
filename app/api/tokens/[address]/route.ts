import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { SolanaAddress } from "@/lib/validators";
import { handleError, jsonError } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    const addr = params.address;
    if (!isValidSolanaAddress(addr)) {
      return jsonError("Invalid Solana address", 400, "INVALID_ADDRESS");
    }
    const db = getSupabaseService();
    const { data, error } = await db
      .from("tokens")
      .select("*")
      .eq("contract_address", addr)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      console.error("[tokens/address] error", error);
      return jsonError("Lookup failed", 500, "DB_ERROR");
    }
    if (!data) {
      return jsonError("Token not found", 404, "NOT_FOUND");
    }
    return Response.json({ token: data });
  } catch (e) {
    return handleError(e);
  }
}
