"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ShieldAlert, Wallet, Upload, ArrowRight, Check } from "lucide-react";
import { isValidSolanaAddress } from "@/lib/solana";
import bs58 from "bs58";
import { TierComparison } from "./TierComparison";

interface Step1Props { address: string; setAddress: (v: string) => void }
function Step1({ address, setAddress }: Step1Props) {
  const valid = address.length === 0 || isValidSolanaAddress(address);
  return (
    <div>
      <h2 className="text-xl font-semibold">Step 1 — Token Contract Address</h2>
      <p className="mt-1 text-sm text-text-secondary">Paste the Solana mint address of the token you want to claim.</p>
      <div className="mt-4">
        <input
          className="input font-mono"
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          placeholder="e.g. DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
        />
        {!valid && (
          <p className="mt-1 text-sm text-danger">Not a valid Solana address</p>
        )}
      </div>
    </div>
  );
}

interface Step2Props {
  address: string;
  onMatch: (data: any) => void;
  tokenInfo: any;
}
function Step2({ onMatch, tokenInfo }: Step2Props) {
  const { isConnected, wallet, signIn, connect } = useWallet();
  const { pushToast } = useUiStore();
  const [checking, setChecking] = useState(false);
  const [match, setMatch] = useState<null | { isCreator: boolean; method: string | null }>(null);

  const check = async () => {
    if (!isConnected) {
      const ok = await signIn();
      if (!ok) return;
    }
    setChecking(true);
    try {
      // We need to look up the token first; assume it exists in DB
      const lookup = await fetch(`/api/tokens/${encodeURIComponent(tokenInfo.address)}`);
      if (lookup.ok) {
        const data = (await lookup.json()) as { token: any };
        const t = data.token;
        setMatch({
          isCreator: t.owner_wallet === wallet || t.update_authority === wallet,
          method: t.owner_wallet === wallet ? "creator_wallet" : t.update_authority === wallet ? "update_authority" : null,
        });
        onMatch({ token: t });
      } else {
        pushToast({ kind: "info", message: "Token not in our database yet. We'll auto-index it on first signature." });
        onMatch({ token: { contract_address: tokenInfo.address } });
      }
    } catch (e) {
      pushToast({ kind: "error", message: "Lookup failed" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold">Step 2 — Connect &amp; Verify</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Connect your wallet. If it matches the creator or update authority of this token, you&apos;ll be auto-approved.
      </p>
      <div className="mt-4 flex flex-col items-start gap-3">
        {isConnected ? (
          <div className="rounded-xl border border-safu/30 bg-safu/10 px-4 py-2 text-sm text-safu">
            Connected: {wallet?.slice(0, 6)}...{wallet?.slice(-4)}
          </div>
        ) : (
          <button onClick={() => signIn()} className="btn-primary">
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </button>
        )}
        <button onClick={check} disabled={!isConnected || checking} className="btn-secondary">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Check Match
        </button>
        {match && (
          <div className={`rounded-xl border p-3 text-sm ${match.isCreator ? "border-safu/30 bg-safu/10 text-safu" : "border-caution/30 bg-caution/10 text-caution"}`}>
            {match.isCreator ? (
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Matched via {match.method} — auto-approve available</span>
            ) : (
              <span className="flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> No match — claim will queue for admin review</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Step3({ address, claimMethod, onSubmit }: { address: string; claimMethod: string; onSubmit: () => Promise<void> }) {
  const { wallet } = useAuthStore();
  const { pushToast } = useUiStore();
  const [signing, setSigning] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const sign = async () => {
    if (!wallet || typeof window === "undefined") return;
    setSigning(true);
    try {
      // 1) Get challenge
      const chRes = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      if (!chRes.ok) throw new Error("Challenge failed");
      const { message, nonce } = (await chRes.json()) as { message: string; nonce: string };
      // 2) Sign
      const provider =
        window.solana?.isPhantom ? window.solana :
        window.backpack?.isBackpack ? window.backpack :
        window.solflare?.isSolflare ? window.solflare : null;
      if (!provider) throw new Error("Wallet provider missing");
      const enc = new TextEncoder().encode(message);
      const sig = await provider.signMessage(enc, "utf8");
      const signature = bs58.encode(sig.signature);
      // 3) Submit claim
      const claimRes = await fetch(`/api/claim/${address}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, message, claim_method: claimMethod, tier: "bronze" }),
      });
      if (!claimRes.ok) {
        const j = (await claimRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Claim failed");
      }
      const data = (await claimRes.json()) as { status: string };
      pushToast({
        kind: data.status === "approved" ? "success" : "info",
        message: data.status === "approved" ? "Claim approved!" : "Claim queued for review",
      });
      setSubmitted(true);
      await onSubmit();
    } catch (e) {
      pushToast({ kind: "error", message: e instanceof Error ? e.message : "Sign failed" });
    } finally {
      setSigning(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold">Step 3 — Sign Message</h2>
      <p className="mt-1 text-sm text-text-secondary">Sign the verification message to prove wallet ownership. This is a free, off-chain signature — no SOL is spent.</p>
      <div className="mt-4">
        <button
          onClick={sign}
          disabled={signing || submitted}
          className="btn-primary"
        >
          {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {submitted ? "Submitted ✓" : "Sign &amp; Submit Claim"}
        </button>
      </div>
    </div>
  );
}

function Step4({ address }: { address: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Step 4 — Choose Your Tier</h2>
      <p className="mt-1 text-sm text-text-secondary">Bronze is free. Silver and Gold add link scanning, priority ranking, and more.</p>
      <div className="mt-4">
        <TierComparison />
      </div>
    </div>
  );
}

function Step5({ address }: { address: string }) {
  const router = useRouter();
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-safu/20 text-safu">
        <Check className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-2xl font-bold">Claim submitted!</h2>
      <p className="mt-2 text-text-secondary">Your token has been queued. Redirecting to your profile...</p>
      <button onClick={() => router.push(`/token/${address}`)} className="btn-primary mt-6">
        Go to Token <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ClaimWizard(props: { initialAddress?: string } = {}) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState(props.initialAddress || "");
  const [tokenInfo, setTokenInfo] = useState<any>({ address: props.initialAddress || "" });
  const [claimMethod, setClaimMethod] = useState("creator_wallet");

  const next = () => setStep((s) => Math.min(5, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
              step >= n ? "border-brand bg-brand/20 text-brand" : "border-border-subtle text-text-muted"
            }`}
          >
            {n}
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        {step === 1 && <Step1 address={address} setAddress={(v) => { setAddress(v); setTokenInfo({ address: v }); }} />}
        {step === 2 && <Step2 address={address} tokenInfo={tokenInfo} onMatch={(d) => { setTokenInfo((p: any) => ({ ...p, ...d })); if (d.token?.owner_wallet) setClaimMethod("creator_wallet"); }} />}
        {step === 3 && <Step3 address={address} claimMethod={claimMethod} onSubmit={async () => { next(); }} />}
        {step === 4 && <Step4 address={address} />}
        {step === 5 && <Step5 address={address} />}
      </div>

      <div className="flex justify-between">
        <button onClick={back} disabled={step === 1 || step === 5} className="btn-secondary">Back</button>
        <button
          onClick={next}
          disabled={
            step === 5 ||
            (step === 1 && !isValidSolanaAddress(address))
          }
          className="btn-primary"
        >
          Next <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
