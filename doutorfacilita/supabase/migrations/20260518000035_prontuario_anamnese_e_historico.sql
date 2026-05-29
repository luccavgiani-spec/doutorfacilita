-- 035 — Anamnese persistente no perfil do paciente + RLS pro doctor que
-- atende o paciente enxergar/atualizar histórico cross-consulta.
--
-- Decisão de modelo:
--   * Campos POR CONSULTA (SOAP, CID, conduta) → public.medical_records
--     (já existe; doctor da consulta já tem ALL via records_doctor_own).
--   * Campos POR PACIENTE persistentes entre consultas (anamnese rápida)
--     → public.patients: alergias (existente) + medical_history,
--       family_history, current_medications (novos).
--
-- Policies aditivas (não derrubam as existentes):
--   * patients_doctor_update_anamnese — doctor que tem QUALQUER consulta
--     com esse paciente pode atualizar a row.
--   * medical_records_doctor_patient_history — doctor que atende o paciente
--     hoje pode ler medical_records de consultas anteriores (mesmo de
--     outros médicos) — é o histórico clínico.
--   * prescricoes_mevo_doctor_patient_history + idem documentos.
--
-- Tudo idempotente.

-- ─── 1. Colunas novas em patients ─────────────────────────────────
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS medical_history text,
  ADD COLUMN IF NOT EXISTS family_history text,
  ADD COLUMN IF NOT EXISTS current_medications text[] DEFAULT '{}';

-- ─── 2. Doctor atualiza anamnese do paciente que atende ───────────
DROP POLICY IF EXISTS patients_doctor_update_anamnese ON public.patients;
CREATE POLICY patients_doctor_update_anamnese
  ON public.patients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.patient_id = patients.id
        AND c.doctor_id = current_doctor_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.patient_id = patients.id
        AND c.doctor_id = current_doctor_id()
    )
  );

-- ─── 3. Doctor lê histórico de prontuários do paciente ────────────
DROP POLICY IF EXISTS medical_records_doctor_patient_history ON public.medical_records;
CREATE POLICY medical_records_doctor_patient_history
  ON public.medical_records
  FOR SELECT
  USING (
    patient_id IN (
      SELECT c.patient_id FROM public.consultations c
      WHERE c.doctor_id = current_doctor_id()
    )
  );

-- ─── 4. Doctor lê histórico de prescrições Mevo do paciente ───────
DROP POLICY IF EXISTS prescricoes_mevo_doctor_patient_history ON public.prescricoes_mevo;
CREATE POLICY prescricoes_mevo_doctor_patient_history
  ON public.prescricoes_mevo
  FOR SELECT
  USING (
    patient_id IN (
      SELECT c.patient_id FROM public.consultations c
      WHERE c.doctor_id = current_doctor_id()
    )
  );

DROP POLICY IF EXISTS prescricoes_documentos_doctor_patient_history ON public.prescricoes_documentos;
CREATE POLICY prescricoes_documentos_doctor_patient_history
  ON public.prescricoes_documentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prescricoes_mevo p
      WHERE p.id = prescricoes_documentos.prescricao_id
        AND p.patient_id IN (
          SELECT c.patient_id FROM public.consultations c
          WHERE c.doctor_id = current_doctor_id()
        )
    )
  );
