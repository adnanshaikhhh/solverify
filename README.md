# 🛡️ SolVerify

> The Trust Layer for Solana Tokens — verified ownership, secure metadata, and community trust for $60, not $299–$499.

SolVerify is a Solana token identity and trust platform. Every token gets a deterministic 0-100 trust score, an ownership claim backed by a wallet signature, a link safety scan, and an embeddable verification badge.

## ✨ Features

- **Trust Score (0-100)** with breakdown across ownership, safety, links, community, and metadata
- **Three verification tiers**: Free Bronze, $30 Silver, $60 Gold
- **Wallet signature auth** (Phantom, Backpack, Solflare) — no passwords, no email
- **Link safety scanning** via Google Safe Browsing + PhishTank + URLhaus
- **Community vouches & reports** with public/admin moderation
- **Embeddable trust badge** for any token (Gold tier)
- **Public REST API** with API-key auth for developers
- **Vercel Cron** jobs for payments, market data, and link re-scans

## 🚀 Quick Start

```bash
npm install
cp .env.local.example .env.local  # fill in your keys
npm run dev
```

Visit `http://localhost:3000`.

## 🗄️ Database Setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com)
2. Find your **Project URL**, **anon key**, **service_role key**, and **DB password** (Settings → API / Database)
3. Add them to `.env.local`
4. Run the migrations directly via pg (no Supabase CLI needed):

```bash
pip install pg8000
python scripts/setup_database.py      # creates all 12 tables, indexes, RLS, triggers
python scripts/grant_service_role.py  # applies service_role GRANTs
python scripts/seed_tokens.py         # inserts 5 demo tokens
python scripts/verify_setup.py        # confirms everything is in place
```

## 🌐 Deploy to Vercel

1. Push to GitHub: `git push`
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Add environment variables from `.env.local` in the Vercel dashboard
4. Deploy. The vercel.json defines 4 cron jobs that run automatically.

## 📚 API

See `/docs` on the live site for the full reference. Public read endpoints (no auth):

- `GET /api/tokens?search=...&tier=gold&sort=score&page=1`
- `GET /api/tokens/{address}`
- `GET /api/tokens/verified`
- `GET /api/tokens/trending`
- `GET /api/search?q=bonk`
- `GET /api/trust/{address}`

Wallet-auth (JWT cookie from `/api/auth/verify`):

- `POST /api/claim/{address}`
- `PUT /api/metadata/{address}`
- `POST /api/vouch/{address}`
- `POST /api/report/{address}`
- `POST /api/payments/initiate`
- `POST /api/links/scan/{address}`

Gold-tier API key (header `X-Api-Key`):

- `GET /api/v1/token/{address}`

## 🛠️ Tech Stack

- **Next.js 14** (App Router, TypeScript strict)
- **Tailwind CSS** + custom design tokens
- **Framer Motion** for animations
- **Supabase** (PostgreSQL + Storage)
- **Helius** for Solana RPC + DAS metadata
- **tweetnacl + bs58** for wallet signature verification
- **Zod** for input validation everywhere
- **Vercel** for hosting + cron

## 📁 Project Structure

```
app/                 # Next.js App Router (pages + API)
  api/               # All REST endpoints
components/          # React components
hooks/               # Custom hooks
lib/                 # Core utilities (helius, auth, trust-score, ...)
store/               # Zustand stores
styles/              # Global CSS
supabase/migrations/ # SQL migrations
scripts/             # Python setup helpers
```

## 🪪 License

MIT
