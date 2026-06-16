import { getSupabaseService } from "@/lib/supabase-server";
import { GlassCard } from "@/components/ui/GlassCard";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { Trophy, Award, Crown, Medal } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export default async function LeaderboardPage() {
  const db = getSupabaseService();
  const { data: top } = await db
    .from("tokens")
    .select("contract_address, name, symbol, logo_url, verification_tier, trust_score, claim_status, community_vouches, updated_at, view_count, is_mint_disabled, is_freeze_disabled, liquidity_locked")
    .in("verification_tier", ["gold", "silver", "bronze"])
    .order("trust_score", { ascending: false })
    .limit(100);

  const tokens = (top as any[]) || [];
  const gold = tokens.filter((t) => t.verification_tier === "gold");
  const silver = tokens.filter((t) => t.verification_tier === "silver");
  const bronze = tokens.filter((t) => t.verification_tier === "bronze");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Trophy className="h-7 w-7 text-gold" />
          Trust Leaderboard
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          The top {tokens.length} SolVerify-verified tokens, ranked by trust score. Updated every 60s.
        </p>
      </div>

      {/* Podium for top 3 */}
      {tokens.length >= 3 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <PodiumCard place={2} token={tokens[1]} color="silver" icon={Award} />
          <PodiumCard place={1} token={tokens[0]} color="gold" icon={Crown} big />
          <PodiumCard place={3} token={tokens[2]} color="bronze" icon={Medal} />
        </div>
      )}

      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">All Ranked Tokens</h2>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-gold">Gold: {gold.length}</span>
            <span className="rounded-full border border-border-subtle bg-bg-elevated px-2 py-0.5 text-text-secondary">Silver: {silver.length}</span>
            <span className="rounded-full border border-bronze/30 bg-bronze/10 text-bronze px-2 py-0.5">Bronze: {bronze.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Token</th>
                <th className="px-3 py-2 text-left">Tier</th>
                <th className="px-3 py-2 text-right">Trust</th>
                <th className="px-3 py-2 text-right hidden md:table-cell">Mint</th>
                <th className="px-3 py-2 text-right hidden md:table-cell">Freeze</th>
                <th className="px-3 py-2 text-right hidden md:table-cell">Liq Locked</th>
                <th className="px-3 py-2 text-right hidden lg:table-cell">Vouches</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t, i) => (
                <tr key={t.contract_address} className="border-b border-border-subtle/50 hover:bg-bg-card-hover">
                  <td className="px-3 py-2 text-text-muted font-mono">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link href={`/token/${t.contract_address}`} className="flex items-center gap-2">
                      <div className="h-7 w-7 overflow-hidden rounded-full bg-bg-elevated">
                        {t.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-text-muted">
                            {(t.symbol || "?").slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">{t.name || "Unknown"}</div>
                        <div className="text-xs text-text-muted">${t.symbol}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <VerificationBadge tier={t.verification_tier} status={t.claim_status} size="sm" showLabel />
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-safu">{t.trust_score}</td>
                  <td className="px-3 py-2 text-right hidden md:table-cell">{t.is_mint_disabled ? <span className="text-safu">✓</span> : <span className="text-danger">✗</span>}</td>
                  <td className="px-3 py-2 text-right hidden md:table-cell">{t.is_freeze_disabled ? <span className="text-safu">✓</span> : <span className="text-danger">✗</span>}</td>
                  <td className="px-3 py-2 text-right hidden md:table-cell">{t.liquidity_locked ? <span className="text-safu">✓</span> : <span className="text-text-muted">—</span>}</td>
                  <td className="px-3 py-2 text-right font-mono hidden lg:table-cell">{t.community_vouches || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

function PodiumCard({ place, token, color, icon: Icon, big = false }: { place: number; token: any; color: "gold" | "silver" | "bronze"; icon: any; big?: boolean }) {
  const tierColor = color === "gold" ? "from-gold/30 to-gold/5" : color === "silver" ? "from-silver/30 to-silver/5" : "from-bronze/30 to-bronze/5";
  const iconColor = color === "gold" ? "text-gold" : color === "silver" ? "text-silver" : "text-bronze";
  return (
    <Link href={`/token/${token.contract_address}`} className={`glass-card relative overflow-hidden ${big ? "md:scale-110 md:z-10" : ""}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${tierColor} pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-base/40">
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div>
            <div className={`text-xs uppercase tracking-wider ${iconColor}`}>#{place}</div>
            <div className="text-lg font-bold">{token.name}</div>
            <div className="text-xs text-text-muted">${token.symbol}</div>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <TrustScoreGauge score={token.trust_score} size="sm" />
          <div className="text-right">
            <div className="font-mono text-2xl font-bold text-safu">{token.trust_score}</div>
            <div className="text-xs text-text-muted">{token.community_vouches || 0} vouches</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
