import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { PaymentInitiate } from "@/lib/validators";
import { readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { getSolUsdPrice, solToLamports } from "@/lib/solana";
import { SILVER_PRICE_USD, GOLD_PRICE_USD, PAYMENT_WALLET } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const auth = await readAuthFromRequest(req);
    if (!auth) return jsonError("Sign in required", 401, "UNAUTHENTICATED");
    const body = await req.json().catch(() => null);
    const parsed = PaymentInitiate.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, "VALIDATION", parsed.error.format());
    }

    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens")
      .select("id, owner_wallet, verification_tier, claim_status")
      .eq("id", parsed.data.token_id)
      .maybeSingle();
    if (!token) return jsonError("Token not found", 404, "NOT_FOUND");
    if (token.owner_wallet !== auth.wallet) {
      return jsonError("Not the owner", 403, "FORBIDDEN");
    }

    const priceUsd = parsed.data.tier === "gold" ? GOLD_PRICE_USD : SILVER_PRICE_USD;
    const solUsd = await getSolUsdPrice();
    if (!solUsd) return jsonError("Cannot get SOL price", 503, "PRICE_UNAVAILABLE");
    const solAmount = priceUsd / solUsd;

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
    const { data, error } = await db
      .from("payments")
      .insert({
        token_id: parsed.data.token_id,
        payer_wallet: auth.wallet,
        tier_requested: parsed.data.tier,
        amount_sol: solAmount,
        amount_usd: priceUsd,
        status: "pending",
      })
      .select("id, amount_sol")
      .single();
    if (error || !data) return jsonError("Insert failed", 500, "DB_ERROR");

    return Response.json({
      payment_id: data.id,
      sol_amount: data.amount_sol,
      expected_lamports: solToLamports(data.amount_sol),
      wallet_address: PAYMENT_WALLET,
      expires_at: expiresAt,
      sol_usd: solUsd,
    });
  } catch (e) {
    return handleError(e);
  }
}
