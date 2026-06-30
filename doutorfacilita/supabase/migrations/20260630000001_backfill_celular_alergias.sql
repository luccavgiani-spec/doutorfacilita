-- 5.2 — Consolidar colunas duplicadas em patients: fonte única passa a ser
-- `celular` e `alergias`. Backfill a partir das legadas `phone`/`allergies`
-- SÓ onde o destino está nulo. NÃO derruba as colunas legadas (fica para depois).
--
-- Aplicada em produção via MCP — arquivo é tracking no repo. Idempotente.

-- celular ← normalizarCelularBR(phone): remove não-dígitos; descarta DDI 55
-- (12–13 dígitos); aceita só resultado com 10 ou 11 dígitos.
update public.patients p
set celular = norm.v
from (
  select id,
    case when length(core) in (10, 11) then core else null end as v
  from (
    select id,
      case
        when left(nd, 2) = '55' and length(nd) in (12, 13) then substr(nd, 3)
        else nd
      end as core
    from (
      select id, regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') as nd
      from public.patients
    ) a
  ) b
) norm
where p.id = norm.id
  and p.celular is null
  and p.phone is not null
  and norm.v is not null;

-- alergias ← allergies (mesmo tipo text[]) onde alergias está nulo.
update public.patients
set alergias = allergies
where alergias is null
  and allergies is not null;
