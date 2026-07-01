// mp-webhook — recebe notificações server-to-server do Mercado Pago (cartão e
// PIX apontam para a MESMA função no painel). verify_jwt=false.
//
// SEGURANÇA: o webhook NUNCA confia no corpo recebido. Ele extrai só o
// payment_id e RE-CONSULTA /v1/payments/{id} com o NOSSO access token — a
// fonte de verdade do status é a API do MP, não o payload. Um webhook forjado
// com id falso cai em 404 → no-op 200 (também é o caso dos ids de teste).
//
// IDEMPOTÊNCIA:
//   • pagamentos_mp.mp_payment_id é UNIQUE.
//   • markConsultaPaga só transiciona de status='created' → corrida com a
//     confirmação síncrona de mp-process-payment é segura (quem chegar depois
//     vira no-op).
//
// Secrets: MP_ACCESS_TOKEN_CARTAO, MP_ACCESS_TOKEN_PIX (+ SUPABASE_* auto).

import { createClient } from "npm:@supabase/supabase-js@2";

const MP_API = "https://api.mercadopago.com";

/** Access token do app correto (secret). Vazio se não configurado. */
function mpToken(metodo: "pix" | "card"): string {
  const t = metodo === "pix"
    ? Deno.env.get("MP_ACCESS_TOKEN_PIX")
    : Deno.env.get("MP_ACCESS_TOKEN_CARTAO");
  return (t ?? "").trim();
}

/** GET /v1/payments/{id} — fonte de verdade do status. */
async function mpGetPayment(
  token: string,
  paymentId: string,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/** Comparação de tempo constante (hex strings) — evita timing attack. */
function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

/** HMAC-SHA256(msg, secret) em hex. */
async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Parse do header x-signature: "ts=...,v1=..." → { ts, v1 }. */
function parseSignature(header: string): { ts: string; v1: string } {
  const out: Record<string, string> = {};
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return { ts: out.ts ?? "", v1: out.v1 ?? "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "supabase_env_missing" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const url = new URL(req.url);
    // deno-lint-ignore no-explicit-any
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      /* MP às vezes manda vazio; segue pelos query params */
    }

    const type = body?.type ?? body?.topic ??
      url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";
    const paymentId = body?.data?.id != null
      ? String(body.data.id)
      : (url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");

    // Só tratamos eventos de pagamento; o resto (merchant_order etc.) → ack.
    if (type && !String(type).includes("payment")) {
      return json({ received: true, ignored: type }, 200);
    }
    if (!paymentId) {
      return json({ received: true, note: "sem payment id" }, 200);
    }

    // ─── Validação de origem (x-signature) por app ──────────────────────
    // O secret que bater identifica o app (cartão vs PIX) → determina qual
    // access token usar na re-consulta. Nenhum secret bateu → 401.
    const secretCard = (Deno.env.get("MP_WEBHOOK_SECRET_CARTAO") ?? "").trim();
    const secretPix = (Deno.env.get("MP_WEBHOOK_SECRET_PIX") ?? "").trim();
    const anySecret = secretCard !== "" || secretPix !== "";

    let validatedApp: "card" | "pix" | null = null;
    if (anySecret) {
      const { ts, v1 } = parseSignature(req.headers.get("x-signature") ?? "");
      const requestId = req.headers.get("x-request-id") ?? "";
      if (!ts || !v1) return json({ error: "missing_signature" }, 401);

      // Template EXATO do MP. data.id vem do query param; se alfanumérico,
      // em minúsculo. Manifest errado rejeita TUDO.
      const sigDataId = url.searchParams.get("data.id") ?? paymentId;
      const idForManifest = /[a-zA-Z]/.test(sigDataId)
        ? sigDataId.toLowerCase()
        : sigDataId;
      const manifest = `id:${idForManifest};request-id:${requestId};ts:${ts};`;

      const candidatos: Array<["card" | "pix", string]> = [];
      if (secretCard) candidatos.push(["card", secretCard]);
      if (secretPix) candidatos.push(["pix", secretPix]);
      for (const [app, secret] of candidatos) {
        const h = await hmacHex(secret, manifest);
        if (safeEqual(h, v1)) {
          validatedApp = app;
          break;
        }
      }
      if (!validatedApp) return json({ error: "invalid_signature" }, 401);
    } else {
      console.warn(
        "[mp-webhook] MP_WEBHOOK_SECRET_* ausentes — validação de assinatura DESLIGADA (bootstrapping).",
      );
    }

    // Descobre o método para escolher o token do app certo:
    //   • assinatura validada → o app do secret que bateu manda.
    //   • sem secrets (bootstrapping) → linha existente, senão tenta ambos.
    const { data: pagRow } = await admin
      .from("pagamentos_mp")
      .select("id, consultation_id, metodo, status")
      .eq("mp_payment_id", paymentId)
      .maybeSingle();

    const metodos: ("card" | "pix")[] = validatedApp
      ? [validatedApp]
      : (pagRow?.metodo ? [pagRow.metodo as "card" | "pix"] : ["card", "pix"]);

    let payment: Record<string, unknown> | null = null;
    let all404 = true;
    for (const m of metodos) {
      const token = mpToken(m);
      if (!token) continue;
      const r = await mpGetPayment(token, paymentId);
      if (r.ok) {
        payment = r.data;
        all404 = false;
        break;
      }
      if (r.status !== 404) all404 = false;
    }

    // Id de teste / inexistente → ack 200 (não estourar 500, não gerar retry).
    if (!payment) {
      return json({ received: true, note: all404 ? "payment_not_found" : "mp_unreachable" }, 200);
    }

    const status = String(payment.status ?? "");
    const consultaId = String(
      payment.external_reference ??
        (payment.metadata as Record<string, unknown> | undefined)?.consultation_id ??
        "",
    );
    const paymentType = String(payment.payment_type_id ?? "");
    const metodo = paymentType.includes("card")
      ? "card"
      : (pagRow?.metodo ?? "pix");

    // Atualiza/insere a linha de pagamento (idempotente via UNIQUE mp_payment_id).
    if (pagRow) {
      await admin.from("pagamentos_mp").update({ status }).eq("id", pagRow.id);
    } else if (consultaId) {
      // Webhook chegou antes da confirmação síncrona salvar o id: casa com a
      // linha pendente da consulta, senão cria uma.
      const { data: pend } = await admin
        .from("pagamentos_mp")
        .select("id, valor_cents")
        .eq("consultation_id", consultaId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pend) {
        await admin
          .from("pagamentos_mp")
          .update({ mp_payment_id: paymentId, status })
          .eq("id", pend.id);
      } else {
        const valor = Math.round(Number(payment.transaction_amount ?? 0) * 100);
        await admin.from("pagamentos_mp").insert({
          consultation_id: consultaId,
          metodo,
          mp_payment_id: paymentId,
          status,
          valor_cents: valor,
          external_reference: consultaId,
        });
      }
    }

    if (status === "approved" && consultaId) {
      const nowIso = new Date().toISOString();
      await admin
        .from("consultations")
        .update({
          status: "in_queue",
          doctor_id: null,
          paid_at: nowIso,
          queued_at: nowIso,
          payment_id: paymentId,
        })
        .eq("id", consultaId)
        .eq("status", "created");
    }

    return json({ received: true, status }, 200);
  } catch (e) {
    console.error("[mp-webhook] erro inesperado", e);
    // Ack mesmo em erro nosso evita tempestade de retry do MP; o próximo evento
    // (ou o polling do cliente) reconcilia.
    return json(
      { received: true, error: e instanceof Error ? e.message : String(e) },
      200,
    );
  }
});
