// Helpers de cliente do Mercado Pago (Checkout Transparente).
//
// Toda a conversa com o MP acontece nas Edge Functions (mp-process-payment /
// mp-webhook), que leem os access tokens dos secrets. Aqui no browser só:
//   • carregamos o SDK v2 + security.js (device fingerprint)
//   • invocamos as Edge Functions via supabase.functions.invoke
//   • fazemos polling do status da consulta (PIX / 3DS)
//
// O Access Token NUNCA vem pro front — só a public key (tokenização do cartão).

import { createClient } from "@/lib/supabase/client";

export const MP_SDK_SRC = "https://sdk.mercadopago.com/js/v2";
const SECURITY_SRC = "https://www.mercadopago.com/v2/security.js";

// deno-lint-ignore no-explicit-any
type AnyObj = Record<string, any>;

export type ProcessResult =
  | { status: "approved"; consultation_id: string }
  | { status: "rejected"; status_detail?: string }
  | { status: "challenge"; three_ds: { url: string }; payment_id?: string }
  | {
    status: "pending";
    metodo?: "pix";
    payment_id?: string;
    qr_code?: string | null;
    qr_code_base64?: string | null;
    ticket_url?: string | null;
  }
  | { status: "error"; message: string; naoConfigurada?: boolean };

/** Carrega um <script> uma única vez; resolve quando `ready` for verdade. */
function loadScript(
  src: string,
  attrs: Record<string, string> = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-mp-src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("script_error")));
      }
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.mpSrc = src;
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    s.addEventListener("load", () => {
      s.dataset.loaded = "1";
      resolve();
    });
    s.addEventListener("error", () => reject(new Error("script_error")));
    document.head.appendChild(s);
  });
}

/** Garante o SDK v2 carregado (window.MercadoPago disponível). */
export async function ensureMpSdk(): Promise<void> {
  if ((window as AnyObj).MercadoPago) return;
  await loadScript(MP_SDK_SRC);
}

/**
 * Garante o security.js e devolve o MP_DEVICE_SESSION_ID.
 * O script preenche window.MP_DEVICE_SESSION_ID de forma assíncrona → polling
 * de até ~10s antes de desistir (device_id ausente não bloqueia, mas derruba
 * a nota de qualidade, então tentamos ao máximo).
 */
export async function ensureDeviceId(): Promise<string | undefined> {
  await loadScript(SECURITY_SRC, { view: "checkout", output: "MP_DEVICE_SESSION_ID" });
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const id = (window as AnyObj).MP_DEVICE_SESSION_ID as string | undefined;
    if (id) return id;
    await new Promise((r) => setTimeout(r, 300));
  }
  return (window as AnyObj).MP_DEVICE_SESSION_ID as string | undefined;
}

/** Lê o corpo JSON de um erro de functions.invoke (FunctionsHttpError). */
async function parseInvokeError(
  error: unknown,
): Promise<{ message: string; naoConfigurada: boolean }> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const b = await ctx.clone().json();
      return {
        message: b.message ?? b.error ?? "Falha no pagamento.",
        naoConfigurada: ctx.status === 503 || b.error === "mp_nao_configurada",
      };
    } catch {
      /* corpo não-JSON */
    }
  }
  const msg = error instanceof Error ? error.message : String(error);
  return { message: msg, naoConfigurada: false };
}

async function invokeProcess(body: AnyObj): Promise<ProcessResult> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("mp-process-payment", {
    body,
  });
  if (error) {
    const parsed = await parseInvokeError(error);
    return { status: "error", ...parsed };
  }
  return data as ProcessResult;
}

/** Cartão: já com o token do cardForm em mãos. */
export function processCard(params: {
  consultationId: string;
  token: string;
  paymentMethodId: string;
  issuerId?: string;
  installments: number;
  deviceId?: string;
}): Promise<ProcessResult> {
  return invokeProcess({
    consultation_id: params.consultationId,
    metodo: "card",
    token: params.token,
    payment_method_id: params.paymentMethodId,
    issuer_id: params.issuerId,
    installments: params.installments,
    device_id: params.deviceId,
  });
}

/** PIX: gera o pagamento e devolve o QR. */
export function processPix(
  consultationId: string,
  deviceId?: string,
): Promise<ProcessResult> {
  return invokeProcess({
    consultation_id: consultationId,
    metodo: "pix",
    device_id: deviceId,
  });
}

/** Status atual da consulta (paciente lê a própria via RLS). */
export async function fetchConsultaStatus(
  consultationId: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("consultations")
    .select("status, paid_at")
    .eq("id", consultationId)
    .maybeSingle();
  if (!data) return null;
  // "pago" = paid_at preenchido (alinhado a hasConsultaPaga()).
  return data.paid_at ? "paid" : (data.status ?? null);
}

/**
 * Faz polling do status até "pago" (paid_at != null) ou timeout.
 * Resolve true se pago; false no timeout. Usado por PIX e pelo challenge 3DS.
 */
export async function pollUntilPaid(
  consultationId: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<boolean> {
  const interval = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + (opts.timeoutMs ?? 10 * 60_000);
  while (Date.now() < deadline) {
    const st = await fetchConsultaStatus(consultationId);
    if (st === "paid" || st === "in_queue" || st === "in_progress" || st === "completed") {
      return true;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}
