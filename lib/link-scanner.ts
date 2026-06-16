// =============================================================================
// SolVerify — lib/link-scanner.ts
// 3-provider URL safety: Google Safe Browsing + PhishTank + URLhaus
// =============================================================================

import { GOOGLE_SAFE_BROWSING_KEY } from "./constants";

export type ScanVerdict = "clean" | "suspicious" | "phishing" | "malware" | "blocked";

export interface ScanResult {
  url: string;
  verdict: ScanVerdict;
  providers: Record<string, { verdict: ScanVerdict; details?: unknown; error?: string }>;
}

// =============================================================================
// Provider 1: Google Safe Browsing
// =============================================================================
async function scanGoogleSafeBrowsing(url: string): Promise<{ verdict: ScanVerdict; details?: unknown; error?: string }> {
  if (!GOOGLE_SAFE_BROWSING_KEY) return { verdict: "clean", error: "no-key" };
  try {
    const body = {
      client: { clientId: "solverify", clientVersion: "1.0" },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "PHISHING"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url }],
      },
    };
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
    if (!res.ok) return { verdict: "clean", error: `http-${res.status}` };
    const data = (await res.json()) as { matches?: Array<{ threatType: string }> };
    if (data.matches && data.matches.length > 0) {
      const types = data.matches.map((m) => m.threatType);
      if (types.includes("MALWARE") || types.includes("UNWANTED_SOFTWARE")) {
        return { verdict: "malware", details: data.matches };
      }
      return { verdict: "phishing", details: data.matches };
    }
    return { verdict: "clean" };
  } catch (e) {
    return { verdict: "clean", error: String(e) };
  }
}

// =============================================================================
// Provider 2: PhishTank (free, no key)
// =============================================================================
async function scanPhishTank(url: string): Promise<{ verdict: ScanVerdict; details?: unknown; error?: string }> {
  try {
    const form = new URLSearchParams();
    form.append("url", url);
    form.append("format", "json");
    const res = await fetch("https://checkurl.phishtank.com/checkurl/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
    });
    if (!res.ok) return { verdict: "clean", error: `http-${res.status}` };
    const data = (await res.json()) as { results?: { in_database?: boolean; verified?: boolean; valid?: boolean } };
    const r = data.results;
    if (r?.in_database && r.verified && r.valid) {
      return { verdict: "phishing", details: r };
    }
    return { verdict: "clean", details: r };
  } catch (e) {
    return { verdict: "clean", error: String(e) };
  }
}

// =============================================================================
// Provider 3: URLhaus (abuse.ch, free)
// =============================================================================
async function scanUrlhaus(url: string): Promise<{ verdict: ScanVerdict; details?: unknown; error?: string }> {
  try {
    const form = new URLSearchParams();
    form.append("url", url);
    const res = await fetch("https://urlhaus-api.abuse.ch/v1/url/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
    });
    if (!res.ok) return { verdict: "clean", error: `http-${res.status}` };
    const data = (await res.json()) as { query_status?: string; url_status?: string };
    if (data.query_status === "ok" && data.url_status === "online") {
      return { verdict: "malware", details: data };
    }
    return { verdict: "clean", details: data };
  } catch (e) {
    return { verdict: "clean", error: String(e) };
  }
}

// =============================================================================
// Aggregate: worst verdict wins
// =============================================================================
const VERDICT_RANK: Record<ScanVerdict, number> = {
  clean: 0,
  suspicious: 1,
  phishing: 2,
  malware: 2,
  blocked: 3,
};

export async function scanUrl(url: string): Promise<ScanResult> {
  const [g, p, u] = await Promise.all([
    scanGoogleSafeBrowsing(url),
    scanPhishTank(url),
    scanUrlhaus(url),
  ]);

  const verdicts = [g.verdict, p.verdict, u.verdict];
  let worst: ScanVerdict = "clean";
  for (const v of verdicts) {
    if (VERDICT_RANK[v] > VERDICT_RANK[worst]) worst = v;
  }
  return {
    url,
    verdict: worst,
    providers: { google: g, phishtank: p, urlhaus: u },
  };
}

export async function scanUrls(urls: string[]): Promise<ScanResult[]> {
  return Promise.all(urls.filter(Boolean).map(scanUrl));
}
