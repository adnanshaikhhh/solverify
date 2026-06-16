import { isValidSolanaAddress } from "@/lib/solana";
import { TokenReport } from "@/components/feed/TokenReport";
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
    .select("contract_address, name, symbol, logo_url, description, website_url, twitter_url, telegram_url, discord_url, github_url, whitepaper_url, is_mint_disabled, is_freeze_disabled, claim_status, verification_tier, trust_score, trust_score_breakdown, owner_wallet, links_safety_status, community_vouches")
    .eq("contract_address", address)
    .maybeSingle();
  if (dbRows) {
    // Apply DB overrides
    token.name = dbRows.name || token.name;
    token.symbol = dbRows.symbol || token.symbol;
    token.logo_url = dbRows.logo_url || token.logo_url;
    token.description = dbRows.description || token.description;
    (token as any).website_url = dbRows.website_url;
    (token as any).twitter_url = dbRows.twitter_url;
    (token as any).telegram_url = dbRows.telegram_url;
    (token as any).discord_url = dbRows.discord_url;
    (token as any).github_url = dbRows.github_url;
    (token as any).whitepaper_url = dbRows.whitepaper_url;
    (token as any).is_mint_disabled = dbRows.is_mint_disabled;
    (token as any).is_freeze_disabled = dbRows.is_freeze_disabled;
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

async function loadStory(address: string) {
  // Best-effort: load story events server-side too
  try {
    const { getTokenPools } = await import("@/lib/feed");
    const { getSupabaseService } = await import("@/lib/supabase-server");
    const db = getSupabaseService();
    const { data: token } = await db
      .from("tokens")
      .select("id, created_at, claim_status, name")
      .eq("contract_address", address)
      .maybeSingle();
    if (!token) return [];
    const [updates, claims, payments] = await Promise.all([
      db.from("metadata_updates").select("id, field_name, updated_by, created_at, previous_value, new_value").eq("token_id", token.id).order("created_at", { ascending: false }).limit(15),
      db.from("ownership_claims").select("id, claimer_wallet, claim_method, status, created_at, verified_at").eq("token_id", token.id).order("created_at", { ascending: false }).limit(5),
      db.from("payments").select("id, payer_wallet, tier_requested, status, created_at, confirmed_at").eq("token_id", token.id).order("created_at", { ascending: false }).limit(5),
    ]);
    const events: any[] = [];
    events.push({ id: `first-${token.id}`, type: "first_seen", label: `${token.name || "Token"} indexed by SolVerify`, actor: null, at: token.created_at, detail: `First indexed. Initial status: ${token.claim_status || "unclaimed"}.` });
    for (const c of (claims.data as any[]) || []) {
      events.push({ id: c.id, type: "claim", label: c.status === "approved" ? "Ownership claim approved" : c.status === "rejected" ? "Ownership claim rejected" : "Ownership claim submitted", actor: c.claimer_wallet, at: c.verified_at || c.created_at, detail: `Method: ${c.claim_method || "n/a"}` });
    }
    for (const p of (payments.data as any[]) || []) {
      if (p.status === "confirmed") {
        events.push({ id: p.id, type: "tier_upgrade", label: `Upgraded to ${p.tier_requested} tier`, actor: p.payer_wallet, at: p.confirmed_at || p.created_at, detail: "Tier upgrade payment confirmed" });
      }
    }
    for (const u of (updates.data as any[]) || []) {
      events.push({ id: u.id, type: "metadata_update", label: `Metadata updated: ${u.field_name}`, actor: u.updated_by, at: u.created_at, detail: u.previous_value && u.new_value ? `"${u.previous_value.slice(0, 30)}" → "${u.new_value.slice(0, 30)}"` : "Field changed" });
    }
    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return events.slice(0, 30);
  } catch {
    return [];
  }
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
  const initialStory = await loadStory(params.address);
  return <TokenReport address={params.address} initial={initial} initialStory={initialStory} />;
}
