"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { formatUsd } from "@/lib/utils";
import { Sparkline } from "./LiveFeed";
import type { FeedTokenRow } from "./LiveFeed";

interface TrendingRow {
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
  pair_created_at: number | null;
  sparkline_7d: number[] | null;
  solverify: { in_db: boolean; claim_status: string | null; verification_tier: string | null; trust_score: number | null; grade: string | null; };
}

interface TrendingProps {
  initial: {
    trending: TrendingRow[];
    new_listings: TrendingRow[];
    verified: TrendingRow[];
    fetched_at: number;
  };
}

export function TrendingSections({ initial }: TrendingProps) {
  return (
    <div className="space-y-8">
      <Section
        title="Trending Now"
        icon={<Sparkles className="h-4 w-4 text-caution" />}
        subtitle="Top 1h volume spike"
        tokens={initial.trending}
      />
      <Section
        title="New Listings"
        icon={<Clock className="h-4 w-4 text-trusted" />}
        subtitle="Listed in the last 7 days"
        tokens={initial.new_listings}
      />
      <Section
        title="SolVerify Verified"
        icon={<ShieldCheck className="h-4 w-4 text-gold" />}
        subtitle="Tokens claimed and verified on SolVerify"
        tokens={initial.verified}
        showTrust
      />
    </div>
  );
}

function Section({
  title,
  icon,
  subtitle,
  tokens,
  showTrust,
}: {
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  tokens: TrendingRow[];
  showTrust?: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            {icon}
            {title}
          </h2>
          <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {tokens.length === 0 && (
          <div className="rounded-xl border border-border-subtle bg-bg-card p-4 text-sm text-text-muted">
            No tokens in this category yet.
          </div>
        )}
        {tokens.map((t) => (
          <Link
            key={t.address}
            href={`/token/${t.address}`}
            className="flex w-56 flex-shrink-0 flex-col gap-2 rounded-2xl border border-border-subtle bg-bg-card p-4 transition-all hover:border-border-glow hover:bg-bg-card-hover"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-bg-elevated">
                {t.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.logo_url} alt={t.name || t.symbol || ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-text-muted">
                    {(t.symbol || "?").slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{t.name || "Unknown"}</div>
                <div className="text-xs text-text-muted">${t.symbol || "—"}</div>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="font-mono text-sm font-semibold">
                  {t.price_usd ? formatUsd(t.price_usd, { compact: false }) : "—"}
                </div>
                {t.change_24h != null && (
                  <div className={`text-xs font-mono ${t.change_24h >= 0 ? "text-safu" : "text-danger"}`}>
                    {t.change_24h >= 0 ? "+" : ""}{t.change_24h.toFixed(2)}%
                  </div>
                )}
              </div>
              <Sparkline prices={t.sparkline_7d} positive={(t.change_24h ?? 0) >= 0} width={64} height={24} />
            </div>
            {showTrust && t.solverify.trust_score != null && (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span className="font-mono font-bold text-safu">{t.solverify.trust_score}</span>
                <span className="text-text-muted">{t.solverify.grade}</span>
              </div>
            )}
            {t.volume_24h ? (
              <div className="text-xs text-text-muted">
                Vol {formatUsd(t.volume_24h, { compact: true })}
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
