#!/usr/bin/env python3
"""
SolVerify — grant_service_role.py
Applies (re-applies) the service_role GRANTs and creates the storage buckets
via the Supabase JS client. Idempotent.

Usage:
    python scripts/grant_service_role.py
"""
from __future__ import annotations

import os
import sys
import json
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

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    sys.exit(1)

try:
    import pg8000.dbapi as pg
except ImportError:
    import pg8000 as pg  # type: ignore

SUPABASE_DB_HOST     = os.environ.get("SUPABASE_DB_HOST", "")
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")

if not SUPABASE_DB_HOST or not SUPABASE_DB_PASSWORD:
    print("ERROR: SUPABASE_DB_HOST and SUPABASE_DB_PASSWORD required for GRANTs")
    sys.exit(1)

# ---- Run GRANTs via pg connection ----
print("Re-applying service_role GRANTs via direct pg connection...")
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

GRANT_SQL = (ROOT / "supabase" / "migrations" / "005_grants.sql").read_text(encoding="utf-8")
try:
    cur.execute(GRANT_SQL)
    print("✓ GRANTs applied")
except Exception as e:
    print(f"✗ GRANTs failed: {e}")
    sys.exit(1)

STORAGE_SQL = (ROOT / "supabase" / "migrations" / "006_storage.sql").read_text(encoding="utf-8")
try:
    cur.execute(STORAGE_SQL)
    print("✓ Storage buckets created")
except Exception as e:
    print(f"✗ Storage buckets failed: {e}")
    # Non-fatal; may already exist

# Verify
cur.execute("""
    SELECT COUNT(*) FROM information_schema.role_table_grants
     WHERE grantee = 'service_role'
""")
print(f"service_role grants:      {cur.fetchone()[0]}")

cur.execute("SELECT id, public, file_size_limit FROM storage.buckets ORDER BY id")
print("\nStorage buckets:")
for row in cur.fetchall():
    print(f"  {row[0]:<20} public={row[1]}  max_size={row[2]}")

cur.close()
conn.close()
print("\n✓ grant_service_role.py complete")
