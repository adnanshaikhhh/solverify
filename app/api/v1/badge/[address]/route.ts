// =============================================================================
// app/api/v1/badge/[address]/route.ts — Free Trust Badge SVG generator
// Returns an inline SVG badge suitable for img src in any website
// =============================================================================

import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-server";
import { isValidSolanaAddress } from "@/lib/solana";
import { handleError, jsonError } from "@/lib/utils";
import { getTrustGrade } from "@/lib/trust-score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  SAFU:    { bg: "#10B981", fg: "#0A1F18", border: "#10B981" },
  Trusted: { bg: "#3B82F6", fg: "#0F172A", border: "#3B82F6" },
  Caution: { bg: "#F59E0B", fg: "#1F1300", border: "#F59E0B" },
  Risky:   { bg: "#F97316", fg: "#1F0A00", border: "#F97316" },
  Danger:  { bg: "#EF4444", fg: "#1F0000", border: "#EF4444" },
  None:    { bg: "#1E1E2E", fg: "#94A3B8", border: "#3A3A5C" },
};

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  try {
    if (!isValidSolanaAddress(params.address)) {
      return new Response(renderErrorSvg("Invalid address"), {
        status: 400,
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" },
      });
    }
    const { searchParams } = new URL(req.url);
    const style = searchParams.get("style") || "card";
    const theme = searchParams.get("theme") || "dark";

    const db = getSupabaseService();
    const { data: token } = await db.from("tokens").select("name, symbol, trust_score, verification_tier, claim_status").eq("contract_address", params.address).maybeSingle();

    const score = token?.trust_score;
    const grade = score != null ? getTrustGrade(score) : "None";
    const colors = COLORS[grade];

    const svg = style === "mini" ? renderMini(params.address, score, grade, colors) :
                style === "banner" ? renderBanner(params.address, token, score, grade, colors) :
                renderCard(params.address, token, score, grade, colors, theme);

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

function escape(s: string): string {
  return (s || "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function renderCard(addr: string, token: any, score: number | null | undefined, grade: string, c: any, theme: string): string {
  const bg = theme === "light" ? "#F1F5F9" : "#0D0D14";
  const fg = theme === "light" ? "#0F172A" : "#F1F5F9";
  const muted = theme === "light" ? "#64748B" : "#94A3B8";
  const cardBg = theme === "light" ? "#FFFFFF" : "#11111A";
  const cardBorder = theme === "light" ? "#E2E8F0" : "#1E1E2E";
  const name = token?.name || "Unknown";
  const symbol = token?.symbol || "—";
  const scoreText = score != null ? `${score}` : "—";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="100" viewBox="0 0 280 100">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="280" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="${cardBg}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="280" height="100" rx="14" fill="url(#bg)" stroke="${cardBorder}"/>
  <rect x="1" y="0" width="4" height="100" fill="${c.bg}"/>
  <text x="22" y="30" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="700" fill="${fg}">${escape(name)}</text>
  <text x="22" y="48" font-family="Inter, system-ui, sans-serif" font-size="11" fill="${muted}">$${escape(symbol)} · ${addr.slice(0,4)}...${addr.slice(-4)}</text>
  <g transform="translate(195, 22)">
    <rect x="0" y="0" width="60" height="60" rx="30" fill="none" stroke="${c.border}" stroke-width="3"/>
    <text x="30" y="32" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="18" font-weight="800" fill="${c.bg}">${scoreText}</text>
    <text x="30" y="46" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="8" font-weight="700" fill="${c.bg}">${grade.toUpperCase()}</text>
  </g>
  <text x="22" y="78" font-family="Inter, system-ui, sans-serif" font-size="9" fill="${muted}">Verified by SolVerify · solverify.vercel.app</text>
</svg>`;
}

function renderMini(addr: string, score: number | null | undefined, grade: string, c: any): string {
  const scoreText = score != null ? `${score}` : "—";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="36" viewBox="0 0 180 36">
  <rect x="0" y="0" width="180" height="36" rx="18" fill="#0D0D14" stroke="${c.border}"/>
  <path d="M18 8 L26 12 V20 C26 25 22 28 18 30 C14 28 10 25 10 20 V12 Z" fill="${c.bg}" opacity="0.2" stroke="${c.border}" stroke-width="1.5" fill-opacity="1"/>
  <text x="18" y="22" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="800" fill="${c.bg}">S</text>
  <text x="40" y="22" font-family="JetBrains Mono, monospace" font-size="14" font-weight="800" fill="#F1F5F9">${scoreText}</text>
  <text x="80" y="22" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="600" fill="${c.bg}">${grade.toUpperCase()}</text>
  <text x="40" y="32" font-family="Inter, system-ui, sans-serif" font-size="8" fill="#94A3B8">SolVerify</text>
</svg>`;
}

function renderBanner(addr: string, token: any, score: number | null | undefined, grade: string, c: any): string {
  const name = token?.name || "Unknown";
  const symbol = token?.symbol || "—";
  const scoreText = score != null ? `${score}` : "—";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120" viewBox="0 0 600 120">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="600" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0D0D14"/>
      <stop offset="1" stop-color="#11111A"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="600" height="120" rx="16" fill="url(#bg)" stroke="${c.border}" stroke-width="1.5"/>
  <rect x="2" y="2" width="6" height="116" fill="${c.bg}"/>
  <text x="32" y="40" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="800" fill="#F1F5F9">${escape(name)} <tspan fill="#94A3B8" font-size="14" font-weight="500">$${escape(symbol)}</tspan></text>
  <text x="32" y="64" font-family="JetBrains Mono, monospace" font-size="11" fill="#94A3B8">${addr.slice(0,8)}...${addr.slice(-8)}</text>
  <g transform="translate(440, 30)">
    <rect x="0" y="0" width="120" height="60" rx="8" fill="${c.bg}" opacity="0.15"/>
    <text x="60" y="34" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="28" font-weight="800" fill="${c.bg}">${scoreText}</text>
    <text x="60" y="52" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700" fill="${c.bg}">${grade.toUpperCase()}</text>
  </g>
  <text x="32" y="100" font-family="Inter, system-ui, sans-serif" font-size="11" fill="#94A3B8">Verified by SolVerify · solverify.vercel.app</text>
</svg>`;
}

function renderErrorSvg(msg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><rect width="200" height="60" rx="8" fill="#0D0D14"/><text x="100" y="35" text-anchor="middle" font-family="Inter" font-size="12" fill="#EF4444">${escape(msg)}</text></svg>`;
}
