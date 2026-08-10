-- =============================================================================
-- Migration: 20260809000005_concept_image_inspiration.sql
-- Tambah kolom image_inspiration ke tabel generated_concepts
-- =============================================================================

ALTER TABLE generated_concepts
  ADD COLUMN IF NOT EXISTS image_inspiration TEXT DEFAULT NULL;

COMMENT ON COLUMN generated_concepts.image_inspiration
  IS 'Catatan singkat elemen visual dari gambar referensi yang diadaptasi ke konsep ini (nullable)';
