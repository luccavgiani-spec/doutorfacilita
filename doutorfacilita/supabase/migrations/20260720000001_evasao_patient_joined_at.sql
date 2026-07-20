-- 20260720000001 — Sistema de evasão (no-show): sinal de "paciente entrou"
--
-- CONTEXTO: ao clicar "Chamar próximo", o médico dispara create_enter_doc, que
-- grava consultations.doctor_called_at (T0). Se o paciente não entrar na chamada
-- em 5 min, a consulta deve ser cancelada e marcada como evasão (status no_show)
-- para fins jurídicos/LGPD.
--
-- Hoje NÃO existe sinal server-side de que o paciente conectou na sala LiveKit.
-- Esta migration adiciona a coluna patient_joined_at, que é o marco que
-- CANCELA o timer de evasão. Ela é escrita por:
--   1. (autoritativo) webhook do LiveKit — evento participant_joined com
--      identity 'patient_*' → edge function livekit-webhook.
--   2. (backup) cliente do paciente ao conectar na sala (RLS
--      consultations_patient_update já permite o paciente atualizar a própria row).
--
-- O corte automático (marcar no_show) fica em migration separada
-- (expire_no_show + pg_cron), autorada após introspecção do audit_log.
--
-- Idempotente.

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS patient_joined_at timestamptz;

COMMENT ON COLUMN public.consultations.patient_joined_at IS
  'Quando o paciente conectou na sala LiveKit (NULL = ainda não entrou). '
  'Escrito pelo webhook do LiveKit (participant_joined, identity patient_*) e, '
  'como backup, pelo cliente do paciente. Base do corte de evasão (no_show).';

-- Índice parcial que serve exatamente a varredura de evasão: consultas em
-- andamento cujo paciente ainda não entrou, ordenáveis por quando foram chamadas.
CREATE INDEX IF NOT EXISTS consultations_evasao_scan_idx
  ON public.consultations (doctor_called_at)
  WHERE status = 'in_progress' AND patient_joined_at IS NULL;
