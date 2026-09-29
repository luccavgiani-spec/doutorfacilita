// meta-capi — Conversions API da Meta (rastreio server-side).
// Recebe eventos do client (meta-tracking.ts → sendToMetaCAPI) e reenvia ao
// endpoint /events do Pixel da Meta, server-side, para melhor atribuição.
//
// ⚠️ POLÍTICA DE DADOS DE SAÚDE (telemedicina): só value + currency vão como
// custom_data. NUNCA content_name/category/ids nem dado clínico.
//
// SELF-CONTAINED de propósito: CORS/JSON inline (imports ../_shared já quebraram
// deploy no passado — ver mp-process-payment).
//
// Secret necessário: META_ACCESS_TOKEN (Events Manager → API de Conversões).
// verify_jwt: FALSE — Purchase valida Authorization e compra internamente.
//   supabase functions deploy meta-capi --project-ref tylpojscdbkzulykdguv --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const PIXEL_ID = "1891368092249300";
const META_API_VERSION = "v21.0"; // bump livre se a Meta depreciar
const META_API_URL = `https://graph.facebook.com/${META_API_VERSION}/${PIXEL_ID}/events`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

interface CAPIPayload {
  event_name: string;
  event_time?: number;
  event_source_url?: string;
  value?: number;
  currency?: string;
  order_id?: string;
  event_id?: string;
  fbp?: string;
  fbc?: string;
  client_user_agent?: string;
  test_event_code?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const accessToken = Deno.env.get("META_ACCESS_TOKEN");
  if (!accessToken) return json({ error: "meta_access_token_missing" }, 500);

  let payload: CAPIPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!payload.event_name) return json({ error: "event_name_required" }, 400);

  if (payload.event_name === "Purchase") {
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "missing_authorization" }, 401);
    if (!payload.order_id) return json({ error: "order_id_required" }, 400);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "server_configuration_missing" }, 503);
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data: auth, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !auth.user) return json({ error: "invalid_authorization" }, 401);
    const { data: patient, error: patientError } = await admin.from("patients")
      .select("id").eq("user_id", auth.user.id).maybeSingle();
    if (patientError) return json({ error: "purchase_verification_failed" }, 503);
    if (!patient) return json({ error: "purchase_not_found" }, 403);
    const { data: consultation, error: consultationError } = await admin.from("consultations")
      .select("paid_at, amount_cents").eq("id", payload.order_id)
      .eq("patient_id", patient.id).maybeSingle();
    if (consultationError) return json({ error: "purchase_verification_failed" }, 503);
    if (!consultation?.paid_at) return json({ error: "purchase_not_paid" }, 409);
    if (!Number.isInteger(consultation.amount_cents) || consultation.amount_cents <= 0)
      return json({ error: "purchase_amount_invalid" }, 422);
    payload.value = consultation.amount_cents / 100;
    payload.currency = "BRL";
    payload.event_id = payload.order_id;
    payload.event_time = Math.floor(new Date(consultation.paid_at).getTime() / 1000);
    payload.test_event_code = undefined;
  }

  // user_data (identificadores anônimos de atribuição — nada clínico).
  const userData: Record<string, string> = {};
  if (payload.fbp) userData.fbp = payload.fbp;
  if (payload.fbc) userData.fbc = payload.fbc;
  if (payload.client_user_agent) userData.client_user_agent = payload.client_user_agent;
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip");
  if (clientIp) userData.client_ip_address = clientIp;

  // custom_data — SOMENTE value + currency (+ order_id p/ dedup). Sem dado de saúde.
  const customData: Record<string, unknown> = { currency: payload.currency || "BRL" };
  if (payload.value !== undefined) customData.value = payload.value;
  if (payload.order_id) customData.order_id = payload.order_id;

  const eventData = {
    event_name: payload.event_name,
    event_time: payload.event_time || Math.floor(Date.now() / 1000),
    // event_id = order_id permite dedup com o Pixel client-side (mesmo id).
    event_id: payload.event_id || payload.order_id ||
      `${Date.now()}_${Math.random().toString(36).substring(2)}`,
    event_source_url: "https://plantaodigital.com.br/",
    action_source: "website",
    user_data: userData,
    custom_data: customData,
  };

  const body: Record<string, unknown> = { data: [eventData] };
  if (payload.test_event_code) body.test_event_code = payload.test_event_code;

  try {
    const res = await fetch(`${META_API_URL}?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (!res.ok) {
      console.error("[meta-capi] erro da Meta:", JSON.stringify(result));
      return json({ success: false, error: result.error?.message ?? "meta_api_error" }, res.status);
    }
    return json({
      success: true,
      fbtrace_id: result.fbtrace_id,
      events_received: result.events_received,
    });
  } catch (error) {
    console.error("[meta-capi] erro:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "unknown" }, 500);
  }
});
