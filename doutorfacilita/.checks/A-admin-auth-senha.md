# A — Admin e autenticação: consulta manual, papéis, cadastro sem confirmação e recuperação de senha

Profile: `light` (nenhum `AGENTS.md` do repo declara outro) · handoff: um único agente (4 fatias somam ~40k de leitura, bem abaixo de 150k).

Sources:

- `doutorfacilita/.tasks/A-admin-auth-senha.md` - registro de decisão: 16 critérios, Decided, Unresolved
- Banco de produção `tylpojscdbkzulykdguv` (lido 2026-09-29) - CHECK `timestamps_order`, `v_cockpit_fila`, índice `unique_active_role`, `has_role()`, policies de `user_roles`/`audit_log`
- Sem design binding: as telas de senha reusam o card `auth-*` existente (Out of scope da task)

## Out of scope

- Link "Esqueci minha senha?" no `/login` - task C; aqui só as rotas (merge A antes de C)
- Visual novo das páginas de senha - card `auth-*` existente
- Impedir auto-revogação / último admin - não pedido
- Papéis `carteira`/`agendamento` - seguem stub
- Template do e-mail, Site URL/redirect allowlist, SMTP - Unresolved 1-3, ação do Lucca no dashboard

## Landing

Toca `src/app/admin/actions.ts` (payload do insert), `src/app/admin/medicos/actions.ts` (corrida no grant), e cria `/esqueci-senha`, `/redefinir-senha`, `/auth/confirm`. Reusa `createClient` (browser/server), `isStrongPassword`/`PasswordChecklist`, o card `auth-*` e o `LoginForm` como está. A regra de senha passa a ter uma fonte só (`senhaSchema` em `cadastroSchema.ts`), usada pelo `/cadastrar` e pelo `/redefinir-senha`.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Unicidade só entre papéis ativos (Decided 1, já aplicado) | `CREATE UNIQUE INDEX unique_active_role ON public.user_roles (user_id, role) WHERE revoked_at IS NULL` | reativar a linha revogada - apaga o histórico do soft-delete |
| Rota `/auth/confirm` vira contrato consumido pelo link do e-mail "Reset Password" (o `redirectTo` aponta para ela; o template ficou no padrão `{{ .ConfirmationURL }}`, informado pelo coordenador em 2026-09-29, então o ramo ativo é `?code=`; `?token_hash=` fica pronto para quando o template mudar) | `GET /auth/confirm?token_hash=<hash>&type=recovery` → `verifyOtp` → 303 `/redefinir-senha` (`Location` relativo); `GET /auth/confirm?code=<pkce>` → `exchangeCodeForSession` → 303 `next` (lista fechada: só `/redefinir-senha`; qualquer outro valor vira o default - trocado de "só caminho relativo" após o Verifier achar bypasses de sanitização nas rodadas 1 e 2); qualquer falha → 303 `/redefinir-senha?erro=link` | só PKCE (`?code=`) no `/redefinir-senha` client-side: com o template padrão funciona só no mesmo navegador que pediu o link (o code verifier fica no cookie dele) - abrir o e-mail no celular falharia sem saída; fluxo implícito (`#access_token` no hash): tokens na URL, e o `@supabase/ssr` é PKCE por padrão |

- `quickCreateConsultation` passa `created_at` explícito = `paid_at` = `queued_at` (um único instante do servidor da app). Reversível (código), registrado aqui porque há alternativa viva: RPC SQL com `now()` exigiria migration nova (DDL fora do escopo); insert `pending_payment` + update não resolve, pois PostgREST não expressa `now()` e o relógio continuaria o da app.
- Corrida no `grantRole`: o perdedor de duas concessões simultâneas recebe `23505` do índice parcial → tratado como sucesso idempotente (o papel ficou ativo). Reversível.
- Nada mais nesta mudança é difícil de reverter.

## Checks

Não existe test runner no repo (`package.json`: `build`, `lint`, `type-check`). As provas são: `npm run type-check`/`build`, SQL de leitura ou em transação que termina em ROLLBACK/exception no banco de produção, scripts Node no scratchpad da sessão (carregam `.env.local` sem imprimir) e o app rodando em `localhost:3101`.

### S1 - Consulta manual pelo admin · 3 arquivos · ~9k

**C1** - A consulta manual grava `status=in_queue`, `payment_id` `ADMIN-MANUAL-…`, `amount_cents=3990`, `paid_at >= created_at`, `queued_at >= paid_at`, mesmo com o relógio da app atrás do banco; o modal mostra "Consulta criada na fila" com o id
Proof: SQL em transação com ROLLBACK - insert com o payload novo e relógio da app 5 s atrás do `now()` do banco passa; o payload antigo falha em `timestamps_order`
Proof: browser `localhost:3101/admin` como `medico-teste` (admin) → "Consulta imediata" para `paciente-teste` → modal "Consulta criada na fila" + id; SQL lê a linha criada (e a cancela em seguida)

**C2** - A consulta manual aparece no `/cockpit` de um médico logado sem recarregar
Proof: browser com `/cockpit` aberto em outra aba antes da criação; a linha aparece sem reload (realtime / polling de 10 s já existentes)

### S2 - Cadastro e pagamento sem confirmação · 0 arquivos alterados · ~6k leitura

**C3** - Com "Confirm email" desligado, `signUp` devolve sessão e o wizard vai para `/login/redirect`
Proof: `node settings.mjs` → `GET /auth/v1/settings` retorna `mailer_autoconfirm: true`; `CadastroWizard.tsx` `if (out.session) router.push("/login/redirect")`

**C4** - Nenhum passo do checkout/fila/edge functions lê `email_confirmed_at`
Proof: `rg -n "email_confirmed_at|confirmed_at|email_verified" src supabase/functions` sem ocorrências

**C5** - `count(*) where email_confirmed_at is null` = 0; as 3 contas backfilladas podem entrar
Proof: SQL de leitura - 0 pendentes; as contas com `email_confirmed_at` do backfill não têm `banned_until`/`deleted_at` (senha própria delas não é conhecida - login real não testado)

### S3 - Re-conceder papel de admin · 3 arquivos · ~8k

**C6** - Re-conceder um papel revogado cria nova linha ativa e preserva o `revoked_at` da anterior; o toggle reflete a linha ativa após recarregar
Proof: SQL como admin `medico-teste` (`set local role authenticated` + `request.jwt.claims`) em transação com ROLLBACK: revoga e re-concede `admin` ao `paciente-teste`, confere as linhas; `medicos/page.tsx` lê `user_roles ... .is("revoked_at", null)`

**C7** - 3 ciclos revogar/conceder terminam sem erro e cada ação tem uma entrada `grant_role`/`revoke_role` no `audit_log`
Proof: mesma transação com ROLLBACK - 3 ciclos + insert em `audit_log` como o `logAdminAction` faz; conta 3+3 entradas

**C8** - No máximo uma linha ativa por (`user_id`, `role`), inclusive com duas concessões simultâneas
Proof: `pg_get_indexdef('unique_active_role')` é único parcial; SQL com duas inserções ativas do mesmo par levanta `unique_violation` (bloco termina em exception); `grantRole` trata `23505` como sucesso

**C9** - `victorhoura@hotmail.com` tem `admin` ativo e `has_role('admin')` é true para ele
Proof: SQL - linha ativa + `has_role('admin')` avaliado com `request.jwt.claims.sub` do Victor, em transação com ROLLBACK

### S4 - Recuperação de senha · 6 arquivos novos · ~15k

**C10** - `/esqueci-senha` sem sessão mostra "E-mail" e "Enviar link" e não redireciona
Proof: browser sem sessão em `localhost:3101/esqueci-senha` - URL final igual, label e botão presentes

**C11** - Enviar chama `resetPasswordForEmail` com `redirectTo` `<origin>/auth/confirm?next=/redefinir-senha` e mostra a mesma mensagem neutra para e-mail cadastrado e não cadastrado
Proof: browser - request `POST /auth/v1/recover` capturado com `redirect_to` apontando para `/auth/confirm?next=/redefinir-senha`; e-mail inexistente (resposta real do Supabase) e e-mail cadastrado (resposta 200 simulada no `fetch`, para não disparar e-mail) mostram o mesmo texto
Proof: `node --test recuperacao.test.mjs` - `mensagemEnvioRecuperacao(null)` devolve o texto neutro

**C12** - O link leva a `/redefinir-senha` com sessão, mostra "Nova senha" / "Confirmar senha" com `PasswordChecklist`, salva e vai para `/login/redirect`
Proof: `generateLink({type:'recovery'})` para `paciente-teste` (não envia e-mail) → browser em `/auth/confirm?token_hash=…&type=recovery` → `/redefinir-senha` com os campos → salvar → URL passa por `/login/redirect`

**C13** - Depois da troca a senha antiga é recusada e a nova entra
Proof: `node login-check.mjs` - `signInWithPassword` com a senha do seed falha e com a nova passa; em seguida a senha do seed é restaurada via `auth.admin.updateUserById`

**C14** - Link expirado/usado/inválido → "Link inválido ou expirado" + botão "Pedir novo link" → `/esqueci-senha`
Proof: browser - `/auth/confirm?code=invalido`, `/auth/confirm?error=access_denied&error_code=otp_expired`, `/auth/confirm?token_hash=invalido&type=recovery`, o mesmo `token_hash` já usado, e `/redefinir-senha` sem sessão mostram o texto e o botão com `href="/esqueci-senha"`

**C15** - Senhas diferentes ou fracas mostram o erro no campo e não chamam `updateUser`
Proof: browser - submit com senha fraca e com confirmação diferente mostra `.auth-error` no campo; nenhuma request `PUT /auth/v1/user`
Proof: `node --test recuperacao.test.mjs` - `novaSenhaSchema` rejeita fraca (path `senha`) e divergente (path `confirmar_senha`)

**C16** - 429 / `over_email_send_rate_limit` → "Muitas tentativas. Aguarde alguns minutos e tente de novo."
Proof: `node --test recuperacao.test.mjs` - `mensagemEnvioRecuperacao({status:429})` e `({code:'over_email_send_rate_limit'})` devolvem o texto
Proof: browser - resposta 429 simulada no `fetch` de `/auth/v1/recover` mostra o texto

## Swept

- validation: C15; e-mail em `/esqueci-senha`: `type="email"` + `required`
- failure modes: C14, C16; outros erros de envio: mensagem genérica "Não foi possível enviar o link agora. Tente de novo em instantes."; `same_password` no `updateUser`: "A nova senha precisa ser diferente da atual."
- idempotency and retry: C8; pedir o link duas vezes: n/a - o último link vale (Supabase Auth)
- authorization: existing - `has_role('admin')` em `admin/layout.tsx` + RLS; C10 (rotas públicas); `/redefinir-senha` sem sessão → C14
- concurrency and ordering: C8
- data lifecycle: C5, C6
- external-dependency failure: C16; entrega do e-mail: Unresolved 2
- state transitions: C1, C6
- observability: existing - `audit_log` (`create` consultation `via: admin_manual`, `grant_role`, `revoke_role`); C7

## Handoff

- Sem handoff: S1-S4 ≈ 40k de leitura, um único agente. O Verifier independente roda sobre `main..HEAD` com todos os checks.
- Settled mid-build (coordenador, 2026-09-29): template "Reset password" traduzido e mantido em `{{ .ConfirmationURL }}` (PKCE `?code=`); Redirect URLs de produção configuradas; SMTP próprio (Resend) ainda inativo - não enviar e-mail real em teste.
- Abandoned: redirect absoluto via `request.nextUrl.origin` em `/auth/confirm` - no dev a origem do servidor é `localhost` e o usuário estava em `127.0.0.1`, trocando de pote de cookies; virou `Location` relativo (303).
- Limites das provas: o ramo `?code=` válido não foi exercitado de ponta a ponta (exige e-mail real); o ramo `token_hash` foi, via `generateLink`. C2 no browser não foi possível: o `doctors` do `medico-teste` está soft-deleted (`current_doctor_id()` nulo) - provado por SQL com o JWT de um médico ativo, em transação abortada.
