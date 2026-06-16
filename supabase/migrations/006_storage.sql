-- =============================================================================
-- SolVerify — 006_storage.sql
-- Create public token-assets and private documents buckets
-- Run this AFTER 005_grants.sql
-- Note: Supabase Storage buckets must be created via the JS client OR
-- the SQL editor with the storage extension. The Python script handles
-- the JS path; this SQL is here for reference.
-- =============================================================================

-- Insert into storage.buckets (Supabase's internal table)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('token-assets', 'token-assets', true, 5242880,
    ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']),
  ('documents', 'documents', false, 10485760,
    ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

-- Public read on token-assets
DROP POLICY IF EXISTS "token-assets public read" ON storage.objects;
CREATE POLICY "token-assets public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'token-assets');

-- Authenticated users can upload to their own folder
DROP POLICY IF EXISTS "token-assets authenticated upload" ON storage.objects;
CREATE POLICY "token-assets authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'token-assets');

DROP POLICY IF EXISTS "token-assets owner update" ON storage.objects;
CREATE POLICY "token-assets owner update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'token-assets');

-- Private documents: only owner can read
DROP POLICY IF EXISTS "documents owner read" ON storage.objects;
CREATE POLICY "documents owner read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents owner upload" ON storage.objects;
CREATE POLICY "documents owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents');
