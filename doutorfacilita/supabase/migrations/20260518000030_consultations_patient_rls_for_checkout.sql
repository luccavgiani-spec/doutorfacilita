-- 030 — Policies RLS para o paciente criar/atualizar a própria consulta no /checkout
--
-- ANTES desta migration:
--   consultations tinha SELECT (paciente), SELECT/UPDATE (doctor), ALL (admin).
--   Faltava INSERT pra paciente — necessário pra finalizarCompra() inserir a
--   linha em status='created'. E faltava UPDATE pra paciente — necessário
--   pro stub do checkout marcar paid_at / status='in_queue' / payment_id.
--
-- Em produção (com gateway real), o UPDATE de pagamento será feito pelo
-- webhook do Mercado Pago via service_role. Esta policy de UPDATE do
-- paciente continua útil pra "cancelar" a consulta que ele criou mas
-- ainda não pagou.
--
-- Reaproveita public.current_patient_id() já existente no banco
-- (mesma função usada pelas policies de SELECT do paciente).
--
-- Idempotente.

-- Paciente INSERE a própria consulta (patient_id = ele mesmo)
DROP POLICY IF EXISTS consultations_patient_insert ON public.consultations;
CREATE POLICY consultations_patient_insert
  ON public.consultations
  FOR INSERT
  WITH CHECK (patient_id = current_patient_id());

-- Paciente ATUALIZA a própria consulta (mesma identidade no USING e CHECK)
DROP POLICY IF EXISTS consultations_patient_update ON public.consultations;
CREATE POLICY consultations_patient_update
  ON public.consultations
  FOR UPDATE
  USING (patient_id = current_patient_id())
  WITH CHECK (patient_id = current_patient_id());
