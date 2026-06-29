-- Permite que um médico logado faça o "claim" de uma consulta da fila
-- (in_queue, ainda sem médico) diretamente — root-cause do "Encerrar e
-- chamar o próximo" que falhava na RLS.
--
-- Já APLICADA EM PRODUÇÃO via MCP — este arquivo é apenas tracking no repo.
-- NÃO reaplicar.

create policy consultations_doctor_claim on public.consultations
for update
using (doctor_id is null and status = 'in_queue' and current_doctor_id() is not null)
with check (doctor_id = current_doctor_id());
