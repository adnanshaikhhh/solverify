"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useWallet } from "@/hooks/useWallet";
import { useAuthStore } from "@/store/authStore";

interface VouchButtonProps {
  tokenId: string;
  initialCount: number;
  onChange?: (newCount: number) => void;
  className?: string;
}

export function VouchButton({ tokenId, initialCount, onChange, className }: VouchButtonProps) {
  const { wallet } = useAuthStore();
  const { isConnected, signIn } = useWallet();
  const { pushToast } = useUiStore();
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  const submit = async (action: "POST" | "DELETE") => {
    if (!isConnected) {
      const ok = await signIn();
      if (!ok) return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/vouch/${encodeURIComponent(tokenId)}`, { method: action });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Failed");
      }
      const data = (await res.json()) as { count: number };
      setCount(data.count);
      onChange?.(data.count);
      pushToast({ kind: "success", message: action === "POST" ? "Vouched!" : "Vouch removed" });
    } catch (e) {
      pushToast({ kind: "error", message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <button
        onClick={() => submit("POST")}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border-active bg-bg-elevated px-3 py-2 text-sm font-medium text-text-primary transition-all hover:border-brand hover:text-brand disabled:opacity-50"
      >
        <ThumbsUp className="h-4 w-4" />
        Vouch
      </button>
      <span className="font-mono text-sm text-text-secondary">{count}</span>
      {wallet && (
        <button
          onClick={() => submit("DELETE")}
          disabled={busy}
          className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-danger"
          aria-label="Remove vouch"
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
