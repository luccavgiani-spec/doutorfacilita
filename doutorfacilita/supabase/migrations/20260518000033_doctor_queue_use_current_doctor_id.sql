-- 033 — Trocar has_role('doctor') por current_doctor_id() IS NOT NULL
--
-- Bug: as policies da fila do cockpit (mig.032) usavam has_role('doctor'),
-- que depende de user_roles ter linha role='doctor'. O medico-teste só tem
-- role='admin' em user_roles (criado por outro fluxo histórico), então
-- has_role('doctor') retornava false e a fila aparecia vazia pro médico.
--
-- Fix: usar current_doctor_id() (SECURITY DEFINER, lê direto public.doctors
-- por user_id = auth.uid()). É a fonte canônica de "esse user é doctor".
-- Mesma garantia funcional, sem depender da consistência entre user_roles
-- e doctors — e sem recursão (já confirmado security_definer).
--
-- Idempotente.

DROP POLICY IF EXISTS consultations_doctor_queue_view ON public.consultations;
CREATE POLICY consultations_doctor_queue_view
  ON public.consultations
  FOR SELECT
  USING (
    status = 'in_queue'
    AND doctor_id IS NULL
    AND current_doctor_id() IS NOT NULL
  );

DROP POLICY IF EXISTS patients_doctor_queue_view ON public.patients;
CREATE POLICY patients_doctor_queue_view
  ON public.patients
  FOR SELECT
  USING (
    current_doctor_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.patient_id = patients.id
        AND c.status = 'in_queue'
        AND c.doctor_id IS NULL
    )
  );
