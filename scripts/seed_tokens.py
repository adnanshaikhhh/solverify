#!/usr/bin/env python3
"""
SolVerify — seed_tokens.py
Inserts 5 demo tokens for immediate testing.

Usage:
    python scripts/seed_tokens.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env.local"
if not ENV_FILE.exists():
    ENV_FILE = ROOT / ".env"
if ENV_FILE.exists():
    for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

try:
    import pg8000.dbapi as pg
except ImportError:
    import pg8000 as pg  # type: ignore

SUPABASE_DB_HOST     = os.environ.get("SUPABASE_DB_HOST", "")
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")

if not SUPABASE_DB_HOST or not SUPABASE_DB_PASSWORD:
    print("ERROR: SUPABASE_DB_HOST and SUPABASE_DB_PASSWORD required")
    sys.exit(1)

SEEDS = [
    {
        "contract_address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        "name": "Bonk",
        "symbol": "BONK",
        "decimals": 5,
        "total_supply": 100000000000000,
        "description": "The first Solana dog coin. Community-run, launched in Dec 2022.",
        "website_url": "https://bonkcoin.com",
        "twitter_url": "https://twitter.com/bonk_inu",
        "claim_status": "claimed",
        "verification_tier": "gold",
        "trust_score": 95,
        "owner_wallet": "7xKDR9dDiVdQ8kBgs9HrG4Z5N9wFbCL1YsCwf4YHtkXR",
        "is_mint_disabled": True,
        "is_freeze_disabled": True,
        "liquidity_locked": True,
        "links_safety_status": "clean",
        "community_vouches": 1240,
    },
    {
        "contract_address": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
        "name": "Jupiter",
        "symbol": "JUP",
        "decimals": 6,
        "total_supply": 10000000000,
        "description": "Jupiter is a key liquidity aggregator for Solana, offering the best swap routes across all major DEXes.",
        "website_url": "https://jup.ag",
        "twitter_url": "https://twitter.com/JupiterExchange",
        "discord_url": "https://discord.gg/jup",
        "claim_status": "claimed",
        "verification_tier": "silver",
        "trust_score": 78,
        "owner_wallet": "JUPdaoTreasury111111111111111111111111111111",
        "is_mint_disabled": True,
        "is_freeze_disabled": False,
        "liquidity_locked": True,
        "links_safety_status": "clean",
        "community_vouches": 312,
    },
    {
        "contract_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        "name": "Samoyedcoin",
        "symbol": "SAMO",
        "decimals": 9,
        "total_supply": 7000000000000,
        "description": "Samoyedcoin is the ambassador dog of Solana. Community-led, fun, and a great on-ramp for new users.",
        "website_url": "https://samoyedcoin.com",
        "twitter_url": "https://twitter.com/samoyedcoin",
        "claim_status": "claimed",
        "verification_tier": "bronze",
        "trust_score": 52,
        "owner_wallet": "SAMOcommWallet11111111111111111111111111111",
        "is_mint_disabled": False,
        "is_freeze_disabled": True,
        "liquidity_locked": False,
        "links_safety_status": "clean",
        "community_vouches": 47,
    },
    {
        "contract_address": "TestAlphaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "name": "TestToken Alpha",
        "symbol": "TSTA",
        "decimals": 9,
        "total_supply": 1000000000,
        "description": "Demo token for testing SolVerify — unclaimed, low score, mint not disabled.",
        "claim_status": "unclaimed",
        "verification_tier": "none",
        "trust_score": 20,
        "is_mint_disabled": False,
        "is_freeze_disabled": False,
        "liquidity_locked": False,
        "links_safety_status": "unchecked",
    },
    {
        "contract_address": "TestBetaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "name": "TestToken Beta",
        "symbol": "TSTB",
        "decimals": 9,
        "total_supply": 1000000000,
        "description": "Demo token for testing SolVerify — unclaimed, very low score, red flags.",
        "claim_status": "unclaimed",
        "verification_tier": "none",
        "trust_score": 8,
        "is_mint_disabled": False,
        "is_freeze_disabled": False,
        "liquidity_locked": False,
        "links_safety_status": "unchecked",
    },
]

print("Connecting...")
conn = pg.connect(
    host=SUPABASE_DB_HOST,
    port=int(os.environ.get("SUPABASE_DB_PORT", "6543")),
    user=os.environ.get("SUPABASE_DB_USER", "postgres"),
    password=SUPABASE_DB_PASSWORD,
    database=os.environ.get("SUPABASE_DB_NAME", "postgres"),
    ssl_context=True,
)
conn.autocommit = True
cur = conn.cursor()

inserted = 0
for s in SEEDS:
    cur.execute("""
        INSERT INTO tokens (
          contract_address, name, symbol, decimals, total_supply,
          description, website_url, twitter_url, discord_url,
          claim_status, verification_tier, trust_score, owner_wallet,
          is_mint_disabled, is_freeze_disabled, liquidity_locked,
          links_safety_status, community_vouches, helius_metadata
        )
        VALUES (
          %s, %s, %s, %s, %s,
          %s, %s, %s, %s,
          %s, %s, %s, %s,
          %s, %s, %s,
          %s, %s, %s
        )
        ON CONFLICT (contract_address) DO UPDATE SET
          name = EXCLUDED.name,
          symbol = EXCLUDED.symbol,
          trust_score = EXCLUDED.trust_score,
          verification_tier = EXCLUDED.verification_tier
    """, (
        s["contract_address"], s["name"], s["symbol"], s["decimals"], s.get("total_supply"),
        s.get("description"), s.get("website_url"), s.get("twitter_url"), s.get("discord_url"),
        s["claim_status"], s["verification_tier"], s["trust_score"], s.get("owner_wallet"),
        s.get("is_mint_disabled", False), s.get("is_freeze_disabled", False), s.get("liquidity_locked", False),
        s.get("links_safety_status", "unchecked"), s.get("community_vouches", 0),
        "{}",
    ))
    inserted += 1
    print(f"  ✓ {s['name']} ({s['symbol']}) score={s['trust_score']}")

cur.execute("SELECT COUNT(*) FROM tokens")
total = cur.fetchone()[0]
print(f"\nTokens now in DB: {total} (expected 5)")

cur.close()
conn.close()
print("✓ seed_tokens.py complete")
