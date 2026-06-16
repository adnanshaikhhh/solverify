-- =============================================================================
-- SolVerify — 001_schema.sql
-- Core tables for the SolVerify platform
-- =============================================================================

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- TABLE: tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address TEXT UNIQUE NOT NULL,
  name TEXT,
  symbol TEXT,
  decimals INTEGER DEFAULT 9,
  total_supply BIGINT,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  website_url TEXT,
  twitter_url TEXT,
  telegram_url TEXT,
  discord_url TEXT,
  github_url TEXT,
  whitepaper_url TEXT,
  claim_status TEXT DEFAULT 'unclaimed'
    CHECK (claim_status IN ('unclaimed','pending','claimed','suspended')),
  verification_tier TEXT DEFAULT 'none'
    CHECK (verification_tier IN ('none','bronze','silver','gold')),
  trust_score INTEGER DEFAULT 0 CHECK (trust_score BETWEEN 0 AND 100),
  trust_score_breakdown JSONB DEFAULT '{}'::jsonb,
  owner_wallet TEXT,
  creator_wallet TEXT,
  update_authority TEXT,
  is_mint_disabled BOOLEAN DEFAULT false,
  is_freeze_disabled BOOLEAN DEFAULT false,
  liquidity_locked BOOLEAN DEFAULT false,
  liquidity_lock_until TIMESTAMP,
  liquidity_lock_source TEXT,
  market_cap_usd REAL,
  price_usd REAL,
  volume_24h REAL,
  holder_count INTEGER,
  top10_holder_percent REAL,
  dexscreener_url TEXT,
  helius_metadata JSONB,
  links_safety_status TEXT DEFAULT 'unchecked'
    CHECK (links_safety_status IN ('unchecked','clean','flagged','blocked')),
  community_vouches INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- TABLE: ownership_claims
-- ============================================================================
CREATE TABLE IF NOT EXISTS ownership_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  claimer_wallet TEXT NOT NULL,
  claim_method TEXT
    CHECK (claim_method IS NULL OR claim_method IN ('creator_wallet','update_authority','largest_holder','admin')),
  signature TEXT NOT NULL,
  message_signed TEXT NOT NULL,
  verified_on_chain BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- TABLE: ownership_history
-- ============================================================================
CREATE TABLE IF NOT EXISTS ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  previous_wallet TEXT,
  new_wallet TEXT,
  transfer_type TEXT
    CHECK (transfer_type IN ('initial_claim','transfer','revoked','suspended')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- TABLE: metadata_updates
-- ============================================================================
CREATE TABLE IF NOT EXISTS metadata_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  updated_by TEXT NOT NULL,
  field_name TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  update_category TEXT
    CHECK (update_category IN ('branding','social','description','links','other')),
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- TABLE: community_reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  reporter_wallet TEXT,
  report_type TEXT
    CHECK (report_type IN ('scam_link','drainer','fake_social','impersonation','rug_pull','bundle_detected','other')),
  description TEXT NOT NULL,
  evidence_url TEXT,
  severity TEXT DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','reviewing','resolved','dismissed')),
  resolved_by TEXT,
  resolution_note TEXT,
  created_at TIMESTAMP DEFAULT now(),
  resolved_at TIMESTAMP
);

-- ============================================================================
-- TABLE: community_vouches
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  voucher_wallet TEXT NOT NULL,
  vouch_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(token_id, voucher_wallet)
);

-- ============================================================================
-- TABLE: link_safety_scans
-- ============================================================================
CREATE TABLE IF NOT EXISTS link_safety_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  url_type TEXT,
  scan_result TEXT
    CHECK (scan_result IN ('clean','suspicious','phishing','malware','blocked')),
  scan_details JSONB,
  scanned_at TIMESTAMP DEFAULT now(),
  next_scan_at TIMESTAMP
);

-- ============================================================================
-- TABLE: trust_score_history
-- ============================================================================
CREATE TABLE IF NOT EXISTS trust_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  breakdown JSONB,
  reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- TABLE: payments
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id),
  payer_wallet TEXT NOT NULL,
  tier_requested TEXT NOT NULL
    CHECK (tier_requested IN ('silver','gold')),
  amount_sol REAL NOT NULL,
  amount_usd REAL,
  tx_signature TEXT UNIQUE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','failed','refunded')),
  tier_granted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  confirmed_at TIMESTAMP
);

-- ============================================================================
-- TABLE: admin_actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_wallet TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_token_id UUID REFERENCES tokens(id),
  target_wallet TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- TABLE: featured_tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS featured_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE UNIQUE,
  position INTEGER DEFAULT 0,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- TABLE: embed_widgets
-- ============================================================================
CREATE TABLE IF NOT EXISTS embed_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  widget_key TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 16),
  style TEXT DEFAULT 'card'
    CHECK (style IN ('mini','card','full')),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- TABLE: api_keys
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_wallet TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  label TEXT,
  rate_limit_per_hour INTEGER DEFAULT 100,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);
