-- user_roles: unicidade só entre papéis ATIVOS.
--
-- A UNIQUE (user_id, role) original contava também as linhas revogadas
-- (soft-delete via revoked_at), então re-conceder um papel revogado batia em
-- duplicate key e o toggle do /admin/medicos não religava. Agora a regra é
-- "no máximo uma linha ativa por usuário+papel"; as revogadas ficam como
-- histórico. Pré-condição: nenhum par com duas linhas ativas (garantido pela
-- UNIQUE total que está sendo substituída).

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS unique_active_role;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_role
  ON public.user_roles (user_id, role)
  WHERE revoked_at IS NULL;
