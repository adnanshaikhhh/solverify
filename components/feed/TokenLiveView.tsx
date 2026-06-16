"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, Plus, ExternalLink, Check } from "lucide-react";
import { formatUsd, formatNumber } from "@/lib/utils";
import { PriceChart } from "./PriceChart";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { AddressDisplay } from "@/components/ui/AddressDisplay";

interface LiveToken {
  address: string;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  description?: string | null;
  price_usd: number | null;
  change_24h: number | null;
  change_1h: number | null;
  volume_24h: number | null;
  liquidity_usd: number | null;
  market_cap: number | null;
  pair_address: string | null;
  dex_id: string | null;
  pair_created_at: number | null;
  sparkline_7d: number[] | null;
  solverify: {
    in_db: boolean;
    claim_status: string | null;
    verification_tier: string | null;
    trust_score: number | null;
    grade: string | null;
  };
}

interface RiskSignal {
  level: "low" | "caution" | "high" | "unknown";
  flags: string[];
  positive: string[];
  score: number;
}

interface TokenLiveViewProps {
  address: string;
  initial: {
    token: LiveToken;
    risk: RiskSignal;
    in_db: boolean;
  };
}

export function TokenLiveView({ address, initial }: TokenLiveViewProps) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/token/${address}/live`, { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (j && j.token) {
            setData(j);
          }
        }
      } catch (e) {
        // Silent
      } finally {
        setLoading(false);
      }
    };
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [address]);

  const { token, risk, in_db } = data;
  const positive = (token.change_24h ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Top CTA banner — only when token NOT in DB */}
      {!in_db && (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">This token hasn&apos;t been verified yet</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Are you the creator? Claim it for <strong>$60</strong> and get the SAFU badge, link safety scan, and priority in search.
            </p>
          </div>
          <Link
            href={`/claim?address=${address}`}
            className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
          >
            <ShieldCheck className="h-4 w-4" />
            Claim &amp; Verify
          </Link>
        </div>
      )}

      {/* Header card */}
      <div className="glass-card !p-0 overflow-hidden">
        {token.logo_url && (
          <div
            className="h-32 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${token.logo_url})` }}
          />
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-2xl bg-bg-elevated ring-1 ring-border-subtle">
                {token.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={token.logo_url} alt={token.name || "token"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-text-muted">
                    {(token.symbol || "?").slice(0, 2)}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{token.name || "Unknown Token"}</h1>
                  <VerificationBadge
                    tier={in_db ? (token.solverify.verification_tier as any) || "none" : "none"}
                    status={in_db ? (token.solverify.claim_status as any) || "unclaimed" : "unclaimed"}
                    size="md"
                  />
                </div>
                <div className="text-text-secondary">${token.symbol || "—"}</div>
                <div className="mt-2">
                  <AddressDisplay address={token.address} />
                </div>
              </div>
            </div>
            <div className="ml-auto flex flex-col items-end gap-2">
              {in_db && token.solverify.trust_score != null && (
                <TrustScoreGauge score={token.solverify.trust_score} size="md" />
              )}
              <Link
                href={`https://dexscreener.com/solana/${token.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-text-muted hover:text-text-primary inline-flex items-center gap-1"
              >
                DexScreener <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Price + stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Price" value={formatUsd(token.price_usd, { compact: false })} />
            <Stat
              label="24h"
              value={
                token.change_24h != null
                  ? `${token.change_24h >= 0 ? "+" : ""}${token.change_24h.toFixed(2)}%`
                  : "—"
              }
              color={positive ? "text-safu" : "text-danger"}
            />
            <Stat label="Volume 24h" value={token.volume_24h ? formatUsd(token.volume_24h, { compact: true }) : "—"} />
            <Stat label="Liquidity" value={token.liquidity_usd ? formatUsd(token.liquidity_usd, { compact: true }) : "—"} />
            <Stat label="Market Cap" value={token.market_cap ? formatUsd(token.market_cap, { compact: true }) : "—"} />
            <Stat label="Trust" value={in_db && token.solverify.trust_score != null ? `${token.solverify.trust_score} (${token.solverify.grade})` : "—"} />
          </div>
        </div>
      </div>

      {/* Risk signals (for unverified tokens) */}
      {(!in_db || risk.level !== "low") && (
        <div className="glass-card">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">On-Chain Risk Signals</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {risk.positive.map((p, i) => (
              <div key={`p${i}`} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-safu" />
                <span className="text-text-primary">{p}</span>
              </div>
            ))}
            {risk.flags.map((f, i) => (
              <div key={`f${i}`} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
                <span className="text-text-primary">{f}</span>
              </div>
            ))}
            {risk.positive.length === 0 && risk.flags.length === 0 && (
              <div className="text-sm text-text-muted">No on-chain data available.</div>
            )}
          </div>
          <div className="mt-3 text-xs text-text-muted">
            This is an automated scan. Claim this token for a full audit + trust score.
          </div>
        </div>
      )}

      {/* Price chart */}
      <PriceChart address={address} />

      {/* Description */}
      {token.description && (
        <div className="glass-card">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">About</h3>
          <p className="whitespace-pre-wrap text-sm text-text-secondary">{token.description}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated/40 p-3">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className={cn("mt-1 font-mono text-sm font-semibold", color || "text-text-primary")}>{value}</div>
    </div>
  );
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(" "); }
