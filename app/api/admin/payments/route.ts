import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin(req);
    if (error) return error;
    const db = getSupabaseService();
    const { data, error: dbErr } = await db
      .from("payments")
      .select("id, payer_wallet, tier_requested, amount_sol, amount_usd, status, tx_signature, created_at, confirmed_at, tokens(name, symbol, contract_address)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (dbErr) return Response.json({ payments: [] });
    return Response.json({ payments: data ?? [] });
  } catch (e) {
    return handleError(e);
  }
}
