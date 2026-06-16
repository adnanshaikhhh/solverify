"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatUsd, cn } from "@/lib/utils";
import { Sparkline } from "@/components/feed/LiveFeed";
import { TrendingUp, TrendingDown, Search, ChevronRight } from "lucide-react";

interface FeedToken {
  address: string;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  price_usd: number | null;
  change_24h: number | null;
  change_1h?: number | null;
  change_6h?: number | null;
  volume_24h: number | null;
  liquidity_usd: number | null;
  market_cap: number | null;
  pair_address: string | null;
  sparkline_7d: number[] | null;
  solverify: { in_db: boolean; trust_score: number | null; grade: string | null };
}

type Tab = "trending" | "new" | "gainers" | "losers" | "verified";
type Timeframe = "5m" | "1h" | "4h" | "24h";

export function FilteredFeed({ initialData, initialFetchedAt }: { initialData: FeedToken[]; initialFetchedAt: number }) {
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<Tab>("trending");
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const [minVolume, setMinVolume] = useState(0);
  const [excludeStables, setExcludeStables] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(initialFetchedAt);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh every 60s
  useEffect(() => {
    const t = setInterval(async () => {
      setRefreshing(true);
      try {
        const r = await fetch("/api/feed", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (j.data) {
            setData(j.data);
            setLastUpdate(j.fetched_at);
          }
        }
      } catch {/* noop */} finally { setRefreshing(false); }
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  // Apply filters
  const filtered = data
    .filter((t) => {
      if (minVolume > 0 && (t.volume_24h || 0) < minVolume) return false;
      if (excludeStables) {
        const stables = ["USDC", "USDT", "USDS", "DAI", "BUSD", "FRAX"];
        if (stables.includes(t.symbol || "")) return false;
      }
      if (tab === "verified" && !t.solverify.in_db) return false;
      return true;
    })
    .map((t) => ({
      ...t,
      // Pick change based on timeframe
      change: timeframe === "1h" ? (t.change_1h ?? null) : timeframe === "4h" ? (t.change_6h ?? null) : t.change_24h,
    }));

  // Sort by tab
  if (tab === "trending") {
    filtered.sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0));
  } else if (tab === "new") {
    // Sort by updated_at if available, else by address hash as poor proxy
    filtered.sort((a, b) => a.address.localeCompare(b.address));
  } else if (tab === "gainers") {
    filtered.sort((a, b) => (b.change || 0) - (a.change || 0));
  } else if (tab === "losers") {
    filtered.sort((a, b) => (a.change || 0) - (b.change || 0));
  } else if (tab === "verified") {
    filtered.sort((a, b) => (b.solverify.trust_score || 0) - (a.solverify.trust_score || 0));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3">
        {(["trending", "gainers", "losers", "new", "verified"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-brand/20 text-brand" : "text-text-muted hover:bg-bg-elevated"
            )}
          >
            {t === "verified" ? "✓ Verified" : t}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex rounded-lg border border-border-subtle bg-bg-elevated p-0.5 text-xs">
            {(["5m", "1h", "4h", "24h"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn("rounded px-2 py-1", timeframe === tf ? "bg-brand text-white" : "text-text-muted")}
                title={`Sort by ${tf} change`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Volume filter */}
          <select
            value={minVolume}
            onChange={(e) => setMinVolume(Number(e.target.value))}
            className="rounded-lg border border-border-subtle bg-bg-elevated px-2 py-1 text-xs text-text-primary"
            title="Min 24h volume"
          >
            <option value={0}>Any vol</option>
            <option value={1000}>≥ $1K</option>
            <option value={10000}>≥ $10K</option>
            <option value={100000}>≥ $100K</option>
            <option value={1000000}>≥ $1M</option>
          </select>

          {/* Stable exclusion */}
          <button
            onClick={() => setExcludeStables((s) => !s)}
            className={cn(
              "rounded-lg border px-2 py-1 text-xs",
              excludeStables ? "border-brand bg-brand/20 text-brand" : "border-border-subtle bg-bg-elevated text-text-muted"
            )}
          >
            No stables
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${refreshing ? "bg-caution animate-pulse" : "bg-safu"}`} />
          {refreshing ? "Refreshing..." : `Live · ${filtered.length} tokens · ${timeAgo(lastUpdate)}`}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
              <th className="px-3 py-3 text-left">#</th>
              <th className="px-3 py-3 text-left">Token</th>
              <th className="px-3 py-3 text-right">Price</th>
              <th className="px-3 py-3 text-right">{timeframe} %</th>
              <th className="px-3 py-3 text-right hidden md:table-cell">Volume 24h</th>
              <th className="px-3 py-3 text-right hidden lg:table-cell">Liquidity</th>
              <th className="px-3 py-3 text-right hidden lg:table-cell">Market Cap</th>
              <th className="px-3 py-3 text-right hidden md:table-cell">7d</th>
              <th className="px-3 py-3 text-center">Trust</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 30).map((t, i) => (
              <FilteredFeedRow key={t.address} token={t} rank={i + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilteredFeedRow({ token, rank }: { token: any; rank: number }) {
  const positive = (token.change || 0) >= 0;
  return (
    <tr className="border-b border-border-subtle/50 transition-colors hover:bg-bg-card-hover">
      <td className="px-3 py-3 text-text-muted">{rank}</td>
      <td className="px-3 py-3">
        <Link href={`/token/${token.address}`} className="flex items-center gap-2.5">
          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-bg-elevated ring-1 ring-border-subtle">
            {token.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={token.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-text-muted">
                {(token.symbol || "?").slice(0, 2)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-text-primary">{token.name || "Unknown"}</div>
            <div className="text-xs text-text-muted">${token.symbol || "—"}</div>
          </div>
        </Link>
      </td>
      <td className="px-3 py-3 text-right font-mono text-sm">{formatUsd(token.price_usd, { compact: false })}</td>
      <td className={cn("px-3 py-3 text-right font-mono text-sm font-semibold", positive ? "text-safu" : "text-danger")}>
        {token.change != null ? (
          <span className="inline-flex items-center gap-1">
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? "+" : ""}{token.change.toFixed(2)}%
          </span>
        ) : "—"}
      </td>
      <td className="px-3 py-3 text-right font-mono text-sm hidden md:table-cell">
        {token.volume_24h ? formatUsd(token.volume_24h, { compact: true }) : "—"}
      </td>
      <td className="px-3 py-3 text-right font-mono text-sm hidden lg:table-cell">
        {token.liquidity_usd ? formatUsd(token.liquidity_usd, { compact: true }) : "—"}
      </td>
      <td className="px-3 py-3 text-right font-mono text-sm hidden lg:table-cell">
        {token.market_cap ? formatUsd(token.market_cap, { compact: true }) : "—"}
      </td>
      <td className="px-3 py-3 hidden md:table-cell">
        <Sparkline prices={token.sparkline_7d} positive={positive} />
      </td>
      <td className="px-3 py-3 text-center">
        {token.solverify.in_db && token.solverify.trust_score != null ? (
          <span className="rounded-full border border-safu/30 bg-safu/10 px-2 py-0.5 text-xs font-mono font-bold text-safu">
            {token.solverify.trust_score}
          </span>
        ) : (
          <span className="rounded-full border border-border-subtle bg-bg-elevated px-2 py-0.5 text-xs text-text-muted">—</span>
        )}
      </td>
    </tr>
  );
}

function timeAgo(ts: number): string {
  const diff = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}s ago`;
  return `${Math.floor(diff / 3600)}m ago`;
}
