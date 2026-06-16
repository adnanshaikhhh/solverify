import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { handleError, jsonError } from "@/lib/utils";
import { CRON_SECRET } from "@/lib/constants";
import { scanUrls } from "@/lib/link-scanner";
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
    const { data: tokens } = await db
      .from("tokens")
      .select("id, contract_address, website_url, twitter_url, telegram_url, discord_url, github_url, whitepaper_url")
      .eq("is_active", true)
      .limit(500);
    let processed = 0;
    for (const t of tokens ?? []) {
      const urls = [t.website_url, t.twitter_url, t.telegram_url, t.discord_url, t.github_url, t.whitepaper_url].filter(Boolean) as string[];
      if (urls.length === 0) continue;
      try {
        const results = await scanUrls(urls);
        if (results.length > 0) {
          await db.from("link_safety_scans").insert(results.map((r) => ({
            token_id: t.id,
            url: r.url,
            scan_result: r.verdict,
            scan_details: r.providers,
            next_scan_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          })));
        }
        // Aggregate status
        let aggregate: "clean" | "flagged" | "blocked" = "clean";
        if (results.some((r) => r.verdict === "blocked" || r.verdict === "phishing" || r.verdict === "malware")) aggregate = "blocked";
        else if (results.some((r) => r.verdict === "suspicious")) aggregate = "flagged";
        const updates: Record<string, unknown> = { links_safety_status: aggregate };
        if (aggregate === "blocked") {
          const blocked = new Set(results.filter((r) => r.verdict === "blocked" || r.verdict === "phishing" || r.verdict === "malware").map((r) => r.url));
          for (const f of ["website_url", "twitter_url", "telegram_url", "discord_url", "github_url", "whitepaper_url"] as const) {
            if (blocked.has((t as any)[f])) updates[f] = null;
          }
        }
        await db.from("tokens").update(updates).eq("id", t.id);
        // Recalc
        const { data: full } = await db.from("tokens").select("*").eq("id", t.id).single();
        if (full) {
          const r = calculateTrustScore(full);
          await db.from("tokens").update({ trust_score: r.score, trust_score_breakdown: r.breakdown }).eq("id", t.id);
        }
        processed += 1;
      } catch (e) {
        console.error("[cron/scan-links]", t.contract_address, e);
      }
    }
    return Response.json({ success: true, processed });
  } catch (e) {
    return handleError(e);
  }
}
