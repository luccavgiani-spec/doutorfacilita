# Prompt — Instalar rastreamento Meta + Google (Plantão Digital)

> Cole o bloco abaixo (a partir de "INÍCIO DO PROMPT") em uma **nova sessão do Claude Code** aberta **dentro deste projeto** (`C:\Users\lucca\projetos\plantao_digital`).
> Ele replica a arquitetura de rastreio da **Prontia Saúde** (referência: `C:\Users\lucca\projetos\prontiasaude`), adaptada para **Next.js 15 (App Router) + Supabase**.

---

## ✅ IDs REAIS já criados (14/07/2026, via automação de browser)

As contas de rastreio já foram **criadas e o contêiner GTM já foi publicado**. Use estes valores reais no código (não são placeholders):

| Recurso | Valor real | Observações |
|---|---|---|
| **Conta Google dona** | `ipvservicosmedicos@gmail.com` | authuser=9 no Chrome; dona de GTM + GA4 |
| **GTM (contêiner)** | `GTM-57XSPWPH` | conta 6366049757 / contêiner 258314564. **Publicado** (Versão 2) |
| **GA4 (Measurement ID)** | `G-KRB2Q1S4D9` | propriedade "Plantão Digital"; stream Web ID `15256500118`; fuso São Paulo; moeda BRL |
| **Meta Pixel (dataset)** | `1891368092249300` | dataset "Pixel Site", portfólio **meuplantaodigital** (business_id `893693100452911`) |
| **Meta domain verification** | `3a5yrek88b4r53flgehe775cilqlcg` | já presente no `<head>` do layout.tsx |
| **Supabase project ref** | `tylpojscdbkzulykdguv` | para a Edge Function meta-capi |

**Tags já dentro do GTM (publicadas):**
- **Google Tag - GA4** → tipo "Tag do Google", ID `G-KRB2Q1S4D9`, acionador *Initialization - All Pages* (cria `window.gtag` + GA4 page_view).
- **Meta Pixel** → HTML personalizado com o base code do Pixel `1891368092249300`, acionador *All Pages* (fbq init + PageView).

**JÁ INSTALADO NO CÓDIGO (14/07/2026 — build + type-check OK):**
- ✅ Snippet do GTM `GTM-57XSPWPH` no `src/app/layout.tsx` (via `next/script`) + `<noscript>`.
- ✅ `src/lib/tracking/{config,gtag-events,meta-tracking}.ts` — IDs reais; dados de saúde removidos dos eventos Meta.
- ✅ `src/components/tracking/TrackingProvider.tsx` — PageView do Meta nas trocas de rota SPA.
- ✅ Conversões no `CheckoutForm`: **InitiateCheckout** (consulta pronta) e **Purchase** (aprovação de cartão/3DS/PIX, dedup por `order_id`).
- ✅ `supabase/functions/meta-capi/index.ts` — Edge Function CAPI (Pixel `1891368092249300`), `CAPI_ENABLED=true`.
- ✅ Segredo `META_ACCESS_TOKEN` salvo no Supabase.

**Ainda PENDENTE:**
- ⏳ **Deploy da Edge Function**: `supabase functions deploy meta-capi --project-ref tylpojscdbkzulykdguv --no-verify-jwt`.
- ⏳ **Deploy do site** (Vercel) com o snippet do GTM para o Pixel/GA4 começarem a disparar em produção.
- ⏳ **Google Ads** (`AW-…` + 2 conversões) — **PENDENTE: Esperando cartão da empresa** (billing). Depois preencher `GOOGLE_ADS_ID` e os rótulos em `src/lib/tracking/config.ts`; no GTM adicionar Conversion Linker + tags de conversão do Ads.
- ⏳ **Validar**: Events Manager → Testar eventos (Pixel + CAPI) e GA4 → DebugView, após os deploys.

---

## ⚙️ Decisões assumidas (ajuste em 1 linha se quiser)

- **Escopo:** replicação **completa** = Pixel Meta client-side + Meta CAPI server-side + GTM + GA4 + Google Ads.
  - _Quer só client-side?_ Pule a **FASE 3-E (Edge Function meta-capi)** e todas as chamadas `sendToMetaCAPI`.
- **Execução:** **automação de browser** (Claude in Chrome) para criar as contas, **pausando** em billing, 2FA e publicação.
  - _Prefere criar as contas você mesmo?_ Troque a FASE 1 por "eu te passo os IDs prontos" e comece na FASE 2.

---

# ===================== INÍCIO DO PROMPT =====================

## Contexto e objetivo

Você está no repositório do **Plantão Digital** — telemedicina, Next.js 15 (App Router, Turbopack) + Supabase + Vercel + Mercado Pago + LiveKit.

- **Código-fonte da app fica em `doutorfacilita/`** (é o que o git rastreia — confirme com `git ls-files | head`). Ignore as cópias/artefatos `plantao_digital/plantao_digital/`, `app/` da raiz e `.next/`.
- **Layout raiz:** `doutorfacilita/src/app/layout.tsx` (tem `<head>`).
- **Domínio de produção:** `https://www.meuplantaodigital.com`.
- **Supabase project ref:** `tylpojscdbkzulykdguv` → base URL `https://tylpojscdbkzulykdguv.supabase.co`. Edge Functions já existem em `doutorfacilita/supabase/functions/`.
- **Meta domain verification já presente** no `<head>`: `3a5yrek88b4r53flgehe775cilqlcg` (ou seja, o domínio já foi verificado num Business Manager — reaproveite esse mesmo BM/portfólio).

**Objetivo:** instalar Meta + Google exatamente no mesmo padrão da **Prontia Saúde**, cujo código está em `C:\Users\lucca\projetos\prontiasaude`. **Leia os arquivos da Prontia** citados abaixo antes de portar — eles são a fonte da verdade de comportamento.

**Contas já logadas no browser:** portfólio da Meta (Business Manager) + conta Google com permissão para criar GA4/Ads/GTM. O Plantão Digital **ainda não tem** GA4, Google Ads, GTM nem Google My Business.

---

## Arquitetura de referência da Prontia (o que você vai reproduzir)

O hub é o **GTM**; tudo pendura nele. O código dispara eventos por 4 canais em paralelo: `fbq` (Pixel client), `dataLayer` (GTM), `gtag` (GA4/Ads) e `fetch` → Edge Function (Meta CAPI server-side).

| Componente | ID da Prontia (⚠️ NÃO REUTILIZAR — gerar novo) | Onde vive |
|---|---|---|
| Container GTM | `GTM-NWKDM9X2` | `index.html` (snippet) + UI do GTM |
| Meta Pixel | `1489396668966676` | base code no HTML + Edge Function CAPI |
| GA4 Measurement ID | `G-NC10XED57R` | **dentro do GTM** (tag GA4 Config) |
| Google Ads | `AW-17744564489` | **dentro do GTM** + `gtag('event','conversion')` no código |
| Conversão Ads "Início de checkout" | label `DZTucUlo6lsMbElmioo1C` | `src/lib/meta-tracking.ts` |
| Conversão Ads "Consulta Realizada" | label `-L0OCPGgnMMbEImioo1C` | `src/lib/meta-tracking.ts` |
| TikTok Pixel | `D4OC72RC77UEBGID78D0` | **fora de escopo** (não instalar salvo pedido) |

⚠️ **Todos os IDs acima são da Prontia. Gere IDs NOVOS e próprios para o Plantão Digital.** Nunca aponte o Plantão para as contas da Prontia.

### Arquivos da Prontia a estudar/portar
- `index.html` (linhas ~125–204): base do Meta Pixel (lazy), snippet do GTM (deferido ao `load`), `noscript` fallbacks, `dns-prefetch`/`preconnect`.
- `src/lib/gtag-events.ts`: wrapper TS de `gtag` (GA4 + Ads).
- `src/lib/meta-tracking.ts`: **o funil central** — `trackViewContent/Lead/InitiateCheckout/SubscribedButtonClick/Purchase/PageView`, dedup por `localStorage`, Enhanced Conversions, push de Enhanced Ecommerce no `dataLayer`, cookies `_fbp`/`_fbc`, e `sendToMetaCAPI()`.
- `supabase/functions/meta-capi/index.ts`: Edge Function que envia ao Conversions API (`graph.facebook.com/v19.0/{pixel}/events`) usando `META_ACCESS_TOKEN`.
- `supabase/functions/common/cors.ts`: allow-list de origens.

### Distinção crucial: código vs. painel do GTM
- **No código** (você escreve): snippet do GTM, base do Pixel + chamadas `fbq`, chamadas `gtag` de conversão/purchase, push de `dataLayer` ecommerce, Edge Function CAPI, meta de verificação de domínio.
- **No painel do GTM** (você configura via browser em `tagmanager.google.com`, **não fica no repo**): a **Google Tag (gtag.js)** que cria `window.gtag`, a tag **GA4 Configuration**, o **Conversion Linker**, as tags de **conversão do Google Ads**, e a tag **GA4 "purchase"** que lê `dataLayer.ecommerce.*`. Sem isso, `window.gtag` nem existe.

> ⚠️ **Política de dados de saúde (obrigatório manter):** o Plantão Digital é telemedicina, igual à Prontia. Em **todos** os eventos da Meta, envie **apenas `value` + `currency`**. **NUNCA** envie `content_name`, `content_category`, `content_ids`, `contents` nem qualquer dado clínico/sensível. Reproduza os comentários "REMOVIDO: dados sensíveis de saúde" da Prontia.

---

## FASE 0 — Preparação (faça antes de tocar em qualquer conta)

1. Confirme o diretório da app (`doutorfacilita/`) e que não há rastreio ainda (`grep -ri "gtm\|gtag\|fbq" doutorfacilita/src` deve vir vazio).
2. Abra `doutorfacilita/src/app/layout.tsx` e confirme o `<head>` e o token de verificação da Meta.
3. Liste os arquivos de referência da Prontia e leia-os por completo.
4. Defina o **naming** das novas contas (peça confirmação ao usuário): sugerido → GA4/GTM/Ads/Pixel todos como **"Plantão Digital"**, site `https://www.meuplantaodigital.com`.
5. **Pare e mostre ao usuário o plano das FASES 1–5 antes de criar contas.**

---

## FASE 1 — Criar contas (browser automation; PAUSE nos pontos sensíveis)

Use as ferramentas `mcp__claude-in-chrome__*`. Comece com `tabs_context_mcp` para ver as abas/logins atuais. **Nunca dispare dialogs/alerts.** Grave um GIF de cada fluxo (`gif_creator`) para auditoria. **PAUSE e peça confirmação** antes de: qualquer etapa de billing, 2FA, aceite de termos, e antes de **publicar** o container do GTM.

Crie, nesta ordem, e **anote cada ID gerado**:

1. **GTM** (`tagmanager.google.com`): nova **Conta** "Plantão Digital" + **Container Web** para `meuplantaodigital.com`. → anote `GTM-XXXXXXX`.
2. **GA4** (`analytics.google.com`): nova propriedade "Plantão Digital", fluxo de dados Web para `https://www.meuplantaodigital.com`. → anote `G-XXXXXXXXXX` (Measurement ID).
3. **Google Ads** (`ads.google.com`): nova conta (moeda **BRL**, fuso **America/Sao_Paulo**). → anote `AW-XXXXXXXXXX`.
   - Crie **2 ações de conversão** (Importar/Manual, categoria correta):
     - **"Início de checkout"** (Begin checkout) → anote o label `AW-XXXXXXXXXX/xxxxxxxx`.
     - **"Consulta Realizada"** (Purchase) → anote o label `AW-XXXXXXXXXX/yyyyyyyy`.
     - Ative **Enhanced Conversions** (via Google Tag / dados fornecidos pela API).
   - ⚠️ **Billing exige cartão → PARE e passe para o usuário.**
4. **Meta Pixel / Conjunto de dados** (`business.facebook.com` → Events Manager): use o **mesmo portfólio/BM** onde `meuplantaodigital.com` já está verificado. Crie um **Pixel (Conjunto de dados)** "Plantão Digital". → anote o **Pixel ID**.
   - Gere um **token de acesso da Conversions API** (Events Manager → Configurações → Conversions API → gerar token). → **guarde como segredo**, nunca no repo/git.
   - Confirme que `meuplantaodigital.com` está **verificado** no portfólio (o token no `<head>` indica que sim).

> **Google My Business:** não é pixel e não entra no código/GTM — é uma ficha de local. Se o usuário quiser, crie em `business.google.com` separadamente e depois vincule ao Google Ads/Maps. **Não bloqueia** a instalação do rastreio.

**Ao fim da FASE 1, apresente uma tabela com todos os IDs novos e peça o "ok" do usuário antes de configurar o GTM.**

---

## FASE 2 — Configurar o container do GTM (browser)

No workspace do novo container, crie (e depois **PAUSE para publicar**):

1. **Google Tag / GA4 Configuration** com o `G-XXXXXXXXXX` — trigger **All Pages** (Initialization). Isso injeta `gtag.js` e cria `window.gtag`.
2. **Conversion Linker** — trigger All Pages.
3. **Google Ads Conversion Tracking** para cada conversão (Início de checkout, Consulta Realizada), com os labels da FASE 1, disparadas por **eventos customizados** do `dataLayer` (ex.: trigger em `event = purchase`) ou por triggers equivalentes aos da Prontia.
4. **Tag GA4 Event "purchase"** que lê `ecommerce.transaction_id`, `ecommerce.value`, `ecommerce.currency`, `ecommerce.items` do `dataLayer` (trigger `event = purchase`). É a equivalente à tag "Purchase Prontia".
5. (Opcional, se quiser CAPI via GTM em vez de/ além da Edge Function) configurar o **Meta CAPI Gateway/automation** — mas o padrão que estamos portando usa a **Edge Function** (FASE 3-E), então **prefira a Edge Function** e mantenha o GTM só para Google.
6. **QA no modo Preview** do GTM antes de publicar. **PAUSE e peça o "ok" para publicar.**

---

## FASE 3 — Instalar no código (Next.js App Router)

> Adapte os padrões da Prontia (que é Vite/`index.html`) para Next.js usando `next/script`. Não copie `index.html` cru.

### 3-A. GTM no `layout.tsx`
Em `doutorfacilita/src/app/layout.tsx`, adicione o GTM com `next/script` (estratégia `afterInteractive`) logo no início do `<body>`, e o `<noscript>` do iframe como primeiro filho do `<body>`. Ex.:

```tsx
import Script from "next/script";
const GTM_ID = "GTM-XXXXXXX"; // novo

// dentro do return, no topo do <body>:
<Script id="gtm" strategy="afterInteractive">{`
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
  j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${GTM_ID}');
`}</Script>
<noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{display:"none",visibility:"hidden"}} /></noscript>
```

### 3-B. Meta Pixel base (lazy) + noscript
Adicione a base do Pixel com carregamento tardio (igual Prontia: init no primeiro `scroll`/`click`/`touchstart`) via `next/script` `strategy="lazyOnload"` ou um `<Script id="fb-pixel">` com o mesmo IIFE da Prontia, trocando o Pixel ID pelo novo. Inclua o `<noscript><img .../></noscript>` com o novo Pixel ID. Confirme que o `<meta name="facebook-domain-verification">` novo/existente está no `<head>`.

### 3-C. `src/lib/gtag-events.ts`
Porte 1:1 de `prontiasaude/src/lib/gtag-events.ts`, trocando na doc/handlers o `AW-17744564489` pelo **novo** `AW-XXXXXXXXXX` e o `G-NC10XED57R` pelo **novo** `G-XXXXXXXXXX`. Importe-o no ponto de entrada (na Prontia é `main.tsx`; no Next, importe onde faça sentido — ex.: um client component montado no layout — ou exponha via `next/script`). Mantenha `window.gtagEvent`.

### 3-D. `src/lib/meta-tracking.ts` (o funil central)
Porte de `prontiasaude/src/lib/meta-tracking.ts` com estas trocas obrigatórias:
- **Pixel ID** → novo.
- **Domínio dos cookies** `_fbp`/`_fbc`: `domain=.meuplantaodigital.com`.
- **URL da Edge Function CAPI**: `https://tylpojscdbkzulykdguv.supabase.co/functions/v1/meta-capi`.
- **`send_to` das conversões do Ads**: novos `AW-XXXXXXXXXX/label` (Início de checkout e Consulta Realizada).
- **Manter** dedup por `localStorage`, Enhanced Conversions (`gtag('set','user_data',{email})`), push Enhanced Ecommerce no `dataLayer` (`event:'purchase'`), e a **remoção de dados sensíveis de saúde** em todos os eventos Meta.
- Guardas de SSR (`typeof window === 'undefined'`) são ainda mais importantes no Next — mantenha/adicione todas.

### 3-E. Edge Function `meta-capi` (server-side; pule se optar por só client-side)
- Crie `doutorfacilita/supabase/functions/meta-capi/index.ts` portando de `prontiasaude/supabase/functions/meta-capi/index.ts`. Troque `PIXEL_ID` pelo novo. Considere subir `META_API_VERSION` para uma versão atual do Graph API (a Prontia usa `v19.0`).
- Crie/atualize `doutorfacilita/supabase/functions/common/cors.ts` (padrão da Prontia) com `ALLOWED_ORIGINS` = domínios do Plantão (`https://meuplantaodigital.com`, `https://www.meuplantaodigital.com`, previews da Vercel `https://*.vercel.app` conforme necessário, `http://localhost:3000`). Se as outras Edge Functions do projeto já têm um `cors.ts`, **reutilize o existente**.
- Configure `verify_jwt = false` para `meta-capi` no `supabase/config.toml` (o cliente chama sem Authorization, igual Prontia).
- Defina o segredo `META_ACCESS_TOKEN` (FASE 4). **Nunca** comite o token.
- Faça o deploy: `supabase functions deploy meta-capi --project-ref tylpojscdbkzulykdguv`.

### 3-F. Ligar os eventos no funil
Descubra as páginas/handlers equivalentes no Plantão Digital e chame o funil nos pontos certos (espelhe a Prontia):
- **ViewContent/Lead** → páginas de serviço/landing e CTAs (na Prontia: `pages/servicos/*`, `ServicoCard`, modais de cadastro).
- **InitiateCheckout** → ao abrir/entrar no checkout (na Prontia: `PaymentModal`; no Plantão: `src/app/checkout/page.tsx`).
- **Purchase** → confirmação de pagamento aprovado (na Prontia: `PaymentModal` + `auth/Callback`; no Plantão: pós-checkout / retorno do Mercado Pago / `posconsulta`).
- Chame `initMetaTracking()` no bootstrap (ex.: um client component no layout, em `requestIdleCallback`).

---

## FASE 4 — Env e segredos

- `.env.example` / `.env.local` (Next): adicione, se usar em código, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_META_PIXEL_ID` — ou deixe os IDs como constantes (como a Prontia faz). **Prefixe com `NEXT_PUBLIC_` tudo que for usado no client.**
- **Segredo server-side** (nunca `NEXT_PUBLIC_`, nunca no git): `META_ACCESS_TOKEN` → configure via `supabase secrets set META_ACCESS_TOKEN=... --project-ref tylpojscdbkzulykdguv` e, se algum código Next server usar, também em **Vercel → Environment Variables**.
- Confirme que `.env.local` está no `.gitignore`.

---

## FASE 5 — Verificação (obrigatória antes de dizer "pronto")

1. `npm run build` (ou `next build`) sem erros; typecheck (`npm run type-check`) limpo.
2. Rode local (`next dev`) e, no browser, confirme na aba Network/Console:
   - GTM carrega (`gtm.js?id=GTM-...`), `window.dataLayer` e `window.gtag` existem.
   - `fbq` inicializa após a primeira interação; `PageView` dispara.
3. **GTM Preview (Tag Assistant):** dispare um fluxo de compra de teste e veja GA4 Config, Conversion Linker, conversões do Ads e a tag `purchase` (lendo `ecommerce.*`) dispararem.
4. **Meta Events Manager → Testar eventos:** valide o Pixel (client) e a **CAPI** (server) — a Prontia tem `window.sendCAPITest()` com `test_event_code`; porte isso para QA e confirme `events_received` + `fbtrace_id`.
5. **GA4 → DebugView:** confirme `page_view` e `purchase` com `transaction_id`/`value`/`items` (items **nunca** vazio).
6. **Google Ads → Conversões:** status "gravando"/recebendo após os testes.
7. Entregue um **resumo** com todos os IDs novos, o que ficou no código vs. no GTM, e o que ainda depende de ação humana (publicar GTM, billing do Ads, ativar conversões).

---

## Guard-rails (leia de novo antes de agir)

- ⛔ **Nunca** reutilize IDs/tokens da Prontia. Gere tudo novo para o Plantão Digital.
- ⛔ **Nunca** comite `META_ACCESS_TOKEN` nem outros segredos; use Supabase secrets / Vercel env.
- 🩺 **Sempre** remova dados clínicos/sensíveis dos eventos Meta (só `value`+`currency`).
- 🍪 Cookies e CORS devem usar **o domínio do Plantão**, não o da Prontia.
- 🛑 **PAUSE** para o usuário em: billing (Google Ads), 2FA, aceite de termos e **publicação** do container GTM.
- 🎥 Grave GIFs dos fluxos de browser para auditoria.
- 🧭 Trabalhe em `doutorfacilita/` (o que o git rastreia); ignore as cópias aninhadas.
- Se qualquer ferramenta de browser falhar 2–3 vezes ou uma conta não estiver logada, **pare e peça orientação** — não fique em loop.

# ===================== FIM DO PROMPT =====================
