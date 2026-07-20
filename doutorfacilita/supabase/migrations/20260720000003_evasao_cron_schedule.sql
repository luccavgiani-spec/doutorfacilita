-- 20260720000003 — Evasao: agenda a varredura de no_show (pg_cron)
--
-- Habilita pg_cron e agenda expire_no_show_consultations() a cada 1 min. Com
-- granularidade de 1 min, o corte ocorre entre 5:00 e ~6:00 apos doctor_called_at
-- — dentro da tolerancia da regra de "5 minutos".
--
-- ORDEM DE APLICACAO: aplicado em prod (via SQL Editor) apos o sinal
-- patient_joined_at estar em producao (backup no cliente do paciente + webhook
-- do LiveKit configurado). Verificado: 0 consultas in_progress no cutover.
-- Arquivo e tracking do que foi aplicado. Idempotente (cron.schedule upsert por nome).

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'evasao-no-show',
  '* * * * *',
  $$ SELECT public.expire_no_show_consultations(); $$
);
