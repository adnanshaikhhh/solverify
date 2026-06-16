import { GlassCard } from "@/components/ui/GlassCard";

export const metadata = { title: "API Docs" };

const EXAMPLES = [
  {
    title: "Search tokens",
    method: "GET",
    path: "/api/tokens?search=bonk&tier=gold&sort=score",
    desc: "Returns paginated token list. Supports search, tier, status, sort, min_score, page, limit.",
  },
  {
    title: "Get a token",
    method: "GET",
    path: "/api/tokens/{address}",
    desc: "Returns the full token profile, including trust score breakdown.",
  },
  {
    title: "Auth challenge",
    method: "POST",
    path: "/api/auth/challenge",
    body: '{ "wallet": "YourSolanaAddress" }',
    desc: "Returns a nonce + message for your wallet to sign.",
  },
  {
    title: "Verify signature",
    method: "POST",
    path: "/api/auth/verify",
    body: '{ "wallet": "...", "signature": "bs58", "nonce": "uuid" }',
    desc: "Exchanges a valid signature for a JWT cookie (24h).",
  },
  {
    title: "Vouch for a token",
    method: "POST",
    path: "/api/vouch/{address}",
    desc: "Auth required. Body: { message?: string }. Unique per wallet.",
  },
  {
    title: "Report a token",
    method: "POST",
    path: "/api/report/{address}",
    body: '{ "report_type": "scam_link", "description": "...", "severity": "high" }',
    desc: "Auth required. Rate limit: 5/day per wallet.",
  },
  {
    title: "Public API (key auth)",
    method: "GET",
    path: "/api/v1/token/{address}",
    desc: "Header: X-Api-Key. Returns full token profile. Available to Gold tier owners.",
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">API Documentation</h1>
        <p className="mt-2 text-text-secondary">
          SolVerify exposes a public read API (no auth) and a signed write API (wallet JWT).
          Gold tier owners get an API key for high-volume access.
        </p>
      </div>

      <GlassCard>
        <h2 className="text-lg font-semibold">Base URL</h2>
        <code className="mt-2 block rounded-lg border border-border-subtle bg-bg-elevated p-3 font-mono text-sm">
          https://solverify.vercel.app
        </code>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold">Rate Limits</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-text-secondary">
          <li>Search: 30 req/min per IP</li>
          <li>Auth challenge: 10 req/min per IP</li>
          <li>Reports: 5 per wallet per day</li>
          <li>API key: 100 req/hour default (tier-based)</li>
        </ul>
      </GlassCard>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Endpoints</h2>
        <div className="space-y-4">
          {EXAMPLES.map((ex) => (
            <GlassCard key={ex.path}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-brand/20 px-2 py-0.5 text-xs font-bold text-brand">{ex.method}</span>
                <code className="font-mono text-sm">{ex.path}</code>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{ex.desc}</p>
              {ex.body && (
                <pre className="mt-3 overflow-x-auto rounded-lg border border-border-subtle bg-bg-elevated p-3 text-xs">
                  {ex.body}
                </pre>
              )}
            </GlassCard>
          ))}
        </div>
      </div>

      <GlassCard>
        <h2 className="text-lg font-semibold">Get an API Key</h2>
        <p className="mt-2 text-sm text-text-secondary">
          API keys are available to Gold tier token owners. Sign in with the verified owner wallet and visit
          your <a href="/dashboard" className="text-brand hover:underline">Dashboard</a>.
        </p>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold">Webhooks</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Coming soon. Subscribe to events: <code>tier.upgraded</code>, <code>report.filed</code>, <code>token.suspended</code>.
        </p>
      </GlassCard>
    </div>
  );
}
