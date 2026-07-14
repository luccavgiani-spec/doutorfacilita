// Central de IDs e flags de rastreamento — Plantão Digital
// Contas criadas em 14/07/2026 via automação de browser:
//   • Conta Google (dona GTM+GA4): ipvservicosmedicos@gmail.com
//   • Portfólio Meta: meuplantaodigital (business_id 893693100452911)
// Os pixels de Meta e Google já estão DENTRO do container GTM (GTM-57XSPWPH),
// publicado. Ou seja: instalar o snippet do GTM já dispara Meta Pixel + GA4.
// As funções deste módulo (fbq/gtag/dataLayer) ainda funcionam porque o GTM
// injeta fbevents.js (Meta Pixel) e gtag.js (Google Tag) no client.

export const GTM_ID = "GTM-57XSPWPH";
export const GA4_MEASUREMENT_ID = "G-KRB2Q1S4D9";
export const META_PIXEL_ID = "1891368092249300";

// ⏳ PENDENTE — "Esperando cartão da empresa" (Google Ads exige billing).
// Enquanto GOOGLE_ADS_ID vazio, todas as conversões do Google Ads viram no-op
// seguro (sem erro). Ao criar a conta + ações de conversão, preencha aqui.
export const GOOGLE_ADS_ID = ""; // ex.: "AW-XXXXXXXXXX"
export const GOOGLE_ADS_CONVERSIONS = {
  // ex.: "AW-XXXXXXXXXX/xxxxxxxx"
  initiateCheckout: "",
  purchase: "",
} as const;

// Domínio dos cookies _fbp/_fbc (atribuição/dedup da Meta).
export const COOKIE_DOMAIN = ".meuplantaodigital.com";

export const CURRENCY = "BRL";

// Rastreio server-side (Meta CAPI). Pré-requisitos:
//   1) segredo META_ACCESS_TOKEN no Supabase ......... ✅ criado (14/07/2026)
//   2) Edge Function `supabase/functions/meta-capi` ... ✅ escrita no repo
//   3) DEPLOY da função ............................... ⏳ pendente:
//      supabase functions deploy meta-capi --project-ref tylpojscdbkzulykdguv --no-verify-jwt
// Enquanto a função não estiver deployada, sendToMetaCAPI() recebe 404 (capturado
// e logado como warn; NÃO quebra nada — o Pixel client-side segue funcionando).
export const CAPI_ENABLED = true;
export const SUPABASE_FUNCTIONS_URL =
  "https://tylpojscdbkzulykdguv.supabase.co/functions/v1";
