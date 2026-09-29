# Auditoria Plantão Digital — 29/09/2026

Domínio principal confirmado pelo proprietário: https://plantaodigital.com.br/.
Código canônico: doutorfacilita/ neste repositório. Alterações abaixo são locais, sem deploy.

| Requisito | Evidência em produção | Situação |
|---|---|---|
| Meta Pixel | Dataset 1891368092249300 no portfólio Plantão Digital 893693100452911; PageView via navegador no Events Manager | Base confirmada, conversões ainda não comprovadas |
| Meta CAPI | Função ativa; requisição vazia retorna event_name_required | Execução confirmada, entrega de conversão não comprovada |
| Google Ads | IDs/labels vazios no código; container publicado sem tag Ads; conta ipvservicosmedicos@gmail.com sem contas listadas | Falta identificar conta correta/configurar |
| GA4 | G-KRB2Q1S4D9, propriedade 545536983, fluxo 15256500118 recebendo tráfego; eventos recentes apenas automáticos; nenhum vínculo Ads | Funil ainda não comprovado; URL do fluxo ainda www.meuplantaodigital.com |
| Search Console | Conta Google inspecionada sem propriedades; GA4 sem vínculos Search Console | Criação/verificação e vínculo pendentes |
| PIX | 8 pagamentos aprovados no banco, último em 27/09; paid_at preenchido | Há evidência recente de aprovação, sem novo pagamento nesta auditoria |
| Cartão | Aprovação histórica em 01/07; recusa mais recente cc_rejected_call_for_authorize em 27/09 | Integração responde; aprovação atual não comprovada |

## Achados

- GTM-57XSPWPH publicado, versão 2: somente Google Tag GA4 e Meta Pixel. Presença de palavras purchase no runtime não constitui tag configurada.
- Fonte Meta classificada como prestador de serviços de saúde e bem-estar, com restrições a alguns eventos padrão. É necessário respeitar essa categoria; não contornar com alteração de classificação.
- Landing principal e www.meuplantaodigital.com têm o mesmo GTM. checkout.plantaodigital.com.br é outro app Vite/Pagar.me, com banco dofvujvpevqkfhdhzwrc; não é o checkout Mercado Pago do Next/Supabase tylpojscdbkzulykdguv. O código desse app separado não apresentou emissões de funil na busca; não foi alterado.
- robots.txt e sitemap.xml da landing retornaram 404 na verificação de produção.
- Webhook publicado podia responder 200 diante de falha interna e deixar status_detail antigo após aprovação PIX. Polling de banco não reconcilia webhook perdido.
- Endpoint CAPI publicado aceita Purchase sem validar compra. Correção local preparada: sessão validada, consulta pertencente ao paciente, paid_at confirmado e valor/BRL/event_id derivados do banco. Ainda depende de deploy.

## Correções locais preparadas

- Fila gtag oficial mesmo sem global exposto pelo GTM, destino GA4 explícito, um único envio purchase; eventos view_item, begin_checkout, sign_up após cadastro efetivo e purchase após pagamento confirmado.
- event_id compartilhado entre Pixel e CAPI, deduplicação de compra, tolerância a storage bloqueado, cookies adequados ao domínio, URL CAPI sem query e remoção de email bruto do envio GA4.
- PageView inicial Meta sem repetição no provider, utilitários de compra sintética somente em desenvolvimento.
- Checkout com mensagem específica de autorização bancária e polling para cartão pendente; confirmação baseada em paid_at.
- Processamento MP preserva alterações da versão ativa v13, impede nova cobrança de consulta paga, valida centavos inteiros e rejeita PIX recusado corretamente.
- Webhook rejeita IDs divergentes, confere valor, verifica erros de escrita, retorna 5xx para retentativas e atualiza status_detail e timestamps completos.
- Canonical da home, metadataBase, sitemap e robots com domínio principal.

## Validação e limites

Checagem TypeScript passou. scripts/audit-tracking-payments.cjs passou em 21 verificações isoladas, incluindo dedup, ausência de email, storage bloqueado, IDs compartilhados, retentativa webhook, valor divergente, PIX rejeitado e consulta paga.

Esses testes não enviam pagamentos nem eventos reais e não substituem validação após deploy. Não foram executados novos pagamentos, alteradas credenciais, aceitos termos ou publicados código/tags. Por orientação do usuário, o dashboard Mercado Pago foi dispensado. Validação realizada por código, funções e registros agregados do Supabase; Google Ads aguarda identificação da conta.

## Próximas ações

1. Aprovar publicação das correções do site e funções MP/CAPI, com verificação posterior de produção. Publicar validação server-side de Purchase e confirmar a recepção permitida pela categoria Meta.
2. Identificar conta Ads e ações de conversão reais; configurar tags/destinos sem duplicar o GA4 e vincular contas.
3. Ajustar URL do fluxo GA4, verificar eventos reais permitidos e configurar eventos principais apropriados.
4. Criar/verificar Search Console para plantaodigital.com.br, enviar sitemap após deploy e vincular ao GA4.
5. Dashboard Mercado Pago dispensado pelo usuário. Registros confirmam aprovação PIX e recusa bancária recente no cartão; sem nova transação real, não afirmar aprovação atual do cartão.

## Vault e skills

Consultadas memórias de cópias do repositório, token/deviceID MP, cardForm e publicação GTM. Atualizadas as três skills solicitadas em C:/Users/lucca/.agents/skills/. sync-vault passou a usar 05-Núcleo/context. Nota Doutor Facilita teve somente domínio no frontmatter e bloco de conectores atualizados; Ads e Search Console não foram marcados como conectados.

## Continuação: Search Console
Propriedade domínio criada pelo usuário, mas TXT ausente. Propriedade URL https://plantaodigital.com.br/ criada; método GTM falhou porque snippet está em posição incorreta. Arquivo oficial google293761e87f900b8e.html baixado e preparado em public/ para verificação após publicação. Nenhuma propriedade foi confirmada como verificada.
