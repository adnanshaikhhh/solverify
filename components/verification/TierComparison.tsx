"use client";

import { Check, X } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SILVER_PRICE_USD, GOLD_PRICE_USD } from "@/lib/constants";

export function TierComparison() {
  const tiers = [
    {
      name: "Bronze",
      price: "Free",
      desc: "Free claim with wallet signature",
      color: "border-bronze/40",
      accent: "text-bronze",
      cta: "Claim Now",
      features: [
        { ok: true, text: "Cryptographic ownership claim" },
        { ok: true, text: "Edit all token metadata" },
        { ok: true, text: "Full audit log begins" },
        { ok: true, text: "Basic trust score displayed" },
        { ok: false, text: "Link safety scanning" },
        { ok: false, text: "Priority in search results" },
        { ok: false, text: "Embed widget access" },
        { ok: false, text: "API key access" },
      ],
    },
    {
      name: "Silver",
      price: `$${SILVER_PRICE_USD}`,
      desc: "All links verified clean",
      color: "border-silver/40",
      accent: "text-silver",
      cta: "Upgrade",
      features: [
        { ok: true, text: "Everything in Bronze" },
        { ok: true, text: "Full link safety scan" },
        { ok: true, text: "Priority in search results" },
        { ok: true, text: "Trust score boost" },
        { ok: true, text: "Remove \"Unverified\" warning" },
        { ok: false, text: "Manual admin review" },
        { ok: false, text: "Embed widget access" },
        { ok: false, text: "API key access" },
      ],
    },
    {
      name: "Gold",
      price: `$${GOLD_PRICE_USD}`,
      desc: "Manual review + on-chain verification",
      color: "border-gold/40",
      accent: "gold-shimmer",
      cta: "Get Verified",
      popular: true,
      features: [
        { ok: true, text: "Everything in Silver" },
        { ok: true, text: "Manual admin review" },
        { ok: true, text: "Full on-chain verification" },
        { ok: true, text: "Featured in Verified directory" },
        { ok: true, text: "Embed widget access" },
        { ok: true, text: "API key access" },
        { ok: true, text: "Competitor name alert" },
        { ok: true, text: "Maximum trust score boost" },
      ],
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {tiers.map((t) => (
        <GlassCard
          key={t.name}
          className={`relative ${t.popular ? `ring-2 ring-gold/40 ${t.color}` : t.color}`}
        >
          {t.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-xs font-bold text-bg-base">
              MOST POPULAR
            </div>
          )}
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">vs DexScreener $299-$499</div>
          <h3 className={`text-2xl font-bold ${t.accent}`}>{t.name}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-text-primary">{t.price}</span>
            {t.price !== "Free" && <span className="text-text-muted">USD</span>}
          </div>
          <p className="mt-1 text-sm text-text-secondary">{t.desc}</p>

          <ul className="mt-6 space-y-2.5">
            {t.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {f.ok ? (
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-safu" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-muted" />
                )}
                <span className={f.ok ? "text-text-primary" : "text-text-muted line-through"}>{f.text}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      ))}
    </div>
  );
}
