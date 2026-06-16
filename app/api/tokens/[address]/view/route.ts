import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { handleError, jsonError, getClientIp, rateLimit } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const ip = getClientIp(req);
    if (!rateLimit(`view:${ip}`, 60, 60_000)) {
      return jsonError("Rate limit exceeded", 429, "RATE_LIMITED");
    }
    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens").select("id, view_count").eq("contract_address", params.address).maybeSingle();
    if (!token) return jsonError("Not found", 404, "NOT_FOUND");
    await db
      .from("tokens")
      .update({ view_count: (token.view_count ?? 0) + 1 })
      .eq("id", token.id);
    return Response.json({ ok: true, view_count: (token.view_count ?? 0) + 1 });
  } catch (e) {
    return handleError(e);
  }
}
