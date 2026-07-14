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
// verify_jwt: FALSE — chamada do browser sem Authorization. Faça o deploy com:
//   supabase functions deploy meta-capi --project-ref tylpojscdbkzulykdguv --no-verify-jwt

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
    event_id: payload.order_id ||
      `${Date.now()}_${Math.random().toString(36).substring(2)}`,
    event_source_url: payload.event_source_url || "https://www.meuplantaodigital.com",
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
