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
import { createClient } from "@/lib/supabase/client";
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
    fbq?: (command: string, eventName: string, data?: Record<string, unknown>, options?: { eventID: string }) => void;
    _fbq?: unknown;
  }
}

// ---- Cookies de atribuição da Meta (_fbp / _fbc) ----
function cookieAttributes(): string {
  const host = window.location.hostname;
  const domain = host === "plantaodigital.com.br" || host.endsWith(".plantaodigital.com.br")
    ? COOKIE_DOMAIN
    : host === "meuplantaodigital.com" || host.endsWith(".meuplantaodigital.com")
      ? ".meuplantaodigital.com" : undefined;
  return `; path=/; max-age=7776000; SameSite=Lax${domain ? `; domain=${domain}` : ""}${window.location.protocol === "https:" ? "; Secure" : ""}`;
}

function getFbp(): string {
  const found = document.cookie.split("; ").find((r) => r.startsWith("_fbp="));
  if (found) return found.split("=")[1];
  const fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
  document.cookie = `_fbp=${fbp}${cookieAttributes()}`;
  return fbp;
}

function getFbc(): string | undefined {
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (fbclid) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    document.cookie = `_fbc=${fbc}${cookieAttributes()}`;
    return fbc;
  }
  const found = document.cookie.split("; ").find((r) => r.startsWith("_fbc="));
  return found ? found.split("=")[1] : undefined;
}

// ---- Meta CAPI server-side (Edge Function) — no-op enquanto desligado ----
async function sendToMetaCAPI(
  eventName: string,
  data: { value?: number; order_id?: string; event_id?: string; test_event_code?: string },
): Promise<void> {
  if (!CAPI_ENABLED || typeof window === "undefined") return; // ⏳ pendente
  try {
    const payload: Record<string, unknown> = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      // Não repassar query strings com IDs, email, tokens ou dados clínicos.
      event_source_url: `${window.location.origin}${window.location.pathname}`,
      value: data.value,
      currency: CURRENCY,
      order_id: data.order_id,
      event_id: data.event_id,
      fbp: getFbp(),
      fbc: getFbc(),
      client_user_agent: navigator.userAgent,
    };
    if (data.test_event_code) payload.test_event_code = data.test_event_code;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (eventName === "Purchase") {
      const { data: sessionData } = await createClient().auth.getSession();
      if (!sessionData.session?.access_token) return;
      headers.Authorization = `Bearer ${sessionData.session.access_token}`;
    }

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/meta-capi`, {
      method: "POST",
      headers,
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
  eventId?: string,
): void {
  if (typeof window === "undefined") return;
  const deadline = Date.now() + 10_000;
  const send = () => {
    if (typeof window.fbq === "function") {
      window.fbq(method, event, data, eventId ? { eventID: eventId } : undefined);
    } else if (Date.now() < deadline) {
      setTimeout(send, 250);
    }
  };
  send();
}

// ---- Eventos ----
export function trackPageView(): void {
  fbqTrack("track", "PageView");
}

// ✅ SEM dados sensíveis de saúde — só value + currency.
export function trackViewContent(data?: { value?: number }): void {
  fbqTrack("track", "ViewContent", { value: data?.value, currency: CURRENCY });
  gtagEvent("view_item", { value: data?.value, currency: CURRENCY, items: [{ item_id: "AVULSA", item_name: "Serviço", quantity: 1, price: data?.value }] });
}

export function trackLead(data?: { value?: number }): void {
  fbqTrack("track", "Lead", { value: data?.value, currency: CURRENCY });
  gtagEvent("generate_lead", { value: data?.value, currency: CURRENCY });
}

export function trackInitiateCheckout(data?: { value?: number }): void {
  const eventId = crypto.randomUUID();
  fbqTrack("track", "InitiateCheckout", { value: data?.value, currency: CURRENCY }, eventId);
  gtagEvent("begin_checkout", { value: data?.value, currency: CURRENCY, items: [{ item_id: "AVULSA", item_name: "Serviço", quantity: 1, price: data?.value }] });

  // Google Ads — no-op enquanto GOOGLE_ADS_CONVERSIONS.initiateCheckout vazio.
  gtagConversion(GOOGLE_ADS_CONVERSIONS.initiateCheckout, data?.value);

  // Meta CAPI server-side (única rota Meta server-side) — ⏳ guardado por flag.
  void sendToMetaCAPI("InitiateCheckout", { value: data?.value, event_id: eventId });
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
  if (trackedPurchases.has(id)) return true;
  try { return localStorage.getItem(`purchase_tracked_${id}`) === "true"; }
  catch { return false; }
}
const trackedPurchases = new Set<string>();
function markTracked(id: string): void {
  if (typeof window === "undefined") return;
  trackedPurchases.add(id);
  try { localStorage.setItem(`purchase_tracked_${id}`, "true"); } catch { /* storage bloqueado não pode impedir a fila */ }
}

export function trackPurchase(data: {
  value: number;
  order_id: string;
  sku?: string;
  email?: string; // Enhanced Conversions
  itemName?: string; // rótulo interno; NÃO é enviado à Meta
}): void {
  if (!data.order_id || !Number.isFinite(data.value) || data.value <= 0) return;
  if (alreadyTracked(data.order_id)) return;

  // GA4 exige items não-vazio.
  const items = [
    {
      item_id: data.sku || "consulta",
      item_name: "Serviço",
      price: data.value,
      quantity: 1,
    },
  ];

  // Meta Pixel — ✅ SEM dados sensíveis (só value + currency).
  fbqTrack("track", "Purchase", { value: data.value, currency: CURRENCY }, data.order_id);

  // Um único envio GA4 pela fila gtag/dataLayer. Sem email/PII e sem outra
  // tag de evento GA4 disparando o mesmo purchase como "redundância".
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
  // Os utilitários de QA não devem permitir compras sintéticas no site público.
  if (process.env.NODE_ENV !== "development") return;
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
