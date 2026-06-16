"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  initialQuery?: string;
  autoFocus?: boolean;
  onSearch?: (q: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ initialQuery = "", autoFocus = false, onSearch, placeholder, className }: SearchBarProps) {
  const [q, setQ] = useState(initialQuery);
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    if (onSearch) {
      onSearch(v);
      return;
    }
    if (v.length >= 32 && v.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(v)) {
      router.push(`/token/${v}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(v)}`);
    }
  };

  return (
    <form onSubmit={submit} className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder ?? "Search by name, symbol, or paste contract address..."}
          autoFocus={autoFocus}
          className="w-full rounded-2xl border border-border-subtle bg-bg-card py-4 pl-12 pr-4 text-base text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
        />
      </div>
    </form>
  );
}
