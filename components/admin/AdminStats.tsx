"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { StatCard } from "@/components/ui/StatCard";
import { Coins, ShieldCheck, Flag, Users, DollarSign } from "lucide-react";

interface AdminStatsProps {
  stats: {
    total_tokens: number;
    claimed_tokens: number;
    verified_tokens: number;
    pending_claims: number;
    pending_reports: number;
    total_payments: number;
    total_revenue_usd: number;
  };
}

export function AdminStats({ stats }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard label="Total Tokens" value={stats.total_tokens} icon={<Coins className="h-4 w-4" />} />
      <StatCard label="Claimed" value={stats.claimed_tokens} icon={<ShieldCheck className="h-4 w-4" />} />
      <StatCard label="Verified (Gold/Silver)" value={stats.verified_tokens} icon={<ShieldCheck className="h-4 w-4" />} />
      <StatCard label="Pending Claims" value={stats.pending_claims} icon={<Users className="h-4 w-4" />} />
      <StatCard label="Open Reports" value={stats.pending_reports} icon={<Flag className="h-4 w-4" />} />
      <StatCard label="Total Payments" value={stats.total_payments} icon={<DollarSign className="h-4 w-4" />} />
      <StatCard label="Revenue (USD)" value={`$${stats.total_revenue_usd.toFixed(2)}`} icon={<DollarSign className="h-4 w-4" />} mono />
    </div>
  );
}
