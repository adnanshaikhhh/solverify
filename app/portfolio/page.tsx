"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet, Loader2, AlertCircle, ExternalLink, Shield } from "lucide-react";
import { isValidSolanaAddress } from "@/lib/solana";
import { formatUsd, cn, formatNumber } from "@/lib/utils";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";
import { GlassCard } from "@/components/ui/GlassCard";

interface PortfolioToken {
  mint: string;
  amount: number;
  usd_value: number | null;
  price_usd: number | null;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  trust_score: number | null;
  grade: string | null;
}

export default function PortfolioPage() {
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<PortfolioToken[] | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);

  const load = async () => {
    setError(null);
    if (!isValidSolanaAddress(wallet)) {
      setError("Invalid Solana wallet address");
      return;
    }
    setLoading(true);
    setTokens(null);
    try {
      // Free public endpoint: Birdeye-free via gmgn.ai public path
      // Use Helius-style: just RPC getTokenAccountsByOwner via gmgn public
      const res = await fetch(`/api/portfolio/${wallet}`);
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Failed to load portfolio");
      } else {
        setTokens(j.tokens || []);
        setSolBalance(j.sol_balance);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const total = tokens?.reduce((s, t) => s + (t.usd_value || 0), 0) || 0;
  const totalTrust = tokens?.filter((t) => t.trust_score != null).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Wallet className="h-7 w-7 text-brand" />
          Portfolio Trust Report
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Paste any Solana wallet address. We&apos;ll show every token you hold, its current value, and its SolVerify trust score.
        </p>
      </div>

      <GlassCard>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value.trim())}
            placeholder="Paste a Solana wallet address (e.g. 7xKDR9dDiVdQ8kBgs9HrG4Z5N9wFbCL1YsCwf4YHtkXR)"
            className="input flex-1 font-mono"
          />
          <button onClick={load} disabled={loading || !wallet} className="btn-primary whitespace-nowrap">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            {loading ? "Scanning..." : "Scan Wallet"}
          </button>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Powered by public Solana RPC + GeckoTerminal price feeds. No account required.
        </p>
      </GlassCard>

      {error && (
        <GlassCard>
          <div className="flex items-center gap-2 text-danger">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </GlassCard>
      )}

      {tokens && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Tokens Held" value={String(tokens.length)} />
            <Stat label="SOL Balance" value={solBalance != null ? `${solBalance.toFixed(4)} SOL` : "—"} />
            <Stat label="Estimated Value" value={formatUsd(total, { compact: true })} />
            <Stat label="Verified Tokens" value={`${totalTrust}/${tokens.length}`} />
          </div>

          {tokens.length === 0 ? (
            <GlassCard>
              <p className="text-sm text-text-muted">No SPL tokens found in this wallet.</p>
            </GlassCard>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-3 py-3 text-left">Token</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-3 py-3 text-right">Price</th>
                    <th className="px-3 py-3 text-right hidden md:table-cell">Value</th>
                    <th className="px-3 py-3 text-center">Trust</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t) => (
                    <tr key={t.mint} className="border-b border-border-subtle/50 hover:bg-bg-card-hover">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 overflow-hidden rounded-full bg-bg-elevated">
                            {t.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={t.logo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-text-muted">
                                {(t.symbol || "?").slice(0, 2)}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold">{t.name || "Unknown"}</div>
                            <div className="text-xs text-text-muted">${t.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">{formatNumber(t.amount)}</td>
                      <td className="px-3 py-3 text-right font-mono">{t.price_usd ? formatUsd(t.price_usd) : "—"}</td>
                      <td className="px-3 py-3 text-right font-mono hidden md:table-cell">{t.usd_value ? formatUsd(t.usd_value) : "—"}</td>
                      <td className="px-3 py-3 text-center">
                        {t.trust_score != null ? (
                          <span className="rounded-full border border-safu/30 bg-safu/10 px-2 py-0.5 text-xs font-mono font-bold text-safu">
                            {t.trust_score}
                          </span>
                        ) : (
                          <span className="rounded-full border border-border-subtle bg-bg-elevated px-2 py-0.5 text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/token/${t.mint}`} className="text-text-muted hover:text-text-primary">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card">
      <div className="text-xs uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
    </div>
  );
}
