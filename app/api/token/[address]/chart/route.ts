// =============================================================================
// SolVerify — app/api/token/[address]/chart/route.ts
// OHLCV last 7 days from GeckoTerminal
// =============================================================================

import { NextRequest } from "next/server";
import { getTokenPools, getPoolOhlcv, type OhlcvBar } from "@/lib/feed";
import { isValidSolanaAddress } from "@/lib/solana";
import { handleError, jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get("timeframe") || "hour") as "hour" | "day";

    // 1) Find the best pool (highest liquidity)
    const pools = await getTokenPools(params.address);
    if (!pools || pools.length === 0) {
      return jsonError("No pool found for this token", 404, "NO_POOL");
    }
    const bestPool = pools.sort((a: any, b: any) => {
      return Number(b.attributes?.reserve_in_usd || 0) - Number(a.attributes?.reserve_in_usd || 0);
    })[0];
    const poolAddress = bestPool.attributes?.address;
    if (!poolAddress) return jsonError("No pool address", 500, "NO_POOL_ADDRESS");

    // 2) Fetch OHLCV
    const aggregate = timeframe === "day" ? 1 : 1;
    const limit = timeframe === "day" ? 30 : 168; // 30d or 7d hourly
    const bars: OhlcvBar[] = await getPoolOhlcv(poolAddress, timeframe, aggregate, limit);

    return Response.json({
      address: params.address,
      pool_address: poolAddress,
      timeframe,
      bars,
      fetched_at: Date.now(),
    });
  } catch (e) {
    return handleError(e);
  }
}
