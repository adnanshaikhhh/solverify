"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const TIERS = [
  { value: "", label: "All tiers" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "bronze", label: "Bronze" },
  { value: "none", label: "None" },
];

const STATUSES = [
  { value: "", label: "All" },
  { value: "claimed", label: "Claimed" },
  { value: "unclaimed", label: "Unclaimed" },
  { value: "pending", label: "Pending" },
];

const SORTS = [
  { value: "score", label: "Trust Score" },
  { value: "trust", label: "Most Trusted" },
  { value: "recent", label: "Recent" },
  { value: "views", label: "Most Viewed" },
  { value: "vouches", label: "Most Vouched" },
];

export function SearchFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [tier, setTier] = useState(params.get("tier") || "");
  const [status, setStatus] = useState(params.get("status") || "");
  const [sort, setSort] = useState(params.get("sort") || "score");
  const [minScore, setMinScore] = useState(params.get("min_score") || "");

  const apply = () => {
    const sp = new URLSearchParams(params.toString());
    if (tier) sp.set("tier", tier); else sp.delete("tier");
    if (status) sp.set("status", status); else sp.delete("status");
    if (sort) sp.set("sort", sort); else sp.delete("sort");
    if (minScore) sp.set("min_score", minScore); else sp.delete("min_score");
    sp.set("page", "1");
    router.push(`/search?${sp.toString()}`);
  };

  return (
    <div className="glass-card space-y-3 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Filters</h3>
      <div>
        <label className="mb-1 block text-xs text-text-secondary">Tier</label>
        <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
          {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-text-secondary">Status</label>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-text-secondary">Sort</label>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-text-secondary">Min Score</label>
        <input
          type="number"
          min={0}
          max={100}
          className="input"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          placeholder="0"
        />
      </div>
      <button onClick={apply} className="btn-primary w-full">Apply</button>
    </div>
  );
}
