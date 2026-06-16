// =============================================================================
// SolVerify — lib/rug-scanner.ts
// On-chain risk detection via public Solana RPC + GeckoTerminal
// Quick scan only (1 RPC call per token) — production can add more depth
// =============================================================================

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { SOLANA_RPC } from "./constants";
import { getTokenPools } from "./feed";

export type RiskLevel = "low" | "caution" | "high" | "unknown";

export interface RiskSignal {
  level: RiskLevel;
  flags: string[];
  positive: string[];
  // Convenience: severity score 0-100 (0 = safe, 100 = definitely rugged)
  score: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min cache (mint/freeze rarely change)
const cache = new Map<string, { value: RiskSignal; expires: number }>();

function getCached(addr: string): RiskSignal | null {
  const e = cache.get(addr);
  if (!e) return null;
  if (e.expires < Date.now()) {
    cache.delete(addr);
    return null;
  }
  return e.value;
}

let _conn: Connection | null = null;
function conn(): Connection {
  if (!_conn) _conn = new Connection(SOLANA_RPC, "confirmed");
  return _conn;
}

// =============================================================================
// Quick risk scan
// Returns aggregated risk level + flags
// =============================================================================
export async function scanRisk(address: string): Promise<RiskSignal> {
  const hit = getCached(address);
  if (hit) return hit;

  const flags: string[] = [];
  const positive: string[] = [];
  let score = 0;

  // Try mint info first
  try {
    const pubkey = new PublicKey(address);
    const mint = await getMint(conn(), pubkey, "confirmed").catch(() => null);
    if (mint) {
      if (mint.mintAuthority !== null) {
        flags.push("Mint authority active — supply can be increased");
        score += 35;
      } else {
        positive.push("Mint authority disabled");
        score -= 5;
      }
      if (mint.freezeAuthority !== null) {
        flags.push("Freeze authority active — wallets can be frozen");
        score += 30;
      } else {
        positive.push("Freeze authority disabled");
        score -= 3;
      }
    }
  } catch (e) {
    // Non-mint or RPC failure — fall through to holders check
  }

  // Holders concentration (use getTokenLargestAccounts on the connection)
  try {
    const pubkey = new PublicKey(address);
    const largest = await conn().getTokenLargestAccounts(pubkey, "confirmed").catch(() => null);
    if (largest && Array.isArray((largest as any).value) && (largest as any).value.length > 0) {
      const accounts: any[] = (largest as any).value;
      const totalUi = accounts.reduce((s, a) => s + Number(a.uiAmount || 0), 0);
      if (totalUi > 0) {
        // Top 3 concentration
        const top3 = accounts.slice(0, 3).reduce((s, a) => s + Number(a.uiAmount || 0), 0);
        const pct = (top3 / totalUi) * 100;
        if (pct > 60) {
          flags.push(`Top 3 wallets hold ${pct.toFixed(0)}% of supply`);
          score += 20;
        } else if (pct > 40) {
          flags.push(`Top 3 wallets hold ${pct.toFixed(0)}% of supply`);
          score += 10;
        } else {
          positive.push(`Top 3 wallets hold only ${pct.toFixed(0)}%`);
        }
      }
    }
  } catch (e) {
    // No token accounts or RPC issue
  }

  // Determine level
  let level: RiskLevel = "low";
  if (score >= 50) level = "high";
  else if (score >= 25) level = "caution";
  else if (flags.length === 0 && positive.length === 0) level = "unknown";

  // Clamp score
  const clamped = Math.max(0, Math.min(100, score));

  const result: RiskSignal = { level, flags, positive, score: clamped };
  cache.set(address, { value: result, expires: Date.now() + CACHE_TTL_MS });
  return result;
}

// =============================================================================
// Bulk pre-warm cache (used by /api/feed)
// Returns a Map<address, RiskSignal> in the same order as input
// =============================================================================
export async function scanRiskBatch(addresses: string[]): Promise<Map<string, RiskSignal>> {
  const out = new Map<string, RiskSignal>();
  // De-dupe
  const unique = Array.from(new Set(addresses)).filter(Boolean);
  // Concurrency: 3 parallel — public RPC handles that
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 3) chunks.push(unique.slice(i, i + 3));
  for (const chunk of chunks) {
    const results = await Promise.all(chunk.map((a) => scanRisk(a).catch(() => null)));
    chunk.forEach((addr, i) => {
      const r = results[i];
      if (r) out.set(addr, r);
    });
  }
  return out;
}
