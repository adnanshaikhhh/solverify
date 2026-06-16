import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { handleError, jsonError } from "@/lib/utils";
import { CRON_SECRET } from "@/lib/constants";
import { getTokenMarketData, getTokenHolders, getTokenMintInfo } from "@/lib/helius";

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
      .select("id, contract_address")
      .eq("is_active", true)
      .limit(200);
    let updated = 0;
    for (const t of tokens ?? []) {
      try {
        const [market, mint, holders] = await Promise.all([
          getTokenMarketData(t.contract_address),
          getTokenMintInfo(t.contract_address),
          getTokenHolders(t.contract_address, 10),
        ]);
        const top10 = holders.reduce((s, h) => s + h.pct, 0);
        await db.from("tokens").update({
          price_usd: market.priceUsd,
          market_cap_usd: market.marketCapUsd,
          volume_24h: market.volume24h,
          is_mint_disabled: mint?.isMintDisabled,
          is_freeze_disabled: mint?.isFreezeDisabled,
          top10_holder_percent: top10 || null,
          updated_at: new Date().toISOString(),
        }).eq("id", t.id);
        updated += 1;
      } catch (e) {
        console.error("[cron/update-market-data]", t.contract_address, e);
      }
    }
    return Response.json({ success: true, processed: (tokens ?? []).length, updated });
  } catch (e) {
    return handleError(e);
  }
}
