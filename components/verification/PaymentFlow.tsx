"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Copy, ExternalLink, Wallet } from "lucide-react";
import { usePayment } from "@/hooks/usePayment";
import { useUiStore } from "@/store/uiStore";
import { useWallet } from "@/hooks/useWallet";
import { GlassCard } from "@/components/ui/GlassCard";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { PAYMENT_WALLET, SILVER_PRICE_USD, GOLD_PRICE_USD } from "@/lib/constants";

interface PaymentFlowProps {
  tokenId: string;
  tier: "silver" | "gold";
  onCompleted?: () => void;
}

export function PaymentFlow({ tokenId, tier, onCompleted }: PaymentFlowProps) {
  const { pushToast } = useUiStore();
  const { isConnected, signIn } = useWallet();
  const { paymentId, solAmount, solPrice, status, fetchSolPrice, initiate, poll } = usePayment();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSolPrice();
  }, [fetchSolPrice]);

  useEffect(() => {
    if (!paymentId) return;
    if (status === "confirmed" || status === "failed") return;
    const iv = setInterval(() => poll(), 30_000);
    return () => clearInterval(iv);
  }, [paymentId, status, poll]);

  useEffect(() => {
    if (status === "confirmed") onCompleted?.();
  }, [status, onCompleted]);

  const start = async () => {
    if (!isConnected) {
      const ok = await signIn();
      if (!ok) return;
    }
    const data = await initiate(tokenId, tier);
    if (!data) return;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_WALLET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* noop */ }
  };

  const priceUsd = tier === "silver" ? SILVER_PRICE_USD : GOLD_PRICE_USD;
  const displaySol = solAmount ?? (solPrice ? priceUsd / solPrice : 0);

  if (status === "confirmed") {
    return (
      <GlassCard className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-safu" />
        <h3 className="mt-4 text-2xl font-bold">Payment confirmed!</h3>
        <p className="mt-2 text-text-secondary">Your tier has been upgraded.</p>
      </GlassCard>
    );
  }

  if (!paymentId) {
    return (
      <GlassCard>
        <h3 className="text-lg font-semibold">Upgrade to {tier === "gold" ? "Gold" : "Silver"}</h3>
        <p className="mt-1 text-sm text-text-secondary">Pay ${priceUsd} USD worth of SOL from your wallet.</p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Price</span>
            <span className="font-mono">${priceUsd}.00 USD</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">SOL price</span>
            <span className="font-mono">{solPrice ? `$${solPrice.toFixed(2)}` : "—"}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border-subtle pt-2 text-base font-semibold">
            <span>You send</span>
            <span className="font-mono">{displaySol.toFixed(4)} SOL</span>
          </div>
        </div>
        <button onClick={start} className="btn-primary mt-6 w-full">
          <Wallet className="h-4 w-4" />
          Continue
        </button>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h3 className="text-lg font-semibold">Send {displaySol.toFixed(4)} SOL to</h3>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-elevated p-3">
        <code className="flex-1 truncate font-mono text-sm">{PAYMENT_WALLET}</code>
        <button onClick={copy} className="rounded-md p-1.5 text-text-muted hover:bg-bg-base">
          {copied ? <CheckCircle2 className="h-4 w-4 text-safu" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Waiting for payment confirmation... (we poll every 30s)
      </div>
      <p className="mt-3 text-xs text-text-muted">
        This page will update automatically once your payment is confirmed on-chain.
      </p>
    </GlassCard>
  );
}
