-- 027 — v_admin_doctor_stats: agregados por médico para a Home e a
-- seção Médicos (total atendimentos, no-shows, receita, último atendimento).
--
-- Filtro por período é feito na query que CONSOME a view
-- (where ended_at between X and Y), não aqui.
--
-- security_invoker=true: respeita a RLS de doctors/consultations do admin.
-- Idempotente.

CREATE OR REPLACE VIEW public.v_admin_doctor_stats
WITH (security_invoker = true) AS
SELECT
  d.id          AS doctor_id,
  d.full_name   AS doctor_name,
  count(c.id) FILTER (WHERE c.status = 'completed')              AS total_atendimentos,
  count(c.id) FILTER (WHERE c.status = 'no_show')                AS total_no_shows,
  coalesce(sum(c.amount_cents) FILTER (WHERE c.status = 'completed'), 0) AS receita_centavos,
  max(c.ended_at)                                                AS ultimo_atendimento
FROM public.doctors d
LEFT JOIN public.consultations c ON c.doctor_id = d.id
GROUP BY d.id, d.full_name;
