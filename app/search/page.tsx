"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import Link from "next/link";
import { SearchBar } from "@/components/search/SearchBar";
import { formatUsd } from "@/lib/utils";
import { Sparkline } from "@/components/feed/LiveFeed";

interface DbHit {
  id: string;
  contract_address: string;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  verification_tier: string;
  claim_status: string;
  trust_score: number;
  community_vouches: number;
}

interface LiveHit {
  address: string;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  price_usd: number | null;
  change_24h: number | null;
  volume_24h: number | null;
  liquidity_usd: number | null;
  market_cap: number | null;
  sparkline_7d: number[] | null;
  solverify: { in_db: boolean; verification_tier: string | null; trust_score: number | null; };
}

function SearchPageInner() {
  const sp = useSearchParams();
  const q = sp.get("q") || "";
  const [dbHits, setDbHits] = useState<DbHit[]>([]);
  const [liveHits, setLiveHits] = useState<LiveHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) {
      setDbHits([]);
      setLiveHits([]);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.ok ? r.json() : { results: [], live: [] })
      .then((d) => {
        setDbHits(d.results || []);
        setLiveHits(d.live || []);
      })
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="mt-1 text-text-secondary">Search SolVerify + the entire Solana ecosystem in real time.</p>
      </div>
      <SearchBar initialQuery={q} autoFocus />

      {loading && <div className="text-text-muted">Searching...</div>}

      {/* SolVerify DB hits */}
      {dbHits.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">On SolVerify</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {dbHits.map((t) => (
              <Link
                key={t.id}
                href={`/token/${t.contract_address}`}
                className="glass-card flex items-center gap-3 p-4 hover:border-border-glow"
              >
                <div className="h-10 w-10 overflow-hidden rounded-full bg-bg-elevated">
                  {t.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-text-muted">
                      {(t.symbol || "?").slice(0, 2)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{t.name || "Unknown"}</div>
                  <div className="text-xs text-text-muted">${t.symbol} · Trust {t.trust_score}</div>
                </div>
                <span className="rounded-full border border-safu/30 bg-safu/10 px-2 py-0.5 text-xs font-mono font-bold text-safu">{t.trust_score}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Live hits */}
      {liveHits.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Live results</h2>
          <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-3 text-left">Token</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right">24h</th>
                  <th className="px-3 py-3 text-right hidden md:table-cell">Volume</th>
                  <th className="px-3 py-3 text-right hidden md:table-cell">Liquidity</th>
                  <th className="px-3 py-3 text-right hidden md:table-cell">7d</th>
                  <th className="px-3 py-3 text-center">Trust</th>
                </tr>
              </thead>
              <tbody>
                {liveHits.map((t) => {
                  const positive = (t.change_24h ?? 0) >= 0;
                  return (
                    <tr key={t.address} className="border-b border-border-subtle/50 hover:bg-bg-card-hover">
                      <td className="px-3 py-3">
                        <Link href={`/token/${t.address}`} className="flex items-center gap-2">
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
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm">
                        {t.price_usd ? formatUsd(t.price_usd, { compact: false }) : "—"}
                      </td>
                      <td className={"px-3 py-3 text-right font-mono text-sm " + (positive ? "text-safu" : "text-danger")}>
                        {t.change_24h != null ? `${t.change_24h >= 0 ? "+" : ""}${t.change_24h.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm hidden md:table-cell">
                        {t.volume_24h ? formatUsd(t.volume_24h, { compact: true }) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm hidden md:table-cell">
                        {t.liquidity_usd ? formatUsd(t.liquidity_usd, { compact: true }) : "—"}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <Sparkline prices={t.sparkline_7d} positive={positive} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {t.solverify.in_db ? (
                          <span className="rounded-full border border-safu/30 bg-safu/10 px-2 py-0.5 text-xs font-mono font-bold text-safu">
                            {t.solverify.trust_score}
                          </span>
                        ) : (
                          <span className="rounded-full border border-caution/30 bg-caution/10 px-2 py-0.5 text-xs text-caution">
                            Not verified
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && dbHits.length === 0 && liveHits.length === 0 && q && (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-bg-card/40 p-12 text-center">
          <p className="text-text-secondary">No results found for &quot;{q}&quot;</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-text-muted">Loading...</div>}>
      <SearchPageInner />
    </Suspense>
  );
}
