"use client";

import { useState } from "react";
import { Send, Copy, Check, MessageCircle, Twitter } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const SHARE_TEXT = "I just built a free Solana token trust platform. Every token gets a 0-100 trust score, on-chain risk scan, and embeddable badge. Free to use.\n\nhttps://solverify.vercel.app";
const APP_URL = "https://solverify.vercel.app";
const SHARE_ENCODED = encodeURIComponent(SHARE_TEXT);
const APP_ENCODED = encodeURIComponent(APP_URL);
const TWITTER_URL = "https://twitter.com/intent/tweet?text=" + SHARE_ENCODED;
const TELEGRAM_URL = "https://t.me/share/url?url=" + APP_ENCODED + "&text=" + SHARE_ENCODED;
const LINKEDIN_URL = "https://www.linkedin.com/sharing/share-offsite/?url=" + APP_ENCODED;

const TWEETS = [
  {
    label: "The intro tweet",
    body: "Every Solana token should have a cryptographic identity + trust score.\n\nDexScreener charges $299-$499 for \"enhanced info\".\n\nSolVerify gives you a trust score for $60 (or free Bronze).\n\nWith on-chain risk scan, link safety, and embeddable badge.\n\nhttps://solverify.vercel.app",
  },
  {
    label: "The rug-warning tweet",
    body: "Just checked an unverified Solana token on SolVerify.\n\nMint authority: ACTIVE\nFreeze authority: ACTIVE\nTop 3 wallets: 71% of supply\n\nRisk: HIGH. Do not buy.\n\nFree to check: https://solverify.vercel.app\n\n(someone should DM the team and tell them)",
  },
  {
    label: "The builder pitch",
    body: "If you launched a Solana token, get it verified on SolVerify.\n\nFree Bronze tier, $30 Silver, $60 Gold.\n\nYou get:\n→ Trust score\n→ Risk audit\n→ Link safety scan\n→ Embed badge on your site\n\nvs DexScreener's $299-$499. Yes really.\n\nhttps://solverify.vercel.app/claim",
  },
];

export default function SharePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Send className="h-7 w-7 text-brand" />
          Share SolVerify
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Spread the word. The more token teams see SolVerify badges everywhere, the more they will want one.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="glass-card text-center hover:border-border-glow">
          <Twitter className="mx-auto h-7 w-7 text-trusted" />
          <div className="mt-2 font-semibold">Share on Twitter / X</div>
          <p className="mt-1 text-xs text-text-muted">Crypto Twitter loves a new tool</p>
        </a>
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="glass-card text-center hover:border-border-glow">
          <Send className="mx-auto h-7 w-7 text-trusted" />
          <div className="mt-2 font-semibold">Share on Telegram</div>
          <p className="mt-1 text-xs text-text-muted">Best for token groups</p>
        </a>
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="glass-card text-center hover:border-border-glow">
          <MessageCircle className="mx-auto h-7 w-7 text-trusted" />
          <div className="mt-2 font-semibold">Share on LinkedIn</div>
          <p className="mt-1 text-xs text-text-muted">For B2B / API customers</p>
        </a>
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Pre-written posts</h3>
        <div className="mt-4 space-y-4">
          {TWEETS.map((t, i) => (
            <Tweet key={i} label={t.label} body={t.body} />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function Tweet({ label, body }: { label: string; body: string }) {
  const [copied, setCopied] = useState(false);
  const tweetUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(body);
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated/30 p-3">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{label}</span>
        <div className="flex gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(body).catch(() => null); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="inline-flex items-center gap-1 text-brand"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={tweetUrl}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand"
          >
            <Twitter className="h-3 w-3" /> Tweet
          </a>
        </div>
      </div>
      <pre className="mt-2 whitespace-pre-wrap text-sm text-text-primary font-mono">{body}</pre>
    </div>
  );
}
