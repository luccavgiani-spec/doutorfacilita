-- View de leitura do board da fila do cockpit (multi-médico).
--
-- Já APLICADA EM PRODUÇÃO via MCP — este arquivo é apenas tracking no repo.
-- NÃO reaplicar.
--
-- Expõe a fila para QUALQUER médico logado, mas só com campos OPERACIONAIS
-- (patient_name, doctor_name) — sem queixa/idade/gênero — para furar a RLS
-- por-médico sem vazar dado clínico de paciente em atendimento por outro
-- médico. "Chamar próximo" e demais writes continuam em consultations (RLS
-- normal); a view é leitura-só do board.

create or replace view public.v_cockpit_fila
with (security_invoker = false) as
select c.id, c.status, c.patient_id,
       p.full_name as patient_name,
       c.doctor_id,
       d.full_name as doctor_name,
       c.queued_at, c.started_at, c.created_at
from public.consultations c
join public.patients p on p.id = c.patient_id
left join public.doctors d on d.id = c.doctor_id
where public.current_doctor_id() is not null
  and (
    (c.status = 'in_queue' and c.doctor_id is null)
    or c.status = 'in_progress'
  );
grant select on public.v_cockpit_fila to authenticated;
