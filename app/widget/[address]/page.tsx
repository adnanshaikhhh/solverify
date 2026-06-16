import { notFound } from "next/navigation";
import { isValidSolanaAddress } from "@/lib/solana";
import { truncateAddress } from "@/lib/utils";
import { APP_URL } from "@/lib/constants";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { Shield } from "lucide-react";

async function fetchToken(address: string) {
  const res = await fetch(`${APP_URL}/api/widget/${address}`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;
  return (await res.json());
}

export default async function WidgetPage({ params, searchParams }: { params: { address: string }; searchParams: { style?: string } }) {
  if (!isValidSolanaAddress(params.address)) notFound();
  const style = (searchParams.style || "card") as "mini" | "card" | "full";
  const token = await fetchToken(params.address);
  if (!token) return <div className="p-8 text-text-secondary">Token not found.</div>;

  if (style === "mini") {
    return (
      <a
        href={`${APP_URL}/token/${params.address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-card px-3 py-1.5 text-xs"
        style={{ display: "inline-flex" }}
      >
        <Shield className="h-3.5 w-3.5 text-brand" />
        <span className="font-semibold">{token.symbol || token.name}</span>
        <span className="text-text-muted">trust</span>
        <span className="font-mono font-bold text-safu">{token.trust_score}</span>
        <VerificationBadge tier={token.verification_tier} status="claimed" size="sm" />
      </a>
    );
  }

  if (style === "full") {
    return (
      <a
        href={`${APP_URL}/token/${params.address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-[420px] rounded-2xl border border-border-subtle bg-bg-card p-5"
      >
        <div className="flex items-center gap-3">
          <TrustScoreGauge score={token.trust_score} size="md" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{token.name || "Unknown"}</h3>
              <VerificationBadge tier={token.verification_tier} status="claimed" size="sm" />
            </div>
            <div className="text-xs text-text-muted">${token.symbol}</div>
            <div className="mt-1 font-mono text-xs text-text-muted">{truncateAddress(params.address, 4, 4)}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border-subtle p-2">
            <div className="text-text-muted">Holders</div>
            <div className="font-mono font-semibold">{token.holder_count ?? "—"}</div>
          </div>
          <div className="rounded-lg border border-border-subtle p-2">
            <div className="text-text-muted">Vouches</div>
            <div className="font-mono font-semibold">{token.community_vouches ?? 0}</div>
          </div>
          <div className="rounded-lg border border-border-subtle p-2">
            <div className="text-text-muted">Links</div>
            <div className="font-mono font-semibold capitalize">{token.links_safety_status}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs text-text-muted">
          <Shield className="h-3 w-3" /> Verified by SolVerify
        </div>
      </a>
    );
  }

  // card (default)
  return (
    <a
      href={`${APP_URL}/token/${params.address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-[280px] rounded-xl border border-border-subtle bg-bg-card p-4"
    >
      <div className="flex items-center gap-3">
        <TrustScoreGauge score={token.trust_score} size="sm" showLabel={false} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{token.name || "Unknown"}</span>
            <VerificationBadge tier={token.verification_tier} status="claimed" size="sm" />
          </div>
          <div className="font-mono text-xs text-text-muted">${token.symbol} · {truncateAddress(params.address, 4, 4)}</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-text-muted">Verified by SolVerify</div>
    </a>
  );
}
