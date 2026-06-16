// =============================================================================
// app/api/portfolio/[wallet]/route.ts
// Free wallet portfolio using public Solana RPC + GeckoTerminal price feeds
// =============================================================================

import { NextRequest } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SOLANA_RPC } from "@/lib/constants";
import { isValidSolanaAddress } from "@/lib/solana";
import { handleError, jsonError } from "@/lib/utils";
import { getSupabaseService } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _conn: Connection | null = null;
function conn(): Connection {
  if (!_conn) _conn = new Connection(SOLANA_RPC, "confirmed");
  return _conn;
}

export async function GET(req: NextRequest, { params }: { params: { wallet: string } }) {
  try {
    if (!isValidSolanaAddress(params.wallet)) {
      return jsonError("Invalid wallet address", 400, "INVALID_ADDRESS");
    }
    const pubkey = new PublicKey(params.wallet);

    // SOL balance
    let solBalance = 0;
    try {
      const lamports = await conn().getBalance(pubkey, "confirmed");
      solBalance = lamports / LAMPORTS_PER_SOL;
    } catch {}

    // SPL token accounts
    const accounts = await conn()
      .getParsedTokenAccountsByOwner(pubkey, { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") })
      .catch(() => null);

    const mints: Array<{ mint: string; amount: number; decimals: number }> = [];
    for (const a of (accounts?.value as any[]) || []) {
      const info = a.account?.data?.parsed?.info;
      if (!info) continue;
      const amount = Number(info.tokenAmount?.uiAmount || 0);
      if (amount > 0) {
        mints.push({
          mint: info.mint,
          amount,
          decimals: info.tokenAmount?.decimals || 0,
        });
      }
    }

    if (mints.length === 0) {
      return Response.json({ tokens: [], sol_balance: solBalance });
    }

    // Get prices from GeckoTerminal (multi-token pool query)
    // GeckoTerminal supports batch via /networks/solana/tokens/multi/{addresses}
    const addrs = mints.map((m) => m.mint).slice(0, 30); // batch limit
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/multi/${addrs.join(",")}`;
    const res = await fetch(url, { cache: "no-store" }).catch(() => null);
    const data: any = res?.ok ? await res.json() : null;

    // Build price map
    const priceMap = new Map<string, { price: number; name: string; symbol: string; logo: string }>();
    for (const item of (data?.data as any[]) || []) {
      const a = item.attributes;
      priceMap.set(item.attributes?.address, {
        price: Number(a.price_usd || 0),
        name: a.name,
        symbol: a.symbol,
        logo: a.image_url || "",
      });
    }

    // SolVerify DB merge
    const db = getSupabaseService();
    const { data: dbRows } = await db
      .from("tokens")
      .select("contract_address, trust_score, verification_tier, name, symbol, logo_url")
      .in("contract_address", addrs);
    const dbMap = new Map<string, any>();
    for (const r of (dbRows as any[]) || []) dbMap.set(r.contract_address, r);

    // Compose
    const tokens = mints.map((m) => {
      const live = priceMap.get(m.mint);
      const dbRow = dbMap.get(m.mint);
      const price = live?.price || null;
      const usd = price ? price * m.amount : null;
      return {
        mint: m.mint,
        amount: m.amount,
        usd_value: usd,
        price_usd: price,
        name: dbRow?.name || live?.name || null,
        symbol: dbRow?.symbol || live?.symbol || null,
        logo_url: dbRow?.logo_url || live?.logo || null,
        trust_score: dbRow?.trust_score ?? null,
        grade: dbRow?.trust_score != null
          ? (dbRow.trust_score >= 90 ? "SAFU" : dbRow.trust_score >= 75 ? "Trusted" : dbRow.trust_score >= 55 ? "Caution" : dbRow.trust_score >= 35 ? "Risky" : "Danger")
          : null,
      };
    });

    // Sort by USD value desc
    tokens.sort((a, b) => (b.usd_value || 0) - (a.usd_value || 0));

    return Response.json({ tokens, sol_balance: solBalance });
  } catch (e) {
    return handleError(e);
  }
}
