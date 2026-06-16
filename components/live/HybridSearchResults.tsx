"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, AlertCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatUsd } from "@/lib/utils";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { RugRiskBadge, type RugLevel } from "@/components/safety/RugRiskBadge";
import { truncateAddress } from "@/lib/utils";

interface SearchResult {
  address: string;
  symbol: string;
  name: string;
  logo: string | null;
  source: "db" | "dexscreener";
  trustScore: number | null;
  tier: string | null;
  priceUsd: number | null;
  volume24h: number | null;
}

interface HybridSearchResultsProps {
  query: string;
  initial?: SearchResult[];
}

export function HybridSearchResults({ query, initial }: HybridSearchResultsProps) {
  const [results, setResults] = useState<SearchResult[] | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query) { setResults(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data = await res.json();
        if (!cancelled) setResults(data.results || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300); // 300ms debounce
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  if (!query) return null;
  if (loading && !results) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-card" />)}
      </div>
    );
  }
  if (error) {
    return <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</div>;
  }
  if (!results || results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-subtle p-12 text-center">
        <Search className="mx-auto h-8 w-8 text-text-muted" />
        <p className="mt-3 text-text-secondary">No tokens found for &ldquo;{query}&rdquo;</p>
        <p className="mt-1 text-sm text-text-muted">Try a different search, or paste a Solana contract address.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border-subtle">
      <table className="w-full text-sm">
        <thead className="bg-bg-card/60 text-xs uppercase text-text-muted">
          <tr>
            <th className="px-3 py-2 text-left">Token</th>
            <th className="px-3 py-2 text-right">Price</th>
            <th className="px-3 py-2 text-right">Volume 24h</th>
            <th className="px-3 py-2 text-center">Source</th>
            <th className="px-3 py-2 text-center">SolVerify</th>
            <th className="px-3 py-2 text-center"></th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.address} className="border-t border-border-subtle/50 hover:bg-bg-card/40">
              <td className="px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-bg-elevated ring-1 ring-border-subtle">
                    {r.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.logo} alt={r.symbol} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-text-muted">
                        {r.symbol.slice(0, 3).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold">
                      {r.symbol}
                      {r.source === "db" && r.tier && r.tier !== "none" && (
                        <VerificationBadge tier={r.tier as any} status="claimed" size="sm" />
                      )}
                    </div>
                    <div className="text-xs text-text-muted">{r.name}</div>
                    <div className="font-mono text-[10px] text-text-muted">{truncateAddress(r.address, 4, 4)}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-right font-mono text-sm">{r.priceUsd != null ? formatUsd(r.priceUsd) : "—"}</td>
              <td className="px-3 py-3 text-right font-mono text-sm">{r.volume24h ? formatUsd(r.volume24h, { compact: true }) : "—"}</td>
              <td className="px-3 py-3 text-center">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                  r.source === "db"
                    ? "border-safu/30 bg-safu/10 text-safu"
                    : "border-trusted/30 bg-trusted/10 text-trusted"
                }`}>
                  {r.source === "db" ? <Sparkles className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {r.source === "db" ? "SolVerify" : "DexScreener"}
                </span>
              </td>
              <td className="px-3 py-3 text-center">
                {r.source === "db" && r.trustScore != null ? (
                  <span className="font-mono font-bold text-safu">{r.trustScore}</span>
                ) : (
                  <span className="text-xs text-text-muted">Not verified</span>
                )}
              </td>
              <td className="px-3 py-3 text-center">
                {r.source === "dexscreener" ? (
                  <Link
                    href={`/claim?address=${r.address}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand/15 px-2 py-1 text-xs font-medium text-brand hover:bg-brand/25"
                  >
                    Claim this token
                  </Link>
                ) : (
                  <Link
                    href={`/token/${r.address}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-active bg-bg-elevated px-2 py-1 text-xs hover:border-border-glow"
                  >
                    View
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
