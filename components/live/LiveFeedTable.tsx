"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkline } from "@/components/ui/Sparkline";
import { RugRiskBadge, type RugLevel } from "@/components/safety/RugRiskBadge";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { formatUsd, formatNumber, truncateAddress, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

interface FeedToken {
  address: string;
  symbol: string;
  name: string;
  logo: string | null;
  priceUsd: number | null;
  change24h: number | null;
  change1h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  marketCap: number | null;
  fdv: number | null;
  pairAddress: string | null;
  dexId: string | null;
  inDb: boolean;
  trustScore: number | null;
  grade: "SAFU" | "Trusted" | "Caution" | "Risky" | "Danger" | null;
  tier: "none" | "bronze" | "silver" | "gold" | null;
  rugRisk: { level: RugLevel; reasons: string[]; mintDisabled: boolean | null; freezeDisabled: boolean | null; topHolderPct: number | null };
  sparkline: number[];
}

interface LiveFeedTableProps {
  initial?: { tokens: FeedToken[]; updatedAt: number };
  limit?: number;
  showHeader?: boolean;
}

export function LiveFeedTable({ initial, limit = 50, showHeader = true }: LiveFeedTableProps) {
  const [tokens, setTokens] = useState<FeedToken[] | null>(initial?.tokens ?? null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(initial?.updatedAt ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/feed?limit=${limit}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = (await res.json()) as { tokens: FeedToken[]; updatedAt: number };
      setTokens(data.tokens);
      setUpdatedAt(data.updatedAt);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initial) fetchFeed();
    const id = setInterval(fetchFeed, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  if (loading && !tokens) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-bg-card" />
        ))}
      </div>
    );
  }

  if (error && !tokens) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6 text-center text-sm text-danger">
        {error}
      </div>
    );
  }

  if (!tokens || tokens.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border-subtle p-12 text-center text-text-secondary">No tokens in feed.</div>;
  }

  const agoSec = updatedAt ? Math.floor((Date.now() - updatedAt) / 1000) : null;

  return (
    <div>
      {showHeader && (
        <div className="mb-3 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-safu animate-pulse" />
            <span>Live feed</span>
            {agoSec != null && <span>· updated {agoSec}s ago</span>}
          </div>
          <button
            onClick={fetchFeed}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-bg-elevated hover:text-text-primary"
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border-subtle">
        <table className="w-full text-sm">
          <thead className="bg-bg-card/60 text-xs uppercase text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Token</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">24h</th>
              <th className="px-3 py-2 text-right">Volume 24h</th>
              <th className="px-3 py-2 text-right">Liquidity</th>
              <th className="px-3 py-2 text-right hidden md:table-cell">MCap</th>
              <th className="px-3 py-2 text-right hidden lg:table-cell">7d chart</th>
              <th className="px-3 py-2 text-center">SolVerify</th>
              <th className="px-3 py-2 text-center">Risk</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t, i) => (
              <tr
                key={t.address}
                className="border-t border-border-subtle/50 transition-colors hover:bg-bg-card/40"
              >
                <td className="px-3 py-3 text-text-muted font-mono text-xs">{i + 1}</td>
                <td className="px-3 py-3">
                  <Link href={`/token/${t.address}`} className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-bg-elevated ring-1 ring-border-subtle">
                      {t.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.logo} alt={t.symbol} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-text-muted">
                          {t.symbol.slice(0, 3).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-text-primary">{t.symbol}</span>
                        {t.inDb && t.tier && t.tier !== "none" && (
                          <VerificationBadge tier={t.tier} status="claimed" size="sm" />
                        )}
                      </div>
                      <div className="truncate text-xs text-text-muted">{t.name}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm">
                  {t.priceUsd != null ? formatUsd(t.priceUsd) : "—"}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm">
                  {t.change24h != null ? (
                    <span className={cn(
                      "inline-flex items-center gap-0.5",
                      t.change24h >= 0 ? "text-safu" : "text-danger"
                    )}>
                      {t.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(t.change24h).toFixed(2)}%
                    </span>
                  ) : "—"}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm">{t.volume24h ? formatUsd(t.volume24h, { compact: true }) : "—"}</td>
                <td className="px-3 py-3 text-right font-mono text-sm">{t.liquidityUsd ? formatUsd(t.liquidityUsd, { compact: true }) : "—"}</td>
                <td className="px-3 py-3 text-right font-mono text-sm hidden md:table-cell">{t.marketCap ? formatUsd(t.marketCap, { compact: true }) : "—"}</td>
                <td className="px-3 py-3 text-right hidden lg:table-cell">
                  <Sparkline data={generateSparkFromChange(t.change24h)} positive={(t.change24h ?? 0) >= 0} width={80} height={28} />
                </td>
                <td className="px-3 py-3 text-center">
                  {t.inDb && t.trustScore != null ? (
                    <span className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold",
                      t.grade === "SAFU" && "bg-safu/15 text-safu",
                      t.grade === "Trusted" && "bg-trusted/15 text-trusted",
                      t.grade === "Caution" && "bg-caution/15 text-caution",
                      t.grade === "Risky" && "bg-risky/15 text-risky",
                      t.grade === "Danger" && "bg-danger/15 text-danger"
                    )}>
                      <ShieldCheck className="h-3 w-3" />
                      {t.trustScore}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-border-subtle bg-bg-elevated px-2 py-0.5 text-xs text-text-muted">
                      <AlertCircle className="h-3 w-3" />
                      Unverified
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <RugRiskBadge level={t.rugRisk?.level || "unknown"} reasons={t.rugRisk?.reasons} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Generate a tiny sparkline from 24h change + tiny noise (placeholder until we wire real history)
function generateSparkFromChange(change24h: number | null): number[] {
  if (change24h == null) return Array.from({ length: 12 }, () => 100);
  const change = change24h / 100;
  const start = 100;
  const end = 100 * (1 + change);
  const out: number[] = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const base = start + (end - start) * t;
    const noise = Math.sin(i * 1.7) * 1.5 + Math.cos(i * 0.9) * 0.8;
    out.push(base + noise);
  }
  return out;
}
