# /admin — O que VOCÊ precisa fazer (runbook + checklist)

O código da Fase 2 está completo e `npm run type-check` passa limpo.
**Nada foi aplicado no banco** (Supabase MCP não autorizado nesta sessão).
Este documento lista exatamente o que falta — tudo do seu lado.

---

## A. Aplicar migrations no Supabase (`tylpojscdbkzulykdguv`)

Arquivos novos em `supabase/migrations/`, **nesta ordem** (já encadeados
por timestamp após a `…021`):

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `…022_extend_audit_action.sql` | `audit_action += grant_role, revoke_role` |
| 2 | `…023_create_integration_configs.sql` | tabela + RLS admin + 3 linhas seed |
| 3 | `…024_create_feature_flags.sql` | tabela + RLS (leitura pública) |
| 4 | `…025_create_prontuario_templates.sql` | tabela + RLS |
| 5 | `…026_create_v_admin_sales.sql` | view (security_invoker) |
| 6 | `…027_create_v_admin_doctor_stats.sql` | view (security_invoker) |

**Como aplicar** (escolha um):

- **CLI:** a partir de `doutorfacilita/`:
  ```bash
  npx supabase db push
  ```
- **Supabase MCP:** autorize a conexão (eu reenvio o link) e eu aplico via
  `apply_migration` uma a uma, já validando.
- **Dashboard:** SQL Editor, colar cada arquivo na ordem.

> A `…022` (ALTER TYPE … ADD VALUE) **não pode** rodar dentro de um bloco
> de transação que já use o valor — por isso ela é uma migration isolada.
> Se o `db push` reclamar de transação, rode a 022 sozinha primeiro.

## B. Pontos do schema que eu NÃO pude verificar (assumi do seu plano)

Confirme estes — se algum divergir, são ajustes pequenos e localizados:

1. **`has_role`** — assumi assinatura `has_role(check_role text)` e chamada
   `supabase.rpc('has_role', { check_role: 'admin' })`
   (`src/app/admin/layout.tsx`). Se o parâmetro tiver outro nome, ajustar
   só essa linha.
2. **`user_roles`** — assumi colunas `id`, `user_id`, `role`,
   `granted_by`, `revoked_at`. Usado em
   `src/app/admin/medicos/actions.ts`. Se o nome da coluna de papel não
   for `role` ou o soft-delete não for `revoked_at`, ajustar lá.
3. **`v_patient_history`** / **`v_failed_pdf_downloads`** / **`consents`**
   — as páginas renderizam as colunas dinamicamente (não assumem nomes),
   então não quebram; só confira se o conteúdo faz sentido.
4. **Enum `consultation_status`** — usei `completed`, `refunded`,
   `no_show`, `cancelled`, `created`, `paid`, `in_queue`, `in_progress`
   conforme o plano. A Home depende de `completed`/`refunded`/`no_show`.

## C. Criar um admin de teste

`/admin` exige `has_role('admin')`. Sem isso o layout redireciona pra
`/cockpit`. Com o `livekit_test_seed.sql` há o médico
`medico-teste@doutorfacilita.test` (`auth.users.id =
aaaaaaaa-0000-4000-8000-000000000001`). Conceda admin:

```sql
-- ajuste nomes de coluna se o item B.2 divergir
insert into public.user_roles (user_id, role, granted_by)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'admin',
        'aaaaaaaa-0000-4000-8000-000000000001');
```

## D. Rodar local (`npm run dev`)

```bash
cd doutorfacilita
npm install        # se ainda não
npm run dev
```

Precisa de `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (sem isso o middleware passa direto e o
guard não funciona). Depois:

1. Acesse `http://localhost:3000/login`
2. Logue como `medico-teste@doutorfacilita.test` / `Test1234!`
3. Acesse **`http://localhost:3000/admin`**

Sem o papel admin (passo C) você cai em `/cockpit` — é o guard
funcionando.

## E. Follow-up de produção (decisão "opção A" — Edge Functions Mevo)

Você escolheu a opção A: o `/admin/mevo` grava em
`integration_configs(id='mevo')`, mas as Edge Functions ainda leem só de
`Deno.env`. **Falta** alterá-las para ler a config DB-first com fallback
pro env e **redeployar**:

- `supabase/functions/mevo-iniciar-prescricao/index.ts` (usa
  `MEVO_SUBPARCEIRO`, `MEVO_LOGO_URL`, `MEVO_COR_*`, deriva `ambiente`)
- `supabase/functions/mevo-reabrir-prescricao/index.ts`
- `supabase/functions/mevo-salvar-documentos/index.ts`

`MEVO_AUTH_B64` e `MEVO_BASE_URL` **continuam secrets** (nunca no
banco/UI). Esse passo está documentado em `docs/INTEGRACAO_MEVO.md`
(seção "Painel administrativo"). Posso implementar quando você der o ok —
não fiz agora porque não há como deployar/testar Edge Function sem
acesso à infra, e você pediu para configurar depois.

---

## F. Checklist de teste manual (após A–D)

- [ ] `/admin` redireciona pra `/cockpit` quando o usuário **não** é admin
- [ ] Com `user_roles.admin`, `/admin` abre e a sidebar mostra 5 seções
- [ ] **Médicos:** lista carrega; busca por nome/CRM funciona; toggle
      `admin` liga/desliga e cria/encerra linha em `user_roles`
      (`revoked_at`), nunca DELETE
- [ ] `audit_log` recebe linha `grant_role`/`revoke_role` a cada toggle
- [ ] `/admin/medicos/[id]` mostra dados + consultas + prescrições Mevo
- [ ] **Mevo:** card carrega de `integration_configs.mevo`; salvar grava
      e registra `update`/`integration_config` em `audit_log`; aviso
      vermelho/amarelo do secret aparece
- [ ] Dashboard Mevo: KPIs e tabela das últimas 50; `v_failed_pdf_downloads`
- [ ] **Templates:** criar → redireciona pro editor; preview reflete em
      tempo real; toggle ativo/inativo; excluir (com confirmação) loga
      `delete`
- [ ] **Pacientes:** lista + busca; abrir detalhe loga `view`/`patient`;
      editar salva e loga `update`; **CPF não editável**
- [ ] **Home:** dropdown de período (7/15/30/60/90) muda os números;
      funil 5 etapas; KPIs (receita/estorno/vendas/no-show); tabela de
      vendas filtra por status e busca; override Prontia salva
- [ ] Em todas as seções: nenhuma chamada client com service role;
      nenhuma exibição de `MEVO_AUTH_B64`/secret

> **§11 (prescriptions vs prescricoes_mevo) — decisão tomada:** ver
> resumo no relatório. A Home **não** agrega prescrições (métrica é
> venda/consulta); o dashboard de prescrições vive na seção Mevo e usa
> **só `prescricoes_mevo`**. `public.prescriptions` (sistema próprio)
> fica fora do `/admin` v1 — quando você confirmar via MCP se é legado
> ou paralelo, decidimos se entra como KPI separado.
