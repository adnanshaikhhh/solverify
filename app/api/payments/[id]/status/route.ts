import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { checkPaymentReceived } from "@/lib/helius";
import { calculateTrustScore } from "@/lib/trust-score";
import { PAYMENT_WALLET } from "@/lib/constants";
import { solToLamports } from "@/lib/solana";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await readAuthFromRequest(req);
    if (!auth) return jsonError("Sign in required", 401, "UNAUTHENTICATED");
    const db = getSupabaseService();
    const { data: payment } = await db
      .from("payments")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (!payment) return jsonError("Not found", 404, "NOT_FOUND");
    if (payment.payer_wallet !== auth.wallet) return jsonError("Forbidden", 403, "FORBIDDEN");
    if (payment.status === "confirmed" || payment.status === "failed") {
      return Response.json({ status: payment.status, payment });
    }

    // Poll Helius
    const after = new Date(payment.created_at).getTime();
    const expectedLamports = solToLamports(payment.amount_sol);
    const found = await checkPaymentReceived(
      auth.wallet,
      PAYMENT_WALLET,
      expectedLamports,
      after
    );
    if (found.found && found.txSignature) {
      await db
        .from("payments")
        .update({
          status: "confirmed",
          tx_signature: found.txSignature,
          confirmed_at: new Date().toISOString(),
          tier_granted: true,
        })
        .eq("id", payment.id);

      // Upgrade token tier
      if (payment.token_id) {
        await db
          .from("tokens")
          .update({ verification_tier: payment.tier_requested, claim_status: "claimed" })
          .eq("id", payment.token_id);

        // Recalc score
        const { data: full } = await db.from("tokens").select("*").eq("id", payment.token_id).single();
        if (full) {
          const r = calculateTrustScore(full);
          await db.from("tokens").update({ trust_score: r.score, trust_score_breakdown: r.breakdown }).eq("id", payment.token_id);
        }
      }
      return Response.json({ status: "confirmed", payment: { ...payment, tx_signature: found.txSignature }, tx: found });
    }
    return Response.json({ status: "pending", payment });
  } catch (e) {
    return handleError(e);
  }
}
