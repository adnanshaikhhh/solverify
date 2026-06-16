"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchFilters } from "@/components/search/SearchFilters";
import { TokenGrid } from "@/components/token/TokenGrid";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Suspense } from "react";

function SearchPageInner() {
  const sp = useSearchParams();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(sp.get("page") || 1));
  const query = sp.get("q") || "";
  const tier = sp.get("tier") || "";
  const status = sp.get("status") || "";
  const sort = sp.get("sort") || "score";
  const minScore = sp.get("min_score") || "";

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (tier) params.set("tier", tier);
    if (status) params.set("status", status);
    if (sort) params.set("sort", sort);
    if (minScore) params.set("min_score", minScore);
    params.set("page", String(page));
    params.set("limit", "30");
    fetch(`/api/tokens?${params.toString()}`)
      .then((r) => r.ok ? r.json() : { data: [], total: 0 })
      .then((d) => { setData(d.data || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, [query, tier, status, sort, minScore, page]);

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      <aside>
        <SearchFilters />
      </aside>
      <div>
        <div className="mb-4">
          <SearchBar initialQuery={query} />
        </div>
        <p className="mb-4 text-sm text-text-muted">
          {loading ? "Searching..." : `${total} token${total === 1 ? "" : "s"} found`}
        </p>
        {loading ? (
          <LoadingSkeleton count={6} className="h-32" />
        ) : (
          <>
            <TokenGrid tokens={data} emptyMessage="No tokens match your filters." />
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary"
                >
                  Prev
                </button>
                <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSkeleton count={6} className="h-32" />}>
      <SearchPageInner />
    </Suspense>
  );
}
