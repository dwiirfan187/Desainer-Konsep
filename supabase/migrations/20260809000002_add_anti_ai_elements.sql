-- =============================================================================
-- Migration: 20260809000002_add_anti_ai_elements.sql
-- Tambah kolom anti_ai_elements ke tabel generated_prompts
-- untuk menyimpan registry elemen anti-AI-look yang aktif di sebuah prompt.
-- =============================================================================

ALTER TABLE generated_prompts
  ADD COLUMN IF NOT EXISTS anti_ai_elements JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN generated_prompts.anti_ai_elements
  IS 'Array string ID elemen anti-AI-look yang aktif, mis. ["no_buzzwords","imperfection"]';
