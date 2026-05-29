# `/admin` — Mapeamento (Fase 1)

> Documento de planejamento. **Nenhum código de feature foi escrito.**
> Aguarda OK antes da Fase 2.

## ⚠️ Caveat de confiabilidade do schema

O repositório **só contém as migrations 015 em diante**
(`supabase/migrations/`). As migrations base `001`–`014` (que criam
`doctors`, `patients`, `consultations`, extensões, enums) **não estão
versionadas aqui** — vivem só no projeto Supabase remoto
(`tylpojscdbkzulykdguv`). Os comentários no código citam "migration 001
(pgcrypto)" e "migration 004 (livekit_room_name)" como prova disso.

Portanto, o inventário de colunas abaixo das tabelas base foi **inferido**
de: `supabase/seeds/livekit_test_seed.sql`, dos `select(...)` nas Edge
Functions e nos Server Components. **Não é um dump de schema.** Antes de
rodar as migrations da Fase 2 recomendo confirmar o schema real e as RLS
vigentes via Supabase MCP (`list_tables` / SQL `information_schema`) — está
listado como pré-requisito no fim deste doc.

---

## 1.1. Inventário do que já existe

### Tabelas (Supabase `public`)

| Tabela | Origem | Campos conhecidos | Confiança |
|---|---|---|---|
| `doctors` | base (001–014, não versionada) | `id` uuid PK, `user_id` uuid→auth.users, `full_name`, `cpf`, `email`, `phone`, `council` (default `CRM`), `council_state`, `council_number`, `council_active` bool, `primary_specialty`, `specialties` text[], `is_active` bool, `accepts_new_consultations` bool, `endereco` (mig.017), `bio` (mig.017), `updated_at` | inferido (seed + `_shared/http.ts` + PerfilForm) |
| `patients` | base | `id` uuid PK, `user_id` uuid→auth.users, `full_name`, `cpf`, `birth_date`, `gender`, `phone`, `email`, `celular` (mig.018), `endereco_completo` (mig.018), `alergias` text[] (mig.018), `updated_at` | inferido (seed + `mevo-iniciar`) |
| `consultations` | base | `id` uuid PK, `patient_id`, `doctor_id` (nullable até ser pego da fila), `status` (enum: confirmados `in_queue`,`in_progress`; faltam os finais), `service_code`, `service_name`, `amount_cents` int, `paid_at`, `queued_at`, `chief_complaint`, `livekit_room_name` UNIQUE (mig.004), `livekit_room_created_at`, `doctor_called_at` (mig.015), `created_at`, `updated_at` | inferido (seed + getUserRole + mevo) |
| `prescricoes_mevo` | mig.019 | `id`, `consultation_id`→consultations, `doctor_id`→doctors, `patient_id`→patients, `mevo_id_prescricao`, `mevo_token`, `qrcode_url`, `codigo_validacao`, `status` CHECK(`iniciada`/`finalizada`/`finalizada_com_erro`/`cancelada`/`excluida`), `ambiente` CHECK(`homologacao`/`producao`), `created_at`, `finalizada_em` | **certo (versionado)** |
| `prescricoes_documentos` | mig.020 | `id`, `prescricao_id`→prescricoes_mevo (ON DELETE CASCADE), `tipo_documento`, `categoria`, `storage_path`, `assinado` bool, `content_type`, `created_at` | **certo** |
| `auth.users` | GoTrue | padrão Supabase; `raw_user_meta_data` traz `{full_name, role}` no seed | gerenciado pelo Supabase |
| `medico_profiles` | mig.016 → **dropada na mig.017** | não existe mais; fonte única do médico é `doctors` | **certo** |
| Storage bucket `prescricoes-pdfs` | mig.021 | privado (`public=false`), path `{doctor_id}/{prescricao_id}/{tipo}-{uuid}.pdf` | **certo** |

**Não existe** tabela de vendas/pagamentos, configs de integração, feature
flags, templates de prontuário, nem permissões/admin. Tudo isso é **novo**
(seção 1.3).

### Rotas / páginas Next.js (`src/app/**`)

| Rota | Tipo | Guard atual |
|---|---|---|
| `/` | LP (estática) | nenhum (fora do matcher do middleware) |
| `/login` | Server | redireciona p/ cockpit ou fila se já logado (`getUserRole`) |
| `/login/redirect` | Server | — |
| `/fila` | Server | — |
| `/consulta` | Server | — |
| `/cockpit` | Server | `getAuthUser()` → `redirect("/login")` se anônimo |
| `/area-do-medico/perfil` | Server | idem |
| `/area-do-medico/relatorios` | Server | idem |

Não há `/admin`. Não há `layout.tsx` em `area-do-medico` — **cada page
repete o guard**. O `src/middleware.ts` tem matcher para
`/cockpit|/fila|/consulta|/area-do-medico|/login` mas os guards de rota
estão **comentados** em `src/lib/supabase/middleware.ts` (só faz refresh de
token). Não existe conceito de role/admin em lugar nenhum.

### Componentes reutilizáveis (`src/components/**`)

| Componente | Reaproveitável para o admin? |
|---|---|
| `area-do-medico/RelatoriosDashboard.tsx` | **Sim, como padrão.** Usa `recharts` (Line/Bar/Pie/Area), define `Card`, `tick`, `tooltipStyle`, `brl()`, badges de status e uma `<table>` manual. Hoje 100% mock (`@/mocks/relatoriosMock`). Vira a base visual de Home/Mevo dashboards. |
| `cockpit/DoctorMenu.tsx` | Padrão de dropdown/menu (útil p/ sidebar/menu admin) |
| `cockpit/MevoPrescricaoCard.tsx` | Padrão de card + estados de config Mevo |
| `auth/LoginForm.tsx`, `auth/LogoutButton.tsx` | reaproveitar logout |
| `area-do-medico/PerfilForm.tsx` | padrão de form controlado + toast + update Supabase no client |
| **Não existe** `DataTable` genérico, modal/drawer genérico, toggle/switch | tabelas são `<table>` manuais → **criar `src/components/ui/data-table.tsx`** |

### Hooks (`src/hooks/**`)

- `useMevoPrescricao.ts` — único hook. Encapsula `supabase.functions.invoke`
  para iniciar/reabrir/salvar prescrição, `verificarConfiguracao`
  (probe `{check:true}` → 503 `mevo_nao_configurada`), e queries client-side
  a `prescricoes_mevo` / `prescricoes_documentos` + signed URLs (1h). É
  **doctor-scoped** (depende de RLS doctor). Reutilizável só parcialmente no
  admin (o admin precisa de visão cross-médico → server-side/service-role).

### Edge Functions (`supabase/functions/**`)

| Função | Papel | Lê config de |
|---|---|---|
| `mevo-iniciar-prescricao` | inicia prescrição; guard 503 se `MEVO_AUTH_B64` vazia; probe `{check:true}` | **`Deno.env`** (`MEVO_BASE_URL`, `MEVO_AUTH_B64`, `MEVO_SUBPARCEIRO`, `MEVO_LOGO_URL`, `MEVO_COR_PRIMARIA`, `MEVO_COR_SECUNDARIA`) |
| `mevo-reabrir-prescricao` | "terminar mais tarde" | `Deno.env` |
| `mevo-salvar-documentos` | baixa/arquiva PDFs no bucket | `Deno.env` |
| `create_enter_doc`, `get_patient_token` | LiveKit (médico/paciente) | `Deno.env` |
| Shared: `_shared/http.ts` (`resolveDoctor`, CORS/json), `_shared/mevo-types.ts` | — | — |

### Padrão de auth / RLS atual

- **Client (browser):** `createClient()` (`@supabase/ssr`, cookies) → RLS
  com `auth.uid()`.
- **Server Components:** `createClient()` server (cookies) +
  `getAuthUser()` (`auth.getUser()` cacheado por request).
- **Edge Functions:** `resolveDoctor()` — valida JWT, depois usa
  **service_role** (ignora RLS) para as queries; ownership checado **na
  mão** no código (`consultation.doctor_id !== doctor.id`).
- **Vínculo auth↔médico:** `doctors.user_id = auth.uid()`. Vínculo
  auth↔paciente: `patients.user_id = auth.uid()`.
- **RLS conhecida (versionada):** `prescricoes_mevo` e
  `prescricoes_documentos` são **doctor-scoped**
  (`doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())`).
  Storage `prescricoes-pdfs`: leitura via JWT do dono.
- **RLS de `doctors`/`patients`/`consultations`:** desconhecida (tabelas
  base não versionadas). **Confirmar no remoto.**
- **Não há** custom claims/JWT de role nem `is_admin`. `getUserRole()` é um
  TODO que infere role por lookup nas tabelas.

---

## 1.2. Gap analysis (por seção)

### Home (dashboard)
- **Existe:** padrão visual de dashboard (`RelatoriosDashboard`), recharts,
  `consultations.amount_cents/paid_at/status` como fonte de receita.
- **Criar:** tabela `sales`, server actions de listagem paginada/filtros,
  `OverrideProntiaCard` (config em `integration_configs`
  `id='prontia_redirect'`), agregações "saldos & atendimentos por médico"
  (GROUP BY sobre `consultations`).
- **Schema novo:** `sales`, `integration_configs`.
- ⚠️ Hoje **não há captura de lead/venda do site** — `sales` nasce vazia;
  popular depende de integração externa futura (fora do escopo desta fase).

### Pacientes
- **Existe:** tabela `patients` com os campos necessários.
- **Criar:** listagem paginada + busca (nome/CPF/celular), drawer de
  detalhe com histórico (`consultations` + `prescricoes_mevo` do paciente),
  edição (CPF bloqueado).
- **Schema novo:** nenhum. Precisa de **policy admin** para ler todos os
  pacientes (a RLS atual de `patients` é desconhecida — confirmar).

### Mevo
- **Existe:** `prescricoes_mevo` + `prescricoes_documentos` (dados para o
  dashboard), bucket de PDFs.
- **Criar:** card de config lendo/gravando `integration_configs`
  `id='mevo'`; dashboard agregado (total, taxa de sucesso, últimas 50).
- **Schema novo:** `integration_configs`.
- 🔴 **GAP crítico:** as Edge Functions Mevo leem config **só de
  `Deno.env`** (secrets do Supabase), **não de tabela**. Um painel que
  grava em `integration_configs` **não muda o comportamento** das
  funções enquanto elas não forem alteradas para ler DB-first com fallback
  pro env. **Decisão necessária na Fase 2** (ver "Decisões em aberto").
  `MEVO_AUTH_B64` e demais secrets continuam **env-only** — painel só
  exibe aviso, nunca edita.

### Templates
- **Existe:** nada.
- **Criar:** tabela `prontuario_templates`, CRUD, editor (form builder
  simples) + preview. O cockpit **ainda não consome templates** — esta
  fase entrega só o CRUD do admin; o consumo no cockpit é trabalho
  posterior.
- **Schema novo:** `prontuario_templates`.

### Médicos
- **Existe:** tabela `doctors` (campos completos), padrão de form.
- **Criar:** listagem + toggles por linha, detalhe `/admin/medicos/[id]`
  com histórico. `carteira_enabled`/`agendamento_enabled` ficam **stub**.
- **Schema novo:** `doctor_permissions` (inclui `is_admin` — é a fonte de
  verdade do guard do `/admin`).

---

## 1.3. Schema novo a criar (proposta — **não executar ainda**)

Refinos sobre a proposta original:

1. `doctor_permissions.doctor_id` → `doctors(id)` (não `auth.users`): o
   resto do código casa auth↔médico via `doctors.user_id`. O guard
   resolve `auth.uid()` → `doctors.id` → `doctor_permissions`.
2. Helper `public.is_admin(uuid)` recebe o **auth user id**
   (`auth.uid()`), faz o join `doctors`→`doctor_permissions`,
   `SECURITY DEFINER` + `STABLE` + `search_path` fixo (evita recursão de
   RLS e injeção de search_path).
3. Todas as tabelas novas: **RLS ON**, e policy única "admin total"
   usando `is_admin(auth.uid())`. Escrita real do app passa por **Server
   Action / Edge Function** — nunca service_role no client.
4. Índices em campos de busca/ordenação frequentes.

```sql
-- 0xx_admin_helper_is_admin
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctors d
    join public.doctor_permissions p on p.doctor_id = d.id
    where d.user_id = uid and p.is_admin = true
  );
$$;

-- 0xx_create_doctor_permissions
create table if not exists public.doctor_permissions (
  doctor_id uuid primary key references public.doctors(id) on delete cascade,
  is_admin boolean not null default false,
  carteira_enabled boolean not null default false,
  agendamento_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.doctor_permissions enable row level security;
create policy "admin gere permissoes" on public.doctor_permissions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
-- médico pode LER a própria linha (pro guard do layout sem recursão)
create policy "medico le propria permissao" on public.doctor_permissions
  for select using (
    doctor_id in (select id from public.doctors where user_id = auth.uid())
  );

-- 0xx_create_integration_configs   (NÃO guarda secrets)
create table if not exists public.integration_configs (
  id text primary key,                       -- 'mevo','prontia_redirect','livekit','resend'
  ambiente text not null default 'homologacao',
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb, -- só dados NÃO sensíveis
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.integration_configs enable row level security;
create policy "admin gere integration_configs" on public.integration_configs
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- 0xx_create_feature_flags
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  rollout jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
create policy "admin gere feature_flags" on public.feature_flags
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- 0xx_create_prontuario_templates
create table if not exists public.prontuario_templates (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  especialidade text,
  estrutura jsonb not null default '{"secoes":[]}'::jsonb,
  created_by uuid references auth.users(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_prontuario_templates_ativo
  on public.prontuario_templates (ativo);
alter table public.prontuario_templates enable row level security;
create policy "admin gere templates" on public.prontuario_templates
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- 0xx_create_sales
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nome text not null,
  telefone text,
  consultation_link text,
  consultation_id uuid references public.consultations(id),
  status text not null default 'pendente'
    check (status in ('pendente','pago','atendido','cancelado')),
  valor_centavos integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_sales_email      on public.sales (email);
create index if not exists idx_sales_created_at  on public.sales (created_at desc);
create index if not exists idx_sales_status      on public.sales (status);
alter table public.sales enable row level security;
create policy "admin gere sales" on public.sales
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- 0xx_admin_read_policies  (admin enxerga tudo p/ Pacientes/Médicos/Mevo)
-- Adiciona policy ADITIVA — não remove as doctor-scoped existentes.
create policy "admin le todas prescricoes" on public.prescricoes_mevo
  for select using (public.is_admin(auth.uid()));
create policy "admin le todos documentos" on public.prescricoes_documentos
  for select using (public.is_admin(auth.uid()));
-- doctors / patients / consultations: depende da RLS atual (desconhecida).
-- Confirmar no remoto antes — se já houver RLS restritiva, somar policy
-- "admin le ..." análoga; se for via service_role server-side, não mexer.

create index if not exists idx_prescricoes_mevo_created_at
  on public.prescricoes_mevo (created_at desc);
```

> Timestamps reais dos arquivos serão gerados na Fase 2
> (`2026051900xxxx_...`), encadeados após a migration 021.

---

## 1.4. RLS e segurança

- Toda tabela nova nasce com **RLS ON** + policy `is_admin(auth.uid())`.
- `is_admin()` é `SECURITY DEFINER`/`STABLE`/`search_path=public` para não
  recursar nas RLS das próprias tabelas e não vazar via search_path.
- Guard do `/admin` é **dupla camada**: (a) `layout.tsx` resolve
  `is_admin` server-side e redireciona; (b) RLS no banco — mesmo que a UI
  falhe, o banco nega. Nunca confiar só no frontend.
- **Mutations:** sempre Server Action (cookie do usuário, RLS aplicada) ou
  Edge Function. **Nunca** service_role no client.

**Secrets que NÃO podem ser editáveis pela UI** (só aviso no painel):

| Secret | Onde vive | Painel |
|---|---|---|
| `MEVO_AUTH_B64` | Supabase secrets (env) | aviso vermelho/amarelo, somente leitura do status |
| `LIVEKIT_API_SECRET` / `LIVEKIT_API_KEY` | Supabase secrets (env) | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime das Functions | nunca exibir |
| `MEVO_BASE_URL` | env (define ambiente) | exibir valor derivado (homolog/prod), não editar via UI nesta fase |

Se em qualquer ponto o código for ler `MEVO_AUTH_B64`/service_role e
mandar pro client → **é bug, paro e aviso** (regra geral nº 1).

---

## 1.5. Estrutura de rotas proposta

```
src/app/admin/
├── layout.tsx              # guard is_admin (server) + sidebar 5 seções
├── page.tsx                # Home: Vendas + Performance + Prontia + Saldos
├── pacientes/page.tsx
├── mevo/page.tsx
├── templates/
│   ├── page.tsx
│   └── [id]/page.tsx       # editor form-builder + preview
└── medicos/
    ├── page.tsx
    └── [id]/page.tsx       # detalhe + toggles permissões

src/components/admin/**     # VendasTable, PerformanceCharts,
                            # OverrideProntiaCard, SaldosEAtendimentos,
                            # PacientesTable, MevoConfigCard, etc.
src/components/ui/data-table.tsx   # tabela genérica (NÃO existe hoje)
src/hooks/admin/**          # hooks de leitura client-side quando necessário
src/app/admin/**/actions.ts # Server Actions p/ mutations (RLS via cookie)
```

Sidebar reaproveita tokens CSS já existentes (`--txt`, `--txt2`, `--bg`,
`--border`, `--blue`, `--red`, `--green`, `--yellow` + variantes `-l/-d` em
`globals.css`) — sem novo design system.

---

## Decisões em aberto (preciso da sua resposta antes da Fase 2)

1. **Config Mevo (gap crítico):** o painel grava em `integration_configs`,
   mas as Edge Functions leem só de `Deno.env`. Opções:
   - **(A)** Alterar as 3 Edge Functions Mevo para ler
     `integration_configs.id='mevo'` primeiro e cair pro `Deno.env` como
     fallback (painel passa a ter efeito real). *Mais trabalho, recomendado.*
   - **(B)** Painel **display/draft-only** nesta fase: salva no DB mas um
     aviso deixa claro que só passa a valer após alguém aplicar nos
     secrets via terminal. *Menos risco, menos valor.*
2. **`sales` sem fonte de dados:** nasce vazia (não há captura de venda do
   site). Confirmo que nesta fase entrego só o schema + UI lendo a tabela
   (vazia/seed manual), sem integração de captura?
3. **RLS das tabelas base:** posso confirmar `doctors`/`patients`/
   `consultations` via **Supabase MCP** (preciso autorizar a conexão) ou
   você prefere que eu trate tudo via Server Action service_role-free
   assumindo RLS desconhecida?
4. **Enum de `consultations.status`:** seed/mocks sugerem
   `in_queue`/`in_progress` + finais (`completed`/`canceled`?). Preciso do
   valor real p/ as agregações de "atendidos/concluídas". Confirmo via MCP?

## Pré-requisitos antes de rodar migrations da Fase 2
- [ ] Confirmar schema real + RLS de `doctors`/`patients`/`consultations`
      (Supabase MCP ou dump).
- [ ] Confirmar valores do enum `consultations.status`.
- [ ] Decidir item 1 (A ou B) acima.
- [ ] Definir o 1º admin (qual `doctors.id` recebe `is_admin=true` no seed).

## Entregáveis da Fase 1
- [x] `docs/ADMIN_MAPEAMENTO.md` (este arquivo)
- [ ] *(Fase 2 — após seu OK)* migrations, rotas, componentes, hooks,
      atualização de `docs/INTEGRACAO_MEVO.md`, checklist de teste manual
- [ ] *(Fase 2)* **`npm run dev` rodando** e a URL local do `/admin`
      (ex.: `http://localhost:3000/admin`) entregue para você visualizar a
      página. Inclui criar um `doctors.id` de teste com
      `doctor_permissions.is_admin=true` (senão o guard redireciona pro
      cockpit) e instruções de login do admin de teste.
