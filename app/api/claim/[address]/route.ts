import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { ClaimRequest } from "@/lib/validators";
import { verifyWalletSignature, readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
import { verifyCreatorWallet } from "@/lib/helius";
import { calculateTrustScore } from "@/lib/trust-score";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid token address", 400, "INVALID_ADDRESS");
    }
    const auth = await readAuthFromRequest(req);
    if (!auth) return jsonError("Sign in to claim", 401, "UNAUTHENTICATED");

    const body = await req.json().catch(() => null);
    const parsed = ClaimRequest.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, "VALIDATION", parsed.error.format());
    }
    const { signature, message, claim_method, tier } = parsed.data;

    // Verify the signature against the message the user signed
    // (the client built the message including the wallet address)
    let sigOk = false;
    try {
      const nacl = (await import("tweetnacl")).default;
      const bs58 = (await import("bs58")).default;
      const enc = new TextEncoder().encode(message);
      const sig = bs58.decode(signature);
      const pub = bs58.decode(auth.wallet);
      if (sig.length === 64 && pub.length === 32) {
        sigOk = nacl.sign.detached.verify(enc, sig, pub);
      }
    } catch (e) {
      console.error("[claim] signature verify error", e);
    }
    if (!sigOk) return jsonError("Signature invalid", 401, "SIGNATURE_INVALID");

    const db = getSupabaseService();

    // Upsert token
    let token: { id: string; owner_wallet: string | null; verification_tier: string; claim_status: string } | null = null;
    const { data: existing } = await db
      .from("tokens")
      .select("id, owner_wallet, verification_tier, claim_status")
      .eq("contract_address", params.address)
      .maybeSingle();
    token = existing;

    if (!token) {
      const { data: created, error: cErr } = await db
        .from("tokens")
        .insert({ contract_address: params.address })
        .select("id, owner_wallet, verification_tier, claim_status")
        .single();
      if (cErr || !created) return jsonError("Could not create token record", 500, "DB_ERROR");
      token = created;
    }

    if (token.claim_status === "suspended") {
      return jsonError("Token is suspended", 403, "SUSPENDED");
    }

    // Verify creator status against Helius
    const verification = await verifyCreatorWallet(params.address, auth.wallet);
    const autoApproved = verification.isCreator;
    const status = autoApproved ? "approved" : "pending";

    // Insert claim
    const { data: claim, error: claimErr } = await db
      .from("ownership_claims")
      .insert({
        token_id: token.id,
        claimer_wallet: auth.wallet,
        claim_method,
        signature,
        message_signed: message,
        verified_on_chain: autoApproved,
        status,
        verified_at: autoApproved ? new Date().toISOString() : null,
      })
      .select("id, status")
      .single();
    if (claimErr) return jsonError("Claim insert failed", 500, "DB_ERROR");

    if (autoApproved) {
      // Update token ownership & tier
      const newTier = tier === "gold" || tier === "silver" || tier === "bronze" ? tier : "bronze";
      await db
        .from("tokens")
        .update({
          claim_status: "claimed",
          owner_wallet: auth.wallet,
          verification_tier: newTier,
          creator_wallet: verification.method === "creator_wallet" ? auth.wallet : token.owner_wallet,
          update_authority: verification.updateAuthority ?? null,
        })
        .eq("id", token.id);

      // Insert ownership history
      await db.from("ownership_history").insert({
        token_id: token.id,
        previous_wallet: token.owner_wallet,
        new_wallet: auth.wallet,
        transfer_type: "initial_claim",
        notes: `Auto-approved via ${verification.method}`,
      });

      // Recalculate trust score
      const { data: full } = await db
        .from("tokens")
        .select("*")
        .eq("id", token.id)
        .single();
      if (full) {
        const result = calculateTrustScore(full);
        await db
          .from("tokens")
          .update({ trust_score: result.score, trust_score_breakdown: result.breakdown })
          .eq("id", token.id);
      }
    } else {
      // Mark as pending
      await db.from("tokens").update({ claim_status: "pending" }).eq("id", token.id);
    }

    return Response.json({
      ok: true,
      claim_id: claim?.id,
      status,
      method: verification.method,
    });
  } catch (e) {
    return handleError(e);
  }
}
