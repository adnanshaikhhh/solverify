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
    const [
      { count: total_tokens },
      { count: claimed_tokens },
      { count: verified_tokens },
      { count: pending_claims },
      { count: pending_reports },
      { count: total_payments },
      payments,
    ] = await Promise.all([
      db.from("tokens").select("id", { count: "exact", head: true }),
      db.from("tokens").select("id", { count: "exact", head: true }).eq("claim_status", "claimed"),
      db.from("tokens").select("id", { count: "exact", head: true }).in("verification_tier", ["gold", "silver"]),
      db.from("ownership_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("community_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("payments").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
      db.from("payments").select("amount_usd").eq("status", "confirmed"),
    ]);
    const total_revenue_usd = (payments.data || []).reduce((s, r) => s + (r.amount_usd || 0), 0);
    return Response.json({
      stats: {
        total_tokens: total_tokens ?? 0,
        claimed_tokens: claimed_tokens ?? 0,
        verified_tokens: verified_tokens ?? 0,
        pending_claims: pending_claims ?? 0,
        pending_reports: pending_reports ?? 0,
        total_payments: total_payments ?? 0,
        total_revenue_usd,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
