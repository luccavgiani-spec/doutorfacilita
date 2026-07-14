/**
 * Funil central de rastreamento — Plantão Digital (telemedicina)
 *
 * Cada evento de negócio é distribuído em paralelo para:
 *   • Meta Pixel  (window.fbq)      — injetado pelo GTM
 *   • GTM dataLayer (ecommerce.*)   — lido por tags do GTM
 *   • GA4 / Google Ads (window.gtag)
 *   • Meta CAPI server-side (fetch) — ⏳ só quando CAPI_ENABLED = true
 *
 * ⚠️ POLÍTICA DE DADOS DE SAÚDE (obrigatória): telemedicina. Para a Meta,
 * enviamos APENAS `value` + `currency`. NUNCA content_name/category/ids/contents
 * nem qualquer dado clínico.
 */
import { gtagEvent, gtagConversion } from "./gtag-events";
import {
  META_PIXEL_ID,
  COOKIE_DOMAIN,
  CURRENCY,
  CAPI_ENABLED,
  SUPABASE_FUNCTIONS_URL,
  GOOGLE_ADS_CONVERSIONS,
} from "./config";

declare global {
  interface Window {
    fbq?: (command: string, eventName: string, data?: Record<string, unknown>) => void;
    _fbq?: unknown;
  }
}

// ---- Cookies de atribuição da Meta (_fbp / _fbc) ----
function getFbp(): string {
  const found = document.cookie.split("; ").find((r) => r.startsWith("_fbp="));
  if (found) return found.split("=")[1];
  const fbp = `fb.1.${Date.now()}.${Math.random().toString(36).substring(2)}`;
  document.cookie = `_fbp=${fbp}; path=/; max-age=7776000; domain=${COOKIE_DOMAIN}`;
  return fbp;
}

function getFbc(): string | undefined {
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (fbclid) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    document.cookie = `_fbc=${fbc}; path=/; max-age=7776000; domain=${COOKIE_DOMAIN}`;
    return fbc;
  }
  const found = document.cookie.split("; ").find((r) => r.startsWith("_fbc="));
  return found ? found.split("=")[1] : undefined;
}

// ---- Meta CAPI server-side (Edge Function) — no-op enquanto desligado ----
async function sendToMetaCAPI(
  eventName: string,
  data: { value?: number; order_id?: string; test_event_code?: string },
): Promise<void> {
  if (!CAPI_ENABLED || typeof window === "undefined") return; // ⏳ pendente
  try {
    const payload: Record<string, unknown> = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: window.location.href,
      value: data.value,
      currency: CURRENCY,
      order_id: data.order_id,
      fbp: getFbp(),
      fbc: getFbc(),
      client_user_agent: navigator.userAgent,
    };
    if (data.test_event_code) payload.test_event_code = data.test_event_code;

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/meta-capi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.warn("[Meta CAPI] resposta não-ok:", await res.json());
  } catch (error) {
    console.error("[Meta CAPI] erro ao enviar:", error);
  }
}

/** QA: dispara um evento de teste na CAPI (só quando CAPI_ENABLED). */
export async function sendCAPITest(): Promise<void> {
  await sendToMetaCAPI("CAPI_Test", {
    value: 1,
    order_id: `test_${Date.now()}`,
    test_event_code: "TEST00000",
  });
}

// ---- fbq helper ----
function fbqTrack(
  method: "track" | "trackCustom",
  event: string,
  data?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(method, event, data);
  }
}

// ---- Eventos ----
export function trackPageView(): void {
  fbqTrack("track", "PageView");
}

// ✅ SEM dados sensíveis de saúde — só value + currency.
export function trackViewContent(data?: { value?: number }): void {
  fbqTrack("track", "ViewContent", { value: data?.value, currency: CURRENCY });
}

export function trackLead(data?: { value?: number }): void {
  fbqTrack("track", "Lead", { value: data?.value, currency: CURRENCY });
}

export function trackInitiateCheckout(data?: { value?: number }): void {
  fbqTrack("track", "InitiateCheckout", { value: data?.value, currency: CURRENCY });

  // Google Ads — no-op enquanto GOOGLE_ADS_CONVERSIONS.initiateCheckout vazio.
  gtagConversion(GOOGLE_ADS_CONVERSIONS.initiateCheckout, data?.value);

  // Meta CAPI server-side (única rota Meta server-side) — ⏳ guardado por flag.
  void sendToMetaCAPI("InitiateCheckout", { value: data?.value });
}

export function trackSubscribedButtonClick(data?: { value?: number }): void {
  fbqTrack("trackCustom", "SubscribedButtonClick", {
    value: data?.value,
    currency: CURRENCY,
  });
}

// ---- Dedup de Purchase por transaction_id (localStorage) ----
function alreadyTracked(id: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`purchase_tracked_${id}`) === "true";
}
function markTracked(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`purchase_tracked_${id}`, "true");
}

export function trackPurchase(data: {
  value: number;
  order_id: string;
  sku?: string;
  email?: string; // Enhanced Conversions
  itemName?: string; // rótulo interno; NÃO é enviado à Meta
}): void {
  if (alreadyTracked(data.order_id)) return;

  // GA4 exige items não-vazio.
  const items = [
    {
      item_id: data.sku || "consulta",
      item_name: data.itemName || "Consulta Plantão Digital",
      price: data.value,
      quantity: 1,
    },
  ];

  // Meta Pixel — ✅ SEM dados sensíveis (só value + currency).
  fbqTrack("track", "Purchase", { value: data.value, currency: CURRENCY });

  // GA4 Enhanced Conversions — user_data ANTES do evento.
  if (typeof window !== "undefined" && window.gtag && data.email) {
    window.gtag("set", "user_data", { email: data.email.toLowerCase().trim() });
  }

  // dataLayer (Enhanced Ecommerce) — para tags GA4/Ads do GTM lerem ecommerce.*
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: "purchase",
      ecommerce: {
        transaction_id: data.order_id,
        value: data.value,
        currency: CURRENCY,
        items,
      },
    });
  }

  // Envio direto ao GA4 (redundância).
  gtagEvent("purchase", {
    transaction_id: data.order_id,
    value: data.value,
    currency: CURRENCY,
    items,
  });

  // Conversão do Google Ads "Consulta Realizada" — no-op enquanto Ads pendente.
  gtagConversion(GOOGLE_ADS_CONVERSIONS.purchase, data.value, data.order_id);

  markTracked(data.order_id);

  // Meta CAPI server-side — ⏳ guardado por flag.
  void sendToMetaCAPI("Purchase", { value: data.value, order_id: data.order_id });
}

/** Inicialização client-side (chamada pelo TrackingProvider). */
export function initMetaTracking(): void {
  if (typeof window === "undefined") return;
  // O Meta Pixel já é injetado e dispara PageView pelo GTM (All Pages).
  // Reexpõe funções para QA no console (paridade com a Prontia).
  const w = window as unknown as Record<string, unknown>;
  w.trackPageView = trackPageView;
  w.trackLead = trackLead;
  w.trackInitiateCheckout = trackInitiateCheckout;
  w.trackPurchase = trackPurchase;
  w.sendCAPITest = sendCAPITest;
}

// Silencia "META_PIXEL_ID unused" — mantém o ID acessível para QA/documentação.
export const PIXEL_ID = META_PIXEL_ID;
