-- 032 — Fix de recursão RLS introduzida pela 031.
--
-- A 031 criou:
--   consultations_doctor_queue_view USING (... EXISTS (SELECT 1 FROM doctors ...))
--   patients_doctor_queue_view      USING (... EXISTS (SELECT 1 FROM consultations JOIN doctors ...))
--
-- Quando alguém faz SELECT em doctors, a policy doctors_patient_view dispara
-- subquery em consultations, que por sua vez aciona consultations_doctor_queue_view,
-- que faz EXISTS em doctors → recursão infinita ("42P17"). Isso quebrava
-- getUserRole() pra QUALQUER user (inclusive pacientes) — o SELECT em doctors
-- retornava erro silencioso (.maybeSingle ignora error), fluxo caía no
-- fallback "Usuário sem perfil cadastrado".
--
-- Fix: substituir o EXISTS(...doctors) por has_role('doctor') — que é
-- SECURITY DEFINER e portanto BYPASSA RLS, quebrando o ciclo. Mantém o
-- requisito de "ser doctor" sem ler a tabela durante a avaliação da policy.
--
-- has_role('doctor') só retorna true quando user_roles tem role='doctor' e
-- revoked_at IS NULL — o que vale pra todo doctor cadastrado via fluxo padrão.
-- (Para docs criados via seed antigo sem user_roles, conceder via SQL/admin.)
--
-- Idempotente.

DROP POLICY IF EXISTS consultations_doctor_queue_view ON public.consultations;
CREATE POLICY consultations_doctor_queue_view
  ON public.consultations
  FOR SELECT
  USING (
    status = 'in_queue'
    AND doctor_id IS NULL
    AND has_role('doctor')
  );

DROP POLICY IF EXISTS patients_doctor_queue_view ON public.patients;
CREATE POLICY patients_doctor_queue_view
  ON public.patients
  FOR SELECT
  USING (
    has_role('doctor')
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.patient_id = patients.id
        AND c.status = 'in_queue'
        AND c.doctor_id IS NULL
    )
  );
