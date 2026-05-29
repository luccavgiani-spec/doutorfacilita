-- 022 — Estende o enum audit_action com as ações de RBAC do /admin.
--
-- A seção Médicos concede/revoga papéis em user_roles e precisa registrar
-- isso em audit_log. O enum atual não tem 'grant_role'/'revoke_role'.
--
-- `ADD VALUE IF NOT EXISTS` é idempotente e seguro (adicionar valor a enum
-- nunca quebra dados existentes; remover sim — por isso só adicionamos).
-- NÃO mexemos nas duplicatas UPPER/lower existentes (fora de escopo;
-- Server Actions novas usam sempre lowercase).
--
-- NOTA: ALTER TYPE ... ADD VALUE precisa rodar fora de bloco de transação
-- que já use o valor. Esta migration só adiciona — sem uso no mesmo arquivo.

ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'grant_role';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'revoke_role';
