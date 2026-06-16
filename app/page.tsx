"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Zap, Lock, Users, TrendingUp, Search, Sparkles, Award, FileCheck, Scan } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";
import { TokenGrid } from "@/components/token/TokenGrid";
import { TierComparison } from "@/components/verification/TierComparison";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatCard } from "@/components/ui/StatCard";
import { useEffect, useState } from "react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

export default function Home() {
  const [demoScore, setDemoScore] = useState(50);
  const [featured, setFeatured] = useState<any[]>([]);
  const [stats, setStats] = useState({ tokens: 0, verified: 0, scans: 0, scams: 0 });

  useEffect(() => {
    // Fetch featured/verified + stats
    fetch("/api/tokens/verified").then((r) => r.ok ? r.json() : { data: [] }).then((d) => setFeatured((d.data || []).slice(0, 6)));
    // Best-effort stats: total tokens via search ? no — we don't have a public count endpoint.
    // Use a small safe approximation from featured count.
  }, []);

  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="relative overflow-hidden pt-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand/20 via-transparent to-transparent" />
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-active bg-bg-elevated/50 px-3 py-1 text-xs text-text-secondary"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Verified ownership. Cryptographic proof. $60.
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl"
          >
            The Trust Layer for <br />
            <span className="gradient-text">Solana Tokens</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-6 max-w-xl text-lg text-text-secondary"
          >
            Verified ownership. Secure metadata. Community trust.
            For <strong className="text-text-primary">$60</strong> — not $299–$499.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8"
          >
            <SearchBar autoFocus className="mx-auto max-w-2xl" />
            <div className="mt-3 flex items-center justify-center gap-3 text-sm text-text-muted">
              <span>Try:</span>
              <Link href="/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" className="hover:text-brand">Bonk</Link>
              <span>·</span>
              <Link href="/token/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" className="hover:text-brand">Jupiter</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live stats bar */}
      <section>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Tokens Indexed" value={stats.tokens || "—"} icon={<Zap className="h-4 w-4" />} />
          <StatCard label="Verified Tokens" value={stats.verified || "—"} icon={<Award className="h-4 w-4" />} />
          <StatCard label="URLs Scanned" value={stats.scans || "—"} icon={<Scan className="h-4 w-4" />} />
          <StatCard label="Threats Caught" value={stats.scams || "—"} icon={<Shield className="h-4 w-4" />} />
        </div>
      </section>

      {/* Trust score demo */}
      <section>
        <GlassCard className="grid grid-cols-1 gap-8 p-8 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">One score, total trust</h2>
            <p className="mt-3 text-text-secondary">
              We combine on-chain data (mint authority, freeze authority, holder concentration),
              link safety scanning, community vouches, and ownership verification into a single 0-100 score.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-brand" /> Ownership proof (30 pts)</li>
              <li className="flex items-center gap-2"><Lock className="h-4 w-4 text-trusted" /> Token safety (25 pts)</li>
              <li className="flex items-center gap-2"><Scan className="h-4 w-4 text-caution" /> Link safety (20 pts)</li>
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-safu" /> Community trust (15 pts)</li>
              <li className="flex items-center gap-2"><FileCheck className="h-4 w-4 text-text-secondary" /> Metadata completeness (10 pts)</li>
            </ul>
          </div>
          <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-border-subtle bg-bg-base/50 p-6">
            <TrustScoreGauge score={demoScore} size="xl" />
            <div className="w-full">
              <input
                type="range"
                min={0}
                max={100}
                value={demoScore}
                onChange={(e) => setDemoScore(Number(e.target.value))}
                className="w-full accent-brand"
              />
              <div className="mt-1 flex justify-between text-xs text-text-muted">
                <span>Danger</span>
                <span>Risky</span>
                <span>Caution</span>
                <span>Trusted</span>
                <span>SAFU</span>
              </div>
            </div>
            <p className="text-center text-sm text-text-muted">
              Drag to see how the grade changes with score.
            </p>
          </div>
        </GlassCard>
      </section>

      {/* Tier comparison */}
      <section>
        <div className="text-center">
          <h2 className="text-3xl font-bold">Verify your token today</h2>
          <p className="mt-2 text-text-secondary">
            Bronze is free. Silver and Gold unlock full trust infrastructure.
          </p>
        </div>
        <div className="mt-8">
          <TierComparison />
        </div>
        <div className="mt-8 text-center">
          <Link href="/claim" className="btn-primary">
            Claim Your Token <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Featured tokens */}
      {featured.length > 0 && (
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">Verified Tokens</h2>
              <p className="mt-1 text-sm text-text-secondary">Recently claimed and verified on SolVerify</p>
            </div>
            <Link href="/search?tier=gold" className="text-sm text-brand hover:underline">View all →</Link>
          </div>
          <TokenGrid tokens={featured} />
        </section>
      )}

      {/* How it works */}
      <section>
        <h2 className="text-center text-3xl font-bold">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Step n={1} icon={<Shield className="h-6 w-6" />} title="Sign with your wallet" desc="Connect Phantom, Backpack, or Solflare. We verify your wallet signature — no SOL is spent." />
          <Step n={2} icon={<Award className="h-6 w-6" />} title="Get verified" desc="We check the on-chain creators and update authority. If you're the owner, you're auto-approved." />
          <Step n={3} icon={<TrendingUp className="h-6 w-6" />} title="Earn the trust score" desc="Your trust score updates in real time based on token safety, link safety, and community vouches." />
        </div>
      </section>

      {/* CTA */}
      <section>
        <GlassCard className="bg-gradient-to-br from-brand/20 to-transparent p-12 text-center">
          <h2 className="text-3xl font-bold">Stop trading on vibes</h2>
          <p className="mx-auto mt-3 max-w-md text-text-secondary">
            SolVerify gives every Solana token a cryptographic identity and a transparent trust score — for the price of a sandwich.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/claim" className="btn-primary">Claim Your Token</Link>
            <Link href="/search" className="btn-secondary">
              <Search className="h-4 w-4" />
              Explore Tokens
            </Link>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}

function Step({ n, icon, title, desc }: { n: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/20 text-brand">
          {icon}
        </div>
        <span className="text-sm font-semibold text-text-muted">Step {n}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-text-secondary">{desc}</p>
    </GlassCard>
  );
}
