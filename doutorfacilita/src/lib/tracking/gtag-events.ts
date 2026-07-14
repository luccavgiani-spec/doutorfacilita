/**
 * Google Analytics 4 & Google Ads — helper de eventos (gtag.js)
 *
 * `window.gtag` e `window.dataLayer` existem porque o GTM (GTM-57XSPWPH) injeta
 * a "Tag do Google" (gtag.js) com o Measurement ID do GA4. Este módulo só
 * empurra eventos para eles.
 *
 * IDs em `./config`:
 *   • GA4:        G-KRB2Q1S4D9
 *   • Google Ads: ⏳ pendente (GOOGLE_ADS_ID vazio → conversões viram no-op)
 */
import { GOOGLE_ADS_ID, CURRENCY } from "./config";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    gtagEvent?: (eventName: string, params?: Record<string, unknown>) => void;
  }
}

/** Envia um evento genérico para GA4/Google Ads via gtag. */
export function gtagEvent(
  eventName: string,
  params: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") {
    if (process.env.NODE_ENV === "development") {
      console.warn("[gtag-events] gtag indisponível. Evento ignorado:", eventName);
    }
    return;
  }
  try {
    window.gtag("event", eventName, params);
    if (process.env.NODE_ENV === "development") {
      console.log("[gtag-events] Evento enviado:", eventName, params);
    }
  } catch (error) {
    console.error("[gtag-events] Erro ao enviar evento:", error);
  }
}

/**
 * Conversão do Google Ads. `label` deve ser o rótulo completo "AW-XXXX/yyyy".
 * No-op seguro enquanto o Google Ads não estiver configurado (GOOGLE_ADS_ID vazio).
 */
export function gtagConversion(
  sendTo: string,
  value?: number,
  transactionId?: string,
): void {
  if (!GOOGLE_ADS_ID || !sendTo) return; // ⏳ Ads ainda não configurado
  const params: Record<string, unknown> = { send_to: sendTo };
  if (value !== undefined) {
    params.value = value;
    params.currency = CURRENCY;
  }
  if (transactionId) params.transaction_id = transactionId;
  gtagEvent("conversion", params);
}

// Exposto globalmente (paridade com a Prontia; útil para QA no console).
if (typeof window !== "undefined") {
  window.gtagEvent = gtagEvent;
}
