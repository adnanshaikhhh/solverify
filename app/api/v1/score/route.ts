// =============================================================================
// app/api/v1/score/route.ts — Free Trust-as-a-Service endpoint
// =============================================================================

import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { isValidSolanaAddress } from "@/lib/solana";
import { scanRisk } from "@/lib/rug-scanner";
import { handleError, jsonError } from "@/lib/utils";
import { calculateTrustScore, getTrustGrade } from "@/lib/trust-score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory rate limiter (100/hr per IP)
const buckets = new Map<string, { count: number; reset: number }>();
function checkRate(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.reset < now) {
    buckets.set(ip, { count: 1, reset: now + 3600_000 });
    return true;
  }
  if (b.count >= 100) return false;
  b.count += 1;
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!checkRate(ip)) {
      return jsonError("Rate limit: 100 requests per hour per IP. Upgrade to Pro for unlimited.", 429, "RATE_LIMITED");
    }
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("token") || searchParams.get("address");
    if (!address || !isValidSolanaAddress(address)) {
      return jsonError("Invalid or missing ?token=<solana_address>", 400, "INVALID_ADDRESS");
    }
    const db = getSupabaseService();
    const { data: token } = await db.from("tokens").select("*").eq("contract_address", address).maybeSingle();
    const risk = await scanRisk(address);

    if (!token) {
      // No SolVerify record — return live data + risk only
      return Response.json({
        address,
        in_solverify: false,
        trust_score: null,
        grade: null,
        risk: { level: risk.level, score: risk.score, flags: risk.flags, positive: risk.positive },
        message: "Token not yet claimed on SolVerify. Visit solverify.vercel.app/claim to add a trust score.",
      });
    }

    // Open reports penalty
    const { data: openReports } = await db
      .from("community_reports")
      .select("severity")
      .eq("token_id", token.id)
      .in("status", ["pending", "reviewing"]);

    const result = calculateTrustScore({
      ...token,
      open_reports: openReports || [],
    });

    return Response.json({
      address,
      in_solverify: true,
      claim_status: token.claim_status,
      verification_tier: token.verification_tier,
      trust_score: result.score,
      grade: getTrustGrade(result.score),
      breakdown: result.breakdown,
      risk: { level: risk.level, score: risk.score, flags: risk.flags, positive: risk.positive },
      owner_wallet: token.owner_wallet,
      updated_at: token.updated_at,
    });
  } catch (e) {
    return handleError(e);
  }
}
