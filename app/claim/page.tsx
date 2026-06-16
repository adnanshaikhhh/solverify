"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Sparkles, Check, ArrowRight, Wallet, FileCheck, Search, Award, ExternalLink, Mail, Twitter } from "lucide-react";
import { TierComparison } from "@/components/verification/TierComparison";
import { useSearchParams, useRouter } from "next/navigation";
import { isValidSolanaAddress } from "@/lib/solana";
import { Suspense } from "react";

function ClaimInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const initial = sp.get("address") || "";
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState(initial);
  const [autoToken, setAutoToken] = useState<any>(null);
  const [showTour, setShowTour] = useState(true);

  useEffect(() => {
    if (initial && initial !== address) {
      setAddress(initial);
    }
  }, [initial, address]);

  // Auto-lookup if address provided
  useEffect(() => {
    if (isValidSolanaAddress(address)) {
      fetch(`/api/token/${address}/live`)
        .then((r) => r.ok ? r.json() : null)
        .then(setAutoToken)
        .catch(() => null);
    } else {
      setAutoToken(null);
    }
  }, [address]);

  const setAddr = (a: string) => {
    setAddress(a);
    if (a) {
      router.replace(`/claim?address=${a}`);
    } else {
      router.replace(`/claim`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Onboarding tour banner (dismissible) */}
      {showTour && (
        <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/15 via-brand/5 to-transparent p-5">
          <button
            onClick={() => setShowTour(false)}
            className="absolute right-2 top-2 rounded p-1 text-text-muted hover:bg-bg-elevated"
            aria-label="Dismiss"
          >
            ×
          </button>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            How SolVerify works
          </div>
          <h2 className="mt-2 text-2xl font-bold">3 steps to your trust badge</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <TourStep
              n={1}
              icon={<Search className="h-5 w-5" />}
              title="Paste your token address"
              desc="We auto-fetch on-chain data: mint authority, freeze authority, top holders."
            />
            <TourStep
              n={2}
              icon={<Wallet className="h-5 w-5" />}
              title="Sign with your wallet"
              desc="Free, off-chain signature. No SOL is spent. Proves you control the wallet."
            />
            <TourStep
              n={3}
              icon={<Award className="h-5 w-5" />}
              title="Get verified"
              desc="If your wallet is the creator or update authority, you&apos;re auto-approved. Optional Silver ($30) or Gold ($60) for full trust."
            />
          </div>
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm">
            <div className="flex items-center gap-2 text-danger">
              <Shield className="h-4 w-4" />
              <strong>vs DexScreener:</strong>
            </div>
            <p className="mt-1 text-text-secondary">
              DexScreener Enhanced Info costs <span className="line-through text-text-muted">$299-$499</span>. SolVerify Gold is <strong className="text-safu">$60</strong> — same trust signal, 80% less.
            </p>
          </div>
        </div>
      )}

      {/* Token address input */}
      <div className="rounded-2xl border border-border-subtle bg-bg-card p-5">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Token contract address</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={address}
            onChange={(e) => setAddr(e.target.value.trim())}
            placeholder="Paste a Solana token address (e.g. DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263)"
            className="input flex-1 font-mono"
          />
        </div>
        {autoToken && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-safu/30 bg-safu/5 p-3">
            {autoToken.token.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={autoToken.token.logo_url} alt="" className="h-10 w-10 rounded-full" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-bg-elevated" />
            )}
            <div className="flex-1">
              <div className="font-semibold">{autoToken.token.name || "Unknown"}</div>
              <div className="text-xs text-text-muted">${autoToken.token.symbol} · {address.slice(0, 8)}…{address.slice(-4)}</div>
            </div>
            <div className="text-right">
              {autoToken.token.solverify?.in_db ? (
                <span className="rounded-full border border-caution/30 bg-caution/10 px-2 py-0.5 text-xs text-caution">
                  Already claimed
                </span>
              ) : (
                <span className="rounded-full border border-safu/30 bg-safu/10 px-2 py-0.5 text-xs text-safu">
                  Ready to claim
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tier comparison */}
      <TierComparison />

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href={`/airdrop-check?token=${address || "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}`} className="btn-secondary">
          <Search className="h-4 w-4" />
          Check a token first
        </Link>
        <a href="/docs" className="btn-ghost">
          <FileCheck className="h-4 w-4" />
          API docs
        </a>
      </div>

      {/* FAQ-style: how does it work */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border-subtle bg-bg-card p-5">
          <h3 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-safu" /> No email, no password</h3>
          <p className="mt-2 text-sm text-text-secondary">
            You authenticate by signing a message with your Solana wallet. We never see your private key, never hold any funds.
          </p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-bg-card p-5">
          <h3 className="font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-gold" /> What does Gold include?</h3>
          <ul className="mt-2 space-y-1 text-sm text-text-secondary">
            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-safu" /> Full link safety scan (3 providers)</li>
            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-safu" /> Trust score 90-100 (maximum)</li>
            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-safu" /> Embeddable trust badge for your site</li>
            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-safu" /> API key (10K requests/hour)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function TourStep({ n, icon, title, desc }: { n: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated/50 p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20 text-brand">
          {icon}
        </div>
        <span className="text-xs font-mono text-text-muted">Step {n}</span>
      </div>
      <h4 className="mt-2 font-semibold text-sm">{title}</h4>
      <p className="mt-1 text-xs text-text-secondary">{desc}</p>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="text-text-muted">Loading...</div>}>
      <ClaimInner />
    </Suspense>
  );
}
