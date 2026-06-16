// =============================================================================
// SolVerify — lib/utils.ts
// Generic helpers: classnames, formatters, error responses
// =============================================================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Truncate a Solana address to 4...4 */
export function truncateAddress(addr: string, head = 4, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

/** Format a USD value */
export function formatUsd(n: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (opts.compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

/** Format a number with thousands separators */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

/** Format supply dividing by decimals */
export function formatSupply(totalSupply: string | null, decimals: number): string {
  if (!totalSupply) return "—";
  try {
    const supply = Number(BigInt(totalSupply) / BigInt(10 ** Math.min(decimals, 9)));
    if (supply >= 1_000_000_000) return `${(supply / 1_000_000_000).toFixed(2)}B`;
    if (supply >= 1_000_000) return `${(supply / 1_000_000).toFixed(2)}M`;
    if (supply >= 1_000) return `${(supply / 1_000).toFixed(2)}K`;
    return supply.toString();
  } catch {
    return "—";
  }
}

/** Standard JSON error response */
export function jsonError(message: string, status = 400, code?: string, details?: unknown) {
  return Response.json({ error: message, code, details }, { status });
}

/** Catch and log wrapper for route handlers */
export function handleError(e: unknown, fallback = "Internal server error") {
  console.error("[SolVerify API error]", e);
  if (e instanceof Error) return jsonError(e.message || fallback, 500);
  return jsonError(fallback, 500);
}

/** Tiny in-process rate limiter (per-process; fine for Vercel single-region) */
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Build a Solscan URL */
export function solscanUrl(type: "address" | "tx", value: string): string {
  const cluster = "mainnet"; // SolVerify is mainnet only
  const kind = type === "address" ? "account" : "tx";
  return `https://solscan.io/${kind}/${value}${cluster === "mainnet" ? "" : `?cluster=${cluster}`}`;
}

/** Build a DexScreener URL */
export function dexscreenerUrl(contractAddress: string): string {
  return `https://dexscreener.com/solana/${contractAddress}`;
}
