-- =============================================================================
-- Migration: 20260809000006_add_aspect_ratio.sql
-- Tambah kolom aspect_ratio ke tabel design_requests
-- =============================================================================

ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT NULL;

COMMENT ON COLUMN design_requests.aspect_ratio
  IS 'Rasio kanvas yang dipilih user, mis. "1:1", "9:16", "16:9" (nullable untuk data lama)';
