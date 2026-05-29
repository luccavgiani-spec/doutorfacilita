-- 023 — integration_configs: configs NÃO-secretas de integrações.
--
-- Guarda só dados não sensíveis (ambiente, flags, logo URL, cores).
-- Credenciais (MEVO_AUTH_B64, LIVEKIT_API_SECRET) continuam em
-- `supabase secrets` — NUNCA nesta tabela.
--
-- RLS: só admin (has_role('admin')) lê/escreve. Idempotente.

CREATE TABLE IF NOT EXISTS public.integration_configs (
  id text PRIMARY KEY,                       -- 'mevo','prontia_redirect','livekit'
  ambiente text NOT NULL DEFAULT 'homologacao'
    CHECK (ambiente IN ('homologacao','producao')),
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,  -- só dados NÃO sensíveis
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage integration_configs" ON public.integration_configs;
CREATE POLICY "admins manage integration_configs"
  ON public.integration_configs FOR ALL
  USING (has_role('admin')) WITH CHECK (has_role('admin'));

DROP TRIGGER IF EXISTS integration_configs_set_updated_at ON public.integration_configs;
CREATE TRIGGER integration_configs_set_updated_at
  BEFORE UPDATE ON public.integration_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Linhas iniciais (placeholders; sem efeito até serem habilitadas no /admin).
INSERT INTO public.integration_configs (id, ambiente, enabled, config) VALUES
  ('mevo', 'homologacao', false, '{}'::jsonb),
  ('prontia_redirect', 'homologacao', false, '{"destino_url":""}'::jsonb),
  ('livekit', 'homologacao', false, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
