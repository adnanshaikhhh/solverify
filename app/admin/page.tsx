"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { AdminStats } from "@/components/admin/AdminStats";
import { ClaimsQueue } from "@/components/admin/ClaimsQueue";
import { ReportsQueue } from "@/components/admin/ReportsQueue";
import { Lock, Shield } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const { wallet, isAdmin, ready } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [tab, setTab] = useState<"claims" | "reports">("claims");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!wallet || !isAdmin) {
      // Don't redirect, just show a gate
      return;
    }
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.ok ? r.json() : null),
      fetch("/api/admin/claims").then((r) => r.ok ? r.json() : { claims: [] }),
      fetch("/api/admin/reports").then((r) => r.ok ? r.json() : { reports: [] }),
    ]).then(([s, c, r]) => {
      setStats(s?.stats ?? null);
      setClaims(c?.claims ?? []);
      setReports(r?.reports ?? []);
    }).catch((e) => setErr(String(e)));
  }, [ready, wallet, isAdmin]);

  if (!ready) return <div className="text-text-muted">Loading...</div>;
  if (!wallet || !isAdmin) {
    return (
      <GlassCard className="text-center">
        <Lock className="mx-auto h-10 w-10 text-text-muted" />
        <h2 className="mt-4 text-xl font-semibold">Admin only</h2>
        <p className="mt-2 text-sm text-text-secondary">
          This area is restricted to admin wallets.
        </p>
        {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      </GlassCard>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-brand" />
        <h1 className="text-3xl font-bold">Admin Console</h1>
      </div>

      {stats && <AdminStats stats={stats} />}

      <div>
        <div className="mb-4 flex gap-2 border-b border-border-subtle">
          {(["claims", "reports"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${
                tab === t ? "border-brand text-text-primary" : "border-transparent text-text-secondary"
              }`}
            >
              {t === "claims" ? `Pending Claims (${claims.length})` : `Pending Reports (${reports.length})`}
            </button>
          ))}
        </div>
        {tab === "claims" ? <ClaimsQueue initial={claims} /> : <ReportsQueue initial={reports} />}
      </div>
    </div>
  );
}
