-- =============================================================================
-- SolVerify — 003_triggers.sql
-- Auto-update timestamps, vouch counts, report counts
-- =============================================================================

-- ----------------------------------------------------------------------------
-- tokens: auto-update updated_at on every UPDATE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tokens_updated_at ON tokens;
CREATE TRIGGER trg_tokens_updated_at
  BEFORE UPDATE ON tokens
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- community_vouches: keep tokens.community_vouches in sync
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_vouch_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tokens
       SET community_vouches = community_vouches + 1
     WHERE id = NEW.token_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tokens
       SET community_vouches = GREATEST(community_vouches - 1, 0)
     WHERE id = OLD.token_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vouches_count ON community_vouches;
CREATE TRIGGER trg_vouches_count
  AFTER INSERT OR DELETE ON community_vouches
  FOR EACH ROW
  EXECUTE FUNCTION sync_vouch_count();

-- ----------------------------------------------------------------------------
-- community_reports: keep tokens.report_count in sync
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tokens
       SET report_count = report_count + 1
     WHERE id = NEW.token_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tokens
       SET report_count = GREATEST(report_count - 1, 0)
     WHERE id = OLD.token_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reports_count ON community_reports;
CREATE TRIGGER trg_reports_count
  AFTER INSERT OR DELETE ON community_reports
  FOR EACH ROW
  EXECUTE FUNCTION sync_report_count();

-- ----------------------------------------------------------------------------
-- Log trust score changes to trust_score_history
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_trust_score_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trust_score IS DISTINCT FROM OLD.trust_score THEN
    INSERT INTO trust_score_history (token_id, score, breakdown, reason)
    VALUES (
      NEW.id,
      NEW.trust_score,
      COALESCE(NEW.trust_score_breakdown, '{}'::jsonb),
      'auto: change detected'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_trust_change ON tokens;
CREATE TRIGGER trg_log_trust_change
  AFTER UPDATE ON tokens
  FOR EACH ROW
  EXECUTE FUNCTION log_trust_score_change();
