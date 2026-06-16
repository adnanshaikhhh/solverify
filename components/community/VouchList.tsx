"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { GlassCard } from "@/components/ui/GlassCard";
import { MessageCircle } from "lucide-react";

interface Vouch {
  id: string;
  voucher_wallet: string;
  vouch_message: string | null;
  created_at: string;
}

interface VouchListProps {
  tokenId: string;
  initialCount: number;
}

export function VouchList({ tokenId, initialCount }: VouchListProps) {
  const [vouches, setVouches] = useState<Vouch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tokens/${tokenId}/vouches`);
        if (res.ok) {
          const j = (await res.json()) as { vouches: Vouch[] };
          if (!cancelled) setVouches(j.vouches);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tokenId]);

  return (
    <GlassCard>
      <h3 className="mb-4 text-lg font-semibold">Community Vouches ({initialCount})</h3>
      {loading ? (
        <p className="text-text-muted">Loading...</p>
      ) : vouches.length === 0 ? (
        <p className="text-text-secondary">No vouches yet. Be the first to vouch.</p>
      ) : (
        <ul className="space-y-3">
          {vouches.map((v) => (
            <li key={v.id} className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated">
                <MessageCircle className="h-3.5 w-3.5 text-text-muted" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <AddressDisplay address={v.voucher_wallet} showCopy={false} showExplorer />
                  <span className="text-xs text-text-muted">
                    {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                  </span>
                </div>
                {v.vouch_message && <p className="mt-1 text-sm text-text-secondary">{v.vouch_message}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
