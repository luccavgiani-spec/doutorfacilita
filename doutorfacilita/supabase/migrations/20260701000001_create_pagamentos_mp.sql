-- 20260701000001 — Tabela de pagamentos do Mercado Pago (Checkout Transparente)
--
-- Registro server-side de cada tentativa de pagamento (cartão ou PIX). O
-- webhook e as Edge Functions escrevem via service_role (bypassa RLS). O
-- paciente só LÊ os pagamentos das próprias consultas; admin lê tudo.
--
-- mp_payment_id é UNIQUE (nullable até o MP responder) — é o alvo de
-- idempotência do webhook contra corrida com a confirmação síncrona.
--
-- Idempotente.

CREATE TABLE IF NOT EXISTS public.pagamentos_mp (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id    uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  metodo             text NOT NULL CHECK (metodo IN ('pix', 'card')),
  mp_payment_id      text UNIQUE,
  status             text NOT NULL DEFAULT 'pending',
  valor_cents        integer NOT NULL,
  external_reference text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pagamentos_mp_consultation_idx
  ON public.pagamentos_mp (consultation_id);

-- updated_at automático (reusa o helper existente do projeto)
DROP TRIGGER IF EXISTS pagamentos_mp_set_updated_at ON public.pagamentos_mp;
CREATE TRIGGER pagamentos_mp_set_updated_at
  BEFORE UPDATE ON public.pagamentos_mp
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.pagamentos_mp ENABLE ROW LEVEL SECURITY;

-- Paciente lê os pagamentos das próprias consultas.
DROP POLICY IF EXISTS pagamentos_mp_patient_select ON public.pagamentos_mp;
CREATE POLICY pagamentos_mp_patient_select
  ON public.pagamentos_mp
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = pagamentos_mp.consultation_id
        AND c.patient_id = public.current_patient_id()
    )
  );

-- Admin lê/gerencia tudo.
DROP POLICY IF EXISTS pagamentos_mp_admin_all ON public.pagamentos_mp;
CREATE POLICY pagamentos_mp_admin_all
  ON public.pagamentos_mp
  FOR ALL
  USING (has_role('admin'::text))
  WITH CHECK (has_role('admin'::text));

-- Escrita (INSERT/UPDATE) das Edge Functions/webhook é via service_role, que
-- bypassa RLS — por isso NÃO há policy de INSERT/UPDATE para roles comuns.
