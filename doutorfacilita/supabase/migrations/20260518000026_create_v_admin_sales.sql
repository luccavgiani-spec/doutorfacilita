-- 026 — v_admin_sales: materializa o conceito de "venda" sobre consultations.
--
-- Não criamos tabela de vendas: consultations já tem amount_cents,
-- payment_id, paid_at e os timestamps do ciclo. Esta view só junta com
-- patients/doctors para a tabela de vendas da Home.
--
-- security_invoker=true: a view roda com as permissões/RLS de QUEM
-- consulta (o admin), não do dono da view — sem isso a RLS de
-- consultations/patients/doctors não seria aplicada e a view vazaria dados.
-- Idempotente (CREATE OR REPLACE).

CREATE OR REPLACE VIEW public.v_admin_sales
WITH (security_invoker = true) AS
SELECT
  c.id            AS consultation_id,
  c.created_at    AS sale_at,
  c.paid_at,
  c.queued_at,
  c.started_at,
  c.ended_at,
  c.amount_cents,
  c.payment_id,
  c.status,
  c.service_code,
  c.service_name,
  c.cancellation_reason,
  p.full_name     AS patient_name,
  p.email         AS patient_email,
  p.celular       AS patient_phone,
  c.doctor_id,
  d.full_name     AS doctor_name,
  '/cockpit/consulta/' || c.id AS consultation_link
FROM public.consultations c
LEFT JOIN public.patients p ON p.id = c.patient_id
LEFT JOIN public.doctors  d ON d.id = c.doctor_id;
