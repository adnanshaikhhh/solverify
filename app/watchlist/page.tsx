"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Trash2, ExternalLink, AlertCircle, Wallet, ArrowRight } from "lucide-react";
import { formatUsd, cn } from "@/lib/utils";
import { Sparkline } from "@/components/feed/LiveFeed";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";

interface WatchedToken {
  address: string;
  data: any | null;
  loading: boolean;
  error?: string;
}

export default function WatchlistPage() {
  const [list, setList] = useState<string[]>([]);
  const [tokens, setTokens] = useState<Map<string, WatchedToken>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = JSON.parse(localStorage.getItem("solverify_watchlist") || "[]") as string[];
    setList(stored);
    const map = new Map<string, WatchedToken>();
    stored.forEach((a) => map.set(a, { address: a, data: null, loading: true }));
    setTokens(map);

    // Fetch each
    stored.forEach(async (address) => {
      try {
        const r = await fetch(`/api/token/${address}/live`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          setTokens((prev) => {
            const next = new Map(prev);
            next.set(address, { address, data: j, loading: false });
            return next;
          });
        } else {
          setTokens((prev) => {
            const next = new Map(prev);
            next.set(address, { address, data: null, loading: false, error: "Could not load" });
            return next;
          });
        }
      } catch {
        setTokens((prev) => {
          const next = new Map(prev);
          next.set(address, { address, data: null, loading: false, error: "Network error" });
          return next;
        });
      }
    });
  }, []);

  const remove = (address: string) => {
    if (typeof window === "undefined") return;
    const next = list.filter((a) => a !== address);
    setList(next);
    localStorage.setItem("solverify_watchlist", JSON.stringify(next));
    setTokens((prev) => {
      const m = new Map(prev);
      m.delete(address);
      return m;
    });
    window.dispatchEvent(new Event("solverify_watchlist_changed"));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Star className="h-7 w-7 text-gold" />
            Watchlist
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Tokens you&apos;re tracking. Stored locally in your browser — no account needed.
          </p>
        </div>
        <Link href="/search" className="btn-primary">
          Add Tokens
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-bg-card/40 p-12 text-center">
          <Star className="mx-auto h-10 w-10 text-text-muted" />
          <h2 className="mt-4 text-lg font-semibold">No tokens yet</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Click the star icon on any token to add it here. Watch live prices, trust scores, and 24h changes in one place.
          </p>
          <Link href="/search" className="btn-primary mt-4 inline-flex">
            Browse Tokens
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((addr) => {
            const t = tokens.get(addr);
            if (!t) return null;
            if (t.loading) {
              return (
                <div key={addr} className="glass-card animate-pulse">
                  <div className="h-24" />
                </div>
              );
            }
            if (t.error || !t.data) {
              return (
                <div key={addr} className="glass-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-text-muted">{addr.slice(0, 8)}…{addr.slice(-4)}</span>
                    <button onClick={() => remove(addr)} className="text-text-muted hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="text-sm text-text-muted flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> {t.error || "No data"}
                  </div>
                </div>
              );
            }
            const token = t.data.token;
            const positive = (token.change_24h ?? 0) >= 0;
            return (
              <div key={addr} className="glass-card relative group">
                <Link href={`/token/${addr}`} className="block">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-bg-elevated ring-1 ring-border-subtle">
                      {token.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={token.logo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-text-muted">
                          {(token.symbol || "?").slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{token.name || "Unknown"}</div>
                      <div className="text-xs text-text-muted">${token.symbol}</div>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(addr); }}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-opacity"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="font-mono text-sm font-semibold">{formatUsd(token.price_usd, { compact: false })}</div>
                      <div className={cn("text-xs font-mono", positive ? "text-safu" : "text-danger")}>
                        {token.change_24h != null ? `${token.change_24h >= 0 ? "+" : ""}${token.change_24h.toFixed(2)}%` : "—"}
                      </div>
                    </div>
                    <Sparkline prices={token.sparkline_7d} positive={positive} />
                  </div>
                  {token.solverify?.in_db && token.solverify.trust_score != null && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      <span className="font-mono font-bold text-safu">{token.solverify.trust_score}</span>
                      <span className="text-text-muted">{token.solverify.grade}</span>
                    </div>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
