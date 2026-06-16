import { getSupabaseService } from "@/lib/supabase-server";
import Link from "next/link";
import { ShieldCheck, TrendingUp } from "lucide-react";

export const revalidate = 30;

export async function RecentlyVerifiedTicker() {
  const db = getSupabaseService();
  // Get recent tier-upgrade activity
  const { data: payments } = await db
    .from("payments")
    .select("id, payer_wallet, tier_requested, amount_sol, created_at, tokens(name, symbol, logo_url, contract_address)")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(20);

  const events = (payments || []).map((p: any) => ({
    id: p.id,
    tier: p.tier_requested,
    token: p.tokens,
    actor: p.payer_wallet,
    at: p.created_at,
  })).filter((e: any) => e.token);

  if (events.length === 0) return null;

  return (
    <div className="relative overflow-hidden border-b border-border-subtle bg-bg-surface/50 py-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-bg-base to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-bg-base to-transparent" />
      <div className="flex items-center gap-6 overflow-hidden">
        <div className="flex flex-shrink-0 items-center gap-2 border-r border-border-subtle pr-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-safu" />
          Recently Verified
        </div>
        <div className="flex animate-[scroll_40s_linear_infinite] gap-6 whitespace-nowrap">
          {[...events, ...events, ...events].map((e: any, i: number) => (
            <Link
              key={`${e.id}-${i}`}
              href={`/token/${e.token.contract_address}`}
              className="flex flex-shrink-0 items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
            >
              {e.token.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.token.logo_url} alt="" className="h-5 w-5 rounded-full" />
              ) : null}
              <span className="font-semibold">{e.token.name || "Token"}</span>
              <span className="text-text-muted">${e.token.symbol}</span>
              <span className={e.tier === "gold" ? "text-gold" : "text-silver"}>✓ {e.tier.toUpperCase()}</span>
              <span className="text-text-muted text-xs">· {timeAgo(e.at)}</span>
              <span className="text-border-subtle">·</span>
            </Link>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}
