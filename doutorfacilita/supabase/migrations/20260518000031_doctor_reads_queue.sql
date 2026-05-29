-- 031 — Doctor pode ler a fila de espera (consultas in_queue sem doctor_id)
-- e os pacientes correspondentes pra montar os cards no /cockpit.
--
-- Antes desta migration:
--   * consultations_doctor_own só permite SELECT quando a consulta JÁ está
--     atribuída ao doctor → fila aberta era invisível.
--   * patients_doctor_view só permite SELECT quando o paciente tem consulta
--     atribuída ao doctor → idem.
--
-- Esta migration adiciona DUAS policies aditivas (não derruba as existentes):
--
--   (a) consultations_doctor_queue_view — qualquer doctor ativo enxerga
--       consultas em status='in_queue' AND doctor_id IS NULL.
--   (b) patients_doctor_queue_view — qualquer doctor ativo enxerga pacientes
--       cuja consulta esteja na fila aberta (mesmo critério).
--
-- Idempotente.

DROP POLICY IF EXISTS consultations_doctor_queue_view ON public.consultations;
CREATE POLICY consultations_doctor_queue_view
  ON public.consultations
  FOR SELECT
  USING (
    status = 'in_queue'
    AND doctor_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.user_id = auth.uid() AND d.is_active = true
    )
  );

DROP POLICY IF EXISTS patients_doctor_queue_view ON public.patients;
CREATE POLICY patients_doctor_queue_view
  ON public.patients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      JOIN public.doctors d ON d.user_id = auth.uid() AND d.is_active = true
      WHERE c.patient_id = patients.id
        AND c.status = 'in_queue'
        AND c.doctor_id IS NULL
    )
  );
