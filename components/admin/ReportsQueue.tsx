"use client";

import { useState } from "react";
import { Check, X, Loader2, Flag } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useUiStore } from "@/store/uiStore";

interface Report {
  id: string;
  token_id: string;
  reporter_wallet: string | null;
  report_type: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  token?: { name: string | null; symbol: string | null; contract_address: string };
}

export function ReportsQueue({ initial }: { initial: Report[] }) {
  const { pushToast } = useUiStore();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, action: "resolve" | "dismiss") => {
    setBusy(`${id}-${action}`);
    try {
      const res = await fetch(`/api/admin/reports/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Action failed");
      }
      setItems((arr) => arr.filter((r) => r.id !== id));
      pushToast({ kind: "success", message: `Report ${action}d` });
    } catch (e) {
      pushToast({ kind: "error", message: e instanceof Error ? e.message : "Action failed" });
    } finally {
      setBusy(null);
    }
  };

  if (items.length === 0) {
    return (
      <GlassCard>
        <p className="text-text-secondary">No pending reports. 🎉</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="!p-0">
      <ul className="divide-y divide-border-subtle">
        {items.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Flag className="h-4 w-4 text-danger" />
              <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs uppercase">{r.report_type.replace(/_/g, " ")}</span>
              <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs uppercase">{r.severity}</span>
              <span className="font-semibold">{r.token?.name || "Token"}</span>
            </div>
            <p className="mt-2 text-sm text-text-primary">{r.description}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => act(r.id, "dismiss")}
                disabled={busy === `${r.id}-dismiss`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-text-muted/40 bg-bg-elevated px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-card-hover"
              >
                {busy === `${r.id}-dismiss` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Dismiss
              </button>
              <button
                onClick={() => act(r.id, "resolve")}
                disabled={busy === `${r.id}-resolve`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-safu/40 bg-safu/10 px-3 py-1.5 text-sm font-medium text-safu hover:bg-safu/20"
              >
                {busy === `${r.id}-resolve` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Resolve
              </button>
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
