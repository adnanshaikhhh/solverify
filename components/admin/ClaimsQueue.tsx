"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { useUiStore } from "@/store/uiStore";

interface Claim {
  id: string;
  token_id: string;
  claimer_wallet: string;
  claim_method: string;
  message_signed: string;
  created_at: string;
  status: string;
  token?: { name: string | null; symbol: string | null; contract_address: string };
}

export function ClaimsQueue({ initial }: { initial: Claim[] }) {
  const { pushToast } = useUiStore();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, action: "approve" | "reject") => {
    setBusy(`${id}-${action}`);
    try {
      const res = await fetch(`/api/admin/claims/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Action failed");
      }
      setItems((arr) => arr.filter((c) => c.id !== id));
      pushToast({ kind: "success", message: `Claim ${action}d` });
    } catch (e) {
      pushToast({ kind: "error", message: e instanceof Error ? e.message : "Action failed" });
    } finally {
      setBusy(null);
    }
  };

  if (items.length === 0) {
    return (
      <GlassCard>
        <p className="text-text-secondary">No pending claims. 🎉</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="!p-0">
      <ul className="divide-y divide-border-subtle">
        {items.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{c.token?.name || "Token"}</span>
                <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">
                  {c.claim_method}
                </span>
              </div>
              {c.token && (
                <AddressDisplay address={c.token.contract_address} showCopy={false} className="text-xs" />
              )}
              <div className="mt-1 text-xs text-text-muted">Claimer:</div>
              <AddressDisplay address={c.claimer_wallet} showCopy={false} className="text-xs" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => act(c.id, "reject")}
                disabled={busy === `${c.id}-reject`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-danger/40 bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/20"
              >
                {busy === `${c.id}-reject` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Reject
              </button>
              <button
                onClick={() => act(c.id, "approve")}
                disabled={busy === `${c.id}-approve`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-safu/40 bg-safu/10 px-3 py-1.5 text-sm font-medium text-safu hover:bg-safu/20"
              >
                {busy === `${c.id}-approve` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Approve
              </button>
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
