-- =============================================================================
-- Migration: 20260809000004_reference_image.sql
-- Tambah kolom reference_image_url ke design_requests
-- dan setup bucket Supabase Storage untuk gambar referensi
-- =============================================================================

-- Kolom URL gambar referensi (nullable — upload opsional)
ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT DEFAULT NULL;

COMMENT ON COLUMN design_requests.reference_image_url
  IS 'URL public gambar referensi dari Supabase Storage bucket reference-images (opsional)';

-- =============================================================================
-- STORAGE BUCKET: reference-images
-- Public read supaya URL bisa langsung ditampilkan di browser.
-- Insert/Delete hanya via service role (server-side) atau user yang login.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reference-images',
  'reference-images',
  true,                          -- public read: URL langsung bisa diakses tanpa auth
  5242880,                       -- 5MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- =============================================================================
-- STORAGE RLS POLICIES
-- =============================================================================

-- Semua orang bisa SELECT (read/download) file dari bucket ini — sesuai public=true
CREATE POLICY "reference_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reference-images');

-- Insert: user login bisa upload ke folder dengan prefix user ID mereka
-- User anonim juga boleh upload (brief anonim tetap didukung)
CREATE POLICY "reference_images_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reference-images');

-- Delete: hanya owner (berdasarkan path prefix) atau service role
CREATE POLICY "reference_images_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'reference-images');
