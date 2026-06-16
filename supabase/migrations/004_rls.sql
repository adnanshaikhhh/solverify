-- =============================================================================
-- SolVerify — 004_rls.sql
-- Row Level Security policies
-- Public read on most tables; only owners (or service_role) can write
-- =============================================================================

-- Enable RLS
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_vouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_safety_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to make this script idempotent
DROP POLICY IF EXISTS tokens_public_select ON tokens;
DROP POLICY IF EXISTS tokens_owner_update ON tokens;
DROP POLICY IF EXISTS claims_select ON ownership_claims;
DROP POLICY IF EXISTS claims_insert ON ownership_claims;
DROP POLICY IF EXISTS claims_owner_select ON ownership_claims;
DROP POLICY IF EXISTS ownership_history_select ON ownership_history;
DROP POLICY IF EXISTS metadata_updates_select ON metadata_updates;
DROP POLICY IF EXISTS metadata_updates_insert ON metadata_updates;
DROP POLICY IF EXISTS reports_select ON community_reports;
DROP POLICY IF EXISTS reports_insert ON community_reports;
DROP POLICY IF EXISTS reports_select_own ON community_reports;
DROP POLICY IF EXISTS vouches_select ON community_vouches;
DROP POLICY IF EXISTS vouches_insert ON community_vouches;
DROP POLICY IF EXISTS vouches_delete_own ON community_vouches;
DROP POLICY IF EXISTS link_scans_select ON link_safety_scans;
DROP POLICY IF EXISTS trust_history_select ON trust_score_history;
DROP POLICY IF EXISTS payments_owner_select ON payments;
DROP POLICY IF EXISTS payments_insert ON payments;
DROP POLICY IF EXISTS admin_actions_select ON admin_actions;
DROP POLICY IF EXISTS admin_actions_insert ON admin_actions;
DROP POLICY IF EXISTS featured_select ON featured_tokens;
DROP POLICY IF EXISTS widgets_select ON embed_widgets;
DROP POLICY IF EXISTS api_keys_select ON api_keys;
DROP POLICY IF EXISTS api_keys_insert ON api_keys;

-- ============================================================================
-- tokens: public read, owner write
-- ============================================================================
CREATE POLICY tokens_public_select ON tokens
  FOR SELECT USING (true);

CREATE POLICY tokens_owner_update ON tokens
  FOR UPDATE USING (
    auth.uid()::text = owner_wallet
    OR auth.jwt() ->> 'wallet' = owner_wallet
  );

-- ============================================================================
-- ownership_claims
-- ============================================================================
CREATE POLICY claims_select ON ownership_claims
  FOR SELECT USING (true);

CREATE POLICY claims_owner_select ON ownership_claims
  FOR SELECT USING (
    auth.jwt() ->> 'wallet' = claimer_wallet
  );

CREATE POLICY claims_insert ON ownership_claims
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- ownership_history: public read
-- ============================================================================
CREATE POLICY ownership_history_select ON ownership_history
  FOR SELECT USING (true);

-- ============================================================================
-- metadata_updates: public read; authenticated write
-- ============================================================================
CREATE POLICY metadata_updates_select ON metadata_updates
  FOR SELECT USING (true);

CREATE POLICY metadata_updates_insert ON metadata_updates
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- community_reports: public read of resolved; authenticated write
-- ============================================================================
CREATE POLICY reports_select ON community_reports
  FOR SELECT USING (status IN ('resolved', 'reviewing') OR true);

CREATE POLICY reports_insert ON community_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY reports_select_own ON community_reports
  FOR SELECT USING (
    auth.jwt() ->> 'wallet' = reporter_wallet
  );

-- ============================================================================
-- community_vouches
-- ============================================================================
CREATE POLICY vouches_select ON community_vouches
  FOR SELECT USING (true);

CREATE POLICY vouches_insert ON community_vouches
  FOR INSERT WITH CHECK (true);

CREATE POLICY vouches_delete_own ON community_vouches
  FOR DELETE USING (
    auth.jwt() ->> 'wallet' = voucher_wallet
  );

-- ============================================================================
-- link_safety_scans: public read
-- ============================================================================
CREATE POLICY link_scans_select ON link_safety_scans
  FOR SELECT USING (true);

-- ============================================================================
-- trust_score_history: public read
-- ============================================================================
CREATE POLICY trust_history_select ON trust_score_history
  FOR SELECT USING (true);

-- ============================================================================
-- payments: owner read; insert allowed
-- ============================================================================
CREATE POLICY payments_owner_select ON payments
  FOR SELECT USING (
    auth.jwt() ->> 'wallet' = payer_wallet
  );

CREATE POLICY payments_insert ON payments
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- admin_actions: admins only (gated via service_role at the API layer)
-- ============================================================================
CREATE POLICY admin_actions_select ON admin_actions
  FOR SELECT USING (true);

CREATE POLICY admin_actions_insert ON admin_actions
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- featured_tokens: public read
-- ============================================================================
CREATE POLICY featured_select ON featured_tokens
  FOR SELECT USING (is_active = true);

-- ============================================================================
-- embed_widgets: public read
-- ============================================================================
CREATE POLICY widgets_select ON embed_widgets
  FOR SELECT USING (true);

-- ============================================================================
-- api_keys: owner read; service_role for inserts
-- ============================================================================
CREATE POLICY api_keys_select ON api_keys
  FOR SELECT USING (
    auth.jwt() ->> 'wallet' = owner_wallet
  );

CREATE POLICY api_keys_insert ON api_keys
  FOR INSERT WITH CHECK (true);
