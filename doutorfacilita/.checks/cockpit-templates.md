# Templates do admin no cockpit (anamnese rápida) + anexos

Profile: light (nenhum declarado no repo) · handoff: on, mas um único batch (ver Handoff)

Sources:

- `doutorfacilita/.tasks/B-cockpit-templates.md` - intent, critérios 1-8, out of scope, Observable, Swept, Unresolved (1 e 2 abertos, ficam como escritos)
- Banco de produção `tylpojscdbkzulykdguv` (lido 2026-09-29) - 9 templates ativos, 0 anexos, 0 objetos; bucket/policies conferidos
- Logs Supabase 2026-09-04/05 (edge_logs + storage_logs) - causa-raiz do "upload nunca funcionou" (abaixo)

## Causa-raiz do anexo (reproduzida antes de qualquer mudança)

- Reprodução local 2026-09-29 (`/admin/templates/novo`, conta admin de teste): `POST /storage/v1/object/template-attachments/draft/…` → **200**, editor mostra "Anexo enviado" e "📎 teste-automatizado.pdf". O upload **não** falha.
- Logs de produção: 2026-09-04 21:28 o admin enviou `Modelos_de_Prontua_rios_HG_2.pdf.pdf` (`ObjectCreated:Post`), o IVAS foi criado com ele (21:35) e "abrir" baixou o arquivo (22:29:54, GET 200). Às 22:29:58 o próprio editor apagou o objeto (`ObjectRemoved:Delete`, botão "remover") e o IVAS foi salvo sem anexo (22:30:20). Um template antigo (`ff0ba22e…`, nome vazio, de 2026-05-29, excluído em 2026-09-05) apontava para um objeto inexistente (`POST /object/sign/… → 400`), então o editor mostrava o 📎 sem o link "abrir".
- Conclusão: storage, bucket e policies funcionam; o anexo "não funcionava" porque **não chegava a lugar nenhum útil** - o cockpit nunca lia `prontuario_templates` nem o anexo - e o único objeto real foi removido pelo botão "remover". Nenhuma mudança de policy/bucket/schema é necessária; o critério 7 é provado sobre o código atual do editor e o 8 é a correção.

## Out of scope

- `structured_fields` no cockpit - nenhum template usa; o cockpit ignora
- Tabela, colunas, bucket, policies - já existem e funcionam (ver causa-raiz)
- "remover" anexo sem confirmação / objeto órfão quando o admin remove e não salva - comportamento atual, inalterado (vira pendência no PR)

## Landing

Toca `src/components/cockpit/ChartPanel.tsx` (lista na aba "Anamnese rápida" + aplicar), `src/components/CockpitScreen.tsx` e `src/app/cockpit/page.tsx` (repassam nome/especialidade do médico), `src/components/admin/TemplateEditor.tsx` (passa a importar `TEMPLATE_VARS` do módulo novo; a URL assinada do "abrir" sai do render para um `useEffect` - o harness pegou `console.error` "state update on a component that hasn't mounted", setState no render era descartado). Reusa o autosave (`patchProntuario` → upsert `medical_records`) e o padrão de URL assinada do `HistoricoDrawer`.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Lógica de aplicar template vira módulo puro sem imports | `src/lib/prontuario/aplicarTemplate.ts`: `TEMPLATE_VARS`, `substituirVariaveis(texto, ctx)`, `aplicarTemplate(prontuario, template, ctx)`; `TemplateEditor` importa `TEMPLATE_VARS` dele | lógica inline no `ChartPanel` com a lista duplicada do editor - as duas listas divergem em silêncio quando o admin ganha uma variável nova |
| Primeiro teste unitário do repo | `node --test tests/` (Node 24 remove tipos nativamente), script `npm test`; testes em `tests/*.test.mjs` importando o `.ts` | adicionar Jest/Vitest - dependência nova e config para 1 módulo puro |
| `{{queixa}}` | `consultations.chief_complaint` (informada pelo paciente); se vazia, o texto atual de "Queixa principal" do prontuário antes de aplicar; senão `""` | só o prontuário - perde a queixa do checkout, que é o que o editor descreve como "informada" |
| `{{data}}`/`{{hora}}` | `consultations.started_at` se houver, senão o instante em que o médico clica "Aplicar"; `pt-BR`, `DD/MM/AAAA` e `HH:MM` | sempre `now()` - diverge da data do atendimento quando o prontuário é completado depois |
| `{{especialidade}}` | `doctors.primary_specialty` do médico logado (lido em `cockpit/page.tsx`) | `prontuario_templates.especialidade` - o editor descreve a variável como "Especialidade do médico" |

- Nada mais aqui é difícil de reverter

## Checks

### S1 - Templates no cockpit · 4 arquivos · ~62 KB · ~16k

**C1** - Na aba "Anamnese rápida" (consulta com paciente), a lista mostra exatamente os templates `ativo = true`, em ordem alfabética pt-BR de `nome`, cada um com `nome` e `especialidade` quando houver, acima do formulário de anamnese (Alergias)
Proof: `node e2e/cockpit-templates.mjs` → linhas `PASS C1 …` (scratchpad; ver "Harness")

**C2** - Criar, renomear e inativar um template no `/admin/templates` aparece/muda/some da lista ao reabrir a aba, sem recarregar o cockpit
Proof: `node e2e/cockpit-templates.mjs` → `PASS C2 criado`, `PASS C2 editado`, `PASS C2 inativo some`

**C3** - "Aplicar" preenche os 5 campos com os `*_template` não nulos, adiciona `cid10_suggested` sem duplicar, muda para "Prontuário" e dispara o upsert de `medical_records` com esses valores
Proof: `node --test tests/aplicarTemplate.test.mjs` (casos "C3 …")
Proof: `node e2e/cockpit-templates.mjs` → `PASS C3 …`

**C4** - Campo de destino com texto: resultado = texto existente + `\n\n` + texto do template
Proof: `node --test tests/aplicarTemplate.test.mjs` (casos "C4 …")
Proof: `node e2e/cockpit-templates.mjs` → `PASS C4 …`

**C5** - As 9 variáveis de `TEMPLATE_VARS` são substituídas pelos valores do paciente/médico/consulta; `{{fora_da_lista}}` fica literal
Proof: `node --test tests/aplicarTemplate.test.mjs` (casos "C5 …", tabela sobre as 9)
Proof: `node e2e/cockpit-templates.mjs` → `PASS C5 …`

**C6** - Consulta sem `doctor_id`: todos os botões "Aplicar" desabilitados
Proof: `node e2e/cockpit-templates.mjs` → `PASS C6 …`

### S2 - Anexos · 2 arquivos · ~20 KB · ~5k

**C7** - Admin anexa `.pdf` em `/admin/templates/novo` e salva: objeto existe no bucket, a linha persiste `attachment_path/name/mime` (editor recarregado mostra "📎 <nome>" e o mime) e "abrir" baixa exatamente os bytes enviados
Proof: `node e2e/cockpit-templates.mjs` → `PASS C7 …`

**C8** - No cockpit, template com anexo mostra link "📎 <attachment_name>" cujo href é URL assinada de `template-attachments` que devolve os bytes do arquivo
Proof: `node e2e/cockpit-templates.mjs` → `PASS C8 …`

## Harness

`e2e/cockpit-templates.mjs` (Playwright) fica no scratchpad da sessão (`C:\Users\lucca\AppData\Local\Temp\claude\C--Users-lucca-projetos-plantao-digital-plantao-digital\db6397ac-dd20-40c2-b4ab-b483d06fa710\scratchpad\e2e\`), não no repo: roda contra o banco de **produção** via dev server local `:3102`. Ele cria um template de teste `AAA TESTE AUTOMATIZADO <ts>` com anexo, e ao fim remove o anexo e exclui o template pelo próprio admin. Toda escrita no Supabase fora de `prontuario_templates`/`template-attachments` é **bloqueada**; o upsert de `medical_records` é interceptado e respondido localmente (o teste lê o corpo da requisição, nada grava no prontuário real). Consultas usadas (conta de teste, só leitura): `dbd01aeb…` (com `doctor_id`) e `e63cb386…` (sem `doctor_id`). A remoção do anexo é conferida pedindo uma **nova** assinatura (a URL assinada antiga continua 200 pelo cache da CDN, `cacheControl: 3600`). Pré-requisito: `npx next dev -p 3102` em `doutorfacilita/` com `.env.local`.

Última execução (2026-09-29, HEAD da feature): `ALL PASS`, 0 escritas do browser bloqueadas, 1 upsert de `medical_records` interceptado; `npm test` 23/23; `npm run type-check` e `npm run build` limpos.

## Swept

- validation: existing - `accept=".pdf,.doc,.docx,…"` no editor
- failure modes: existing - "Erro no upload: …" no editor; lista com erro → `console.error("[ChartPanel] …")` + lista vazia
- idempotency: C3 (CID sem duplicar); aplicar duas vezes acrescenta de novo (C4) - ação explícita
- authorization: existing - RLS `doctors read active templates`, policies `template_attachments_*`, guard do `/cockpit`
- concurrency: n/a - leitura; escrita pelo autosave existente
- data lifecycle: n/a - nenhum dado novo
- dependency failure: existing - URL assinada nula → link não aparece (C8 cobre o caminho feliz)
- state transitions: n/a
- observability: existing - `audit_log` de create/update/delete de template

## Handoff

S1 ≈ 16k + S2 ≈ 5k = 21k, bem abaixo de 150k → um único batch, sem handoff.
