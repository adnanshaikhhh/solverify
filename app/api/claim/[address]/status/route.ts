import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const auth = await readAuthFromRequest(req);
    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens")
      .select("id, claim_status, owner_wallet, verification_tier")
      .eq("contract_address", params.address)
      .maybeSingle();
    if (!token) return Response.json({ claim: null });

    let claim: any = null;
    if (auth) {
      const { data } = await db
        .from("ownership_claims")
        .select("id, claimer_wallet, claim_method, status, verified_at, created_at, rejection_reason")
        .eq("token_id", token.id)
        .eq("claimer_wallet", auth.wallet)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      claim = data;
    }

    return Response.json({ token, claim });
  } catch (e) {
    return handleError(e);
  }
}
