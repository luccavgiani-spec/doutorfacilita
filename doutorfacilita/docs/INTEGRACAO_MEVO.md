# Integração Mevo Receita Digital

Infraestrutura completa para emissão de receita digital via **Mevo Receita
Digital** (Nexodata) embutida no Cockpit do médico.

> **Status:** código pronto e buildando. A integração **só funciona
> end-to-end quando `MEVO_AUTH_B64` for preenchida** com a credencial real
> da Mevo. Até lá, a UI mostra o estado "🔧 Aguardando credenciais".

## Arquitetura

- A Mevo opera com **uma credencial única do parceiro** (Plantão Digital):
  `Authorization: Basic Base64(login:senha)`. Médicos **não** criam conta —
  são identificados a cada chamada pelo payload (Nome, CPF, CRM+UF, especialidade).
- A credencial **nunca** vai ao frontend. Toda chamada passa por Edge
  Function no Supabase (`Authorization: Basic` setado server-side).
- **Fonte única do médico:** `public.doctors` (a tabela `medico_profiles` foi
  mergeada na migration 017). Paciente vem de `consultations → patients`.
- **PDFs expiram em 10 min.** O evento `prescricao` dispara o download
  imediato e o arquivamento no bucket privado `prescricoes-pdfs`
  (compliance CFM 1.821/2007).

## Migrations

```bash
# A partir de doutorfacilita/
npx supabase db push      # aplica 017..021 no projeto linkado
```

| Migration | O que faz |
|---|---|
| `017_merge_medico_profiles_into_doctors` | adiciona `endereco`/`bio` em `doctors`, copia dados pendentes de `medico_profiles`, **dropa** `medico_profiles` |
| `018_extend_patients_for_mevo` | `patients` += `celular`, `endereco_completo`, `alergias[]` |
| `019_create_prescricoes_mevo` | tabela `prescricoes_mevo` + RLS (`doctors.user_id = auth.uid()`) |
| `020_create_prescricoes_documentos` | tabela `prescricoes_documentos` + RLS |
| `021_create_prescricoes_storage_bucket` | bucket privado `prescricoes-pdfs` + policy de leitura |

> O bucket também pode ser criado pelo Dashboard → Storage → New bucket
> `prescricoes-pdfs` com **Public = OFF**. A migration 021 já faz isso via
> SQL (`storage.buckets` + policy); rodar `db push` basta.

## Edge Functions

```bash
npx supabase functions deploy mevo-iniciar-prescricao
npx supabase functions deploy mevo-reabrir-prescricao
npx supabase functions deploy mevo-salvar-documentos
```

| Função | Body | Papel |
|---|---|---|
| `mevo-iniciar-prescricao` | `{ consultation_id }` | valida médico/consulta/paciente, monta payload, chama `POST /api/prescricao/iniciar`, salva `prescricoes_mevo`, devolve `{ modal_url, prescricao_id }` |
| `mevo-reabrir-prescricao` | `{ prescricao_id }` | "terminar mais tarde": `POST /api/prescricao/{idMevo}/sessao`, devolve nova `modal_url` |
| `mevo-salvar-documentos` | `{ prescricao_id, documentos[] }` | baixa cada PDF (retry 2x, timeout 30s), sobe pro bucket, registra; status `finalizada` ou `finalizada_com_erro` |

Tipos compartilhados: `supabase/functions/_shared/mevo-types.ts`
(espelhado no frontend em `src/lib/mevo/types.ts`).

## Variáveis de ambiente (secrets do Supabase)

```bash
npx supabase secrets set \
  MEVO_BASE_URL=https://emr-homolog.nexodata.com.br \
  MEVO_AUTH_B64=                # Base64(login:senha) — VAZIO até a Mevo enviar \
  MEVO_SUBPARCEIRO=PLANTAO_DIGITAL \
  MEVO_LOGO_URL=                # URL pública do logo (162x50px, ≤500kb) \
  MEVO_COR_PRIMARIA=#0066CC \
  MEVO_COR_SECUNDARIA=#00A3FF
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente
pelo runtime das Functions.

> Enquanto `MEVO_AUTH_B64` estiver vazia, as funções retornam **503
> `mevo_nao_configurada`** e o card no Cockpit mostra o estado de espera
> (mensagem técnica em dev/staging, genérica em produção).

## Checklist antes de testar com credenciais reais

- [ ] Kickoff com a Mevo realizado (`integracao@mevosaude.com.br`)
- [ ] `SubParceiro` definido junto à Mevo (atualizar `MEVO_SUBPARCEIRO`)
- [ ] Credencial de **homologação** recebida → `MEVO_AUTH_B64`
- [ ] ≥3 médicos em `public.doctors` com `cpf`, `council_number`,
      `council_state`, `email` válidos
- [ ] Cada médico com certificado digital em nuvem (Bird ID / SafeID / Vidaas)
- [ ] Logo do Plantão Digital em URL pública (162x50px, ≤500kb) → `MEVO_LOGO_URL`
- [ ] Migrations 017–021 aplicadas; bucket `prescricoes-pdfs` privado existe

## Fluxo de teste end-to-end (homologação)

1. Aplicar migrations + deploy das 3 functions + setar secrets (incl.
   `MEVO_AUTH_B64` de homologação).
2. Logar como médico, ter uma consulta em `status='in_progress'`
   (médico chama o paciente no Cockpit → consulta vira `in_progress`).
3. No card **Documentos médicos** do Cockpit → **Emitir prescrição**.
4. A iframe Mevo Prescritores abre embutida (ou popup se o card < 900px).
5. Emitir um documento na Mevo e assinar com certificado.
6. Ao concluir, a Mevo dispara `postMessage` `prescricao` → o card chama
   `mevo-salvar-documentos` imediatamente.
7. Verificar: linha em `prescricoes_mevo` (`status='finalizada'`),
   linhas em `prescricoes_documentos`, arquivos no bucket
   `prescricoes-pdfs/{doctor_id}/{prescricao_id}/…pdf`.
8. Botão **Baixar PDFs** na lista → abre via signed URL (válida 1h).

Eventos tratados pelo card: `prescricao` (salva PDFs), `cancel`
("terminar mais tarde" — `idPrescricao` já persistido, basta reabrir),
`excluded` (atualiza status local).

## Homologação → Produção

1. Trocar `MEVO_BASE_URL` para o endpoint de produção da Mevo.
2. Trocar `MEVO_AUTH_B64` pela credencial de **produção**.
3. (Opcional) Validar `MEVO_LOGO_URL` / cores com a identidade final.

O campo `prescricoes_mevo.ambiente` é derivado automaticamente da
`MEVO_BASE_URL` (`homologacao` se a URL contém "homolog", senão `producao`).

## O que o cockpit exibe e por quê

O card **Documentos médicos** foi auditado para mostrar **só o que a Mevo
realmente entrega** (doc oficial Mevo Receita Digital **v1.42**). Mocks que
sugeriam capacidades inexistentes foram removidos para não gerar bug report
quando os médicos reais clicarem.

### Exibido (fiel à doc)

| Elemento | Fonte real | Ref. doc v1.42 |
|---|---|---|
| Subtítulo dinâmico (sem consulta / aguardando credencial / pronto · ambiente) | probe `mevo-iniciar-prescricao` com `{ check: true }` reaproveitando o guard **503 `mevo_nao_configurada`**; `ambiente` derivado de `MEVO_BASE_URL` (fallback `NEXT_PUBLIC_MEVO_AMBIENTE`) | Arquitetura da credencial única do parceiro |
| Botão **Emitir prescrição** | `POST /api/prescricao/iniciar` (Edge Function) | p.13 — modal única Mevo Prescritores |
| Lista "Prescrições desta consulta" (`Token:`, `Código:`, status, timestamp) | tabela `prescricoes_mevo` (migration 019) | p.16, p.18-19 |
| Botão **Ver QR Code** | `prescricoes_mevo.qrcode_url` (migration 019) | p.16 |
| Botão **Baixar N PDFs** | `prescricoes_documentos` + signed URL do bucket privado (migration 020/021) | p.16 |
| Bloco informativo "Tipos de documento na modal Mevo" (9 tipos) | texto estático fiel — o tipo é escolhido **dentro** da modal, não antes | p.18-19 (RECEITA SIMPLES/CONTROLE ESPECIAL, EXAME, ATESTADO, LME, ENCAMINHAMENTO, RELATORIO, INSTRUCAO, MANIPULADOS) |
| "✓ Última prescrição enviada para o paciente (SMS + e-mail)" | só aparece quando há prescrição `finalizada`/`finalizada_com_erro` | p.19 (SMS+e-mail são disparados pela Mevo após emissão) |
| Rodapé "Assinatura digital obrigatória (ICP-Brasil) · PDFs arquivados em até 10min · CFM 1.821/2007" | — | p.16 (janela de 10 min dos PDFs) |

> O médico **escolhe o certificado dentro da modal Mevo**. A doc lista 6
> opções (Bird ID, VoultID, SafeID, Safe4Health, Vidaas, A1/A3 ICP-Brasil).
> O cockpit **não** cita marca específica de certificado.

### Removido (não existe na API/doc Mevo — era mock/dívida técnica)

- **Banner "Sessão pronta · CRM validado · certificado Soluti BirdID ativo"**
  — estado falso e marca de certificado que o médico nem escolheu.
- **6 "Atalhos diretos" (R/A/E/N/L/M)** — sugeriam escolher o tipo antes de
  abrir a modal; a modal Mevo é única (p.13).
- **Card "Interações IBM Micromedex"** — não existe na API Mevo.
- **Card "Modelos · receitas salvas"** — existe **dentro** da modal Mevo, não
  é API exposta ao parceiro.
- **Card "Farmácias · rede nacional"** — é o portal próprio da Mevo para
  farmacêuticos (`farmacia.mevosaude.com.br`), não recurso do médico.
- **Card "Benefícios · Rename · desconto"** — não existe na doc Mevo.
- **Cards "Histórico" e "Alergias"** — eram mock estático (badge `3` e textos
  hardcoded, sem query a `consultations`/`patients`).
- **Bloco "mevo SYNC · Transcrição → prescrição automática"** — inventado;
  não existe na doc nem há LLM ligado.
- **"sugestão nó IA: faringite aguda (J02.9)"** no prontuário — mock sem LLM.
- **"Documentos chegam no SMS e email da paciente em segundos"** — promessa
  antecipada; substituída pela confirmação condicional pós-emissão.

## TODO de produção (anotado no código)

- Validar `event.origin` do `postMessage` contra os domínios oficiais da
  Mevo (`MevoPrescricaoCard.tsx`).
- Confirmar nomes EXATOS dos campos do payload/resposta contra o PDF
  oficial da Mevo (`_shared/mevo-types.ts` — hoje há parsing defensivo
  camelCase/snake_case).

## Painel administrativo (`/admin/mevo`)

A partir do painel admin (`src/app/admin/mevo/page.tsx`) a configuração
**não-secreta** da Mevo é editável por UI e persistida em
`public.integration_configs` (`id='mevo'`): `enabled`, `ambiente` e
`config` jsonb (`subparceiro`, `logo_url`, `cor_primaria`,
`cor_secundaria`, `certificado_obrigatorio`, `permitir_impressao`,
`exibir_email`). Acesso restrito a `has_role('admin')` (RLS) e toda
gravação registra em `audit_log` via `logAdminAction`.

O painel também exibe o dashboard de prescrições (`prescricoes_mevo`,
taxa de sucesso, últimas 50) e as falhas de download
(`v_failed_pdf_downloads`).

> ⚠️ **Pendência de produção (decisão "opção A" do plano /admin):** as
> Edge Functions (`mevo-iniciar-prescricao`, `mevo-reabrir-prescricao`,
> `mevo-salvar-documentos`) **ainda leem a config só de `Deno.env`**.
> Para o painel ter efeito real, falta alterá-las para ler
> `integration_configs` (`id='mevo'`) **DB-first com fallback pro
> `Deno.env`**. `MEVO_AUTH_B64` e `MEVO_BASE_URL` continuam **secrets**
> (env), nunca no banco/UI. Enquanto essa alteração não for feita +
> redeployada, salvar no `/admin/mevo` persiste mas não muda o
> comportamento das funções.
