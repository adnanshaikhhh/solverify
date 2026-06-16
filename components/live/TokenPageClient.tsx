"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Shield, AlertTriangle, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { TokenTabs } from "@/components/token/TokenTabs";
import { LiveTokenChart } from "@/components/live/LiveTokenChart";
import { RugRiskBadge, type RugLevel } from "@/components/safety/RugRiskBadge";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatUsd, formatNumber, truncateAddress } from "@/lib/utils";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { VerificationBadge } from "@/components/verification/VerificationBadge";

interface LiveData {
  pair: any;
  rugRisk: { level: RugLevel; reasons: string[]; mintDisabled: boolean | null; freezeDisabled: boolean | null; topHolderPct: number | null };
  updatedAt: number;
}

export function TokenPageClient({ address, initialToken }: { address: string; initialToken: any }) {
  const [live, setLive] = useState<LiveData | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLiveLoading(true);
    fetch(`/api/token/${address}/live`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled) { setLive(d); setLiveLoading(false); } })
      .catch(() => { if (!cancelled) setLiveLoading(false); });
    return () => { cancelled = true; };
  }, [address]);

  const pair = live?.pair;
  const priceUsd = pair?.priceUsd ? Number(pair.priceUsd) : (initialToken?.price_usd ?? null);
  const change24h = pair?.priceChange?.h24 ?? null;
  const volume24h = pair?.volume?.h24 ?? (initialToken?.volume_24h ?? null);
  const liquidity = pair?.liquidity?.usd ?? null;
  const marketCap = pair?.marketCap ?? initialToken?.market_cap_usd ?? null;
  const fdv = pair?.fdv ?? null;
  const dexId = pair?.dexId ?? null;
  const pairUrl = pair?.url ?? null;
  const logo = pair?.info?.imageUrl ?? initialToken?.logo_url ?? null;

  const inDb = !!initialToken;
  const symbol = pair?.baseToken?.symbol ?? initialToken?.symbol ?? "?";
  const name = pair?.baseToken?.name ?? initialToken?.name ?? "Unknown";

  return (
    <div>
      {/* Live data panel -- always shown */}
      <div className="mb-6">
        <GlassCard className="!p-0 overflow-hidden">
          {/* Banner gradient */}
          <div
            className="relative h-32 w-full"
            style={{
              background: initialToken?.banner_url
                ? `url(${initialToken.banner_url}) center/cover`
                : `linear-gradient(135deg, #7C3AED 0%, #1E1E2E 100%)`,
            }}
          />
          <div className="relative -mt-12 px-5 pb-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-4">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-bg-card bg-bg-elevated ring-2 ring-border-active">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt={symbol} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-text-muted">
                      {symbol.slice(0, 3).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">{name}</h1>
                    {inDb && initialToken.verification_tier && initialToken.verification_tier !== "none" && (
                      <VerificationBadge tier={initialToken.verification_tier} status={initialToken.claim_status || "claimed"} size="md" showLabel />
                    )}
                  </div>
                  <div className="text-text-secondary">${symbol}</div>
                  <div className="mt-1">
                    <AddressDisplay address={address} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold">{priceUsd != null ? formatUsd(priceUsd) : "—"}</div>
                {change24h != null && (
                  <div className={`mt-1 inline-flex items-center gap-1 text-sm font-mono ${change24h >= 0 ? "text-safu" : "text-danger"}`}>
                    {change24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {Math.abs(change24h).toFixed(2)}% (24h)
                  </div>
                )}
                {dexId && (
                  <div className="mt-1 text-xs text-text-muted">
                    via <span className="text-text-secondary">{dexId}</span>
                    {pairUrl && (
                      <a href={pairUrl} target="_blank" rel="noopener noreferrer" className="ml-2 hover:text-brand">DexScreener &rarr;</a>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="24h Volume" value={volume24h ? formatUsd(volume24h, { compact: true }) : "—"} />
              <Stat label="Liquidity" value={liquidity ? formatUsd(liquidity, { compact: true }) : "—"} />
              <Stat label="Market Cap" value={marketCap ? formatUsd(marketCap, { compact: true }) : "—"} />
              <Stat label="FDV" value={fdv ? formatUsd(fdv, { compact: true }) : "—"} />
            </div>
            {/* Rug risk row */}
            {live && !liveLoading && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-muted">On-chain safety:</span>
                <RugRiskBadge level={live.rugRisk.level} reasons={live.rugRisk.reasons} />
                {live.rugRisk.mintDisabled === true && <span className="text-xs text-safu">Mint disabled</span>}
                {live.rugRisk.mintDisabled === false && <span className="text-xs text-danger">Mint active</span>}
                {live.rugRisk.freezeDisabled === true && <span className="text-xs text-safu">Freeze disabled</span>}
                {live.rugRisk.freezeDisabled === false && <span className="text-xs text-danger">Freeze active</span>}
                {live.rugRisk.topHolderPct != null && (
                  <span className={`text-xs ${live.rugRisk.topHolderPct > 60 ? "text-caution" : "text-text-secondary"}`}>
                    Top 3: {live.rugRisk.topHolderPct.toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Unverified CTA banner -- only for tokens not in DB */}
      {!inDb && (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-brand/40 bg-brand/5 p-6">
          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-brand">
                <Shield className="h-5 w-5" />
                This token hasn&apos;t been verified yet
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                Are you the creator? Claim it for <strong className="text-text-primary">$60</strong> and get the SAFU badge, link safety scan, and the trust score.
              </p>
            </div>
            <Link
              href={`/claim?address=${address}`}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-hover active:scale-95"
            >
              Claim & Verify This Token <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Live chart -- always shown */}
      <div className="mb-6">
        <LiveTokenChart address={address} days={7} />
      </div>

      {/* Existing tabs / metadata / history (for DB tokens) */}
      {inDb && <TokenTabs address={address} initialToken={initialToken} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-3">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}
