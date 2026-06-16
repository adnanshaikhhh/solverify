import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { readAuthFromRequest } from "@/lib/auth";
import { handleError, jsonError } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
import { scanUrls } from "@/lib/link-scanner";
import { calculateTrustScore } from "@/lib/trust-score";
import { ADMIN_WALLETS } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const auth = await readAuthFromRequest(req);
    if (!auth) return jsonError("Sign in required", 401, "UNAUTHENTICATED");

    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens")
      .select("*")
      .eq("contract_address", params.address)
      .maybeSingle();
    if (!token) return jsonError("Not found", 404, "NOT_FOUND");
    if (!ADMIN_WALLETS.includes(auth.wallet) && token.owner_wallet !== auth.wallet) {
      return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const urls = [
      token.website_url,
      token.twitter_url,
      token.telegram_url,
      token.discord_url,
      token.github_url,
      token.whitepaper_url,
    ].filter(Boolean) as string[];

    const results = await scanUrls(urls);
    if (results.length > 0) {
      await db.from("link_safety_scans").insert(
        results.map((r) => ({
          token_id: token.id,
          url: r.url,
          url_type: "social_or_link",
          scan_result: r.verdict,
          scan_details: r.providers,
        }))
      );
    }

    // Determine aggregate safety status
    let aggregate: "clean" | "flagged" | "blocked" = "clean";
    if (results.some((r) => r.verdict === "blocked" || r.verdict === "phishing" || r.verdict === "malware")) {
      aggregate = "blocked";
    } else if (results.some((r) => r.verdict === "suspicious")) {
      aggregate = "flagged";
    }

    // Auto-remove blocked URLs
    const updates: Record<string, unknown> = { links_safety_status: aggregate, updated_at: new Date().toISOString() };
    if (aggregate === "blocked") {
      const blocked = new Set(
        results
          .filter((r) => r.verdict === "blocked" || r.verdict === "phishing" || r.verdict === "malware")
          .map((r) => r.url)
      );
      for (const f of ["website_url", "twitter_url", "telegram_url", "discord_url", "github_url", "whitepaper_url"] as const) {
        const v = (token as any)[f];
        if (v && blocked.has(v)) updates[f] = null;
      }
    }
    await db.from("tokens").update(updates).eq("id", token.id);

    // Recalculate trust
    const { data: full } = await db.from("tokens").select("*").eq("id", token.id).single();
    if (full) {
      const r = calculateTrustScore(full);
      await db.from("tokens").update({ trust_score: r.score, trust_score_breakdown: r.breakdown }).eq("id", token.id);
    }

    return Response.json({ ok: true, aggregate, results });
  } catch (e) {
    return handleError(e);
  }
}
