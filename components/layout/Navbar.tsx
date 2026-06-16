"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Shield, BookOpen, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { WalletConnect } from "./WalletConnect";

export function Navbar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    // If it looks like an address, go to the token page; else search
    if (v.length >= 32 && v.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(v)) {
      router.push(`/token/${v}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(v)}`);
    }
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-border-subtle bg-bg-base/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-brand" />
          <span className="text-lg font-bold tracking-tight">SolVerify</span>
        </Link>

        <form onSubmit={onSearch} className="ml-4 hidden flex-1 max-w-md md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search token name, symbol, or address..."
              className="w-full rounded-xl border border-border-subtle bg-bg-surface py-2 pl-10 pr-3 text-sm placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/docs"
            className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary sm:inline-flex"
          >
            <BookOpen className="h-4 w-4" />
            Docs
          </Link>
          <Link
            href="/claim"
            className="hidden items-center gap-1.5 rounded-xl border border-border-active px-3 py-2 text-sm font-medium text-text-primary transition-all hover:border-border-glow sm:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Submit Token
          </Link>
          <WalletConnect />
        </div>
      </div>
    </nav>
  );
}
