"use client";

import { formatDistanceToNow } from "date-fns";
import { Flag, Shield, ShieldAlert, AlertTriangle } from "lucide-react";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  reporter_wallet: string | null;
  report_type: string;
  description: string;
  evidence_url: string | null;
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

const SEV_STYLE = {
  low: "text-trusted border-trusted/30 bg-trusted/10",
  medium: "text-caution border-caution/30 bg-caution/10",
  high: "text-risky border-risky/30 bg-risky/10",
  critical: "text-danger border-danger/30 bg-danger/10",
};

export function ReportList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <GlassCard>
        <p className="text-text-secondary">No reports yet.</p>
      </GlassCard>
    );
  }
  return (
    <GlassCard className="!p-0">
      <ul className="divide-y divide-border-subtle">
        {reports.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Flag className="h-4 w-4 text-text-muted" />
              <span className="rounded-full border bg-bg-elevated px-2 py-0.5 text-xs font-medium uppercase text-text-secondary">
                {r.report_type.replace(/_/g, " ")}
              </span>
              <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold uppercase", SEV_STYLE[r.severity])}>
                {r.severity}
              </span>
              <span className="ml-auto text-xs text-text-muted">
                {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="mt-2 text-sm text-text-primary">{r.description}</p>
            {r.evidence_url && (
              <a href={r.evidence_url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-trusted hover:underline">
                Evidence: {r.evidence_url}
              </a>
            )}
            {r.reporter_wallet && (
              <div className="mt-2 text-xs text-text-muted">
                by <AddressDisplay address={r.reporter_wallet} truncate showCopy={false} showExplorer={false} />
              </div>
            )}
            {r.resolution_note && (
              <div className="mt-2 rounded-lg border border-border-subtle bg-bg-elevated p-2 text-xs text-text-secondary">
                <strong>Resolution:</strong> {r.resolution_note}
              </div>
            )}
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
