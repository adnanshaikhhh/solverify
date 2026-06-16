"use client";

import { Shield, ShieldCheck, Lock, Link2, Users, FileText } from "lucide-react";
import { cn, truncateAddress, solscanUrl, dexscreenerUrl } from "@/lib/utils";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { SafetyIndicator } from "@/components/safety/LinkSafetyBadge";
import { GradientText } from "@/components/ui/GradientText";
import { formatUsd, formatSupply, formatNumber } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export interface TokenProfileHeaderData {
  contract_address: string;
  name: string | null;
  symbol: string | null;
  decimals: number;
  total_supply: string | null;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  website_url: string | null;
  twitter_url: string | null;
  telegram_url: string | null;
  discord_url: string | null;
  github_url: string | null;
  whitepaper_url: string | null;
  claim_status: "unclaimed" | "pending" | "claimed" | "suspended";
  verification_tier: "none" | "bronze" | "silver" | "gold";
  trust_score: number;
  owner_wallet: string | null;
  is_mint_disabled: boolean;
  is_freeze_disabled: boolean;
  liquidity_locked: boolean;
  market_cap_usd: number | null;
  price_usd: number | null;
  volume_24h: number | null;
  holder_count: number | null;
  top10_holder_percent: number | null;
  community_vouches: number;
  links_safety_status: "unchecked" | "clean" | "flagged" | "blocked";
}

interface TokenProfileHeaderProps {
  token: TokenProfileHeaderData;
}

export function TokenProfileHeader({ token }: TokenProfileHeaderProps) {
  return (
    <div className="relative">
      {/* Banner */}
      <div
        className="relative h-44 w-full overflow-hidden rounded-2xl"
        style={{
          background: token.banner_url
            ? `url(${token.banner_url}) center/cover`
            : `linear-gradient(135deg, var(--tier-color, #7C3AED) 0%, #07070C 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base to-transparent" />
      </div>

      <div className="relative -mt-16 px-2 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-bg-base bg-bg-elevated shadow-2xl ring-2 ring-border-active">
              {token.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={token.logo_url} alt={token.name || "token"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-text-muted">
                  {(token.symbol || "?").slice(0, 3)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1">
                <VerificationBadge
                  tier={token.verification_tier}
                  status={token.claim_status}
                  size="md"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-text-primary">
                  {token.name || "Unknown Token"}
                </h1>
                <span className="rounded-full border border-border-subtle bg-bg-elevated px-2.5 py-1 text-sm text-text-secondary">
                  ${token.symbol || "—"}
                </span>
                <SafetyIndicator
                  level={token.links_safety_status}
                  size="sm"
                />
              </div>
              <AddressDisplay address={token.contract_address} />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 md:items-end">
            <TrustScoreGauge score={token.trust_score} size="lg" />
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Stat icon={<Users className="h-4 w-4" />} label="Holders" value={formatNumber(token.holder_count)} />
          <Stat icon={<FileText className="h-4 w-4" />} label="Supply" value={formatSupply(token.total_supply, token.decimals)} />
          <Stat icon={<FileText className="h-4 w-4" />} label="Market Cap" value={formatUsd(token.market_cap_usd, { compact: true })} />
          <Stat icon={<FileText className="h-4 w-4" />} label="Price" value={formatUsd(token.price_usd)} />
          <Stat icon={<FileText className="h-4 w-4" />} label="24h Volume" value={formatUsd(token.volume_24h, { compact: true })} />
          <Stat icon={<Lock className="h-4 w-4" />} label="Top 10 %" value={token.top10_holder_percent != null ? `${token.top10_holder_percent.toFixed(1)}%` : "—"} />
        </div>

        {/* Property pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          <PropertyPill
            label="Mint"
            value={token.is_mint_disabled ? "Disabled" : "Enabled"}
            safe={token.is_mint_disabled}
          />
          <PropertyPill
            label="Freeze"
            value={token.is_freeze_disabled ? "Disabled" : "Enabled"}
            safe={token.is_freeze_disabled}
          />
          <PropertyPill
            label="Liquidity"
            value={token.liquidity_locked ? "Locked" : "Unlocked"}
            safe={token.liquidity_locked}
          />
          {token.website_url && (
            <a
              href={token.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs font-medium text-text-secondary hover:border-border-glow"
            >
              Website <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {token.twitter_url && (
            <a
              href={token.twitter_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs font-medium text-text-secondary hover:border-border-glow"
            >
              Twitter <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {token.telegram_url && (
            <a
              href={token.telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs font-medium text-text-secondary hover:border-border-glow"
            >
              Telegram <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <a
            href={dexscreenerUrl(token.contract_address)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs font-medium text-text-secondary hover:border-border-glow"
          >
            DexScreener <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}

function PropertyPill({ label, value, safe }: { label: string; value: string; safe: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        safe
          ? "border border-safu/30 bg-safu/10 text-safu"
          : "border border-caution/30 bg-caution/10 text-caution"
      )}
    >
      <span className="text-text-muted">{label}:</span>
      {value}
    </span>
  );
}
