import { isValidSolanaAddress } from "@/lib/solana";
import { TokenLiveView } from "@/components/feed/TokenLiveView";
import { notFound } from "next/navigation";
import { getTokenPools, normalizePool, getTokenInfo } from "@/lib/feed";
import { getSupabaseService } from "@/lib/supabase-server";
import { scanRisk } from "@/lib/rug-scanner";
import Link from "next/link";

export const revalidate = 30;

async function loadLive(address: string) {
  const pools = await getTokenPools(address);
  if (!pools || pools.length === 0) return null;
  const sorted = [...pools].sort((a, b) =>
    Number(b.attributes?.reserve_in_usd || 0) - Number(a.attributes?.reserve_in_usd || 0)
  );
  const token = normalizePool(sorted[0]);
  const info = await getTokenInfo(address);
  if (info) {
    token.logo_url = info.logo_url || token.logo_url;
    token.name = info.name || token.name;
    token.symbol = info.symbol || token.symbol;
    if (info.description) token.description = info.description;
  }
  const db = getSupabaseService();
  const { data: dbRows } = await db
    .from("tokens")
    .select("contract_address, name, symbol, logo_url, description, website_url, twitter_url, telegram_url, discord_url, github_url, whitepaper_url, claim_status, verification_tier, trust_score, trust_score_breakdown, owner_wallet, is_mint_disabled, is_freeze_disabled, liquidity_locked, links_safety_status, community_vouches")
    .eq("contract_address", address)
    .maybeSingle();
  if (dbRows) {
    token.name = dbRows.name || token.name;
    token.symbol = dbRows.symbol || token.symbol;
    token.logo_url = dbRows.logo_url || token.logo_url;
    token.description = dbRows.description || token.description;
    token.solverify = {
      in_db: true,
      claim_status: dbRows.claim_status,
      verification_tier: dbRows.verification_tier,
      trust_score: dbRows.trust_score,
      grade: dbRows.trust_score != null
        ? (dbRows.trust_score >= 90 ? "SAFU" :
           dbRows.trust_score >= 75 ? "Trusted" :
           dbRows.trust_score >= 55 ? "Caution" :
           dbRows.trust_score >= 35 ? "Risky" : "Danger")
        : null,
    };
  }
  const risk = await scanRisk(address);
  return { token, risk, in_db: !!dbRows };
}

export default async function TokenPage({ params }: { params: { address: string } }) {
  if (!isValidSolanaAddress(params.address)) notFound();
  const initial = await loadLive(params.address);
  if (!initial) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Token not found</h1>
        <p className="mt-2 text-text-secondary">No token with address {params.address} found on Solana.</p>
        <Link href={`/claim?address=${params.address}`} className="btn-primary mt-4 inline-flex">
          Claim &amp; Verify This Token
        </Link>
      </div>
    );
  }
  return <TokenLiveView address={params.address} initial={initial} />;
}
