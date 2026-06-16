import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { requireAdmin, readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { AdminClaimAction } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error, auth } = await requireAdmin(req);
    if (error) return error;
    const body = await req.json().catch(() => ({}));
    const parsed = AdminClaimAction.safeParse(body);
    if (!parsed.success) return jsonError("Invalid", 400, "VALIDATION");
    const db = getSupabaseService();
    const { data: claim } = await db
      .from("ownership_claims")
      .select("id, token_id, claimer_wallet")
      .eq("id", params.id)
      .maybeSingle();
    if (!claim) return jsonError("Not found", 404, "NOT_FOUND");
    await db.from("ownership_claims").update({
      status: "rejected",
      rejection_reason: parsed.data.reason || "Admin rejected",
    }).eq("id", claim.id);
    await db.from("admin_actions").insert({
      admin_wallet: auth!.wallet,
      action_type: "reject_claim",
      target_token_id: claim.token_id,
      target_wallet: claim.claimer_wallet,
      reason: parsed.data.reason || "Admin rejected",
    });
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
