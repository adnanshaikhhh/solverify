"use client";

import { useState } from "react";
import { useToken } from "@/hooks/useToken";
import { VouchList } from "../community/VouchList";
import { ReportList } from "../community/ReportList";
import { TokenProfileHeader } from "./TokenProfileHeader";
import { TrustBreakdown } from "../trust/TrustBreakdown";
import { TrustGradeHistory } from "../trust/TrustGradeHistory";
import { MetadataEditor } from "./MetadataEditor";
import { UpdateTimeline } from "./UpdateTimeline";
import { VouchButton } from "../community/VouchButton";
import { ReportModal } from "../community/ReportModal";
import { Flag } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { AddressDisplay } from "../ui/AddressDisplay";
import { GlassCard } from "../ui/GlassCard";
import { TIER_COLORS } from "@/lib/constants";

interface TokenTabsProps {
  address: string;
  initialToken: any;
}

type Tab = "overview" | "metadata" | "history" | "reports" | "vouches" | "analytics";

export function TokenTabs({ address, initialToken }: TokenTabsProps) {
  const { token, mutate } = useToken(address);
  const { wallet, isAdmin } = useAuthStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [reportOpen, setReportOpen] = useState(false);

  const data = token ?? initialToken;
  if (!data) return <div className="p-8 text-text-muted">Loading token...</div>;

  const isOwner = wallet && (data.owner_wallet === wallet || isAdmin);
  const tierColor = (TIER_COLORS as any)[data.verification_tier] || TIER_COLORS.none;

  return (
    <div className="mt-8">
      <TokenProfileHeader token={data} />

      <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-border-subtle">
        {(["overview", "metadata", "history", "reports", "vouches", "analytics"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? "border-brand text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex gap-2 py-2">
          <VouchButton
            tokenId={data.id}
            initialCount={data.community_vouches}
            onChange={(n) => mutate({ ...data, community_vouches: n }, false)}
          />
          <button
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/15"
          >
            <Flag className="h-4 w-4" />
            Report
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {tab === "overview" && (
            <>
              <GlassCard>
                <h3 className="text-lg font-semibold">About</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                  {data.description || "No description provided yet."}
                </p>
              </GlassCard>
              <UpdateTimelineClient address={address} />
            </>
          )}
          {tab === "metadata" && (
            <MetadataEditor
              tokenId={data.id}
              initial={data}
              canEdit={Boolean(isOwner)}
              onSaved={() => mutate()}
            />
          )}
          {tab === "history" && <UpdateTimelineClient address={address} full />}
          {tab === "reports" && <ReportsClient address={address} />}
          {tab === "vouches" && <VouchList tokenId={data.id} initialCount={data.community_vouches} />}
          {tab === "analytics" && <TrustGradeHistory address={address} />}
        </div>

        <div className="space-y-6">
          {data.trust_score_breakdown && Object.keys(data.trust_score_breakdown).length > 0 && (
            <TrustBreakdown breakdown={data.trust_score_breakdown} />
          )}
          <GlassCard>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Owner</h3>
            <div className="mt-2">
              {data.owner_wallet ? (
                <AddressDisplay address={data.owner_wallet} />
              ) : (
                <span className="text-sm text-text-muted">No verified owner yet</span>
              )}
            </div>
            {data.update_authority && data.update_authority !== data.owner_wallet && (
              <>
                <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Update Authority</h3>
                <div className="mt-2">
                  <AddressDisplay address={data.update_authority} />
                </div>
              </>
            )}
          </GlassCard>
        </div>
      </div>

      <ReportModal
        tokenId={data.id}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => mutate()}
      />
    </div>
  );
}

function UpdateTimelineClient({ address, full = false }: { address: string; full?: boolean }) {
  const [updates, setUpdates] = useState<any[] | null>(null);
  if (!updates) {
    fetch(`/api/tokens/${address}/history${full ? "?limit=100" : ""}`)
      .then((r) => r.ok ? r.json() : { updates: [] })
      .then((d) => setUpdates(d.updates || []))
      .catch(() => setUpdates([]));
  }
  if (updates === null) return <p className="text-text-muted">Loading updates...</p>;
  return <UpdateTimeline updates={updates} />;
}

function ReportsClient({ address }: { address: string }) {
  const [reports, setReports] = useState<any[] | null>(null);
  if (!reports) {
    fetch(`/api/tokens/${address}/reports`)
      .then((r) => r.ok ? r.json() : { reports: [] })
      .then((d) => setReports(d.reports || []))
      .catch(() => setReports([]));
  }
  if (reports === null) return <p className="text-text-muted">Loading reports...</p>;
  return <ReportList reports={reports} />;
}
