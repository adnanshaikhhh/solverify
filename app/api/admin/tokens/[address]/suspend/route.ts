import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { AdminSuspend } from "@/lib/validators";
import { calculateTrustScore } from "@/lib/trust-score";
import { isValidSolanaAddress } from "@/lib/solana";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    const { error, auth } = await requireAdmin(req);
    if (error) return error;
    const body = await req.json().catch(() => ({}));
    const parsed = AdminSuspend.safeParse(body);
    if (!parsed.success) return jsonError("Reason required", 400, "VALIDATION");
    const db = getSupabaseService();
    const { data: token } = await db.from("tokens").select("id").eq("contract_address", params.address).maybeSingle();
    if (!token) return jsonError("Not found", 404, "NOT_FOUND");
    await db.from("tokens").update({ claim_status: "suspended", is_active: false }).eq("id", token.id);
    await db.from("admin_actions").insert({
      admin_wallet: auth!.wallet,
      action_type: "suspend_token",
      target_token_id: token.id,
      reason: parsed.data.reason,
    });
    const { data: full } = await db.from("tokens").select("*").eq("id", token.id).single();
    if (full) {
      const r = calculateTrustScore(full);
      await db.from("tokens").update({ trust_score: r.score, trust_score_breakdown: r.breakdown }).eq("id", token.id);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
