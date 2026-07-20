-- 20260720000002 — Evasão: função de varredura que marca no_show
--
-- expire_no_show_consultations() é a ação AUTORITATIVA do corte de evasão:
-- percorre consultas em andamento cujo paciente não entrou dentro do prazo
-- (default 5 min a partir de doctor_called_at) e as marca como no_show, com
-- cancellation_reason e ended_at, além de registrar no audit_log (fins
-- jurídicos/LGPD). Reusa o status no_show e a coluna cancellation_reason já
-- existentes; nenhum enum/coluna nova.
--
-- SECURITY DEFINER (bypassa RLS, escreve audit_log append-only via INSERT).
-- EXECUTE é revogado de public/anon/authenticated: só o agendador (pg_cron,
-- rodando como postgres) e o service_role podem disparar — um cliente NÃO pode
-- forçar evasão de consultas via RPC do PostgREST.
--
-- O AGENDAMENTO (pg_cron) fica em migration separada (…_03), aplicada só depois
-- que o sinal patient_joined_at (webhook do LiveKit + backup no cliente) estiver
-- em produção e verificado — senão a varredura cancelaria consultas legítimas
-- em andamento (patient_joined_at ainda nulo). Definir a função não a executa.
--
-- Idempotente (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.expire_no_show_consultations(
  p_grace interval DEFAULT interval '5 minutes'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT id, doctor_id, patient_id, livekit_room_name
    FROM public.consultations
    WHERE status = 'in_progress'
      AND patient_joined_at IS NULL
      AND doctor_called_at IS NOT NULL
      AND doctor_called_at < (now() - p_grace)
    ORDER BY doctor_called_at
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.consultations
       SET status = 'no_show',
           cancellation_reason = 'evasão: paciente não entrou na chamada em 5 minutos',
           ended_at = now()
     WHERE id = r.id;

    -- Registro jurídico/LGPD. audit_log é append-only (só INSERT permitido).
    INSERT INTO public.audit_log (
      user_id, user_role, user_email, action, entity_type, entity_id, metadata
    ) VALUES (
      NULL, 'system', 'system@evasao', 'update', 'consultation', r.id,
      jsonb_build_object(
        'event', 'no_show_evasao',
        'reason', 'paciente não entrou na chamada em 5 minutos',
        'doctor_id', r.doctor_id,
        'patient_id', r.patient_id,
        'grace_minutes', round(extract(epoch FROM p_grace) / 60.0)
      )
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_no_show_consultations(interval) FROM public, anon, authenticated;
