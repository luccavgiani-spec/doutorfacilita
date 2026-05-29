-- 024 — feature_flags: rollout de funcionalidades.
--
-- Leitura liberada (qualquer sessão lê flags para gating de UI);
-- escrita só admin. Idempotente.

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  rollout jsonb DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone reads feature_flags" ON public.feature_flags;
CREATE POLICY "anyone reads feature_flags"
  ON public.feature_flags FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins insert feature_flags" ON public.feature_flags;
CREATE POLICY "admins insert feature_flags"
  ON public.feature_flags FOR INSERT WITH CHECK (has_role('admin'));

DROP POLICY IF EXISTS "admins update feature_flags" ON public.feature_flags;
CREATE POLICY "admins update feature_flags"
  ON public.feature_flags FOR UPDATE
  USING (has_role('admin')) WITH CHECK (has_role('admin'));

DROP POLICY IF EXISTS "admins delete feature_flags" ON public.feature_flags;
CREATE POLICY "admins delete feature_flags"
  ON public.feature_flags FOR DELETE USING (has_role('admin'));

DROP TRIGGER IF EXISTS feature_flags_set_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_set_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
