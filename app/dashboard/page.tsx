"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { TokenGrid } from "@/components/token/TokenGrid";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Wallet, ArrowRight } from "lucide-react";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";

export default function DashboardPage() {
  const router = useRouter();
  const { wallet, ready } = useAuthStore();
  const [tokens, setTokens] = useState<any[] | null>(null);
  const [payments, setPayments] = useState<any[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!wallet) {
      router.push("/");
      return;
    }
    // Fetch tokens owned by this wallet — we don't have a direct endpoint, so we filter from /api/tokens
    // For MVP: just show all owned
    fetch(`/api/tokens?limit=100`)
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((d) => {
        const owned = (d.data || []).filter((t: any) => t.owner_wallet === wallet);
        setTokens(owned);
      })
      .catch(() => setTokens([]));
  }, [ready, wallet, router]);

  if (!ready) return <LoadingSkeleton className="h-32" />;
  if (!wallet) {
    return (
      <GlassCard className="text-center">
        <Wallet className="mx-auto h-10 w-10 text-text-muted" />
        <h2 className="mt-4 text-xl font-semibold">Sign in to view your dashboard</h2>
        <p className="mt-2 text-sm text-text-secondary">Connect your wallet from the top right.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage your claimed tokens, payments, and API keys.</p>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Tokens</h2>
          <a href="/claim" className="text-sm text-brand hover:underline flex items-center gap-1">
            Claim new token <ArrowRight className="h-3 w-3" />
          </a>
        </div>
        {tokens === null ? (
          <LoadingSkeleton count={3} className="h-32" />
        ) : tokens.length === 0 ? (
          <GlassCard>
            <p className="text-text-secondary">You have&rsquo;t claimed any tokens yet.</p>
          </GlassCard>
        ) : (
          <TokenGrid tokens={tokens} />
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">API Keys</h2>
        <GlassCard>
          <p className="text-text-secondary">Gold-tier owners can generate API keys for programmatic access.</p>
          <a href="/docs" className="mt-2 inline-block text-sm text-brand hover:underline">Learn more →</a>
        </GlassCard>
      </section>
    </div>
  );
}
