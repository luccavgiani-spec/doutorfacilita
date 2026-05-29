-- 037 — Registro de encaminhamentos pra Prontia (override de redirecionamento)
--
-- Quando o admin liga o override Prontia, leads que iriam pro nosso /checkout
-- são redirecionados pra Prontia. Esta tabela registra cada encaminhamento
-- com os valores praticados no momento (cobrado do paciente e repasse à
-- Prontia) — assim o dashboard mostra ROI/margem corretamente mesmo quando
-- esses valores forem ajustados depois.
--
-- O dispatcher real (a função/middleware que redireciona) insere uma row aqui
-- antes de devolver o 302 pro paciente. Por enquanto não há dispatcher real
-- — admin pode usar o botão "registrar encaminhamento teste" no dashboard
-- pra popular dados de simulação.
--
-- patient_id é opcional (o lead pode nem ter conta na DF). Guardamos
-- name/email/phone snapshot direto na linha.
--
-- Idempotente.

CREATE TABLE IF NOT EXISTS public.prontia_encaminhamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name text,
  patient_email text,
  patient_phone text,
  destino_url text,
  valor_cobrado_cents integer NOT NULL DEFAULT 0,
  valor_pago_prontia_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent','confirmed','failed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prontia_encaminhamentos_created_at
  ON public.prontia_encaminhamentos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prontia_encaminhamentos_patient
  ON public.prontia_encaminhamentos (patient_id);

ALTER TABLE public.prontia_encaminhamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prontia_encam_admin_all ON public.prontia_encaminhamentos;
CREATE POLICY prontia_encam_admin_all
  ON public.prontia_encaminhamentos
  FOR ALL
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

-- Garante que a linha de config do prontia_redirect tenha os campos de
-- preço no jsonb. NÃO sobrescreve se admin já configurou.
UPDATE public.integration_configs
SET config = config
           || jsonb_build_object(
                'valor_cobrado_cents',
                COALESCE((config->>'valor_cobrado_cents')::int, 5900),
                'valor_pago_prontia_cents',
                COALESCE((config->>'valor_pago_prontia_cents')::int, 4000)
              )
WHERE id = 'prontia_redirect';
