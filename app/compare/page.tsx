"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GitCompare, ArrowRight, ExternalLink, Shield, X, Plus } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { TrustScoreGauge } from "@/components/trust/TrustScoreGauge";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { formatUsd, formatNumber, cn } from "@/lib/utils";
import { Suspense } from "react";

function CompareInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [a, setA] = useState(sp.get("a") || "");
  const [b, setB] = useState(sp.get("b") || "");
  const [dataA, setDataA] = useState<any>(null);
  const [dataB, setDataB] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!a || !b) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/token/${a}/live`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/token/${b}/live`).then((r) => r.ok ? r.json() : null),
    ]).then(([da, db]) => {
      setDataA(da);
      setDataB(db);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [a, b]);

  const setPair = (na: string, nb: string) => {
    setA(na);
    setB(nb);
    router.replace(`/compare?a=${na}&b=${nb}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <GitCompare className="h-7 w-7 text-brand" />
          Compare Tokens
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Side-by-side trust score, risk, and market data for any two Solana tokens.
        </p>
      </div>

      <GlassCard>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr]">
          <input
            value={a}
            onChange={(e) => setA(e.target.value.trim())}
            placeholder="Token A address"
            className="input font-mono"
          />
          <div className="flex items-center justify-center text-text-muted">
            <span className="rounded-full border border-border-subtle bg-bg-elevated p-1.5">VS</span>
          </div>
          <input
            value={b}
            onChange={(e) => setB(e.target.value.trim())}
            placeholder="Token B address"
            className="input font-mono"
          />
        </div>
        {(a || b) && (
          <div className="mt-3 flex justify-end">
            <button onClick={() => { setA(""); setB(""); setDataA(null); setDataB(null); router.replace("/compare"); }} className="btn-ghost text-xs">
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        )}
      </GlassCard>

      {loading && <GlassCard><p className="text-text-muted">Loading comparison...</p></GlassCard>}

      {dataA && dataB && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <TokenCompareCard
            side="A"
            data={dataA}
            address={a}
            other={dataB}
          />
          <TokenCompareCard
            side="B"
            data={dataB}
            address={b}
            other={dataA}
          />
        </div>
      )}

      {dataA && dataB && (
        <CompareVerdict a={dataA} b={dataB} />
      )}

      {!a || !b ? (
        <GlassCard>
          <p className="text-sm text-text-secondary">
            Try it: <button onClick={() => setPair("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN")} className="text-brand hover:underline">Bonk vs Jupiter</button>{" "}
            or <button onClick={() => setPair("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")} className="text-brand hover:underline">Bonk vs SAMO</button>
          </p>
        </GlassCard>
      ) : null}
    </div>
  );
}

function TokenCompareCard({ side, data, address, other }: { side: string; data: any; address: string; other: any }) {
  const t = data.token;
  const r = data.risk;
  const tier = t.solverify.verification_tier || "none";
  const claimStatus = t.solverify.claim_status || "unclaimed";
  const oTier = other?.token?.solverify?.verification_tier || "none";

  const winner = (key: "score" | "liq" | "vol" | "mcap", a: number | null, b: number | null): "win" | "tie" | "loss" => {
    if (a == null && b == null) return "tie";
    if (a == null) return "loss";
    if (b == null) return "win";
    if (a > b) return "win";
    if (a < b) return "loss";
    return "tie";
  };

  const scoreWin = winner("score", t.solverify.trust_score, other?.token?.solverify?.trust_score);
  const liqWin = winner("liq", t.liquidity_usd, other?.token?.liquidity_usd);
  const volWin = winner("vol", t.volume_24h, other?.token?.volume_24h);
  const mcapWin = winner("mcap", t.market_cap, other?.token?.market_cap);

  return (
    <div className="glass-card relative">
      <div className="absolute right-3 top-3 rounded-full bg-brand/20 px-2 py-0.5 text-xs font-bold text-brand">{side}</div>
      <Link href={`/token/${address}`} className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-full bg-bg-elevated ring-1 ring-border-subtle">
          {t.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-text-muted">
              {(t.symbol || "?").slice(0, 2)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{t.name || "Unknown"}</span>
            <VerificationBadge tier={tier as any} status={claimStatus as any} size="sm" />
          </div>
          <div className="text-xs text-text-muted">${t.symbol}</div>
        </div>
      </Link>

      {t.solverify.trust_score != null && (
        <div className="mt-4 flex justify-center">
          <TrustScoreGauge score={t.solverify.trust_score} size="md" />
        </div>
      )}

      <div className="mt-4 space-y-2 text-sm">
        <CompareRow label="Trust Score" a={t.solverify.trust_score} b={other?.token?.solverify?.trust_score} win={scoreWin} format={(n) => n != null ? `${n}/100` : "—"} />
        <CompareRow label="Tier" a={tier} b={oTier} win={tier === "gold" ? "win" : tier === "none" ? "loss" : "tie"} format={(n) => n || "—"} />
        <CompareRow label="Price" a={t.price_usd} b={other?.token?.price_usd} win={t.price_usd && other?.token?.price_usd ? (t.price_usd > other.token.price_usd ? "win" : "loss") : "tie"} format={(n) => n != null ? formatUsd(n) : "—"} />
        <CompareRow label="24h Volume" a={t.volume_24h} b={other?.token?.volume_24h} win={volWin} format={(n) => n ? formatUsd(n, { compact: true }) : "—"} />
        <CompareRow label="Liquidity" a={t.liquidity_usd} b={other?.token?.liquidity_usd} win={liqWin} format={(n) => n ? formatUsd(n, { compact: true }) : "—"} />
        <CompareRow label="Market Cap" a={t.market_cap} b={other?.token?.market_cap} win={mcapWin} format={(n) => n ? formatUsd(n, { compact: true }) : "—"} />
        <CompareRow label="Risk Level" a={r?.level} b={other?.risk?.level} win={r?.level === "low" ? "win" : r?.level === "high" ? "loss" : "tie"} format={(n) => n || "—"} />
        <CompareRow label="Mint disabled" a={!r?.flags?.find((f: string) => f.includes("Mint")) ? "yes" : "no"} b={!other?.risk?.flags?.find((f: string) => f.includes("Mint")) ? "yes" : "no"} win={!r?.flags?.find((f: string) => f.includes("Mint")) ? "win" : "loss"} format={(n) => n} />
        <CompareRow label="Freeze disabled" a={!r?.flags?.find((f: string) => f.includes("Freeze")) ? "yes" : "no"} b={!other?.risk?.flags?.find((f: string) => f.includes("Freeze")) ? "yes" : "no"} win={!r?.flags?.find((f: string) => f.includes("Freeze")) ? "win" : "loss"} format={(n) => n} />
      </div>
    </div>
  );
}

function CompareRow({ label, a, b, win, format }: { label: string; a: any; b: any; win: "win" | "loss" | "tie"; format: (n: any) => string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border-subtle/50 bg-bg-elevated/30 px-3 py-2">
      <span className="text-text-muted">{label}</span>
      <span className={cn("font-mono font-semibold", win === "win" ? "text-safu" : win === "loss" ? "text-danger" : "text-text-primary")}>
        {format(a)} {win === "win" ? "↑" : win === "loss" ? "↓" : "="}
      </span>
    </div>
  );
}

function CompareVerdict({ a, b }: { a: any; b: any }) {
  const tA = a.token;
  const tB = b.token;
  const scoreA = tA.solverify.trust_score || 0;
  const scoreB = tB.solverify.trust_score || 0;
  const liqA = tA.liquidity_usd || 0;
  const liqB = tB.liquidity_usd || 0;
  const volA = tA.volume_24h || 0;
  const volB = tB.volume_24h || 0;
  const winsA = (scoreA > scoreB ? 1 : 0) + (liqA > liqB ? 1 : 0) + (volA > volB ? 1 : 0);
  const winsB = (scoreB > scoreA ? 1 : 0) + (liqB > liqA ? 1 : 0) + (volB > volA ? 1 : 0);

  let verdict = "Tie — both are roughly equivalent on key metrics.";
  if (winsA > winsB) verdict = `${tA.name || "Token A"} wins on ${winsA} of 3 key metrics (trust, liquidity, volume).`;
  if (winsB > winsA) verdict = `${tB.name || "Token B"} wins on ${winsB} of 3 key metrics (trust, liquidity, volume).`;

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Verdict</h3>
      <p className="mt-2 text-text-primary">{verdict}</p>
    </GlassCard>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="text-text-muted">Loading...</div>}>
      <CompareInner />
    </Suspense>
  );
}
