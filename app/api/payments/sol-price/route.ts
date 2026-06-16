import { getSolUsdPrice } from "@/lib/solana";
import { handleError, jsonError } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const price = await getSolUsdPrice();
    if (!price) return jsonError("Price unavailable", 503, "PRICE_UNAVAILABLE");
    return Response.json({ sol_usd: price, ts: new Date().toISOString() });
  } catch (e) {
    return handleError(e);
  }
}
