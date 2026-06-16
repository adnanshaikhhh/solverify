// =============================================================================
// SolVerify — lib/helius.ts
// Helius + Solana RPC integration: metadata, mint info, holders, payments
// =============================================================================

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { HELIUS_API_KEY, HELIUS_RPC, SOLANA_RPC } from "./constants";

function rpcUrl(): string {
  if (HELIUS_API_KEY) return HELIUS_RPC;
  return SOLANA_RPC;
}

let _conn: Connection | null = null;
function conn(): Connection {
  if (!_conn) _conn = new Connection(rpcUrl(), "confirmed");
  return _conn;
}

// =============================================================================
// Token metadata via Helius DAS
// =============================================================================
export interface HeliusTokenMetadata {
  name?: string;
  symbol?: string;
  uri?: string;
  creators?: Array<{ address: string; verified: boolean; share: number }>;
  updateAuthority?: string;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  supply?: string;
  decimals?: number;
  raw?: Record<string, unknown>;
}

export async function getTokenMetadata(mintAddress: string): Promise<HeliusTokenMetadata | null> {
  try {
    if (!HELIUS_API_KEY) return null;
    const res = await fetch("https://api.helius.xyz/v0/token-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mintAccounts: [mintAddress], includeOffChain: true }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<Record<string, unknown>>;
    if (!data.length) return null;
    const first = data[0] as Record<string, unknown>;
    const account = (first.account as Record<string, unknown> | undefined) || {};
    const onChain = (account.onChain as Record<string, unknown> | undefined) || {};
    const offChain = (account.offChain as Record<string, unknown> | undefined) || {};
    const meta = (offChain.metadata as Record<string, unknown> | undefined) || {};

    return {
      name: (meta.name as string) || (first.name as string) || undefined,
      symbol: (meta.symbol as string) || (first.symbol as string) || undefined,
      uri: (meta.uri as string) || (first.uri as string) || undefined,
      creators: (first.creators as HeliusTokenMetadata["creators"]) || [],
      updateAuthority: (first.updateAuthority as string) || undefined,
      mintAuthority: (onChain.mintAuthority as string | null) ?? null,
      freezeAuthority: (onChain.freezeAuthority as string | null) ?? null,
      supply: (onChain.supply as string) || undefined,
      decimals: (onChain.decimals as number) || undefined,
      raw: first,
    };
  } catch (e) {
    console.error("[getTokenMetadata] error", e);
    return null;
  }
}

// =============================================================================
// Mint info via getMint
// =============================================================================
export interface TokenMintInfo {
  supply: string;
  decimals: number;
  isInitialized: boolean;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isMintDisabled: boolean;
  isFreezeDisabled: boolean;
}

export async function getTokenMintInfo(mintAddress: string): Promise<TokenMintInfo | null> {
  try {
    const pubkey = new PublicKey(mintAddress);
    const info = await getMint(conn(), pubkey, "confirmed");
    return {
      supply: info.supply.toString(),
      decimals: info.decimals,
      isInitialized: info.isInitialized,
      mintAuthority: info.mintAuthority ? info.mintAuthority.toBase58() : null,
      freezeAuthority: info.freezeAuthority ? info.freezeAuthority.toBase58() : null,
      isMintDisabled: info.mintAuthority === null,
      isFreezeDisabled: info.freezeAuthority === null,
    };
  } catch (e) {
    console.error("[getTokenMintInfo] error", e);
    return null;
  }
}

// =============================================================================
// Top holders
// =============================================================================
export interface HolderInfo {
  address: string;
  amount: string;
  uiAmount: number;
  pct: number;
}

export async function getTokenHolders(
  mintAddress: string,
  limit = 10
): Promise<HolderInfo[]> {
  try {
    const pubkey = new PublicKey(mintAddress);
    const resp = await conn().getTokenLargestAccounts(pubkey, "confirmed");
    const accounts = (resp && (resp as any).value) ? resp : { value: (resp as any) };
    const list = (accounts.value as Array<{ address: PublicKey; amount: string; uiAmount: number | null }>) || [];
    const totalUi = list.reduce((acc, a) => acc + Number(a.uiAmount || 0), 0);
    return list.slice(0, limit).map((a) => ({
      address: typeof a.address === "string" ? a.address : a.address.toBase58(),
      amount: a.amount,
      uiAmount: Number(a.uiAmount || 0),
      pct: totalUi > 0 ? (Number(a.uiAmount || 0) / totalUi) * 100 : 0,
    }));
  } catch (e) {
    console.error("[getTokenHolders] error", e);
    return [];
  }
}

// =============================================================================
// Verify creator wallet
// =============================================================================
export interface CreatorVerification {
  isCreator: boolean;
  method: "creator_wallet" | "update_authority" | "largest_holder" | null;
  updateAuthority?: string;
  topHolder?: string;
}

export async function verifyCreatorWallet(
  mintAddress: string,
  wallet: string
): Promise<CreatorVerification> {
  try {
    const meta = await getTokenMetadata(mintAddress);
    if (meta) {
      if (meta.creators && meta.creators.length > 0) {
        const isCreator = meta.creators.some(
          (c) => c.address === wallet && c.verified
        );
        if (isCreator) {
          return { isCreator: true, method: "creator_wallet", updateAuthority: meta.updateAuthority };
        }
      }
      if (meta.updateAuthority === wallet) {
        return { isCreator: true, method: "update_authority", updateAuthority: meta.updateAuthority };
      }
    }
    // Fallback: largest holder
    const holders = await getTokenHolders(mintAddress, 1);
    if (holders.length > 0 && holders[0].address === wallet) {
      return { isCreator: true, method: "largest_holder", topHolder: holders[0].address };
    }
    return { isCreator: false, method: null, updateAuthority: meta?.updateAuthority };
  } catch (e) {
    console.error("[verifyCreatorWallet] error", e);
    return { isCreator: false, method: null };
  }
}

// =============================================================================
// Market data: try Helius, fall back to Jupiter price
// =============================================================================
export interface TokenMarketData {
  priceUsd: number | null;
  marketCapUsd: number | null;
  volume24h: number | null;
  source: "helius" | "jupiter" | "none";
}

export async function getTokenMarketData(mintAddress: string): Promise<TokenMarketData> {
  // Try Helius
  try {
    if (HELIUS_API_KEY) {
      const res = await fetch(
        `https://api.helius.xyz/v0/token-metadata?mint=${mintAddress}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        const priceUsd = Number(
          (data.price as number) ?? (data.priceUsd as number) ?? 0
        );
        const marketCapUsd = Number(
          (data.marketCap as number) ?? (data.marketCapUsd as number) ?? 0
        );
        if (priceUsd > 0) {
          return {
            priceUsd,
            marketCapUsd: marketCapUsd || null,
            volume24h: Number((data.volume24h as number) ?? 0) || null,
            source: "helius",
          };
        }
      }
    }
  } catch (e) {
    console.error("[getTokenMarketData/helius] error", e);
  }

  // Fallback: Jupiter
  try {
    const res = await fetch(`https://price.jup.ag/v4/price?ids=${mintAddress}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { data?: Record<string, { price: number }> };
      const item = data.data?.[mintAddress];
      if (item?.price) {
        return {
          priceUsd: item.price,
          marketCapUsd: null,
          volume24h: null,
          source: "jupiter",
        };
      }
    }
  } catch (e) {
    console.error("[getTokenMarketData/jupiter] error", e);
  }

  return { priceUsd: null, marketCapUsd: null, volume24h: null, source: "none" };
}

// =============================================================================
// Check payment received
// =============================================================================
export interface PaymentCheck {
  found: boolean;
  txSignature?: string;
  amount?: number;
  slot?: number;
  blockTime?: number;
}

export async function checkPaymentReceived(
  payerWallet: string,
  recipientWallet: string,
  expectedLamports: number,
  afterTimestamp: number
): Promise<PaymentCheck> {
  try {
    const recipient = new PublicKey(recipientWallet);
    const sigs = await conn().getSignaturesForAddress(recipient, { limit: 20 });
    for (const s of sigs) {
      if (!s.signature) continue;
      if (s.blockTime && s.blockTime * 1000 < afterTimestamp) continue;
      if (s.err) continue;

      const tx = await conn().getParsedTransaction(s.signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (!tx) continue;

      // Look for a transfer from payerWallet to recipientWallet
      for (const ix of tx.transaction.message.instructions) {
        const program = ix.programId.toBase58();
        if (program !== "11111111111111111111111111111111") continue;
        // System transfer
        if ("parsed" in ix && ix.parsed?.type === "transfer") {
          const info = ix.parsed.info;
          if (info.source === payerWallet && info.destination === recipientWallet) {
            const lamports = Number(info.lamports || 0);
            if (lamports >= expectedLamports) {
              return {
                found: true,
                txSignature: s.signature,
                amount: lamports / LAMPORTS_PER_SOL,
                slot: s.slot,
                blockTime: s.blockTime || undefined,
              };
            }
          }
        }
      }
    }
    return { found: false };
  } catch (e) {
    console.error("[checkPaymentReceived] error", e);
    return { found: false };
  }
}
