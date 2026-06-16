"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Gift, Shield, AlertTriangle, Search, Check, ArrowRight, Share2, Twitter } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { isValidSolanaAddress } from "@/lib/solana";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";

function AirdropInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const initial = sp.get("token") || "";
  const [address, setAddress] = useState(initial);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!address || !isValidSolanaAddress(address)) {
      setData(null);
      return;
    }
    setLoading(true);
    setScanned(true);
    fetch(`/api/token/${address}/live`)
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
  }, [address]);

  const setAddr = (a: string) => {
    setAddress(a);
    router.replace(`/airdrop-check?token=${a}`);
  };

  const risk = data?.risk;
  const token = data?.token;
  const tier = token?.solverify?.verification_tier;
  const score = token?.solverify?.trust_score;

  const verdict = !data ? null :
    risk?.level === "high" ? { label: "DANGEROUS", color: "danger", sub: "Multiple severe on-chain risks. Do not interact with this airdrop." } :
    risk?.level === "caution" ? { label: "CAUTION", color: "caution", sub: "Some concerns. Claim only if you understand the risks." } :
    score != null && score >= 75 ? { label: "LIKELY SAFE", color: "safu", sub: "High trust score. Project is verified on SolVerify." } :
    score != null && score >= 55 ? { label: "PROCEED CAREFULLY", color: "caution", sub: "Moderate trust. Verify the source before claiming." } :
    { label: "UNVERIFIED", color: "text-muted", sub: "Token is not yet verified on SolVerify. Proceed at your own risk." };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/20 text-brand">
          <Gift className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-3xl font-bold">Airdrop Trust Check</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Paste any Solana token address. We&apos;ll scan the on-chain risk signals and trust score before you claim.
        </p>
      </div>

      <GlassCard>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={address}
            onChange={(e) => setAddr(e.target.value.trim())}
            placeholder="Token contract address"
            className="input flex-1 font-mono"
          />
        </div>
        <p className="mt-2 text-xs text-text-muted">
          We check mint authority, freeze authority, holder concentration, and SolVerify trust score — all without connecting your wallet.
        </p>
      </GlassCard>

      {loading && <GlassCard><p className="text-text-muted text-sm">Scanning...</p></GlassCard>}

      {verdict && token && (
        <>
          <div className={`rounded-2xl border p-6 ${
            verdict.color === "danger" ? "border-danger/40 bg-danger/5" :
            verdict.color === "caution" ? "border-caution/40 bg-caution/5" :
            verdict.color === "safu" ? "border-safu/40 bg-safu/5" :
            "border-border-subtle bg-bg-card"
          }`}>
            <div className="flex items-center gap-3">
              {verdict.color === "danger" ? <AlertTriangle className="h-8 w-8 text-danger" /> :
               verdict.color === "safu" ? <Check className="h-8 w-8 text-safu" /> :
               <Shield className="h-8 w-8 text-caution" />}
              <div>
                <div className={`text-xs uppercase tracking-wider ${
                  verdict.color === "danger" ? "text-danger" :
                  verdict.color === "caution" ? "text-caution" :
                  verdict.color === "safu" ? "text-safu" : "text-text-muted"
                }`}>Airdrop Verdict</div>
                <div className="text-2xl font-bold">{verdict.label}</div>
                <div className="mt-1 text-sm text-text-secondary">{verdict.sub}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <GlassCard>
              <div className="text-xs uppercase tracking-wider text-text-muted">Token</div>
              <div className="mt-2 flex items-center gap-2">
                {token.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={token.logo_url} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-bg-elevated flex items-center justify-center text-xs font-bold text-text-muted">
                    {(token.symbol || "?").slice(0, 2)}
                  </div>
                )}
                <div>
                  <div className="font-semibold">{token.name || "Unknown"}</div>
                  <div className="text-xs text-text-muted">${token.symbol}</div>
                </div>
              </div>
              <div className="mt-3 font-mono text-xs text-text-secondary truncate">{token.address}</div>
            </GlassCard>

            <GlassCard>
              <div className="text-xs uppercase tracking-wider text-text-muted">Trust Score</div>
              {score != null ? (
                <div className="mt-2 flex justify-center">
                  <TrustScoreGauge score={score} size="md" />
                </div>
              ) : (
                <div className="mt-2 text-center text-text-muted">Not verified</div>
              )}
            </GlassCard>

            <GlassCard>
              <div className="text-xs uppercase tracking-wider text-text-muted">On-Chain Checks</div>
              <div className="mt-2 space-y-1.5 text-sm">
                <CheckRow ok={!risk?.flags?.find((f: string) => f.includes("Mint"))} label="Mint authority disabled" />
                <CheckRow ok={!risk?.flags?.find((f: string) => f.includes("Freeze"))} label="Freeze authority disabled" />
                <CheckRow ok={!risk?.flags?.find((f: string) => f.includes("Top 3"))} label="Top 3 holders healthy" />
                <CheckRow ok={score != null && score >= 75} label="SolVerify trust score ≥ 75" />
              </div>
            </GlassCard>
          </div>

          {verdict.color === "danger" && (
            <GlassCard>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-danger">⚠ Specific risks found</h3>
              <ul className="mt-3 space-y-1.5 text-sm">
                {risk?.flags?.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href={`/token/${address}`} className="btn-primary">
              View Full Trust Report <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `Airdrop Trust Check — ${token.name || token.symbol}`,
                    text: verdict.label,
                    url: window.location.href,
                  }).catch(() => null);
                } else {
                  navigator.clipboard.writeText(window.location.href).catch(() => null);
                  alert("Link copied");
                }
              }}
              className="btn-secondary"
            >
              <Share2 className="h-4 w-4" /> Share Check
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${verdict.label}: ${token.name || token.symbol}\nAirdrop trust check: ${window.location.href}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="btn-secondary"
            >
              <Twitter className="h-4 w-4" /> Tweet
            </a>
          </div>

          <p className="text-center text-xs text-text-muted">
            Share this link with your community. The URL updates with the verdict so others can see the result.
          </p>
        </>
      )}

      {!scanned && (
        <GlassCard>
          <p className="text-sm text-text-secondary text-center">
            Try: <button onClick={() => setAddr("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")} className="text-brand hover:underline">Bonk</button>,{" "}
            <button onClick={() => setAddr("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN")} className="text-brand hover:underline">Jupiter</button>, or paste any airdrop address above.
          </p>
        </GlassCard>
      )}
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? <Check className="h-4 w-4 text-safu" /> : <AlertTriangle className="h-4 w-4 text-danger" />}
      <span className={ok ? "text-text-primary" : "text-danger"}>{label}</span>
    </div>
  );
}

export default function AirdropCheckPage() {
  return (
    <Suspense fallback={<div className="text-text-muted">Loading...</div>}>
      <AirdropInner />
    </Suspense>
  );
}
