import { LiveFeed, type FeedTokenRow } from "@/components/feed/LiveFeed";
import { TrendingSections } from "@/components/feed/TrendingSections";
import { getTopPools, normalizePool, mergeSolverifyData, getTrendingPools, getNewPools } from "@/lib/feed";
import { getSupabaseService } from "@/lib/supabase-server";
import Link from "next/link";
import { ArrowRight, Sparkles, Shield } from "lucide-react";
import { TierComparison } from "@/components/verification/TierComparison";

export const revalidate = 60; // ISR every 60s

async function loadFeed(): Promise<{ data: FeedTokenRow[]; fetched_at: number }> {
  const pools = await getTopPools(50);
  let tokens = pools.map(normalizePool);
  // Merge DB
  const db = getSupabaseService();
  const addrs = tokens.map((t) => t.address).filter(Boolean);
  if (addrs.length) {
    const { data } = await db
      .from("tokens")
      .select("contract_address, name, symbol, logo_url, claim_status, verification_tier, trust_score")
      .in("contract_address", addrs);
    tokens = mergeSolverifyData(tokens, data || []);
  }
  return { data: tokens, fetched_at: Date.now() };
}

async function loadTrending() {
  const db = getSupabaseService();
  const [trendingPools, newPools, { data: verifiedRows }] = await Promise.all([
    getTrendingPools(15),
    getNewPools(15),
    db
      .from("tokens")
      .select("contract_address, name, symbol, logo_url, claim_status, verification_tier, trust_score")
      .in("verification_tier", ["gold", "silver", "bronze"])
      .order("trust_score", { ascending: false })
      .limit(15),
  ]);
  return {
    trending: trendingPools.map(normalizePool),
    new_listings: newPools.map(normalizePool),
    verified: (verifiedRows || []).map((r: any) => ({
      address: r.contract_address,
      name: r.name, symbol: r.symbol, logo_url: r.logo_url,
      price_usd: null, price_native: null,
      change_24h: null, change_1h: null, change_6h: null,
      volume_24h: null, liquidity_usd: null, market_cap: null, fdv: null,
      pair_address: null, dex_id: null, pair_created_at: null,
      sparkline_7d: null,
      solverify: { in_db: true, claim_status: r.claim_status, verification_tier: r.verification_tier, trust_score: r.trust_score, grade: r.trust_score != null ? (r.trust_score >= 90 ? "SAFU" : r.trust_score >= 75 ? "Trusted" : r.trust_score >= 55 ? "Caution" : r.trust_score >= 35 ? "Risky" : "Danger") : null },
    })),
    fetched_at: Date.now(),
  };
}

export default async function Home() {
  const [feed, trending] = await Promise.all([loadFeed(), loadTrending()]);

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden pt-8">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand/20 via-transparent to-transparent" />
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-active bg-bg-elevated/50 px-3 py-1 text-xs text-text-secondary">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Verified ownership. Live feed. $60 vs $299.
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            The Trust Layer for <br />
            <span className="gradient-text">Solana Tokens</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-text-secondary">
            Every Solana token, ranked by 24h volume. On-chain risk signals. Verified ownership for $60.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/claim" className="btn-primary">
              Claim Your Token <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/search" className="btn-secondary">
              Search any token
            </Link>
          </div>
        </div>
      </section>

      {/* Live Feed */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="text-2xl font-bold">Live Token Feed</h2>
            <p className="mt-1 text-sm text-text-secondary">
              All top Solana tokens by 24h volume · Solana mainnet
            </p>
          </div>
        </div>
        <LiveFeed initialData={feed.data} fetchedAt={feed.fetched_at} />
      </section>

      {/* Trending / New / Verified */}
      <section>
        <TrendingSections initial={trending} />
      </section>

      {/* Tier comparison */}
      <section>
        <div className="text-center">
          <h2 className="text-3xl font-bold">Verify your token today</h2>
          <p className="mt-2 text-text-secondary">Bronze is free. Silver and Gold unlock full trust infrastructure.</p>
        </div>
        <div className="mt-8">
          <TierComparison />
        </div>
      </section>
    </div>
  );
}
