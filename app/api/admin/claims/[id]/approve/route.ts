import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { requireAdmin, readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { calculateTrustScore } from "@/lib/trust-score";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error, auth } = await requireAdmin(req);
    if (error) return error;
    const db = getSupabaseService();
    const { data: claim } = await db
      .from("ownership_claims")
      .select("id, token_id, claimer_wallet, claim_method")
      .eq("id", params.id)
      .maybeSingle();
    if (!claim) return jsonError("Not found", 404, "NOT_FOUND");
    await db.from("ownership_claims").update({ status: "approved", verified_at: new Date().toISOString() }).eq("id", claim.id);
    await db.from("tokens").update({
      claim_status: "claimed",
      owner_wallet: claim.claimer_wallet,
      verification_tier: "bronze",
    }).eq("id", claim.token_id);
    await db.from("ownership_history").insert({
      token_id: claim.token_id,
      new_wallet: claim.claimer_wallet,
      transfer_type: "initial_claim",
      notes: `Admin approved via ${claim.claim_method} (admin: ${auth!.wallet})`,
    });
    await db.from("admin_actions").insert({
      admin_wallet: auth!.wallet,
      action_type: "approve_claim",
      target_token_id: claim.token_id,
      target_wallet: claim.claimer_wallet,
      reason: "Admin approved pending claim",
    });
    const { data: full } = await db.from("tokens").select("*").eq("id", claim.token_id).single();
    if (full) {
      const r = calculateTrustScore(full);
      await db.from("tokens").update({ trust_score: r.score, trust_score_breakdown: r.breakdown }).eq("id", claim.token_id);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
