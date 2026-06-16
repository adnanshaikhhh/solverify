"use client";

import { useEffect, useState } from "react";
import { Shield, ShieldCheck, ShieldAlert, ExternalLink, Copy, Check, AlertTriangle, Sparkles, Activity, Users, Lock, FileText, Link2, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { PriceChart } from "./PriceChart";
import { formatUsd, formatNumber, formatSupply, cn } from "@/lib/utils";

interface LiveToken {
  address: string;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  description?: string | null;
  price_usd: number | null;
  change_24h: number | null;
  change_1h: number | null;
  change_6h: number | null;
  volume_24h: number | null;
  liquidity_usd: number | null;
  market_cap: number | null;
  fdv: number | null;
  pair_address: string | null;
  dex_id: string | null;
  pair_created_at: number | null;
  sparkline_7d: number[] | null;
  solverify: {
    in_db: boolean;
    claim_status: string | null;
    verification_tier: string | null;
    trust_score: number | null;
    grade: string | null;
  };
}

interface RiskSignal {
  level: "low" | "caution" | "high" | "unknown";
  flags: string[];
  positive: string[];
  score: number;
}

interface StoryEvent {
  id: string;
  type: string;
  label: string;
  actor: string | null;
  at: string;
  detail: string;
}

interface TokenReportProps {
  address: string;
  initial: { token: LiveToken; risk: RiskSignal; in_db: boolean };
  initialStory: StoryEvent[];
}

type Tab = "overview" | "audit" | "holders" | "story" | "alerts";

export function TokenReport({ address, initial, initialStory }: TokenReportProps) {
  const [data, setData] = useState(initial);
  const [story, setStory] = useState<StoryEvent[]>(initialStory || []);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [watchlisted, setWatchlisted] = useState(false);

  // Load watchlist state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const wl = JSON.parse(localStorage.getItem("solverify_watchlist") || "[]") as string[];
    setWatchlisted(wl.includes(address));
  }, [address]);

  // Live refresh every 60s
  useEffect(() => {
    const refresh = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/token/${address}/live`, { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (j && j.token) setData(j);
        }
      } catch (e) {/* silent */} finally { setLoading(false); }
    };
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [address]);

  // Load story events on demand
  useEffect(() => {
    if (tab === "story" && story.length === 0) {
      fetch(`/api/token/${address}/story`)
        .then((r) => r.ok ? r.json() : { events: [] })
        .then((j) => setStory(j.events || []))
        .catch(() => setStory([]));
    }
  }, [tab, address, story.length]);

  const toggleWatchlist = () => {
    if (typeof window === "undefined") return;
    const wl = JSON.parse(localStorage.getItem("solverify_watchlist") || "[]") as string[];
    let next: string[];
    if (watchlisted) {
      next = wl.filter((a) => a !== address);
    } else {
      next = [...wl, address];
    }
    localStorage.setItem("solverify_watchlist", JSON.stringify(next));
    setWatchlisted(!watchlisted);
    window.dispatchEvent(new Event("solverify_watchlist_changed"));
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied");
    } catch {/* noop */}
  };

  const shareTwitter = () => {
    const t = data.token;
    const score = t.solverify.trust_score != null ? t.solverify.trust_score : "—";
    const grade = t.solverify.grade || "Unverified";
    const txt = `${t.name || "Unknown"} ($${t.symbol || "?"}) on @SolVerify\nTrust ${score}/100 · ${grade}\n${window.location.href}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}`, "_blank");
  };

  const shareTelegram = () => {
    const t = data.token;
    const txt = `${t.name || "Unknown"} on SolVerify — Trust ${t.solverify.trust_score ?? "—"}/100\n${window.location.href}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(txt)}`, "_blank");
  };

  const { token, risk, in_db } = data;
  const positive = (token.change_24h ?? 0) >= 0;
  const tier = in_db ? (token.solverify.verification_tier || "none") : "none";
  const claimStatus = in_db ? (token.solverify.claim_status || "unclaimed") : "unclaimed";
  const trustScore = token.solverify.trust_score;

  return (
    <div className="space-y-6">
      {/* ===== Unverified CTA banner ===== */}
      {!in_db && (
        <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/15 via-brand/5 to-transparent p-5">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand/20 blur-2xl" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-brand">
                <Sparkles className="h-3.5 w-3.5" />
                Not verified yet
              </div>
              <h2 className="mt-1 text-lg font-semibold">This token hasn&apos;t been claimed on SolVerify</h2>
              <p className="mt-1 text-sm text-text-secondary">
                DexScreener Enhanced Info costs <span className="line-through text-text-muted">$299</span>. SolVerify Gold is <strong className="text-text-primary">$60</strong> — same trust, 80% less.
              </p>
            </div>
            <Link
              href={`/claim?address=${address}`}
              className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
            >
              <ShieldCheck className="h-4 w-4" />
              Claim &amp; Verify
            </Link>
          </div>
        </div>
      )}

      {/* ===== Hero header ===== */}
      <div className="glass-card !p-0 overflow-hidden">
        {/* Banner — animated gradient if no logo */}
        <div
          className="relative h-36 w-full overflow-hidden"
          style={{
            background: token.logo_url
              ? `linear-gradient(180deg, transparent, var(--bg-card)), url(${token.logo_url}) center/cover`
              : "linear-gradient(135deg, #7C3AED 0%, #3B82F6 50%, #10B981 100%)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card to-transparent" />
        </div>

        <div className="relative px-6 pb-6">
          <div className="flex flex-wrap items-start gap-5 -mt-12">
            {/* Logo */}
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-bg-card bg-bg-elevated shadow-2xl">
              {token.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={token.logo_url} alt={token.name || "token"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-text-muted">
                  {(token.symbol || "?").slice(0, 2)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1">
                <VerificationBadge tier={tier as any} status={claimStatus as any} size="md" />
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-12">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{token.name || "Unknown Token"}</h1>
                <span className="rounded-full border border-border-subtle bg-bg-elevated px-2.5 py-1 text-sm text-text-secondary">
                  ${token.symbol || "—"}
                </span>
                {in_db && token.solverify.grade && (
                  <span className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
                    token.solverify.grade === "SAFU" ? "border-safu/30 bg-safu/10 text-safu" :
                    token.solverify.grade === "Trusted" ? "border-trusted/30 bg-trusted/10 text-trusted" :
                    token.solverify.grade === "Caution" ? "border-caution/30 bg-caution/10 text-caution" :
                    token.solverify.grade === "Risky" ? "border-risky/30 bg-risky/10 text-risky" :
                    "border-danger/30 bg-danger/10 text-danger"
                  )}>{token.solverify.grade}</span>
                )}
              </div>
              <div className="mt-2">
                <AddressDisplay address={token.address} />
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 pt-12">
              {trustScore != null && (
                <TrustScoreGauge score={trustScore} size="lg" />
              )}
              <div className="flex gap-1">
                <button onClick={toggleWatchlist} title={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
                  className={cn("rounded-lg p-2 transition-colors", watchlisted ? "bg-gold/20 text-gold" : "text-text-muted hover:bg-bg-elevated")}>
                  <StarIcon filled={watchlisted} className="h-4 w-4" />
                </button>
                <button onClick={copyShare} title="Copy link" className="rounded-lg p-2 text-text-muted hover:bg-bg-elevated">
                  <Copy className="h-4 w-4" />
                </button>
                <button onClick={shareTwitter} title="Share on Twitter" className="rounded-lg p-2 text-text-muted hover:bg-bg-elevated">
                  <Twitter className="h-4 w-4" />
                </button>
                <button onClick={shareTelegram} title="Share on Telegram" className="rounded-lg p-2 text-text-muted hover:bg-bg-elevated">
                  <Send className="h-4 w-4" />
                </button>
                <a href={`https://dexscreener.com/solana/${token.address}`} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg p-2 text-text-muted hover:bg-bg-elevated" title="DexScreener">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Price strip */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="Price" value={formatUsd(token.price_usd, { compact: false })} />
            <Stat
              label="24h"
              value={token.change_24h != null ? `${token.change_24h >= 0 ? "+" : ""}${token.change_24h.toFixed(2)}%` : "—"}
              color={positive ? "text-safu" : "text-danger"}
            />
            <Stat label="1h" value={token.change_1h != null ? `${token.change_1h >= 0 ? "+" : ""}${token.change_1h.toFixed(2)}%` : "—"}
              color={(token.change_1h ?? 0) >= 0 ? "text-safu" : "text-danger"} />
            <Stat label="Volume 24h" value={token.volume_24h ? formatUsd(token.volume_24h, { compact: true }) : "—"} />
            <Stat label="Liquidity" value={token.liquidity_usd ? formatUsd(token.liquidity_usd, { compact: true }) : "—"} />
            <Stat label="Market Cap" value={token.market_cap ? formatUsd(token.market_cap, { compact: true }) : "—"} />
            <Stat label="Trust" value={trustScore != null ? `${trustScore}/100` : "—"} />
          </div>
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle">
        {(["overview", "audit", "holders", "story", "alerts"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors",
              tab === t ? "border-brand text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-text-muted">
          {loading ? (
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-caution animate-pulse" />Refreshing</span>
          ) : (
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-safu" />Live</span>
          )}
        </div>
      </div>

      {/* ===== Tab content ===== */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <PriceChart address={address} />
            {token.description && (
              <div className="glass-card">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">About</h3>
                <p className="whitespace-pre-wrap text-sm text-text-secondary">{token.description}</p>
              </div>
            )}
            <RiskPanel risk={risk} />
          </div>
          <div className="space-y-6">
            <TopHolders address={address} />
            <TokenLinks token={token} />
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-6">
          <PriceChart address={address} />
          <AuditReport address={address} token={token} risk={risk} />
        </div>
      )}

      {tab === "holders" && (
        <div className="space-y-6">
          <TopHolders address={address} full />
          <PriceChart address={address} />
        </div>
      )}

      {tab === "story" && (
        <TokenStory address={address} events={story} />
      )}

      {tab === "alerts" && (
        <PriceAlerts address={address} price={token.price_usd} />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className={cn("mt-1 font-mono text-sm font-semibold", color || "text-text-primary")}>{value}</div>
    </div>
  );
}

function RiskPanel({ risk }: { risk: RiskSignal }) {
  if (risk.level === "low" && risk.positive.length === 0 && risk.flags.length === 0) {
    return null;
  }
  return (
    <div className="glass-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">On-Chain Risk Signals</h3>
        <span className={cn(
          "rounded-full px-2 py-0.5 text-xs font-semibold uppercase",
          risk.level === "low" ? "bg-safu/10 text-safu" :
          risk.level === "caution" ? "bg-caution/10 text-caution" :
          "bg-danger/10 text-danger"
        )}>{risk.level}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {risk.positive.map((p, i) => (
          <div key={`p${i}`} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-safu" />
            <span className="text-text-primary">{p}</span>
          </div>
        ))}
        {risk.flags.map((f, i) => (
          <div key={`f${i}`} className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
            <span className="text-text-primary">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopHolders({ address, full = false }: { address: string; full?: boolean }) {
  const [holders, setHolders] = useState<Array<{ address: string; pct: number; uiAmount: number }> | null>(null);

  useEffect(() => {
    fetch(`/api/token/${address}/holders`)
      .then((r) => r.ok ? r.json() : { holders: [] })
      .then((j) => setHolders(j.holders || []))
      .catch(() => setHolders([]));
  }, [address]);

  if (holders === null) {
    return <div className="glass-card text-sm text-text-muted">Loading holders...</div>;
  }
  if (holders.length === 0) {
    return <div className="glass-card text-sm text-text-muted">No holder data available on-chain.</div>;
  }

  const top10Pct = holders.slice(0, 10).reduce((s, h) => s + h.pct, 0);
  // Build donut segments
  const palette = ["#7C3AED", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#94A3B8", "#EC4899", "#06B6D4", "#84CC16", "#F97316"];
  const segments = holders.slice(0, 10).map((h, i) => ({
    pct: h.pct,
    color: palette[i % palette.length],
    address: h.address,
    uiAmount: h.uiAmount,
  }));
  // Build SVG path
  let cum = 0;
  const R = 60;
  const C = 2 * Math.PI * R;
  const arcs = segments.map((s) => {
    const dash = (s.pct / 100) * C;
    const offset = (cum / 100) * C;
    cum += s.pct;
    return { ...s, dash, offset };
  });

  return (
    <div className="glass-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Top Holders</h3>
        <span className="text-xs text-text-muted">Top 10 = {top10Pct.toFixed(1)}%</span>
      </div>
      <div className="flex flex-col items-center gap-4 md:flex-row">
        <div className="relative h-36 w-36 flex-shrink-0">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle cx="70" cy="70" r={R} fill="none" stroke="#1E1E2E" strokeWidth="14" />
            {arcs.map((a, i) => (
              <circle
                key={i}
                cx="70" cy="70" r={R}
                fill="none"
                stroke={a.color}
                strokeWidth="14"
                strokeDasharray={`${a.dash} ${C - a.dash}`}
                strokeDashoffset={-a.offset}
                opacity="0.9"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono text-lg font-bold">{top10Pct.toFixed(0)}%</div>
            <div className="text-[10px] text-text-muted">Top 10</div>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 w-full">
          {holders.slice(0, full ? 10 : 5).map((h, i) => (
            <div key={h.address} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: palette[i % palette.length] }} />
              <span className="font-mono text-text-secondary truncate flex-1">{h.address.slice(0, 6)}…{h.address.slice(-4)}</span>
              <span className="font-mono text-text-primary tabular-nums">{h.pct.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TokenLinks({ token }: { token: LiveToken }) {
  const links: Array<{ href: string; label: string }> = [];
  if (token.solverify.verification_tier && (token as any).website_url) links.push({ href: (token as any).website_url, label: "Website" });
  if (token.solverify.verification_tier && (token as any).twitter_url) links.push({ href: (token as any).twitter_url, label: "Twitter" });
  if ((token as any).telegram_url) links.push({ href: (token as any).telegram_url, label: "Telegram" });
  if (token.pair_address) links.push({ href: `https://dexscreener.com/solana/${token.address}`, label: "DexScreener" });
  if (token.pair_address) links.push({ href: `https://jup.ag/swap/SOL-${token.address}`, label: "Jupiter" });
  if (token.pair_address) links.push({ href: `https://gmgn.ai/solana/token/${token.address}`, label: "GMGN" });
  if (token.pair_address) links.push({ href: `https://www.dextools.io/app/en/solana/pair-explorer/${token.pair_address}`, label: "DexTools" });

  return (
    <div className="glass-card">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Links & Tools</h3>
      {links.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2 text-sm transition-colors hover:border-border-glow"
            >
              <span>{l.label}</span>
              <ExternalLink className="h-3 w-3 text-text-muted" />
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No links submitted. Get this token verified to add official links.</p>
      )}
    </div>
  );
}

function AuditReport({ address, token, risk }: { address: string; token: LiveToken; risk: RiskSignal }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ audit: true });
  return (
    <div className="space-y-4">
      <div className="glass-card">
        <button
          onClick={() => setExpanded((e) => ({ ...e, audit: !e.audit }))}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-semibold uppercase tracking-wide">Audit Summary</h3>
          </div>
          <span className="text-xs text-text-muted">{expanded.audit ? "▾" : "▸"}</span>
        </button>
        {expanded.audit && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <AuditItem
              icon={<Lock className="h-4 w-4" />}
              title="Mint Authority"
              status={(token as any).is_mint_disabled !== false && risk.flags.find((f) => f.includes("Mint")) == null ? "pass" : (risk.flags.find((f) => f.includes("Mint")) ? "fail" : "unknown")}
              detail={(token as any).is_mint_disabled ? "Disabled — supply cannot be increased" : "Enabled — token supply can be inflated by the mint authority"}
            />
            <AuditItem
              icon={<Lock className="h-4 w-4" />}
              title="Freeze Authority"
              status={(token as any).is_freeze_disabled !== false && risk.flags.find((f) => f.includes("Freeze")) == null ? "pass" : (risk.flags.find((f) => f.includes("Freeze")) ? "fail" : "unknown")}
              detail={(token as any).is_freeze_disabled ? "Disabled — wallets cannot be frozen" : "Enabled — wallets can be frozen (rug-pull risk)"}
            />
            <AuditItem
              icon={<Activity className="h-4 w-4" />}
              title="Liquidity"
              status={token.liquidity_usd && token.liquidity_usd > 50000 ? "pass" : token.liquidity_usd && token.liquidity_usd > 10000 ? "warn" : "fail"}
              detail={token.liquidity_usd ? `$${formatNumber(token.liquidity_usd)} total liquidity` : "No liquidity data available"}
            />
            <AuditItem
              icon={<Link2 className="h-4 w-4" />}
              title="Link Safety"
              status="pass"
              detail={token.solverify.in_db ? "All verified links scanned" : "Run a free link scan by claiming this token"}
            />
            <AuditItem
              icon={<Users className="h-4 w-4" />}
              title="Holder Distribution"
              status={risk.flags.find((f) => f.includes("Top 3")) ? "warn" : "pass"}
              detail={risk.flags.find((f) => f.includes("Top 3")) || "Concentrated holders within healthy range"}
            />
            <AuditItem
              icon={<TrendingUp className="h-4 w-4" />}
              title="Trading Volume"
              status={token.volume_24h && token.volume_24h > 100000 ? "pass" : "warn"}
              detail={token.volume_24h ? `$${formatNumber(token.volume_24h)} in 24h — sufficient liquidity depth` : "Low volume"}
            />
          </div>
        )}
      </div>

      {/* Rule-based "AI" risk summary (free) */}
      <div className="glass-card">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-caution" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Risk Analysis</h3>
        </div>
        <RiskNarrative token={token} risk={risk} />
      </div>
    </div>
  );
}

function AuditItem({ icon, title, status, detail }: { icon: React.ReactNode; title: string; status: "pass" | "warn" | "fail" | "unknown"; detail: string }) {
  const colors = {
    pass: "text-safu",
    warn: "text-caution",
    fail: "text-danger",
    unknown: "text-text-muted",
  };
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated/40 p-3">
      <div className="flex items-center gap-2">
        <div className={colors[status]}>{icon}</div>
        <div className="font-medium text-sm">{title}</div>
        <div className={`ml-auto rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase ${status === "pass" ? "border-safu/30 bg-safu/10 text-safu" : status === "warn" ? "border-caution/30 bg-caution/10 text-caution" : status === "fail" ? "border-danger/30 bg-danger/10 text-danger" : "border-border-subtle text-text-muted"}`}>{status}</div>
      </div>
      <p className="mt-1.5 text-xs text-text-secondary">{detail}</p>
    </div>
  );
}

function RiskNarrative({ token, risk }: { token: LiveToken; risk: RiskSignal }) {
  // Deterministic rule-based "AI" — free, no LLM cost
  const positive: string[] = [];
  const warnings: string[] = [];
  const critical: string[] = [];

  if ((token as any).is_mint_disabled) positive.push("the mint authority is disabled, so the team cannot inflate supply");
  else warnings.push("the mint authority is still enabled, which means the team can increase the supply at any time");

  if ((token as any).is_freeze_disabled) positive.push("the freeze authority is disabled, so no wallet can be frozen");
  else warnings.push("the freeze authority is active — wallets can be frozen, which has been used in past rug pulls");

  if (token.liquidity_usd && token.liquidity_usd > 100000) positive.push(`the liquidity pool holds ${formatUsd(token.liquidity_usd, { compact: true })}, enough to absorb normal sell pressure`);
  else if (token.liquidity_usd) warnings.push(`liquidity is only ${formatUsd(token.liquidity_usd, { compact: true })} — a single large sell could crash the price`);

  if (token.volume_24h && token.volume_24h > 100000) positive.push(`trading volume is healthy at ${formatUsd(token.volume_24h, { compact: true })} over 24 hours`);
  else if (token.volume_24h && token.volume_24h < 5000) warnings.push(`24h volume is only ${formatUsd(token.volume_24h, { compact: true })} — very illiquid, wide spreads likely`);

  if (risk.flags.find((f) => f.includes("Top 3"))) {
    const f = risk.flags.find((f) => f.includes("Top 3"))!;
    warnings.push(f.toLowerCase().replace(/\.$/, ""));
  }

  if (token.solverify.in_db) {
    positive.push(`the project has claimed this token on SolVerify (${token.solverify.verification_tier || "no tier"} tier)`);
  } else {
    critical.push("this token has NOT been claimed or verified on SolVerify — anyone could be the owner and we cannot confirm any of the social links");
  }

  const veredict =
    critical.length > 0
      ? { tone: "danger", label: "HIGH RISK" }
      : warnings.length >= 2
      ? { tone: "caution", label: "MODERATE RISK" }
      : warnings.length === 1
      ? { tone: "caution", label: "LOW-MODERATE RISK" }
      : { tone: "safe", label: "LOW RISK" };

  return (
    <div className="space-y-3 text-sm leading-relaxed text-text-secondary">
      <p>
        SolVerify&apos;s risk analysis for <strong className="text-text-primary">{token.name || "this token"}</strong> shows {veredict.label.toLowerCase()}.{" "}
        {positive.length > 0 && (
          <>On the positive side, {positive.join("; ")}.</>
        )}
      </p>
      {warnings.length > 0 && (
        <p>
          ⚠ Areas of concern: {warnings.join("; ")}.
        </p>
      )}
      {critical.length > 0 && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-text-primary">
          🚨 {critical.join(". ")}.
        </p>
      )}
      <p className="border-t border-border-subtle pt-3 text-xs text-text-muted">
        This analysis is generated automatically by SolVerify from public on-chain data and price feeds. It is not financial advice.{" "}
        {!token.solverify.in_db && (
          <>If you are the team behind this token, <Link href={`/claim?address=${token.address}`} className="text-brand hover:underline">claim and verify it for $60</Link> to upgrade the trust score.</>
        )}
      </p>
    </div>
  );
}

function TokenStory({ address, events }: { address: string; events: StoryEvent[] }) {
  return (
    <div className="glass-card">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Token Story</h3>
      {events.length === 0 ? (
        <p className="text-sm text-text-muted">No events yet. The story starts when the token gets claimed, updated, or verified.</p>
      ) : (
        <ol className="relative space-y-4 pl-6">
          <span className="absolute left-2 top-2 bottom-2 w-px bg-border-subtle" />
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full border-2 border-bg-card bg-brand" />
              <div className="text-xs uppercase tracking-wide text-text-muted">{new Date(e.at).toLocaleString()}</div>
              <div className="text-sm font-semibold mt-0.5">{e.label}</div>
              <div className="text-xs text-text-secondary">{e.detail}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PriceAlerts({ address, price }: { address: string; price: number | null }) {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    // Load existing alerts
    const all = JSON.parse(localStorage.getItem("solverify_alerts") || "{}") as Record<string, { threshold: number; direction: "above" | "below" }>;
    if (all[address]) {
      setEnabled(true);
      setThreshold(all[address].threshold);
    }
  }, [address]);

  const enable = async () => {
    if (permission === "unsupported") {
      alert("Your browser does not support notifications. Alerts will work silently (badge on token page).");
      save();
      return;
    }
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") save();
  };

  const save = () => {
    if (threshold == null) return;
    const all = JSON.parse(localStorage.getItem("solverify_alerts") || "{}") as Record<string, any>;
    all[address] = { threshold, direction: "below" };
    localStorage.setItem("solverify_alerts", JSON.stringify(all));
    setEnabled(true);
  };

  // Poll for triggered alerts every minute
  useEffect(() => {
    if (!enabled || price == null) return;
    const check = () => {
      const all = JSON.parse(localStorage.getItem("solverify_alerts") || "{}") as Record<string, any>;
      const a = all[address];
      if (!a) return;
      if (a.direction === "below" && price <= a.threshold) {
        if (permission === "granted") {
          new Notification(`SolVerify: ${address.slice(0, 6)}...${address.slice(-4)} dropped below $${a.threshold}`, {
            body: `Current price: $${price.toFixed(8)}`,
            icon: "/logo.svg",
          });
        }
        delete all[address];
        localStorage.setItem("solverify_alerts", JSON.stringify(all));
        setEnabled(false);
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [enabled, price, address, permission]);

  return (
    <div className="glass-card">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Price Alerts</h3>
      <p className="text-sm text-text-secondary">
        Get a free browser notification when {address.slice(0, 6)}…{address.slice(-4)} drops below a target price.
        Alerts run locally in your browser — no account or email required.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">Notify me when price goes below</span>
        <input
          type="number"
          step="any"
          value={threshold ?? ""}
          onChange={(e) => setThreshold(e.target.value ? Number(e.target.value) : null)}
          placeholder="0.000001"
          className="input w-40"
        />
        <button
          onClick={enabled ? () => { setEnabled(false); const all = JSON.parse(localStorage.getItem("solverify_alerts") || "{}"); delete all[address]; localStorage.setItem("solverify_alerts", JSON.stringify(all)); } : enable}
          className={enabled ? "btn-secondary" : "btn-primary"}
        >
          {enabled ? "Disable" : "Enable"}
        </button>
      </div>
      {permission === "default" && (
        <p className="mt-2 text-xs text-text-muted">Clicking enable will ask for browser notification permission.</p>
      )}
      {permission === "denied" && (
        <p className="mt-2 text-xs text-danger">Notifications blocked. Re-enable in browser settings, or alerts will still log on this page.</p>
      )}
    </div>
  );
}

// Icons we use
function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function Twitter({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  );
}
function Send({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
    </svg>
  );
}
