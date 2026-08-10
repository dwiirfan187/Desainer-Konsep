-- =============================================================================
-- Migration: 20260809000001_initial_schema.sql
-- Skema awal database sesuai PRD Bagian 8
-- AI Design Concept & Prompt Generator
-- =============================================================================

-- Aktifkan ekstensi uuid-ossp untuk generate UUID otomatis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE design_type AS ENUM (
  'poster',
  'feed',
  'logo',
  'banner'
);

CREATE TYPE platform_target AS ENUM (
  'chatgpt',
  'midjourney',
  'dalle',
  'other'
);

-- =============================================================================
-- TABEL: users
-- Menyimpan profil user terdaftar.
-- id di-link ke auth.users.id dari Supabase Auth.
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users            IS 'Profil user terdaftar, di-link ke Supabase Auth';
COMMENT ON COLUMN users.id         IS 'UUID — sama dengan auth.users.id dari Supabase Auth';
COMMENT ON COLUMN users.email      IS 'Email unik user';
COMMENT ON COLUMN users.created_at IS 'Waktu registrasi';

-- =============================================================================
-- TABEL: design_requests
-- Brief desain yang diinput user via form.
-- user_id nullable untuk mendukung user anonim (PRD §5.4).
-- =============================================================================

CREATE TABLE IF NOT EXISTS design_requests (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        REFERENCES users(id) ON DELETE SET NULL,
  design_type      design_type NOT NULL,
  topic            TEXT        NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 500),
  mood_tags        TEXT[]      NOT NULL DEFAULT '{}',
  target_audience  TEXT        CHECK (char_length(target_audience) <= 200),
  color_preference TEXT        CHECK (char_length(color_preference) <= 200),
  extra_notes      TEXT        CHECK (char_length(extra_notes) <= 1000),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  design_requests                  IS 'Brief desain yang disubmit user lewat form input';
COMMENT ON COLUMN design_requests.user_id          IS 'FK → users.id; NULL jika user anonim';
COMMENT ON COLUMN design_requests.design_type      IS 'Kategori: poster | feed | logo | banner';
COMMENT ON COLUMN design_requests.topic            IS 'Deskripsi singkat topik/tema desain (maks 500 karakter)';
COMMENT ON COLUMN design_requests.mood_tags        IS 'Array mood/vibe yang dipilih user';
COMMENT ON COLUMN design_requests.target_audience  IS 'Deskripsi target audiens — opsional';
COMMENT ON COLUMN design_requests.color_preference IS 'Preferensi warna dari user — opsional';
COMMENT ON COLUMN design_requests.extra_notes      IS 'Catatan/instruksi tambahan — opsional';

CREATE INDEX idx_design_requests_user_id ON design_requests(user_id);
CREATE INDEX idx_design_requests_type    ON design_requests(design_type);
CREATE INDEX idx_design_requests_created ON design_requests(created_at DESC);

-- =============================================================================
-- TABEL: generated_concepts
-- Hasil generate ide/konsep desain dari LLM (3–5 konsep per request).
-- =============================================================================

CREATE TABLE IF NOT EXISTS generated_concepts (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID        NOT NULL REFERENCES design_requests(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description     TEXT        NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  color_palette   JSONB       NOT NULL DEFAULT '[]',
  style_reference TEXT        NOT NULL CHECK (char_length(style_reference) BETWEEN 1 AND 500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  generated_concepts                 IS 'Konsep desain hasil generate AI, terkait ke design_request';
COMMENT ON COLUMN generated_concepts.request_id      IS 'FK → design_requests.id; cascade delete';
COMMENT ON COLUMN generated_concepts.title           IS 'Judul singkat konsep';
COMMENT ON COLUMN generated_concepts.description     IS 'Deskripsi gaya visual 2–3 kalimat';
COMMENT ON COLUMN generated_concepts.color_palette   IS 'JSON array hex color, contoh: ["#3B5EFF","#FFB100","#FF5C7A"]';
COMMENT ON COLUMN generated_concepts.style_reference IS 'Referensi gaya/teknik desain, mis. "risograph print"';

CREATE INDEX idx_generated_concepts_request_id ON generated_concepts(request_id);
CREATE INDEX idx_generated_concepts_created    ON generated_concepts(created_at DESC);

-- =============================================================================
-- TABEL: generated_prompts
-- Prompt image generator yang dihasilkan dari konsep yang dipilih user.
-- Satu konsep bisa menghasilkan prompt untuk beberapa platform berbeda.
-- =============================================================================

CREATE TABLE IF NOT EXISTS generated_prompts (
  id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  concept_id      UUID            NOT NULL REFERENCES generated_concepts(id) ON DELETE CASCADE,
  prompt_text     TEXT            NOT NULL CHECK (char_length(prompt_text) BETWEEN 1 AND 5000),
  platform_target platform_target NOT NULL DEFAULT 'chatgpt',
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  generated_prompts                  IS 'Prompt image generator hasil AI, per konsep & per platform';
COMMENT ON COLUMN generated_prompts.concept_id       IS 'FK → generated_concepts.id; cascade delete';
COMMENT ON COLUMN generated_prompts.prompt_text      IS 'Teks prompt lengkap siap copy-paste';
COMMENT ON COLUMN generated_prompts.platform_target  IS 'Target platform: chatgpt | midjourney | dalle | other';

CREATE INDEX idx_generated_prompts_concept_id ON generated_prompts(concept_id);
CREATE INDEX idx_generated_prompts_platform   ON generated_prompts(platform_target);
CREATE INDEX idx_generated_prompts_created    ON generated_prompts(created_at DESC);

-- =============================================================================
-- TABEL: saved_history
-- Riwayat prompt yang disimpan/difavoritkan oleh user terdaftar.
-- Kombinasi user_id + prompt_id bersifat unik (tidak bisa duplikat).
-- =============================================================================

CREATE TABLE IF NOT EXISTS saved_history (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id   UUID        NOT NULL REFERENCES generated_prompts(id) ON DELETE CASCADE,
  is_favorite BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_saved_history_user_prompt UNIQUE (user_id, prompt_id)
);

COMMENT ON TABLE  saved_history             IS 'Riwayat prompt tersimpan per user terdaftar';
COMMENT ON COLUMN saved_history.user_id     IS 'FK → users.id; cascade delete saat user dihapus';
COMMENT ON COLUMN saved_history.prompt_id   IS 'FK → generated_prompts.id; cascade delete';
COMMENT ON COLUMN saved_history.is_favorite IS 'Tandai sebagai favorit; default false';

CREATE INDEX idx_saved_history_user_id   ON saved_history(user_id);
CREATE INDEX idx_saved_history_prompt_id ON saved_history(prompt_id);
CREATE INDEX idx_saved_history_favorite  ON saved_history(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_saved_history_created   ON saved_history(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Aktifkan RLS di semua tabel untuk keamanan default.
-- Policy spesifik per tabel ditambahkan di migration berikutnya saat
-- auth flow sudah diimplementasi.
-- =============================================================================

ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_history     ENABLE ROW LEVEL SECURITY;

-- Policy sementara: izinkan semua operasi untuk development.
-- GANTI dengan policy yang lebih ketat sebelum production.
CREATE POLICY "dev_allow_all_users"              ON users             FOR ALL USING (true);
CREATE POLICY "dev_allow_all_design_requests"    ON design_requests   FOR ALL USING (true);
CREATE POLICY "dev_allow_all_generated_concepts" ON generated_concepts FOR ALL USING (true);
CREATE POLICY "dev_allow_all_generated_prompts"  ON generated_prompts FOR ALL USING (true);
CREATE POLICY "dev_allow_all_saved_history"      ON saved_history     FOR ALL USING (true);
