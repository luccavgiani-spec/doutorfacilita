# B — Templates do admin no cockpit do médico (anamnese rápida) + anexos

> Build this with **tlc-implement**.
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

O médico não tem acesso, durante a consulta, aos 9 templates de prontuário que o admin cadastrou
(IVAS, ANSIEDADE, EPISÓDIO DEPRESSIVO, APTIDÃO FISICA, CONJUNTIVITE, ENXAQUECA, GECA, ITU,
LOMBALGIA): o cockpit (`src/components/cockpit/ChartPanel.tsx`) não lê `prontuario_templates` em
lugar nenhum, então a anamnese é redigida do zero a cada paciente. O anexo de template (PDF/Word)
nunca funcionou: o bucket `template-attachments` tem **0 objetos**, embora bucket, policies
(`template_attachments_admin_all`, `template_attachments_doctor_read`) e `has_role()` estejam
corretos no banco — a causa não foi reproduzida estaticamente.

Quando isto for entregue: na aba "Anamnese rápida" do painel lateral do cockpit o médico vê os
templates ativos, aplica um e o Prontuário é preenchido (com variáveis substituídas e CIDs
sugeridos); o admin anexa PDF/Word no template e o médico abre esse anexo no cockpit.

8 critérios em 2 fatias · 0 one-way doors · 2 em aberto, nenhum bloqueia

## Criteria

### Templates no cockpit

1. Dado um médico no `/cockpit` com paciente selecionado, quando abre a aba "Anamnese rápida", então vê a lista de todos os templates com `ativo = true` (hoje 9), em ordem alfabética de `nome`, cada um com `nome` e, quando houver, `especialidade`, acima do formulário de anamnese já existente.
2. Quando o admin cria, edita ou inativa um template em `/admin/templates`, então a lista do cockpit reflete a mudança na próxima abertura da aba, sem deploy; template inativo não aparece.
3. Dado uma consulta com `doctor_id` preenchido, quando o médico clica "Aplicar" num template, então Queixa principal, História da doença atual, Evolução / exame físico, Hipótese diagnóstica e Conduta recebem os respectivos `*_template` não nulos, os códigos de `cid10_suggested` entram como chips de CID sem duplicar os existentes, a aba muda para "Prontuário" e o autosave grava em `medical_records`.
4. Se um campo de destino já tem texto, então o texto do template é acrescentado depois de uma linha em branco e o texto existente permanece.
5. Quando o texto aplicado contém `{{nome_paciente}}`, `{{primeiro_nome}}`, `{{idade}}`, `{{cpf}}`, `{{data}}`, `{{hora}}`, `{{medico}}`, `{{especialidade}}` ou `{{queixa}}` (lista `TEMPLATE_VARS` do `TemplateEditor`), então cada um é trocado pelo valor do paciente / médico / consulta; um `{{...}}` fora dessa lista permanece literal.
6. Enquanto a consulta não tem `doctor_id`, o botão "Aplicar" fica desabilitado — mesma regra do `ProntuarioForm` (`disabled={!consultation?.doctor_id}`).

### Anexos

7. Dado um admin em `/admin/templates/<id>` ou `/admin/templates/novo`, quando anexa um `.pdf`, `.doc` ou `.docx` e salva, então existe o objeto no bucket `template-attachments`, a linha tem `attachment_path`/`attachment_name`/`attachment_mime` preenchidos e o editor mostra "📎 <nome do arquivo>" com "abrir" baixando o arquivo.
8. Dado um template com anexo, quando o médico o vê na lista do cockpit, então há um link com `attachment_name` que abre o arquivo por URL assinada.

## Out of scope

- `structured_fields` no cockpit — 0 dos 9 templates usam; o editor continua aceitando, o cockpit ignora.
- Alterar tabela, colunas, bucket ou policies — já existem em produção; se a causa do upload exigir mudança de policy, parar e perguntar (vira one-way door).
- Remover anexo sem confirmação no editor — comportamento atual, inalterado.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen cockpit · aba "Anamnese rápida" (lista) | empty state | existing - padrão `.chart-empty` do `ChartPanel` ("Nenhum template disponível.") |
| screen cockpit · aba "Anamnese rápida" (lista) | loading | existing - padrão de carregamento do `ChartPanel` |
| screen cockpit · aba "Anamnese rápida" (lista) | error | existing - `console.error("[ChartPanel] …")` + lista vazia |
| screen cockpit · aba "Anamnese rápida" (lista) | unauthorised | existing - `/cockpit` redireciona não-médico; RLS `doctors read active templates` |
| screen cockpit · aba "Anamnese rápida" (lista) | ordering | 1 |
| screen cockpit · aba "Anamnese rápida" (lista) | ação destrutiva confirma | 4 (aplicar nunca apaga texto) |
| screen `/admin/templates/<id>` · anexo | error | existing - "Erro no upload: <mensagem>" |

## Swept

- validation: existing - `accept=".pdf,.doc,.docx,…"`
- failure modes: existing - erro de upload no editor; 7 corrige a falha atual
- idempotency and retry: 3 (CID sem duplicar); aplicar duas vezes: 4 (acrescenta de novo — é ação explícita do médico)
- authorization: existing - RLS `prontuario_templates` + policies de storage `template_attachments_*` + guard do `/cockpit`
- concurrency and ordering: n/a - leitura; escrita no prontuário usa o autosave existente
- data lifecycle: n/a - nenhum dado novo; anexos já têm coluna e bucket
- external-dependency failure: existing - erro do Storage exibido no editor; URL assinada nula → link não aparece
- state transitions: n/a - nenhum ciclo de vida muda
- observability: existing - `audit_log` de create/update/delete de template

## Impact

| Front | What changes |
|---|---|
| cockpit | `ChartPanel` passa a ler `prontuario_templates` e gerar URL assinada em `template-attachments`; precisa do nome do médico (hoje em `CockpitScreen` como `doctorNome`) para `{{medico}}` |
| upload | primeiro passo: reproduzir logado como admin (`medico-teste@doutorfacilita.test`, seed `livekit_test_seed.sql`) e capturar o erro devolvido pelo Storage antes de mexer |
| stored data | nada a migrar |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| None - tudo reversível no código; schema, bucket e policies já existem | | |

## Sources

- Mensagem do Lucca (2026-09-29, chat): "templates salvos no template dentro do painel administrativo nao estao propagando no menu lateral do cockpit para o medico. O intuito disso é auxiliar na anamnase rapida durante a consulta e nao está funcionando. Nem o subir arquivos."
- Banco de produção `tylpojscdbkzulykdguv` (lido 2026-09-29): 9 templates ativos, 0 com `structured_fields`, 0 com anexo, 0 objetos no bucket.

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | Comportamento ao aplicar sobre texto existente | Escrito no meio-tempo: acrescenta (4) |
| 2 | open | Ordem da lista | Escrito no meio-tempo: alfabética por `nome` (1) |
