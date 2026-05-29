-- 019 — prescricoes_mevo: registro de cada prescrição iniciada na Mevo
--
-- FKs apontam para o schema REAL: consultations / doctors / patients.
-- RLS: o vínculo auth↔médico é doctors.user_id = auth.uid()
-- (mesmo padrão das Edge Functions de LiveKit: .from('doctors').eq('user_id', authUserId)).
-- Idempotente.

CREATE TABLE IF NOT EXISTS public.prescricoes_mevo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES public.consultations(id) NOT NULL,
  doctor_id uuid REFERENCES public.doctors(id) NOT NULL,
  patient_id uuid REFERENCES public.patients(id) NOT NULL,
  mevo_id_prescricao text,           -- idPrescricao retornado pela Mevo
  mevo_token text,                   -- token da receita (ex: M6CRLIL)
  qrcode_url text,
  codigo_validacao text,             -- ex: NX12345
  status text NOT NULL DEFAULT 'iniciada'
    CHECK (status IN ('iniciada','finalizada','finalizada_com_erro','cancelada','excluida')),
  ambiente text NOT NULL DEFAULT 'homologacao'
    CHECK (ambiente IN ('homologacao','producao')),
  created_at timestamptz DEFAULT now(),
  finalizada_em timestamptz
);

CREATE INDEX IF NOT EXISTS idx_prescricoes_mevo_consultation
  ON public.prescricoes_mevo (consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescricoes_mevo_doctor
  ON public.prescricoes_mevo (doctor_id);

ALTER TABLE public.prescricoes_mevo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medico le proprias prescricoes" ON public.prescricoes_mevo;
CREATE POLICY "medico le proprias prescricoes" ON public.prescricoes_mevo
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "medico cria proprias prescricoes" ON public.prescricoes_mevo;
CREATE POLICY "medico cria proprias prescricoes" ON public.prescricoes_mevo
  FOR INSERT WITH CHECK (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "medico atualiza proprias prescricoes" ON public.prescricoes_mevo;
CREATE POLICY "medico atualiza proprias prescricoes" ON public.prescricoes_mevo
  FOR UPDATE USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );
