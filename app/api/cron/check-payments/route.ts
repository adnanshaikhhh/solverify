import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { handleError, jsonError } from "@/lib/utils";
import { CRON_SECRET } from "@/lib/constants";
import { checkPaymentReceived } from "@/lib/helius";
import { PAYMENT_WALLET } from "@/lib/constants";
import { solToLamports } from "@/lib/solana";
import { calculateTrustScore } from "@/lib/trust-score";

export const runtime = "nodejs";

function authorized(req: NextRequest): boolean {
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  if (isVercelCron) return true;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  try {
    const db = getSupabaseService();
    const { data: pending } = await db
      .from("payments")
      .select("*")
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 60_000).toISOString()) // skip very recent
      .limit(20);
    let confirmed = 0;
    for (const p of pending ?? []) {
      const after = new Date(p.created_at).getTime();
      const expected = solToLamports(p.amount_sol);
      const r = await checkPaymentReceived(p.payer_wallet, PAYMENT_WALLET, expected, after);
      if (r.found && r.txSignature) {
        await db.from("payments").update({
          status: "confirmed",
          tx_signature: r.txSignature,
          confirmed_at: new Date().toISOString(),
          tier_granted: true,
        }).eq("id", p.id);
        if (p.token_id) {
          await db.from("tokens").update({ verification_tier: p.tier_requested, claim_status: "claimed" }).eq("id", p.token_id);
          const { data: full } = await db.from("tokens").select("*").eq("id", p.token_id).single();
          if (full) {
            const sc = calculateTrustScore(full);
            await db.from("tokens").update({ trust_score: sc.score, trust_score_breakdown: sc.breakdown }).eq("id", p.token_id);
          }
        }
        confirmed += 1;
      }
    }
    return Response.json({ success: true, processed: (pending ?? []).length, confirmed });
  } catch (e) {
    return handleError(e);
  }
}
