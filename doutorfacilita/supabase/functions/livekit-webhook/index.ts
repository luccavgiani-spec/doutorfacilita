// livekit-webhook — Recebe eventos do LiveKit e registra quando o PACIENTE
// conecta na sala, gravando consultations.patient_joined_at. Esse é o sinal
// autoritativo que CANCELA o timer de evasão (no_show).
//
// LiveKit assina cada webhook com um JWT no header Authorization (chave = API
// key/secret). WebhookReceiver valida essa assinatura — por isso a função pode
// (e deve) ser deployada com verify_jwt = false: a autenticidade vem do LiveKit,
// não de um JWT do Supabase.
//
//   supabase functions deploy livekit-webhook --no-verify-jwt
//
// Config no painel do LiveKit (Project → Settings → Webhooks):
//   URL: https://<project-ref>.supabase.co/functions/v1/livekit-webhook
//
// Required edge function secrets:
//   LIVEKIT_API_KEY
//   LIVEKIT_API_SECRET
//   SUPABASE_URL               ← auto-provided
//   SUPABASE_SERVICE_ROLE_KEY  ← auto-provided
//
// Identidades (definidas em create_enter_doc / get_patient_token):
//   paciente → identity `patient_<patient_id>`
//   médico   → identity `doctor_<doctor_id>`
// Só o participant_joined do paciente nos interessa aqui.

import { createClient } from "npm:@supabase/supabase-js@2";
import { WebhookReceiver } from "npm:livekit-server-sdk@2";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("LIVEKIT_API_KEY");
  const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey || !apiSecret) return json({ error: "livekit_secrets_missing" }, 500);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "supabase_env_missing" }, 500);

  // 1) Valida a assinatura do LiveKit sobre o corpo cru.
  const raw = await req.text();
  const authHeader = req.headers.get("Authorization") ?? "";
  const receiver = new WebhookReceiver(apiKey, apiSecret);

  let event;
  try {
    event = await receiver.receive(raw, authHeader);
  } catch (err) {
    console.error("[livekit-webhook] assinatura inválida:", err);
    return json({ error: "invalid_signature" }, 401);
  }

  // 2) Só nos interessa o paciente entrando na sala.
  const identity = event.participant?.identity ?? "";
  const roomName = event.room?.name ?? "";
  if (event.event !== "participant_joined" || !identity.startsWith("patient_") || !roomName) {
    // Ack para o LiveKit não reentregar (não é um evento que tratamos).
    return json({ ok: true, ignored: event.event });
  }

  // 3) Marca patient_joined_at (só se ainda nulo — idempotente e monotônico).
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("consultations")
    .update({ patient_joined_at: new Date().toISOString() })
    .eq("livekit_room_name", roomName)
    .is("patient_joined_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[livekit-webhook] update falhou:", error.message);
    return json({ error: "update_failed", detail: error.message }, 500);
  }

  return json({ ok: true, consultation_id: data?.id ?? null, room: roomName });
});
