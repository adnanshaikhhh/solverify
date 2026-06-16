// =============================================================================
// SolVerify — lib/feed.ts
// Live token feed data layer: GeckoTerminal (primary) + DexScreener (fallback)
// + in-memory cache (60s) + rate-limit-safe sequential calls
// =============================================================================

export interface FeedToken {
  address: string;
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  price_usd: number | null;
  price_native: number | null;
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
  sparkline_7d: number[] | null; // 7 daily closes (synthetic if no real data)
  description?: string | null;
  solverify: {
    in_db: boolean;
    claim_status: string | null;
    verification_tier: string | null;
    trust_score: number | null;
    grade: string | null;
  };
}

export interface TrendingResponse {
  trending: FeedToken[];
  new_listings: FeedToken[];
  verified: FeedToken[];
  fetched_at: number;
}

export interface OhlcvBar {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// =============================================================================
// In-memory cache (module-level, persists across requests in the same Vercel
// serverless function instance)
// =============================================================================
type CacheEntry<T> = { value: T; expires: number };
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

// =============================================================================
// Sequential rate-limit-safe fetch helper
// Ensures we never exceed ~5 req/sec to GeckoTerminal
// =============================================================================
let lastFetch = 0;
async function politeFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const minGap = 250; // ms between calls
  const elapsed = Date.now() - lastFetch;
  if (elapsed < minGap) {
    await new Promise((r) => setTimeout(r, minGap - elapsed));
  }
  lastFetch = Date.now();
  return fetch(url, { ...opts, cache: "no-store" });
}

// =============================================================================
// Safe JSON parse
// =============================================================================
async function safeJson(res: Response | null): Promise<any | null> {
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// =============================================================================
// Fetch a single pool from GeckoTerminal
// Returns the strongest (highest-liquidity) Solana pool for a token
// =============================================================================
export async function getTokenPools(address: string): Promise<any[]> {
  const cacheKey = `pools:${address}`;
  const hit = getCached<any[]>(cacheKey);
  if (hit) return hit;

  const url = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${address}/pools?page=1`;
  const res = await politeFetch(url, {
    headers: { Accept: "application/json" },
  }).catch(() => null);
  const data = await safeJson(res);
  const pools: any[] = (data && Array.isArray(data.data)) ? data.data : [];
  setCached(cacheKey, pools, 60_000);
  return pools;
}

// =============================================================================
// Get OHLCV for a pool
// =============================================================================
export async function getPoolOhlcv(
  poolAddress: string,
  timeframe: "hour" | "day" = "hour",
  aggregate: number = 1,
  limit: number = 168
): Promise<OhlcvBar[]> {
  const cacheKey = `ohlcv:${poolAddress}:${timeframe}:${aggregate}:${limit}`;
  const hit = getCached<OhlcvBar[]>(cacheKey);
  if (hit) return hit;

  const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd`;
  const res = await politeFetch(url, {
    headers: { Accept: "application/json" },
  }).catch(() => null);
  const data = await safeJson(res);
  const list: any[] = (data && data.data && Array.isArray(data.data.attributes?.ohlcv_list))
    ? data.data.attributes.ohlcv_list
    : [];
  // GeckoTerminal returns: [timestamp, open, high, low, close, volume]
  const bars: OhlcvBar[] = list.map((row) => ({
    time: Math.floor(Number(row[0])),
    open: Number(row[1]) || 0,
    high: Number(row[2]) || 0,
    low: Number(row[3]) || 0,
    close: Number(row[4]) || 0,
    volume: Number(row[5]) || 0,
  }));
  setCached(cacheKey, bars, 60_000);
  return bars;
}

// =============================================================================
// Get token info (logo, name, description, socials)
// =============================================================================
export async function getTokenInfo(address: string): Promise<{
  name: string | null;
  symbol: string | null;
  logo_url: string | null;
  description: string | null;
  websites: string[];
  telegram: string | null;
  twitter: string | null;
} | null> {
  const cacheKey = `tokeninfo:${address}`;
  const hit = getCached<any>(cacheKey);
  if (hit) return hit;

  const url = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${address}/info`;
  const res = await politeFetch(url, { headers: { Accept: "application/json" } }).catch(() => null);
  const data = await safeJson(res);
  if (!data || !data.data) return null;
  const a = data.data.attributes || {};
  const result = {
    name: a.name ?? null,
    symbol: a.symbol ?? null,
    logo_url: a.image_url ?? a.image?.large ?? a.image?.small ?? null,
    description: a.description ?? null,
    websites: Array.isArray(a.websites) ? a.websites.map((w: any) => w.url).filter(Boolean) : [],
    telegram: a.telegram_handle ? `https://t.me/${a.telegram_handle}` : null,
    twitter: a.twitter_handle ? `https://twitter.com/${a.twitter_handle}` : null,
  };
  setCached(cacheKey, result, 300_000); // 5 min
  return result;
}

// =============================================================================
// Get top pools on Solana (the FEED source)
// We use GeckoTerminal's "trending pools" endpoint, sorted by 24h volume
// =============================================================================
export async function getTopPools(limit: number = 50): Promise<any[]> {
  const cacheKey = `toppools:v1:${limit}`;
  const hit = getCached<any[]>(cacheKey);
  if (hit) return hit;

  const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools?page=1&sort=h24_volume_usd_desc`;
  const res = await politeFetch(url, { headers: { Accept: "application/json" } }).catch(() => null);
  const data = await safeJson(res);
  const list: any[] = (data && Array.isArray(data.data)) ? data.data : [];
  const sliced = list.slice(0, limit);
  setCached(cacheKey, sliced, 60_000); // 60s cache
  return sliced;
}

// =============================================================================
// Get trending pools on Solana (1h volume spike) — GeckoTerminal "recent" sort
// =============================================================================
export async function getTrendingPools(limit: number = 15): Promise<any[]> {
  const cacheKey = `trending:v1:${limit}`;
  const hit = getCached<any[]>(cacheKey);
  if (hit) return hit;
  const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools?page=1&sort=h1_volume_usd_desc`;
  const res = await politeFetch(url, { headers: { Accept: "application/json" } }).catch(() => null);
  const data = await safeJson(res);
  const list: any[] = (data && Array.isArray(data.data)) ? data.data : [];
  const sliced = list.slice(0, limit);
  setCached(cacheKey, sliced, 60_000);
  return sliced;
}

// =============================================================================
// Get new pools (last 7 days, sorted by creation date)
// =============================================================================
export async function getNewPools(limit: number = 15): Promise<any[]> {
  const cacheKey = `newpools:v1:${limit}`;
  const hit = getCached<any[]>(cacheKey);
  if (hit) return hit;
  const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools?page=1&sort=pool_created_at_desc`;
  const res = await politeFetch(url, { headers: { Accept: "application/json" } }).catch(() => null);
  const data = await safeJson(res);
  const list: any[] = (data && Array.isArray(data.data)) ? data.data : [];
  // Filter: created in last 7 days AND volume > 10k
  const cutoff = Date.now() / 1000 - 7 * 24 * 60 * 60;
  const filtered = list.filter((p: any) => {
    const a = p.attributes || {};
    const created = a.pool_created_at ? new Date(a.pool_created_at).getTime() / 1000 : 0;
    const vol24 = Number(a.volume_usd?.h24 || 0);
    return created > cutoff && vol24 > 10000;
  });
  const sliced = filtered.slice(0, limit);
  setCached(cacheKey, sliced, 60_000);
  return sliced;
}

// =============================================================================
// Search GeckoTerminal by token symbol/name
// =============================================================================
export async function searchTokens(query: string, limit: number = 10): Promise<any[]> {
  const q = query.trim();
  if (!q) return [];
  const cacheKey = `search:${q.toLowerCase()}:${limit}`;
  const hit = getCached<any[]>(cacheKey);
  if (hit) return hit;
  const url = `https://api.geckoterminal.com/api/v2/search/pools?query=${encodeURIComponent(q)}&network=solana&page=1`;
  const res = await politeFetch(url, { headers: { Accept: "application/json" } }).catch(() => null);
  const data = await safeJson(res);
  const list: any[] = (data && Array.isArray(data.data)) ? data.data : [];
  const sliced = list.slice(0, limit);
  setCached(cacheKey, sliced, 60_000);
  return sliced;
}

// =============================================================================
// DexScreener fallback (in case GeckoTerminal rate-limits)
// =============================================================================
export async function getDexScreenerToken(address: string): Promise<any | null> {
  const cacheKey = `dex:${address}`;
  const hit = getCached<any>(cacheKey);
  if (hit) return hit;
  const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
  const res = await politeFetch(url).catch(() => null);
  const data = await safeJson(res);
  if (!data || !data.pairs) {
    setCached(cacheKey, null, 30_000);
    return null;
  }
  setCached(cacheKey, data, 60_000);
  return data;
}

export async function dexScreenerSearch(query: string): Promise<any[]> {
  const q = query.trim();
  if (!q) return [];
  const cacheKey = `dexsearch:${q.toLowerCase()}`;
  const hit = getCached<any[]>(cacheKey);
  if (hit) return hit;
  const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`;
  const res = await politeFetch(url).catch(() => null);
  const data = await safeJson(res);
  const list: any[] = (data && Array.isArray(data.pairs)) ? data.pairs : [];
  setCached(cacheKey, list, 60_000);
  return list;
}

// =============================================================================
// Normalize a GeckoTerminal pool into a FeedToken
// =============================================================================
export function normalizePool(pool: any): FeedToken {
  const a = pool.attributes || {};
  const base = a.base_token || {};
  const quote = a.quote_token || {};
  const txns = a.transactions || {};
  const vol = a.volume_usd || {};
  const chg = a.price_change_percentage || {};
  const liq = a.reserve_in_usd ?? null;

  // Build a synthetic 7-day sparkline using the percentage changes + the current price
  const price = Number(a.base_token_price_usd || 0) || null;
  const sparkline = price
    ? synthSparkline(price, Number(chg.h24 || 0), Number(chg.h6 || 0), Number(chg.h1 || 0))
    : null;

  return {
    address: base.address || a.address?.split("_")[1] || "",
    name: base.name || null,
    symbol: base.symbol || null,
    logo_url: base.image_url || null,
    price_usd: price,
    price_native: a.base_token_price_native_currency ? Number(a.base_token_price_native_currency) : null,
    change_24h: chg.h24 != null ? Number(chg.h24) : null,
    change_1h: chg.h1 != null ? Number(chg.h1) : null,
    change_6h: chg.h6 != null ? Number(chg.h6) : null,
    volume_24h: vol.h24 != null ? Number(vol.h24) : null,
    liquidity_usd: liq != null ? Number(liq) : null,
    market_cap: a.market_cap_usd != null ? Number(a.market_cap_usd) : null,
    fdv: a.fdv_usd != null ? Number(a.fdv_usd) : null,
    pair_address: a.address || null,
    dex_id: a.dex_id || null,
    pair_created_at: a.pool_created_at ? new Date(a.pool_created_at).getTime() : null,
    sparkline_7d: sparkline,
    solverify: {
      in_db: false,
      claim_status: null,
      verification_tier: null,
      trust_score: null,
      grade: null,
    },
  };
}

// =============================================================================
// Synthesize a 7-day sparkline from current price + 24h/6h/1h % changes
// Walks backwards from current price through approximate historical points
// =============================================================================
function synthSparkline(currentPrice: number, h24: number, h6: number, h1: number): number[] {
  if (!currentPrice || currentPrice <= 0) return [];
  // Approximate price 7 days ago = currentPrice / (1 + h24/100 * 7)  — very rough
  // We'll use 7 evenly-spaced points, the most recent is the current price
  // Use known % changes as anchors: 7d ago, 6d, 5d, 4d, 3d, 2d, 1d, current
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  // Synthesize: assume the 24h change happened linearly, and extend backward
  // with a smooth random walk tied to the magnitude of recent change
  const noise = (Math.abs(h24) + Math.abs(h6) + Math.abs(h1)) / 300; // 0..~0.5
  const drift = (h24 || 0) / 100 / 7; // daily drift

  const points: number[] = [];
  // 7 days ago → price before all the recent moves
  let p = currentPrice / (1 + (h24 || 0) / 100);
  for (let i = 7; i >= 0; i--) {
    // Each day, apply drift + small noise
    const seed = (i * 17 + 3) % 7;
    const wobble = 1 + ((seed / 7) - 0.5) * noise * 0.1;
    p = p * (1 + drift + (wobble - 1));
    points.push(p);
  }
  // Last point must be current price
  points[points.length - 1] = currentPrice;
  // Make sure all positive
  return points.map((v) => Math.max(v, currentPrice * 0.0001));
}

// =============================================================================
// Merge SolVerify DB records onto a list of FeedTokens
// =============================================================================
export function mergeSolverifyData(tokens: FeedToken[], dbRows: any[]): FeedToken[] {
  const byAddr = new Map<string, any>();
  for (const r of dbRows || []) {
    if (r.contract_address) byAddr.set(r.contract_address, r);
  }
  return tokens.map((t) => {
    const row = byAddr.get(t.address);
    if (!row) return t;
    return {
      ...t,
      // Prefer DB data for canonical name/symbol/logo if present
      name: row.name || t.name,
      symbol: row.symbol || t.symbol,
      logo_url: row.logo_url || t.logo_url,
      solverify: {
        in_db: true,
        claim_status: row.claim_status,
        verification_tier: row.verification_tier,
        trust_score: typeof row.trust_score === "number" ? row.trust_score : null,
        grade: row.trust_score != null
          ? (row.trust_score >= 90 ? "SAFU" :
             row.trust_score >= 75 ? "Trusted" :
             row.trust_score >= 55 ? "Caution" :
             row.trust_score >= 35 ? "Risky" : "Danger")
          : null,
      },
    };
  });
}

// =============================================================================
// Public market cap ranker (used for new-listings trending sort)
// =============================================================================
export function rankByVolume(tokens: FeedToken[]): FeedToken[] {
  return [...tokens].sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0));
}

export function rankByLiquidity(tokens: FeedToken[]): FeedToken[] {
  return [...tokens].sort((a, b) => (b.liquidity_usd || 0) - (a.liquidity_usd || 0));
}
