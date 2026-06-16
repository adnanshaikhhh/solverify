"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrendingUp, Sparkles, ShieldCheck } from "lucide-react";
import { formatUsd } from "@/lib/utils";
import { RugRiskBadge, type RugLevel } from "@/components/safety/RugRiskBadge";

interface FeedToken {
  address: string;
  symbol: string;
  name: string;
  logo: string | null;
  priceUsd: number | null;
  change24h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  inDb: boolean;
  trustScore: number | null;
  tier: string | null;
  rugRisk: { level: RugLevel; reasons: string[] };
}

interface TrendingRowProps {
  title: string;
  icon: React.ReactNode;
  tokens: FeedToken[];
  empty?: string;
  /** "1h" | "new" | "verified" badge style */
  variant: "trending" | "new" | "verified";
}

export function TrendingRow({ title, icon, tokens, empty, variant }: TrendingRowProps) {
  if (tokens.length === 0) {
    return (
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          {icon}
          {title}
        </h3>
        <div className="rounded-2xl border border-dashed border-border-subtle p-6 text-center text-sm text-text-muted">
          {empty || "No tokens to show."}
        </div>
      </div>
    );
  }
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
        {tokens.map((t) => (
          <Link
            key={t.address}
            href={`/token/${t.address}`}
            className="glass-card flex-shrink-0 w-56 p-4 snap-start glass-card-hover"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-bg-elevated ring-1 ring-border-subtle">
                {t.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.logo} alt={t.symbol} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-text-muted">
                    {t.symbol.slice(0, 3).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{t.symbol}</div>
                <div className="truncate text-xs text-text-muted">{t.name}</div>
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="font-mono text-sm">{t.priceUsd != null ? formatUsd(t.priceUsd) : "—"}</div>
              {t.change24h != null && (
                <div className={`text-xs font-mono ${t.change24h >= 0 ? "text-safu" : "text-danger"}`}>
                  {t.change24h >= 0 ? "+" : ""}{t.change24h.toFixed(2)}%
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted">
              <span>Vol {t.volume24h ? formatUsd(t.volume24h, { compact: true }) : "—"}</span>
              <RugRiskBadge level={t.rugRisk?.level || "unknown"} size="sm" />
            </div>
            {variant === "verified" && t.trustScore != null && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-safu">
                <ShieldCheck className="h-3 w-3" />
                Trust {t.trustScore}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

interface TrendingSectionProps {
  initial?: { trending: FeedToken[]; newListings: FeedToken[]; verified: FeedToken[]; updatedAt: number };
}

export function TrendingSection({ initial }: TrendingSectionProps) {
  const [data, setData] = useState(initial);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch("/api/trending");
        if (res.ok) {
          const j = await res.json();
          if (!cancelled) setData(j);
        }
      } catch (e) { /* ignore */ }
    };
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [initial]);

  if (!data) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-bg-card" />)}
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <TrendingRow
        title="Trending Now"
        icon={<TrendingUp className="h-5 w-5 text-trusted" />}
        tokens={data.trending}
        variant="trending"
        empty="No trending tokens yet."
      />
      <TrendingRow
        title="New Listings"
        icon={<Sparkles className="h-5 w-5 text-caution" />}
        tokens={data.newListings}
        variant="new"
        empty="No new high-volume listings."
      />
      <TrendingRow
        title="SolVerify Verified"
        icon={<ShieldCheck className="h-5 w-5 text-safu" />}
        tokens={data.verified}
        variant="verified"
        empty="No verified tokens yet — be the first."
      />
    </div>
  );
}
