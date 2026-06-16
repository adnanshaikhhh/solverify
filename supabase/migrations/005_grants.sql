-- =============================================================================
-- SolVerify — 005_grants.sql
-- Grant the service_role key the access it needs to bypass RLS
-- CRITICAL: skip this and you will get 403 / "permission denied" everywhere
-- =============================================================================

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Apply same to anon and authenticated for SELECT on read-only tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON tokens,
                ownership_claims,
                ownership_history,
                metadata_updates,
                community_reports,
                community_vouches,
                link_safety_scans,
                trust_score_history,
                featured_tokens,
                embed_widgets
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON community_vouches,
                              community_reports,
                              metadata_updates
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys,
                                       payments
TO authenticated;

-- Make sure future tables are covered too
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;
