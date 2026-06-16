-- =============================================================================
-- SolVerify — 002_indexes.sql
-- Performance indexes for hot read paths
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_tokens_contract ON tokens(contract_address);
CREATE INDEX IF NOT EXISTS idx_tokens_trust_score ON tokens(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_tier ON tokens(verification_tier);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(claim_status);
CREATE INDEX IF NOT EXISTS idx_tokens_updated ON tokens(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_active_trust ON tokens(is_active, trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_views ON tokens(view_count DESC);

CREATE INDEX IF NOT EXISTS idx_claims_token ON ownership_claims(token_id);
CREATE INDEX IF NOT EXISTS idx_claims_wallet ON ownership_claims(claimer_wallet);
CREATE INDEX IF NOT EXISTS idx_claims_status ON ownership_claims(status);

CREATE INDEX IF NOT EXISTS idx_ownership_history_token ON ownership_history(token_id);

CREATE INDEX IF NOT EXISTS idx_updates_token ON metadata_updates(token_id);
CREATE INDEX IF NOT EXISTS idx_updates_created ON metadata_updates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_token ON community_reports(token_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_severity ON community_reports(severity);

CREATE INDEX IF NOT EXISTS idx_vouches_token ON community_vouches(token_id);
CREATE INDEX IF NOT EXISTS idx_vouches_wallet ON community_vouches(voucher_wallet);

CREATE INDEX IF NOT EXISTS idx_link_scans_token ON link_safety_scans(token_id);
CREATE INDEX IF NOT EXISTS idx_link_scans_next ON link_safety_scans(next_scan_at);

CREATE INDEX IF NOT EXISTS idx_trust_history_token ON trust_score_history(token_id);
CREATE INDEX IF NOT EXISTS idx_trust_history_created ON trust_score_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_wallet ON payments(payer_wallet);
CREATE INDEX IF NOT EXISTS idx_payments_tx ON payments(tx_signature);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_wallet);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_token_id);

CREATE INDEX IF NOT EXISTS idx_featured_active ON featured_tokens(is_active, position);
CREATE INDEX IF NOT EXISTS idx_widgets_key ON embed_widgets(widget_key);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys(owner_wallet);
