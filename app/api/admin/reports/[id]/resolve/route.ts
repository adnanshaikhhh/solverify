import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { AdminReportAction } from "@/lib/validators";
import { calculateTrustScore } from "@/lib/trust-score";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error, auth } = await requireAdmin(req);
    if (error) return error;
    const body = await req.json().catch(() => ({}));
    const parsed = AdminReportAction.safeParse(body);
    if (!parsed.success) return jsonError("Invalid", 400, "VALIDATION");
    const db = getSupabaseService();
    const { data: report } = await db.from("community_reports").select("id, token_id").eq("id", params.id).maybeSingle();
    if (!report) return jsonError("Not found", 404, "NOT_FOUND");
    await db.from("community_reports").update({
      status: "resolved",
      resolved_by: auth!.wallet,
      resolution_note: parsed.data.note || "Resolved",
      resolved_at: new Date().toISOString(),
    }).eq("id", report.id);
    await db.from("admin_actions").insert({
      admin_wallet: auth!.wallet,
      action_type: "resolve_report",
      target_token_id: report.token_id,
      reason: parsed.data.note || "Resolved",
    });
    // Recalc score
    const { data: full } = await db.from("tokens").select("*").eq("id", report.token_id).single();
    if (full) {
      const r = calculateTrustScore(full);
      await db.from("tokens").update({ trust_score: r.score, trust_score_breakdown: r.breakdown }).eq("id", report.token_id);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
