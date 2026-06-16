"use client";

import Link from "next/link";
import { Search, Shield, BookOpen, Plus, Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WalletConnect } from "./WalletConnect";

export function Navbar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [showHint, setShowHint] = useState(false);

  // Show Cmd+K hint after a short delay (only on desktop, only once)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 768) return;
    const seen = localStorage.getItem("solverify_cmdk_seen");
    if (seen) return;
    const t = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    if (v.length >= 32 && v.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(v)) {
      router.push(`/token/${v}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(v)}`);
    }
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-border-subtle bg-bg-base/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Shield className="h-7 w-7 text-brand" />
          <span className="text-lg font-bold tracking-tight">SolVerify</span>
        </Link>

        <form onSubmit={onSearch} className="ml-2 hidden flex-1 max-w-md md:flex">
          <button
            type="button"
            onClick={() => {
              // Trigger Cmd+K
              const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true });
              window.dispatchEvent(e);
            }}
            className="relative w-full text-left"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <div className="w-full rounded-xl border border-border-subtle bg-bg-surface py-2 pl-10 pr-16 text-sm text-text-muted">
              Search tokens, pages…
            </div>
            {showHint ? (
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border-subtle bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                ⌘K
              </kbd>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border-subtle bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                ⌘K
              </kbd>
            )}
          </button>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/leaderboard" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary sm:inline-flex">
            Leaderboard
          </Link>
          <Link href="/portfolio" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary sm:inline-flex">
            Portfolio
          </Link>
          <Link href="/airdrop-check" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary sm:inline-flex">
            <Shield className="h-4 w-4" /> Airdrop Check
          </Link>
          <Link href="/claim" className="hidden items-center gap-1.5 rounded-xl border border-border-active bg-bg-elevated px-3 py-2 text-sm font-medium text-text-primary transition-all hover:border-border-glow sm:inline-flex">
            <Plus className="h-4 w-4" />
            Claim
          </Link>
          <WalletConnect />
        </div>
      </div>
    </nav>
  );
}
