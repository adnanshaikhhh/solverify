import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { ReportCreate } from "@/lib/validators";
import { readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError, rateLimit } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
import { calculateTrustScore } from "@/lib/trust-score";

export const runtime = "nodejs";

async function getTokenId(address: string): Promise<string | null> {
  const db = getSupabaseService();
  const { data } = await db.from("tokens").select("id").eq("contract_address", address).maybeSingle();
  return data?.id ?? null;
}

export async function POST(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const auth = await readAuthFromRequest(req);
    if (!auth) return jsonError("Sign in required", 401, "UNAUTHENTICATED");

    // Rate limit: 5 reports per wallet per day
    if (!rateLimit(`report:${auth.wallet}`, 5, 24 * 60 * 60 * 1000)) {
      return jsonError("Daily report limit reached", 429, "RATE_LIMITED");
    }

    const body = await req.json().catch(() => null);
    const parsed = ReportCreate.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, "VALIDATION", parsed.error.format());
    }

    const tokenId = await getTokenId(params.address);
    if (!tokenId) return jsonError("Not found", 404, "NOT_FOUND");

    const db = getSupabaseService();
    const { data, error } = await db
      .from("community_reports")
      .insert({
        token_id: tokenId,
        reporter_wallet: auth.wallet,
        report_type: parsed.data.report_type,
        description: parsed.data.description,
        evidence_url: parsed.data.evidence_url || null,
        severity: parsed.data.severity,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !data) return jsonError("Insert failed", 500, "DB_ERROR");

    // Recalculate trust score (open report affects community score)
    const { data: full } = await db.from("tokens").select("*").eq("id", tokenId).single();
    if (full) {
      const r = calculateTrustScore(full);
      await db.from("tokens").update({ trust_score: r.score, trust_score_breakdown: r.breakdown }).eq("id", tokenId);
    }

    // If critical, log admin action flag
    if (parsed.data.severity === "critical") {
      await db.from("admin_actions").insert({
        admin_wallet: "system",
        action_type: "alert_critical_report",
        target_token_id: tokenId,
        reason: `Critical report by ${auth.wallet}: ${parsed.data.report_type}`,
      });
    }

    return Response.json({ ok: true, report_id: data.id });
  } catch (e) {
    return handleError(e);
  }
}
