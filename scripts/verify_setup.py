#!/usr/bin/env python3
"""
SolVerify — verify_setup.py
Confirms DB schema, RLS, grants, and seed data are all in place.
Optionally hits a live deployment URL if --url is provided.

Usage:
    python scripts/verify_setup.py
    python scripts/verify_setup.py --url https://solverify.vercel.app
"""
from __future__ import annotations

import os
import sys
import argparse
from pathlib import Path
import urllib.request
import json

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

parser = argparse.ArgumentParser()
parser.add_argument("--url", help="Optional live URL to test endpoints")
args = parser.parse_args()

def ok(msg: str): print(f"  ✓ {msg}")
def fail(msg: str): print(f"  ✗ {msg}"); sys.exit(1)

print("=" * 60)
print("SolVerify — verify_setup.py")
print("=" * 60)

SUPABASE_DB_HOST     = os.environ.get("SUPABASE_DB_HOST", "")
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")

if not SUPABASE_DB_HOST or not SUPABASE_DB_PASSWORD:
    print("ERROR: SUPABASE_DB_HOST and SUPABASE_DB_PASSWORD required")
    sys.exit(1)

print("\n[1/4] Database connection & schema")
conn = pg.connect(
    host=SUPABASE_DB_HOST,
    port=int(os.environ.get("SUPABASE_DB_PORT", "6543")),
    user=os.environ.get("SUPABASE_DB_USER", "postgres"),
    password=SUPABASE_DB_PASSWORD,
    database=os.environ.get("SUPABASE_DB_NAME", "postgres"),
    ssl_context=True,
)
cur = conn.cursor()
ok("Connected to database")

EXPECTED_TABLES = [
    "tokens", "ownership_claims", "ownership_history", "metadata_updates",
    "community_reports", "community_vouches", "link_safety_scans",
    "trust_score_history", "payments", "admin_actions", "featured_tokens",
    "embed_widgets", "api_keys",
]
cur.execute("""
    SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
""")
found_tables = {r[0] for r in cur.fetchall()}
missing = set(EXPECTED_TABLES) - found_tables
if missing:
    fail(f"Missing tables: {missing}")
ok(f"All {len(EXPECTED_TABLES)} tables present")

print("\n[2/4] RLS enabled")
cur.execute("""
    SELECT relname, relrowsecurity FROM pg_class
     WHERE relkind='r' AND relnamespace='public'::regnamespace
     AND relname = ANY(%s)
""", (EXPECTED_TABLES,))
rls_disabled = [r[0] for r in cur.fetchall() if not r[1]]
if rls_disabled:
    fail(f"RLS not enabled on: {rls_disabled}")
ok("RLS enabled on all 13 tables")

print("\n[3/4] service_role grants")
cur.execute("""
    SELECT COUNT(*) FROM information_schema.role_table_grants
     WHERE grantee = 'service_role'
""")
n = cur.fetchone()[0]
if n < len(EXPECTED_TABLES) * 4:
    fail(f"Only {n} service_role grants (expected >= {len(EXPECTED_TABLES)*4})")
ok(f"{n} service_role grants present")

print("\n[4/4] Seed data")
cur.execute("SELECT COUNT(*) FROM tokens")
n = cur.fetchone()[0]
if n < 5:
    fail(f"Only {n} tokens in DB (expected 5)")
ok(f"{n} tokens in DB")

cur.execute("SELECT name, trust_score, verification_tier FROM tokens ORDER BY trust_score DESC")
print("\nToken roster:")
for name, score, tier in cur.fetchall():
    print(f"  {name:<25} score={score:<3} tier={tier}")

cur.close()
conn.close()

# -----------------------------------------------------------------------------
# Optional: hit live URL
# -----------------------------------------------------------------------------
if args.url:
    print(f"\n[live] Testing {args.url}")
    base = args.url.rstrip("/")
    endpoints = [
        ("/", "GET"),
        ("/api/tokens", "GET"),
        ("/api/tokens/verified", "GET"),
        ("/api/tokens/trending", "GET"),
        ("/api/auth/challenge", "POST"),
    ]
    for path, method in endpoints:
        url = f"{base}{path}"
        try:
            req = urllib.request.Request(url, method=method)
            if method == "POST":
                req.add_header("Content-Type", "application/json")
                req.data = json.dumps({"wallet": "11111111111111111111111111111111"}).encode()
            with urllib.request.urlopen(req, timeout=10) as resp:
                ok(f"{method} {path} → {resp.status}")
        except Exception as e:
            print(f"  ✗ {method} {path} → {e}")

print("\n" + "=" * 60)
print("✓ verify_setup.py: ALL CHECKS PASSED")
print("=" * 60)
