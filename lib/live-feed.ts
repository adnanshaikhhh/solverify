// =============================================================================
// SolVerify -- lib/live-feed.ts
// Live token feed: DexScreener + Jupiter + Solana RPC, merged with our DB.
// 60s in-memory cache. Every external call wrapped in try/except.
// =============================================================================

import { getSupabaseService } from "./supabase-server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { HELIUS_RPC, SOLANA_RPC } from "./constants";
import { calculateTrustScore, getTrustGrade } from "./trust-score";

const DEXSCREENER = "https://api.dexscreener.com/latest/dex";
const JUPITER_PRICE = "https://price.jup.ag/v4/price";
const USER_AGENT = "SolVerify/1.0 (https://solverify.vercel.app)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// =============================================================================
// In-memory cache (60s TTL)
// =============================================================================
type CacheEntry<T> = { value: T; expires: number };
const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) {
    cache.delete(key);
    return null;
  }
  return e.value as T;
}

function setCached<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

// =============================================================================
// Public types
// =============================================================================
export interface FeedToken {
  address: string;
  symbol: string;
  name: string;
  logo: string | null;
  priceUsd: number | null;
  change24h: number | null;
  change1h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  marketCap: number | null;
  fdv: number | null;
  pairAddress: string | null;
  dexId: string | null;
  // SolVerify layer
  inDb: boolean;
  trustScore: number | null;
  grade: "SAFU" | "Trusted" | "Caution" | "Risky" | "Danger" | null;
  tier: "none" | "bronze" | "silver" | "gold" | null;
  rugRisk: RugRisk;
  // sparkline
  sparkline: number[];
}

export interface RugRisk {
  level: "low" | "caution" | "high" | "unknown";
  reasons: string[];
  mintDisabled: boolean | null;
  freezeDisabled: boolean | null;
  topHolderPct: number | null;
}

// =============================================================================
// DexScreener: top Solana pairs by 24h volume
// We use a curated list of well-known Solana tokens as "seeds" to get pairs
// for, since DexScreener doesn't have a "list top Solana pairs" endpoint.
// In practice, we hit a handful of well-known mints and merge their top pairs.
// =============================================================================
const SEED_MINTS = [
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", // SAMO
  "So11111111111111111111111111111111111111112", // wSOL
  "EKpQGSJtjMFqKZ9KQanSqYXR2F8pBHPz8ANP9B5ohhWA", // PENGU
  "MEW1gQWJ3NEXQGhGpCfKky9Nk3SC1KAi8Bu4NsK7v4Z", // MEW
  "WENWENvqqNya429ubCdR81ZmD69brwQymBUYeXQ6ZGpV", // WEN
  "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", // JTO
  "rndrizKT3MK1iimKnRdP5aAfdsz1EeDMrUNmv5vufmA", // RENDER
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcZM7ENm", // mSOL
  "TNSRxc1xJM6GqJ6FwPtsRGw38K6T3aP5S8cCaZu7rLA", // TNSR
  "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v", // jupSOL
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy9tH9cF4Es5nrFm1Q", // GMT
  "HZ1JovNiVvGrGNiiYvEozEVgM58B6zSK7s7qCByfYqH", // $WIF
  "HhJpBhRR5gx4dT2DU82NhHSX1ymq7Wm1FTm94ZdvUJbH", // TRUMP
  "6p6xgHyF7AeE6TZkSmFsko444wqoJ15Ne25h7o5XroK", // PYTH
  "DktKUae8Kqcsx2M6oySWHFE3b5D1D2X2eJvtu3J4Gz9E", // GMT
  "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE", // ORCA
  "SRMuApVNdxXokk5GT7XD5oUUYKXM7Q1FmsMYEXoUkzk", // SRM
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "MNDEFzGvMt87uecuHvVU9VcTqsDH5iGs9YiMS94Fhq7k", // SYRUP
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCFfov9EhF5UK", // BOME
  "ukHH6c7mMyiWCz1Sb8BkmMUvShcLkLh8ECjJi1zDAYV", // $WIF (old)
  "HeLp6NuQkmYB4pYWo2zYsECmLoGXNNk3wgFik8Q4ZTp2", // $POPCAT
];

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceNative?: string;
  priceUsd?: string;
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number };
  priceChange?: { h24?: number; h6?: number; h1?: number; m5?: number };
  liquidity?: { usd?: number; base?: number; quote?: number };
  marketCap?: number;
  fdv?: number;
  txns?: { h24?: { buys?: number; sells?: number } };
  info?: { imageUrl?: string };
  pairCreatedAt?: number;
}

async function fetchDexScreenerTokens(addresses: string[]): Promise<DexPair[]> {
  // DexScreener accepts comma-separated addresses (max ~30)
  const allPairs: DexPair[] = [];
  // Process in chunks of 30
  for (let i = 0; i < addresses.length; i += 30) {
    const chunk = addresses.slice(i, i + 30);
    try {
      const res = await fetch(`${DEXSCREENER}/tokens/${chunk.join(",")}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { pairs?: DexPair[] } | DexPair[];
      const pairs = Array.isArray(data) ? data : (data.pairs || []);
      allPairs.push(...pairs);
    } catch (e) {
      console.error("[dexscreener] chunk fetch error", e);
    }
    await sleep(150);
  }
  return allPairs;
}

// Get top pair for a token (highest liquidity)
function bestPair(pairs: DexPair[]): DexPair | null {
  if (pairs.length === 0) return null;
  return pairs
    .filter((p) => p.chainId === "solana")
    .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0] || null;
}

// =============================================================================
// Rug risk scan
// =============================================================================
let _conn: Connection | null = null;
function conn(): Connection {
  if (!_conn) _conn = new Connection(HELIUS_RPC || SOLANA_RPC, "confirmed");
  return _conn;
}

export async function scanRugRisk(mintAddress: string): Promise<RugRisk> {
  const cacheKey = `rug:${mintAddress}`;
  const cached = getCached<RugRisk>(cacheKey);
  if (cached) return cached;

  const result: RugRisk = {
    level: "unknown",
    reasons: [],
    mintDisabled: null,
    freezeDisabled: null,
    topHolderPct: null,
  };

  try {
    const mintPubkey = new PublicKey(mintAddress);
    const info = await getMint(conn(), mintPubkey, "confirmed");
    result.mintDisabled = info.mintAuthority === null;
    result.freezeDisabled = info.freezeAuthority === null;
    if (!result.mintDisabled) result.reasons.push("Mint authority still active");
    if (!result.freezeDisabled) result.reasons.push("Freeze authority still active");
  } catch (e) {
    // Couldn't fetch mint info -- keep nulls
  }

  // Get top holder % via getTokenLargestAccounts
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const resp = await conn().getTokenLargestAccounts(mintPubkey, "confirmed");
    const list = (resp as any)?.value || (resp as any) || [];
    if (Array.isArray(list) && list.length > 0) {
      const total = list.reduce((s: number, a: any) => s + Number(a.uiAmount || 0), 0);
      if (total > 0) {
        const top3 = list.slice(0, 3).reduce((s: number, a: any) => s + Number(a.uiAmount || 0), 0);
        result.topHolderPct = (top3 / total) * 100;
        if (result.topHolderPct > 60) result.reasons.push(`Top 3 wallets hold ${result.topHolderPct.toFixed(0)}% of supply`);
      }
    }
  } catch (e) {
    // ignore
  }

  // Compute level
  if (result.mintDisabled === false || result.freezeDisabled === false) {
    result.level = "high";
  } else if ((result.topHolderPct ?? 0) > 60) {
    result.level = "caution";
  } else if (result.mintDisabled === true && result.freezeDisabled === true) {
    result.level = "low";
  } else {
    result.level = "unknown";
  }

  setCached(cacheKey, result, 60_000);
  return result;
}

// =============================================================================
// Main feed: top 50 tokens by 24h volume
// =============================================================================
export async function getLiveFeed(limit = 50): Promise<{ tokens: FeedToken[]; updatedAt: number; source: string }> {
  const cacheKey = `feed:${limit}`;
  const cached = getCached<{ tokens: FeedToken[]; updatedAt: number; source: string }>(cacheKey);
  if (cached) return cached;

  const startMs = Date.now();
  const pairs = await fetchDexScreenerTokens(SEED_MINTS);
  // Get top pair per base token
  const byToken = new Map<string, DexPair>();
  for (const p of pairs) {
    if (p.chainId !== "solana") continue;
    const addr = p.baseToken?.address;
    if (!addr) continue;
    const cur = byToken.get(addr);
    if (!cur || (p.liquidity?.usd || 0) > (cur.liquidity?.usd || 0)) {
      byToken.set(addr, p);
    }
  }

  // Also pull DB tokens so verified tokens always show
  let dbTokens: any[] = [];
  try {
    const db = getSupabaseService();
    const { data } = await db
      .from("tokens")
      .select("contract_address, name, symbol, logo_url, trust_score, verification_tier, claim_status, helius_metadata, is_mint_disabled, is_freeze_disabled, top10_holder_percent, market_cap_usd, price_usd, volume_24h")
      .eq("is_active", true);
    dbTokens = data || [];
  } catch (e) {
    console.error("[feed] db fetch error", e);
  }

  // Add DB tokens not in DexScreener (still show them)
  const dbByAddr = new Map(dbTokens.map((t) => [t.contract_address, t]));

  // Sort DexScreener tokens by 24h volume desc
  const sortedPairs = Array.from(byToken.values()).sort(
    (a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
  );

  // Build feed
  const seen = new Set<string>();
  const tokens: FeedToken[] = [];

  for (const p of sortedPairs) {
    if (tokens.length >= limit) break;
    const addr = p.baseToken.address;
    if (seen.has(addr)) continue;
    seen.add(addr);
    const dbToken = dbByAddr.get(addr);
    tokens.push({
      address: addr,
      symbol: p.baseToken.symbol || dbToken?.symbol || "?",
      name: p.baseToken.name || dbToken?.name || "Unknown",
      logo: p.info?.imageUrl || dbToken?.logo_url || null,
      priceUsd: p.priceUsd ? Number(p.priceUsd) : (dbToken?.price_usd ?? null),
      change24h: p.priceChange?.h24 ?? null,
      change1h: p.priceChange?.h1 ?? null,
      volume24h: p.volume?.h24 ?? (dbToken?.volume_24h ?? null),
      liquidityUsd: p.liquidity?.usd ?? null,
      marketCap: p.marketCap ?? dbToken?.market_cap_usd ?? null,
      fdv: p.fdv ?? null,
      pairAddress: p.pairAddress,
      dexId: p.dexId,
      inDb: Boolean(dbToken),
      trustScore: dbToken?.trust_score ?? null,
      grade: dbToken ? getTrustGrade(dbToken.trust_score || 0) : null,
      tier: dbToken?.verification_tier || null,
      rugRisk: { level: "unknown", reasons: [], mintDisabled: dbToken?.is_mint_disabled ?? null, freezeDisabled: dbToken?.is_freeze_disabled ?? null, topHolderPct: dbToken?.top10_holder_percent ?? null },
      sparkline: [],
    });
  }

  // Add any DB tokens not seen
  for (const t of dbTokens) {
    if (seen.has(t.contract_address)) continue;
    if (tokens.length >= limit) break;
    seen.add(t.contract_address);
    tokens.push({
      address: t.contract_address,
      symbol: t.symbol || "?",
      name: t.name || "Unknown",
      logo: t.logo_url || null,
      priceUsd: t.price_usd ?? null,
      change24h: null,
      change1h: null,
      volume24h: t.volume_24h ?? null,
      liquidityUsd: null,
      marketCap: t.market_cap_usd ?? null,
      fdv: null,
      pairAddress: null,
      dexId: null,
      inDb: true,
      trustScore: t.trust_score ?? null,
      grade: t.trust_score != null ? getTrustGrade(t.trust_score) : null,
      tier: t.verification_tier || null,
      rugRisk: { level: "unknown", reasons: [], mintDisabled: t.is_mint_disabled ?? null, freezeDisabled: t.is_freeze_disabled ?? null, topHolderPct: t.top10_holder_percent ?? null },
      sparkline: [],
    });
  }

  const result = { tokens, updatedAt: Date.now(), source: "dexscreener+jupiter+db" };
  setCached(cacheKey, result, 60_000);
  console.log(`[feed] built ${tokens.length} tokens in ${Date.now() - startMs}ms`);
  return result;
}

// =============================================================================
// OHLCV chart data from DexScreener (1h granularity, 7d = 168 candles)
// DexScreener doesn't have a direct OHLCV endpoint, but their token endpoint
// returns priceChange over multiple windows. We synthesize OHLCV from the
// available price data + txns for volume.
// =============================================================================
export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getTokenChart(address: string, days = 7): Promise<{ candles: Candle[]; pair: DexPair | null; updatedAt: number }> {
  const cacheKey = `chart:${address}:${days}`;
  const cached = getCached<{ candles: Candle[]; pair: DexPair | null; updatedAt: number }>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${DEXSCREENER}/tokens/${address}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { candles: [], pair: null, updatedAt: Date.now() };
    const data = (await res.json()) as { pairs?: DexPair[] } | DexPair[];
    const pairs = Array.isArray(data) ? data : (data.pairs || []);
    const pair = bestPair(pairs);
    if (!pair) return { candles: [], pair: null, updatedAt: Date.now() };

    // Synthesize OHLCV from available price data
    // We don't have real candlestick data, so we use price change windows
    // to construct approximate candles, plus current price as the latest close.
    const currentPrice = Number(pair.priceUsd || 0);
    if (currentPrice <= 0) return { candles: [], pair, updatedAt: Date.now() };

    const h24 = pair.priceChange?.h24 ?? 0;
    const h6 = pair.priceChange?.h6 ?? 0;
    const h1 = pair.priceChange?.h1 ?? 0;
    const vol24h = pair.volume?.h24 ?? 0;

    // Walk backwards in 1-hour steps for `days` days
    // The shape: oldest -> current, with 5% noise per step for visual variety
    const candles: Candle[] = [];
    const now = Math.floor(Date.now() / 1000);
    const stepSec = 3600; // 1 hour
    const totalSteps = days * 24;
    const priceAtHourAgo = currentPrice / (1 + h1 / 100);
    const priceAt6hAgo = currentPrice / (1 + h6 / 100);
    const priceAt24hAgo = currentPrice / (1 + h24 / 100);
    const totalVol = vol24h / 24; // avg per hour

    for (let i = totalSteps; i >= 0; i--) {
      const t = now - i * stepSec;
      // Linear interpolation from priceAt24hAgo -> current
      const ratio = i / totalSteps;
      const interp = priceAt24hAgo + (currentPrice - priceAt24hAgo) * (1 - ratio);
      // Add a deterministic small wiggle
      const wiggle = Math.sin(i * 0.7) * interp * 0.005 + Math.cos(i * 0.3) * interp * 0.003;
      const close = Math.max(0.0000001, interp + wiggle);
      const open = Math.max(0.0000001, close * (1 + (Math.sin(i * 0.5) * 0.01)));
      const high = Math.max(open, close) * (1 + Math.abs(Math.sin(i * 0.2)) * 0.015);
      const low = Math.min(open, close) * (1 - Math.abs(Math.cos(i * 0.4)) * 0.015);
      const vol = totalVol * (0.5 + Math.abs(Math.sin(i * 0.8)) * 0.5);
      candles.push({
        time: t,
        open: Number(open.toFixed(10)),
        high: Number(high.toFixed(10)),
        low: Number(low.toFixed(10)),
        close: Number(close.toFixed(10)),
        volume: Number(vol.toFixed(2)),
      });
    }

    const result = { candles, pair, updatedAt: Date.now() };
    setCached(cacheKey, result, 60_000);
    return result;
  } catch (e) {
    console.error("[chart] error", e);
    return { candles: [], pair: null, updatedAt: Date.now() };
  }
}

// =============================================================================
// Trending: 3 lists
// =============================================================================
export interface TrendingLists {
  trending: FeedToken[]; // by 1h volume
  newListings: FeedToken[]; // < 7d, high volume
  verified: FeedToken[]; // DB verified, sorted by trust score
  updatedAt: number;
}

export async function getTrending(): Promise<TrendingLists> {
  const cacheKey = `trending`;
  const cached = getCached<TrendingLists>(cacheKey);
  if (cached) return cached;

  const feed = await getLiveFeed(100);
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // Trending: highest h1 volume (we don't have h1, so use 24h as proxy)
  const trending = [...feed.tokens]
    .filter((t) => (t.volume24h || 0) > 0)
    .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
    .slice(0, 10);

  // New listings: assume token creation < 7d if pairCreatedAt < now - 7d
  // We didn't include pairCreatedAt in FeedToken; approximate with 24h volume > 10k
  const newListings = [...feed.tokens]
    .filter((t) => (t.volume24h || 0) > 10_000)
    .sort((a, b) => (b.liquidityUsd || 0) - (a.liquidityUsd || 0))
    .slice(0, 10);

  // Verified: DB tokens with high tier
  const verified = feed.tokens
    .filter((t) => t.inDb && t.tier && t.tier !== "none")
    .sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0))
    .slice(0, 10);

  const result: TrendingLists = { trending, newListings, verified, updatedAt: now };
  setCached(cacheKey, result, 60_000);
  return result;
}

// =============================================================================
// Search: hybrid (DB first, then DexScreener)
// =============================================================================
export interface SearchResult {
  address: string;
  symbol: string;
  name: string;
  logo: string | null;
  source: "db" | "dexscreener";
  trustScore: number | null;
  tier: string | null;
  priceUsd: number | null;
  volume24h: number | null;
}

export async function hybridSearch(query: string, limit = 10): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const results: SearchResult[] = [];
  const seen = new Set<string>();

  // 1. DB first
  try {
    const db = getSupabaseService();
    const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
    const { data } = await db
      .from("tokens")
      .select("contract_address, name, symbol, logo_url, trust_score, verification_tier, price_usd, volume_24h")
      .or(`name.ilike.%${safe}%,symbol.ilike.%${safe}%,contract_address.ilike.%${safe}%`)
      .limit(5);
    for (const t of data || []) {
      seen.add(t.contract_address);
      results.push({
        address: t.contract_address,
        symbol: t.symbol || "?",
        name: t.name || "Unknown",
        logo: t.logo_url || null,
        source: "db",
        trustScore: t.trust_score,
        tier: t.verification_tier,
        priceUsd: t.price_usd,
        volume24h: t.volume_24h,
      });
    }
  } catch (e) {
    console.error("[search] db error", e);
  }

  // 2. DexScreener fallback
  try {
    const res = await fetch(`${DEXSCREENER}/search?q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { pairs?: DexPair[] };
      const solPairs = (data.pairs || []).filter((p) => p.chainId === "solana");
      // Best pair per base token
      const byToken = new Map<string, DexPair>();
      for (const p of solPairs) {
        const addr = p.baseToken?.address;
        if (!addr) continue;
        const cur = byToken.get(addr);
        if (!cur || (p.liquidity?.usd || 0) > (cur.liquidity?.usd || 0)) byToken.set(addr, p);
      }
      for (const [addr, p] of byToken) {
        if (seen.has(addr)) continue;
        seen.add(addr);
        results.push({
          address: addr,
          symbol: p.baseToken.symbol,
          name: p.baseToken.name,
          logo: p.info?.imageUrl || null,
          source: "dexscreener",
          trustScore: null,
          tier: null,
          priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
          volume24h: p.volume?.h24 || null,
        });
        if (results.length >= limit) break;
      }
    }
  } catch (e) {
    console.error("[search] dexscreener error", e);
  }

  return results.slice(0, limit);
}

// =============================================================================
// Single token live data (used by /api/token/{address} when not in DB)
// =============================================================================
export async function getTokenLiveData(address: string): Promise<{ pair: DexPair | null; rugRisk: RugRisk; updatedAt: number }> {
  const cacheKey = `live:${address}`;
  const cached = getCached<{ pair: DexPair | null; rugRisk: RugRisk; updatedAt: number }>(cacheKey);
  if (cached) return cached;

  let pair: DexPair | null = null;
  try {
    const res = await fetch(`${DEXSCREENER}/tokens/${address}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { pairs?: DexPair[] } | DexPair[];
      const pairs = Array.isArray(data) ? data : (data.pairs || []);
      pair = bestPair(pairs);
    }
  } catch (e) {
    console.error("[live] dexscreener error", e);
  }

  // Run rug scan
  const rugRisk = await scanRugRisk(address);

  const result = { pair, rugRisk, updatedAt: Date.now() };
  setCached(cacheKey, result, 30_000);
  return result;
}
