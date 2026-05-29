-- 034 — REPLICA IDENTITY FULL em consultations
--
-- Supabase Realtime (postgres_changes) precisa avaliar a OLD row contra RLS
-- pra decidir se entrega o evento pra cada user. Com REPLICA IDENTITY DEFAULT,
-- o WAL só carrega a primary key da OLD row → a avaliação de RLS no UPDATE
-- pode falhar e o evento ser silenciosamente descartado.
--
-- Com FULL, todas as colunas da OLD row vão no WAL → RLS roda corretamente
-- contra OLD e NEW, e o cockpit recebe o UPDATE quando paid_at + status muda
-- pra in_queue. Custo de armazenamento marginal (linhas pequenas, ~poucos
-- bytes extras por UPDATE).
--
-- A tabela já está na publication supabase_realtime desde a mig.015.
-- Idempotente.

ALTER TABLE public.consultations REPLICA IDENTITY FULL;
