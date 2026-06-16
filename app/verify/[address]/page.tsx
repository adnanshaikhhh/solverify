import { notFound } from "next/navigation";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { Shield, Twitter, Share2, Copy } from "lucide-react";
import { isValidSolanaAddress } from "@/lib/solana";
import { truncateAddress, solscanUrl } from "@/lib/utils";
import { APP_URL } from "@/lib/constants";

async function fetchToken(address: string) {
  const res = await fetch(`${APP_URL}/api/tokens/${address}`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;
  return (await res.json())?.token ?? null;
}

export default async function VerifyPage({ params }: { params: { address: string } }) {
  if (!isValidSolanaAddress(params.address)) notFound();
  const token = await fetchToken(params.address);
  if (!token) {
    return <div className="py-16 text-center text-text-secondary">Token not found.</div>;
  }

  const url = `${APP_URL}/verify/${params.address}`;
  const tweet = `I just verified ${token.name} ($${token.symbol}) on SolVerify. Trust score: ${token.trust_score}/100.${" "}${url}`;

  return (
    <div className="mx-auto max-w-2xl py-8 text-center">
      <div className="mb-6 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-text-muted">
        <Shield className="h-4 w-4 text-brand" />
        Verified by SolVerify
      </div>

      <div className="mb-6 flex justify-center">
        <VerificationBadge tier={token.verification_tier} status={token.claim_status} size="xl" showLabel />
      </div>

      <h1 className="text-4xl font-bold">{token.name || "Unknown"}</h1>
      <div className="mt-1 text-text-secondary">${token.symbol}</div>
      <div className="mt-3 font-mono text-sm text-text-muted">{truncateAddress(params.address, 6, 6)}</div>

      <div className="mt-8 flex justify-center">
        <TrustScoreGauge score={token.trust_score} size="xl" />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <Stat label="Status" value={token.claim_status} />
        <Stat label="Mint" value={token.is_mint_disabled ? "Disabled" : "Enabled"} />
        <Stat label="Freeze" value={token.is_freeze_disabled ? "Disabled" : "Enabled"} />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          <Twitter className="h-4 w-4" />
          Share on Twitter
        </a>
        <a href={solscanUrl("address", params.address)} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          View on Solscan
        </a>
        <a href={url} className="btn-secondary">
          <Share2 className="h-4 w-4" />
          Copy link
        </a>
      </div>

      <div className="mt-12 text-xs text-text-muted">
        Verification provided by SolVerify • {APP_URL}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-3">
      <div className="text-xs uppercase text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold capitalize">{value}</div>
    </div>
  );
}
