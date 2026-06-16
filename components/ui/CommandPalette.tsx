"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight, Hash, FileText, Shield, TrendingUp, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchHit {
  address: string;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  price_usd: number | null;
  change_24h: number | null;
  solverify: { in_db: boolean; verification_tier: string | null; trust_score: number | null };
}

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Sparkles, group: "Pages" },
  { href: "/search", label: "Search Tokens", icon: Search, group: "Pages" },
  { href: "/leaderboard", label: "Trust Leaderboard", icon: TrendingUp, group: "Pages" },
  { href: "/compare", label: "Compare Tokens", icon: ArrowRight, group: "Pages" },
  { href: "/claim", label: "Claim Your Token", icon: Shield, group: "Pages" },
  { href: "/portfolio", label: "My Portfolio", icon: FileText, group: "Pages" },
  { href: "/watchlist", label: "Watchlist", icon: Hash, group: "Pages" },
  { href: "/docs", label: "API Documentation", icon: FileText, group: "Pages" },
  { href: "/dashboard", label: "Dashboard", icon: FileText, group: "Pages" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQ("");
      setActive(0);
    }
  }, [open]);

  // Search w/ debounce
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.ok ? r.json() : { results: [], live: [] })
        .then((d) => {
          const merged: SearchHit[] = [
            ...(d.results || []).map((r: any) => ({
              address: r.contract_address,
              name: r.name, symbol: r.symbol, logo_url: r.logo_url,
              price_usd: null, change_24h: null,
              solverify: { in_db: true, verification_tier: r.verification_tier, trust_score: r.trust_score },
            })),
            ...(d.live || []).slice(0, 6).map((r: any) => ({
              address: r.address, name: r.name, symbol: r.symbol, logo_url: r.logo_url,
              price_usd: r.price_usd, change_24h: r.change_24h,
              solverify: r.solverify,
            })),
          ];
          setResults(merged);
          setActive(0);
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // Build the option list
  const options = useMemo(() => {
    const list: Array<{ type: string; label: string; sublabel?: string; href: string; icon: any; data?: any }> = [];
    if (q.trim()) {
      results.forEach((r) => {
        list.push({
          type: "token",
          label: `${r.name || r.symbol || "Unknown"} ($${r.symbol || "—"})`,
          sublabel: r.solverify.in_db ? `Trust ${r.solverify.trust_score}` : (r.price_usd ? `$${r.price_usd.toFixed(8)}` : "Live"),
          href: `/token/${r.address}`,
          icon: Hash,
          data: r,
        });
      });
    } else {
      NAV_ITEMS.forEach((n) => {
        list.push({ type: "nav", label: n.label, sublabel: "Page", href: n.href, icon: n.icon });
      });
    }
    return list;
  }, [q, results]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, options.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const opt = options[active];
        if (opt) {
          router.push(opt.href);
          setOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, options, active, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-bg-base/80 p-4 pt-[10vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border-active bg-bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tokens, pages…"
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          {q && (
            <button onClick={() => setQ("")} className="rounded p-1 text-text-muted hover:bg-bg-elevated">
              <X className="h-3 w-3" />
            </button>
          )}
          <kbd className="hidden rounded border border-border-subtle bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted sm:inline">Esc</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading && q && (
            <div className="px-3 py-6 text-center text-sm text-text-muted">Searching...</div>
          )}
          {!loading && options.length === 0 && q && (
            <div className="px-3 py-6 text-center text-sm text-text-muted">No results. Try a different search.</div>
          )}
          {!loading && options.length > 0 && (
            <>
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-text-muted">
                {q ? `Tokens (${results.length})` : "Navigation"}
              </div>
              {options.map((o, i) => (
                <button
                  key={o.href + i}
                  onClick={() => { router.push(o.href); setOpen(false); }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    active === i ? "bg-brand/15 text-text-primary" : "text-text-secondary hover:bg-bg-elevated"
                  )}
                >
                  <o.icon className={cn("h-4 w-4", active === i ? "text-brand" : "text-text-muted")} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{o.label}</div>
                    {o.sublabel && <div className="truncate text-xs text-text-muted">{o.sublabel}</div>}
                  </div>
                  {active === i && <ArrowRight className="h-3.5 w-3.5 text-brand" />}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="border-t border-border-subtle bg-bg-elevated/40 px-4 py-2 text-[10px] text-text-muted flex items-center gap-3">
          <span><kbd className="rounded border border-border-subtle bg-bg-card px-1.5">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border border-border-subtle bg-bg-card px-1.5">↵</kbd> open</span>
          <span><kbd className="rounded border border-border-subtle bg-bg-card px-1.5">Esc</kbd> close</span>
          <span className="ml-auto">Cmd+K</span>
        </div>
      </div>
    </div>
  );
}
