"use client";

import { useState, useMemo } from "react";
import { Link2, Copy, Check, Code, ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export default function WidgetGeneratorPage() {
  const [address, setAddress] = useState("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263");
  const [style, setStyle] = useState<"mini" | "card" | "banner" | "full">("card");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [copied, setCopied] = useState<string | null>(null);

  const imgUrl = useMemo(() => {
    return `https://solverify.vercel.app/api/v1/badge/${address}?style=${style}&theme=${theme}`;
  }, [address, style, theme]);

  const iframeCode = `<iframe src="https://solverify.vercel.app/widget/${address}?style=${style}" width="${style === "banner" ? 600 : style === "mini" ? 200 : 320}" height="${style === "banner" ? 120 : style === "mini" ? 40 : 110}" frameborder="0" style="border:0;border-radius:14px;overflow:hidden" loading="lazy"></iframe>`;

  const imgCode = `<img src="${imgUrl}" alt="SolVerify Trust Score" style="border-radius:14px" />`;

  const copy = (s: string, key: string) => {
    navigator.clipboard.writeText(s).catch(() => null);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Link2 className="h-7 w-7 text-brand" />
          Trust Badge Generator
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Embed your SolVerify trust score anywhere — your website, README, Twitter bio, Discord.
        </p>
      </div>

      <GlassCard>
        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Token address</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          className="input mt-2 font-mono"
        />

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["mini", "card", "banner", "full"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`rounded-xl border p-3 text-sm capitalize transition-colors ${
                style === s ? "border-brand bg-brand/20 text-brand" : "border-border-subtle bg-bg-elevated text-text-secondary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`rounded-lg border px-3 py-1.5 text-xs capitalize transition-colors ${
                theme === t ? "border-brand bg-brand/20 text-brand" : "border-border-subtle bg-bg-elevated text-text-muted"
              }`}
            >
              {t} theme
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Live Preview</h3>
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgUrl} alt="Trust badge preview" />
            {style === "full" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`https://solverify.vercel.app/api/v1/badge/${address}?style=card&theme=${theme}`} alt="" />
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Embed code</h3>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                <span>Image (lightest, works everywhere)</span>
                <button onClick={() => copy(imgCode, "img")} className="inline-flex items-center gap-1 text-brand">
                  {copied === "img" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === "img" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-border-subtle bg-bg-elevated p-3 text-xs font-mono whitespace-pre-wrap break-all">{imgCode}</pre>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                <span>iFrame (interactive, slightly heavier)</span>
                <button onClick={() => copy(iframeCode, "iframe")} className="inline-flex items-center gap-1 text-brand">
                  {copied === "iframe" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === "iframe" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-border-subtle bg-bg-elevated p-3 text-xs font-mono whitespace-pre-wrap break-all">{iframeCode}</pre>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
          <Code className="h-4 w-4" />
          Chrome / Firefox userscript — add SolVerify badges to DexScreener
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          Install Tampermonkey (free browser extension), then add this userscript. Whenever you visit a DexScreener token page, the SolVerify trust score will be overlaid automatically.
        </p>
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-border-subtle bg-bg-elevated p-3 text-xs font-mono whitespace-pre-wrap break-all">
{`// ==UserScript==
// @name         SolVerify Trust Overlay for DexScreener
// @namespace    solverify
// @version      1.0
// @description  Show SolVerify trust score on DexScreener token pages
// @match        https://dexscreener.com/solana/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  const m = window.location.pathname.match(/\\/solana\\/([1-9A-HJ-NP-Za-km-z]+)/);
  if (!m) return;
  const address = m[1];
  const img = document.createElement('img');
  img.src = 'https://solverify.vercel.app/api/v1/badge/' + address + '?style=card&theme=dark';
  img.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.4);border-radius:14px';
  img.alt = 'SolVerify Trust Score';
  document.body.appendChild(img);
})();`}
        </pre>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => copy(`// ==UserScript==\n// @name         SolVerify Trust Overlay for DexScreener\n// @namespace    solverify\n// @version      1.0\n// @description  Show SolVerify trust score on DexScreener token pages\n// @match        https://dexscreener.com/solana/*\n// @grant        none\n// @run-at       document-end\n// ==/UserScript==\n\n(function () {\n  const m = window.location.pathname.match(/\\\\/solana\\\\/([1-9A-HJ-NP-Za-km-z]+)/);\n  if (!m) return;\n  const address = m[1];\n  const img = document.createElement('img');\n  img.src = 'https://solverify.vercel.app/api/v1/badge/' + address + '?style=card&theme=dark';\n  img.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.4);border-radius:14px';\n  img.alt = 'SolVerify Trust Score';\n  document.body.appendChild(img);\n})();`, "script")}
            className="btn-secondary"
          >
            {copied === "script" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy userscript
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
