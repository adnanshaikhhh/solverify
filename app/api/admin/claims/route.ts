import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin(req);
    if (error) return error;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";
    const db = getSupabaseService();
    const q = db
      .from("ownership_claims")
      .select("id, token_id, claimer_wallet, claim_method, verified_on_chain, status, verified_at, created_at, rejection_reason, tokens(name, symbol, contract_address)")
      .order("created_at", { ascending: false })
      .limit(50);
    const { data, error: dbErr } = status === "all" ? await q : await q.eq("status", status);
    if (dbErr) return Response.json({ claims: [] });
    return Response.json({ claims: data ?? [] });
  } catch (e) {
    return handleError(e);
  }
}
