// =============================================================================
// app/api/token/[address]/holders/route.ts
// =============================================================================

import { NextRequest } from "next/server";
import { getTokenPools } from "@/lib/feed";
import { isValidSolanaAddress } from "@/lib/solana";
import { handleError, jsonError } from "@/lib/utils";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SOLANA_RPC } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _conn: Connection | null = null;
function conn(): Connection {
  if (!_conn) _conn = new Connection(SOLANA_RPC, "confirmed");
  return _conn;
}

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return jsonError("Invalid address", 400, "INVALID_ADDRESS");
    }
    const pubkey = new PublicKey(params.address);

    // Try GeckoTerminal pool data first for total supply
    let totalSupply = 0;
    try {
      const pools = await getTokenPools(params.address);
      if (pools && pools.length > 0) {
        const sorted = [...pools].sort((a, b) =>
          Number(b.attributes?.reserve_in_usd || 0) - Number(a.attributes?.reserve_in_usd || 0)
        );
        const baseAmount = Number(sorted[0].attributes?.reserve_in_usd || 0);
        totalSupply = baseAmount; // Use reserve as proxy
      }
    } catch {}

    const largest = await conn().getTokenLargestAccounts(pubkey, "confirmed").catch(() => null);
    if (!largest || !(largest as any).value) {
      return Response.json({ holders: [] });
    }
    const accounts: any[] = (largest as any).value;
    const total = accounts.reduce((s, a) => s + Number(a.uiAmount || 0), 0);
    const denominator = total > 0 ? total : 1;

    const holders = accounts.slice(0, 10).map((a) => {
      const addr = typeof a.address === "string" ? a.address : a.address.toBase58();
      const uiAmount = Number(a.uiAmount || 0);
      return {
        address: addr,
        uiAmount,
        pct: (uiAmount / denominator) * 100,
      };
    });
    return Response.json({ holders, total_supply_proxy: total });
  } catch (e) {
    return handleError(e);
  }
}
