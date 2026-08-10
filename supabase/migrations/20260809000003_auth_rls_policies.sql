-- =============================================================================
-- Migration: 20260809000003_auth_rls_policies.sql
-- RLS policies production + trigger sync auth.users → public.users
--
-- PENTING: Jalankan migration ini SETELAH migration 00001 dan 00002.
-- =============================================================================

-- =============================================================================
-- TRIGGER: Auto-create public.users saat user baru daftar via Supabase Auth
-- Supabase Auth menyimpan user di auth.users (schema terpisah).
-- Trigger ini sync ke public.users supaya bisa di-FK dari tabel lain.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- Pasang trigger ke auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger untuk update email jika berubah
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- =============================================================================
-- DROP dev policies dulu
-- =============================================================================

DROP POLICY IF EXISTS "dev_allow_all_users"              ON users;
DROP POLICY IF EXISTS "dev_allow_all_design_requests"    ON design_requests;
DROP POLICY IF EXISTS "dev_allow_all_generated_concepts" ON generated_concepts;
DROP POLICY IF EXISTS "dev_allow_all_generated_prompts"  ON generated_prompts;
DROP POLICY IF EXISTS "dev_allow_all_saved_history"      ON saved_history;

-- =============================================================================
-- TABEL: users — hanya bisa lihat/update data sendiri
-- =============================================================================

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- =============================================================================
-- TABEL: design_requests — user bisa CRUD milik sendiri; anonim bisa insert
-- =============================================================================

CREATE POLICY "requests_select_own_or_anon"
  ON design_requests FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "requests_insert_any"
  ON design_requests FOR INSERT
  WITH CHECK (true); -- anonim boleh insert (user_id = null)

CREATE POLICY "requests_update_own"
  ON design_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "requests_delete_own"
  ON design_requests FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- TABEL: generated_concepts — bisa dibaca siapa saja (hasil AI adalah publik)
-- =============================================================================

CREATE POLICY "concepts_select_all"
  ON generated_concepts FOR SELECT
  USING (true);

CREATE POLICY "concepts_insert_server"
  ON generated_concepts FOR INSERT
  WITH CHECK (true); -- insert hanya via server (service_role key)

CREATE POLICY "concepts_delete_cascade"
  ON generated_concepts FOR DELETE
  USING (true);

-- =============================================================================
-- TABEL: generated_prompts — bisa dibaca siapa saja
-- =============================================================================

CREATE POLICY "prompts_select_all"
  ON generated_prompts FOR SELECT
  USING (true);

CREATE POLICY "prompts_insert_server"
  ON generated_prompts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "prompts_delete_cascade"
  ON generated_prompts FOR DELETE
  USING (true);

-- =============================================================================
-- TABEL: saved_history — private per user
-- =============================================================================

CREATE POLICY "history_select_own"
  ON saved_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "history_insert_own"
  ON saved_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "history_update_own"
  ON saved_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "history_delete_own"
  ON saved_history FOR DELETE
  USING (auth.uid() = user_id);
