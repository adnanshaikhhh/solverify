#!/usr/bin/env python3
"""
SolVerify — setup_database.py
Runs all Supabase migrations via direct pg8000 connection.
Reads connection details from .env.local (or .env).

Usage:
    python scripts/setup_database.py
"""
from __future__ import annotations

import os
import sys
import glob
from pathlib import Path

try:
    import pg8000.dbapi as pg
except ImportError:
    import pg8000 as pg  # type: ignore

# -----------------------------------------------------------------------------
# 1. Load environment
# -----------------------------------------------------------------------------
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
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # Don't overwrite real env vars
        os.environ.setdefault(key, value)

SUPABASE_DB_HOST     = os.environ.get("SUPABASE_DB_HOST", "")
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")
SUPABASE_DB_PORT     = int(os.environ.get("SUPABASE_DB_PORT", "6543"))
SUPABASE_DB_USER     = os.environ.get("SUPABASE_DB_USER", "postgres")
SUPABASE_DB_NAME     = os.environ.get("SUPABASE_DB_NAME", "postgres")

if not SUPABASE_DB_HOST or not SUPABASE_DB_PASSWORD:
    print("ERROR: SUPABASE_DB_HOST and SUPABASE_DB_PASSWORD must be set in .env.local")
    print("       Find these in your Supabase Dashboard → Settings → Database")
    sys.exit(1)

# -----------------------------------------------------------------------------
# 2. Connect
# -----------------------------------------------------------------------------
print(f"Connecting to {SUPABASE_DB_HOST}:{SUPABASE_DB_PORT} as {SUPABASE_DB_USER}...")
try:
    conn = pg.connect(
        host=SUPABASE_DB_HOST,
        port=SUPABASE_DB_PORT,
        user=SUPABASE_DB_USER,
        password=SUPABASE_DB_PASSWORD,
        database=SUPABASE_DB_NAME,
        ssl_context=True,
    )
    conn.autocommit = True
    print("✓ Connected")
except Exception as e:
    print(f"✗ Connection failed: {e}")
    sys.exit(1)

cur = conn.cursor()

# -----------------------------------------------------------------------------
# 3. Run all migration files in order
# -----------------------------------------------------------------------------
MIGRATION_DIR = ROOT / "supabase" / "migrations"
migration_files = sorted(MIGRATION_DIR.glob("*.sql"))

print(f"\nFound {len(migration_files)} migration file(s):")

success_count = 0
for sql_file in migration_files:
    print(f"\n→ Running {sql_file.name} ...")
    sql = sql_file.read_text(encoding="utf-8")
    try:
        cur.execute(sql)
        print(f"  ✓ {sql_file.name} OK")
        success_count += 1
    except Exception as e:
        print(f"  ✗ {sql_file.name} FAILED: {e}")
        # Continue with other migrations; they may be independent
        continue

# -----------------------------------------------------------------------------
# 4. Verify
# -----------------------------------------------------------------------------
print("\n" + "=" * 60)
print("VERIFICATION")
print("=" * 60)

cur.execute("""
    SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
""")
table_count = cur.fetchone()[0]
print(f"Tables in public schema:  {table_count} (expected 13)")

cur.execute("SELECT COUNT(*) FROM tokens")
token_count = cur.fetchone()[0]
print(f"Rows in tokens:           {token_count} (seed inserts happen in seed_tokens.py)")

cur.execute("""
    SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = 'tokens'
""")
col_count = cur.fetchone()[0]
print(f"Columns in tokens table:  {col_count}")

cur.execute("""
    SELECT COUNT(*) FROM pg_indexes
     WHERE schemaname = 'public'
""")
idx_count = cur.fetchone()[0]
print(f"Indexes in public schema: {idx_count}")

cur.execute("""
    SELECT COUNT(*) FROM information_schema.triggers
     WHERE trigger_schema = 'public'
""")
trig_count = cur.fetchone()[0]
print(f"Triggers in public:       {trig_count}")

cur.execute("""
    SELECT COUNT(*) FROM information_schema.role_table_grants
     WHERE grantee = 'service_role'
""")
grant_count = cur.fetchone()[0]
print(f"Service_role grants:      {grant_count}")

cur.execute("SELECT relname, relrowsecurity FROM pg_class WHERE relkind='r' AND relnamespace='public'::regnamespace ORDER BY relname")
print("\nRLS status per table:")
for relname, rls in cur.fetchall():
    print(f"  {relname:<25} RLS={rls}")

# -----------------------------------------------------------------------------
# 5. Done
# -----------------------------------------------------------------------------
print("\n" + "=" * 60)
print(f"setup_database.py: {success_count}/{len(migration_files)} migrations OK")
print("=" * 60)

cur.close()
conn.close()
