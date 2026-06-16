"use client";

import Link from "next/link";
import { useTrustScore } from "@/hooks/useTrustScore";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";
import { SafetyIndicator } from "@/components/safety/LinkSafetyBadge";
import { cn, truncateAddress } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface TokenCardData {
  id: string;
  contract_address: string;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  description: string | null;
  verification_tier: "none" | "bronze" | "silver" | "gold";
  claim_status: "unclaimed" | "pending" | "claimed" | "suspended";
  trust_score: number;
  links_safety_status: "unchecked" | "clean" | "flagged" | "blocked";
  community_vouches: number;
  view_count: number;
  updated_at: string;
}

interface TokenCardProps {
  token: TokenCardData;
  className?: string;
}

const TIER_BORDER = {
  gold: "from-gold via-gold/40 to-gold",
  silver: "from-silver via-silver/40 to-silver",
  bronze: "from-bronze via-bronze/40 to-bronze",
  none: "from-border-subtle via-border-subtle to-border-subtle",
};

export function TokenCard({ token, className }: TokenCardProps) {
  const { grade } = useTrustScore(token.trust_score);
  const tierColor = TIER_BORDER[token.verification_tier];

  return (
    <Link
      href={`/token/${token.contract_address}`}
      className={cn(
        "glass-card relative block overflow-hidden p-5 glass-card-hover",
        className
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", tierColor)} />

      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-bg-elevated ring-1 ring-border-subtle">
            {token.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={token.logo_url} alt={token.name || "token"} className="h-full w-full object-cover" />
            ) : (
              <span className="font-bold text-text-secondary">{(token.symbol || "?").slice(0, 3)}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 rounded-full bg-bg-card p-0.5">
            <VerificationBadge tier={token.verification_tier} status={token.claim_status} size="sm" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate font-semibold text-text-primary">{token.name || "Unknown"}</h3>
            <span className="text-sm text-text-muted">${token.symbol || "—"}</span>
          </div>
          <div className="mt-0.5 font-mono text-xs text-text-muted">
            {truncateAddress(token.contract_address, 4, 4)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <TrustScoreGauge score={token.trust_score} size="sm" showLabel={false} />
          <span className="font-mono text-xs font-bold text-text-primary">{token.trust_score}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-full border border-border-subtle bg-bg-elevated px-2 py-0.5 text-xs font-medium uppercase text-text-secondary">
          {grade}
        </span>
        {token.claim_status === "claimed" ? (
          <SafetyIndicator level="clean" size="sm" label="Claimed" />
        ) : token.claim_status === "pending" ? (
          <SafetyIndicator level="suspicious" size="sm" label="Pending" />
        ) : (
          <SafetyIndicator level="unchecked" size="sm" label="Unclaimed" />
        )}
        <span className="ml-auto text-xs text-text-muted">
          {formatDistanceToNow(new Date(token.updated_at), { addSuffix: true })}
        </span>
      </div>
    </Link>
  );
}
