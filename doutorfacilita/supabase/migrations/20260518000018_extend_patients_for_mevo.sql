-- 018 — Campos do paciente exigidos pela Mevo Receita Digital
--
-- patients já tem: full_name, cpf, birth_date, gender, phone, email.
-- Mevo precisa adicionalmente de:
--   celular           — formato DDD+numero, ex: 11991420955 (sem máscara)
--   endereco_completo — endereço textual do paciente
--   alergias          — lista estruturada (Mevo aceita array de alergias)
--
-- `phone` já existe mas pode estar mascarado/landline; `celular` é o campo
-- normalizado que vai no payload Mevo (Paciente.Celular).
-- Idempotente.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS celular text,
  ADD COLUMN IF NOT EXISTS endereco_completo text,
  ADD COLUMN IF NOT EXISTS alergias text[] DEFAULT '{}';
