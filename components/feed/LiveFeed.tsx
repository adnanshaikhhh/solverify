"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Shield, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";
import { cn, formatUsd, formatNumber } from "@/lib/utils";

export interface FeedTokenRow {
  address: string;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  price_usd: number | null;
  change_24h: number | null;
  change_1h: number | null;
  volume_24h: number | null;
  liquidity_usd: number | null;
  market_cap: number | null;
  pair_address: string | null;
  dex_id: string | null;
  sparkline_7d: number[] | null;
  solverify: {
    in_db: boolean;
    claim_status: string | null;
    verification_tier: string | null;
    trust_score: number | null;
    grade: string | null;
  };
  risk?: {
    level: "low" | "caution" | "high" | "unknown";
    flags: string[];
    score: number;
  };
}

interface LiveFeedProps {
  initialData: FeedTokenRow[];
  fetchedAt: number;
}

export function LiveFeed({ initialData, fetchedAt }: LiveFeedProps) {
  const [data, setData] = useState<FeedTokenRow[]>(initialData);
  const [lastUpdate, setLastUpdate] = useState(fetchedAt);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      setRefreshing(true);
      try {
        const res = await fetch("/api/feed", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (Array.isArray(j.data)) {
            setData(j.data);
            setLastUpdate(j.fetched_at || Date.now());
          }
        }
      } catch (e) {
        // Silent — show stale data
      } finally {
        setRefreshing(false);
      }
    };
    const id = setInterval(refresh, 60_000); // 60s
    return () => clearInterval(id);
  }, []);

  const ageSec = Math.max(0, Math.round((Date.now() - lastUpdate) / 1000));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${refreshing ? "bg-caution animate-pulse" : "bg-safu"}`} />
          <span>{refreshing ? "Refreshing..." : `Live · updated ${ageSec}s ago`}</span>
        </div>
        <span className="hidden sm:inline">Auto-refresh every 60s · Source: GeckoTerminal</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
              <th className="px-3 py-3 text-left">#</th>
              <th className="px-3 py-3 text-left">Token</th>
              <th className="px-3 py-3 text-right">Price</th>
              <th className="px-3 py-3 text-right">24h %</th>
              <th className="px-3 py-3 text-right hidden md:table-cell">Volume 24h</th>
              <th className="px-3 py-3 text-right hidden lg:table-cell">Liquidity</th>
              <th className="px-3 py-3 text-right hidden lg:table-cell">Market Cap</th>
              <th className="px-3 py-3 text-right hidden md:table-cell">7d</th>
              <th className="px-3 py-3 text-center">Trust</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t, i) => (
              <FeedRow key={t.address} token={t} rank={i + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export 

function FeedRow({ token, rank }: { token: FeedTokenRow; rank: number }) {
  const positive = (token.change_24h ?? 0) >= 0;
  const tier = token.solverify.verification_tier;
  return (
    <tr className="border-b border-border-subtle/50 transition-colors hover:bg-bg-card-hover">
      <td className="px-3 py-3 text-text-muted">{rank}</td>
      <td className="px-3 py-3">
        <Link href={`/token/${token.address}`} className="flex items-center gap-2.5">
          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-bg-elevated ring-1 ring-border-subtle">
            {token.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={token.logo_url}
                alt={token.name || token.symbol || "token"}
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-text-muted">
                {(token.symbol || "?").slice(0, 2)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold text-text-primary">{token.name || "Unknown"}</span>
              {tier === "gold" && <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-gold" />}
              {tier === "silver" && <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-silver" />}
              {token.risk?.level === "high" && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-danger" />}
            </div>
            <div className="text-xs text-text-muted">${token.symbol || "—"}</div>
          </div>
        </Link>
      </td>
      <td className="px-3 py-3 text-right font-mono text-sm">
        {formatUsd(token.price_usd, { compact: false })}
      </td>
      <td className={cn("px-3 py-3 text-right font-mono text-sm font-semibold", positive ? "text-safu" : "text-danger")}>
        {token.change_24h != null ? (
          <span className="inline-flex items-center gap-1">
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? "+" : ""}{token.change_24h.toFixed(2)}%
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
        <TrustBadge token={token} />
      </td>
    </tr>
  );
}

function TrustBadge({ token }: { token: FeedTokenRow }) {
  if (token.solverify.in_db && token.solverify.trust_score != null) {
    const score = token.solverify.trust_score;
    const color = score >= 90 ? "text-safu border-safu/30 bg-safu/10" :
                  score >= 75 ? "text-trusted border-trusted/30 bg-trusted/10" :
                  score >= 55 ? "text-caution border-caution/30 bg-caution/10" :
                  score >= 35 ? "text-risky border-risky/30 bg-risky/10" :
                  "text-danger border-danger/30 bg-danger/10";
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-mono font-bold", color)}>
        {score}
      </span>
    );
  }
  if (token.risk?.level === "high") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
        <AlertTriangle className="h-3 w-3" />
        Risk
      </span>
    );
  }
  if (token.risk?.level === "caution") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-caution/30 bg-caution/10 px-2 py-0.5 text-xs font-semibold text-caution">
        Caution
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-elevated px-2 py-0.5 text-xs text-text-muted">
      —
    </span>
  );
}


export function Sparkline({ prices, positive, width = 80, height = 28 }: { prices: number[] | null; positive: boolean; width?: number; height?: number }) {
  if (!prices || prices.length < 2) {
    return <div style={{ width, height }} className="rounded bg-bg-elevated" />;
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  const color = positive ? "#22c55e" : "#ef4444";
  return (
    <svg width={width} height={height} viewBox={"0 0 " + width + " " + height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}
