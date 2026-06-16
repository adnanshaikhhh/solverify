# SolVerify — Setup Guide

This is the full step-by-step guide to go from a fresh clone to a fully deployed production app.

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+ with `pg8000` (`pip install pg8000`)
- A free [Supabase](https://supabase.com) project
- A free [Helius](https://helius.dev) API key
- A free [Google Cloud](https://console.cloud.google.com) API key with the **Safe Browsing API** enabled
- A [Vercel](https://vercel.com) account (GitHub login is easiest)
- A Solana wallet (Phantom, Backpack, or Solflare) with some SOL for receiving payments

## 1. Clone & install

```bash
git clone <your-repo-url> solverify
cd solverify
npm install
```

## 2. Supabase setup

1. Sign in to [supabase.com](https://supabase.com) and click **New project**.
2. Pick a region close to your users, set a strong DB password, save it.
3. Wait ~1 minute for the project to provision.
4. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)
5. Go to **Project Settings → Database** → **Connection string** → **Direct** and copy:
   - Host (looks like `aws-0-us-east-1.pooler.supabase.com`) → `SUPABASE_DB_HOST`
   - Port `6543` (or `5432`) → `SUPABASE_DB_PORT`
   - User `postgres` → `SUPABASE_DB_USER`
   - Database `postgres` → `SUPABASE_DB_NAME`
   - The DB password you set → `SUPABASE_DB_PASSWORD`

## 3. Helius setup

1. Sign up at [helius.dev](https://helius.dev)
2. Create a free API key (100k credits/month)
3. Copy the key → `HELIUS_API_KEY`

## 4. Google Safe Browsing setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable the **Safe Browsing API**
4. Create an API key (no OAuth needed, just a key)
5. Copy the key → `GOOGLE_SAFE_BROWSING_KEY`

## 5. Generate secrets

```bash
# JWT secret (>= 64 chars)
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Cron secret (32 hex chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## 6. Fill in `.env.local`

```bash
cp .env.local.example .env.local
# Open in your editor and fill in all the values
```

Key fields:
- `JWT_SECRET` — paste the 64-char value from step 5
- `ADMIN_WALLETS` — your Solana wallet address (comma-separate if multiple)
- `PAYMENT_WALLET` — a Solana wallet that will receive tier upgrade payments
- `CRON_SECRET` — paste from step 5
- `SILVER_PRICE_USD` / `GOLD_PRICE_USD` — defaults 30 / 60

## 7. Run database migrations

```bash
pip install pg8000
python scripts/setup_database.py
python scripts/grant_service_role.py
python scripts/seed_tokens.py
python scripts/verify_setup.py
```

Expected output: 6 migration files run, 5 tokens in DB, all RLS enabled, all service_role grants applied.

## 8. Local development

```bash
npm run dev
```

Open `http://localhost:3000`. You should see the homepage with Bonk, Jupiter, Samoyedcoin, and 2 demo tokens in the search page.

## 9. Build verification (no errors allowed)

```bash
npm run build
```

If you see TypeScript errors, fix them before continuing. Common ones:
- `Module not found`: run `npm install` again
- `Type X is not assignable to Y`: usually a missing `as const` on a literal type
- `Property X does not exist on type Y`: check imports

## 10. Deploy to Vercel

### Option A: GitHub + Vercel Dashboard (recommended)

```bash
git init
git add .
git commit -m "🚀 SolVerify v1.0"
gh repo create solverify --public --source=. --push
```

Then:
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `solverify` repo
3. Add all the environment variables from your `.env.local` (Settings → Environment Variables in the Vercel dashboard)
4. Click **Deploy**

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# ... add all 11 env vars
vercel --prod
```

## 11. Verify live deployment

```bash
# Replace with your real URL
URL=https://solverify.vercel.app

curl $URL/                  # 200 OK
curl $URL/api/tokens        # JSON with 5 seed tokens
curl $URL/api/auth/challenge -X POST \
  -H "Content-Type: application/json" \
  -d '{"wallet":"11111111111111111111111111111111"}'  # returns nonce + message

# Check security headers
curl -I $URL/ | grep -i "strict-transport"
# → strict-transport-security: max-age=63072000; ...
```

Then run:

```bash
python scripts/verify_setup.py --url $URL
```

## 12. Cron jobs

The 4 cron jobs (`/api/cron/check-payments`, `/api/cron/update-market-data`, `/api/cron/scan-links`, `/api/cron/expire-claims`) are configured in `vercel.json` and run automatically. To verify they're registered, go to your Vercel project → **Settings → Cron Jobs**.

## 13. Going to market

The first $600 of revenue comes from your first 10 Gold verifications. Channels:

1. **Solana Twitter** — share the [pricing page](https://solverify.vercel.app) with the $60 vs $299 comparison
2. **Token Telegrams** — every new pump.fun launch wants to be the next Bonk
3. **Solana ecosystem directories** — submit to [solana.com/ecosystem](https://solana.com/ecosystem)
4. **Direct outreach** — find new Pump.fun launches and DM the dev with a SolVerify link

Done. You're live.
