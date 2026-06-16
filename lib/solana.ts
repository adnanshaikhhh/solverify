// =============================================================================
// SolVerify — lib/solana.ts
// Solana-specific helpers (validation, price fetches)
// =============================================================================

import { PublicKey } from "@solana/web3.js";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

export function isValidSolanaAddress(addr: string): boolean {
  if (!addr) return false;
  if (!BASE58.test(addr)) return false;
  if (addr.length < 32 || addr.length > 44) return false;
  try {
    const k = new PublicKey(addr);
    return k.toBase58() === addr;
  } catch {
    return false;
  }
}

export async function getSolUsdPrice(): Promise<number> {
  try {
    const res = await fetch("https://price.jup.ag/v4/price?ids=SOL", { cache: "no-store" });
    if (!res.ok) return 0;
    const data = (await res.json()) as { data?: { SOL?: { price: number } } };
    return data.data?.SOL?.price ?? 0;
  } catch {
    return 0;
  }
}

export function solToLamports(sol: number): number {
  return Math.round(sol * 1_000_000_000);
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}
