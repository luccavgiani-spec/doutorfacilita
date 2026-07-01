# Integração Mercado Pago — Checkout Transparente (cartão + PIX)

> Substitui o stub de pagamento por Checkout Transparente do MP. Ponto de
> verdade de "pago" continua sendo `hasConsultaPaga()`. Validado em ambiente
> de TESTE (cartão aprovado + PIX + fila + médico chamar). Falta go-live.

## Arquitetura (client-orchestrated, EFs falam com o MP)

```
Browser (CheckoutForm "use client")
  ├─ prepararConsulta() [server action]  → cria/recupera consultations(status='created', amount_cents)
  ├─ mp.cardForm() (SDK v2) tokeniza o cartão no browser  → token
  ├─ security.js → window.MP_DEVICE_SESSION_ID (device_id)
  └─ supabase.functions.invoke('mp-process-payment', {…})
        └─ Edge Function (service_role): relê amount_cents, monta payer/items,
           POST /v1/payments com o token do app certo → aprova/QR/3DS
MP → webhook server-to-server → Edge Function 'mp-webhook' (re-consulta /v1/payments)
```

- **LEI #1:** cartão **e** PIX via **Payments API (`/v1/payments`)**. Nunca Orders API.
- **Dois apps MP** (mesma conta) p/ isolar score do cartão: cada método lê o
  **seu** access token (`MP_ACCESS_TOKEN_CARTAO` vs `MP_ACCESS_TOKEN_PIX`).
- **Valor sempre server-side** (anti-tamper): `consultations.amount_cents`.
  Guard 422 se `amount_cents` NULL/≤0.
- **Ambiente = valor do secret.** Trocar teste↔produção não mexe em código
  (exceto `NEXT_PUBLIC_*`, que é build-time — ver Go-live).

## Banco (migrations aplicadas em `tylpojscdbkzulykdguv`)

- `20260701000000_patients_address_number.sql` — coluna `patients.address_number`
  + backfill (separa o número do fim de `address_line` legado) + trigger
  `handle_new_user` passa a popular `address_number`.
- `20260701000001_create_pagamentos_mp.sql` — tabela `pagamentos_mp`
  (`mp_payment_id` UNIQUE, `metodo`, `status`, `valor_cents`, `external_reference`,
  FK `consultation_id`). RLS: paciente lê os seus; admin ALL; escrita via
  service_role (webhook/EF bypassa RLS).

## Edge Functions (deployadas, `verify_jwt=false`, self-contained)

- **`mp-process-payment`** — resolve paciente pelo JWT, valida ownership +
  `status='created'`, guard 422 no valor, monta payer/additional_info completos
  (nota +90), `POST /v1/payments`. Aprovado (síncrono) → `markConsultaPaga`
  (idempotente, só transiciona de `created`). 3DS → `{status:'challenge',
  three_ds:{url}}`. PIX → `qr_code`/`qr_code_base64`.
- **`mp-webhook`** — nunca confia no corpo; re-consulta `/v1/payments/{id}` com o
  nosso token. **Validação `x-signature` por app** (HMAC-SHA256 do manifest
  `id:{data.id};request-id:{x-request-id};ts:{ts};`; o secret que bate identifica
  cartão vs PIX). 404 de teste → 200. Idempotência via UNIQUE `mp_payment_id` +
  guard `status='created'`.

> Ambas são **self-contained** (helpers inline, sem `../_shared`) — deploy via
> MCP usa lista de arquivos plana e imports relativos que "sobem" de pasta
> quebram. (Regra de ouro prontia-debug.)

## Frontend

- `src/app/checkout/actions.ts` → `prepararConsulta()` (só cria a consulta;
  pagamento é no cliente).
- `src/lib/payments/mercadopago.ts` → helpers de cliente: `ensureMpSdk`,
  `ensureDeviceId`, `processCard`, `processPix`, `pollUntilPaid`.
- `src/components/checkout/CheckoutForm.tsx` → `mp.cardForm()` (campos seguros,
  singleton anti-StrictMode, tripla checagem), PIX QR + polling, 3DS em iframe.
- Endereço com número: `CadastroWizard` manda `address_line`=logradouro +
  `address_number`; `PatientEditForm` (admin) ganhou campos estruturados.

## Secrets

| Secret | Onde | TESTE |
|---|---|---|
| `MP_ACCESS_TOKEN_CARTAO` | Supabase secrets | `TEST-124863…` |
| `MP_ACCESS_TOKEN_PIX` | Supabase secrets | `TEST-714722…` |
| `MP_WEBHOOK_SECRET_CARTAO` | Supabase secrets | (assinatura do app cartão) |
| `MP_WEBHOOK_SECRET_PIX` | Supabase secrets | (assinatura do app PIX) |
| `NEXT_PUBLIC_MP_PUBLIC_KEY_CARTAO` | **build-time** (.env.local / Vercel) | `TEST-967bf3f4…` |

> Enquanto `MP_WEBHOOK_SECRET_*` não existem, o webhook roda em modo
> bootstrapping (validação de assinatura desligada, com warning) — ainda seguro
> porque re-consulta a API do MP.

## Correções pós-teste (importantes)

1. **Token do cartão vem de `cardForm.getCardFormData().token`**, não do 2º arg
   do `onCardTokenReceived` (formato varia). Ler do 2º arg causava falso
   "confira os dados" mesmo com tokenização OK.
2. **CPF do cartão em dígitos** (não mascarado) no `identificationNumber`.
3. **`statement_descriptor` ≤ 13 chars.** Com 14 (`PLANTAODIGITAL`) o MP
   responde **HTTP 500 `internal_error`** (não trunca) e derruba o pagamento.
   Fixado em `PLANTAODIGITA` (13) + `.slice(0,13)` defensivo.
4. **Dev com Turbopack** (`next dev --turbopack`) — navegação quente ~0.25s.
5. EF loga o erro real do MP e o cliente exibe a mensagem real (não só `mp_error`).

## Go-live (só trocar secrets — sem mexer em código)

1. Supabase secrets → produção:
   - `MP_ACCESS_TOKEN_CARTAO` = `APP_USR-400579409888309-…`
   - `MP_ACCESS_TOKEN_PIX` = (token de produção do app PIX — pendente)
   - `MP_WEBHOOK_SECRET_CARTAO` / `_PIX` = assinaturas de produção de cada app
2. **`NEXT_PUBLIC_MP_PUBLIC_KEY_CARTAO` = `APP_USR-946e3536-…` no Vercel** e
   **redeploy do front** (NEXT_PUBLIC é inlined no build — trocar secret não basta).
3. Webhook já registrado nos dois apps → `…/functions/v1/mp-webhook`.
4. Teste final R$1 real por cartão e por PIX.
5. Medidor de qualidade ≥ 90 em cada app.
