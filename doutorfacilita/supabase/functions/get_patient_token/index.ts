// get_patient_token — Patient presses "Acessar consulta" → returns a
// LiveKit join token scoped to the patient's identity for the same room
// the doctor created via create_enter_doc.
//
// Returns 409 if the doctor hasn't called yet (livekit_room_name still NULL).
//
// Required edge function secrets:
//   LIVEKIT_API_KEY
//   LIVEKIT_API_SECRET
//   LIVEKIT_URL
//   SUPABASE_URL              ← auto
//   SUPABASE_SERVICE_ROLE_KEY ← auto
//
// Body: { consultation_id: string }
// Auth: Bearer JWT of the patient (must match patients.user_id).

import { createClient } from "npm:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Json = Record<string, unknown>;

function json(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("LIVEKIT_API_KEY");
  const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
  const livekitUrl = Deno.env.get("LIVEKIT_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey || !apiSecret || !livekitUrl) {
    return json({ error: "livekit_secrets_missing" }, 500);
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "supabase_env_missing" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return json({ error: "missing_authorization" }, 401);

  let body: { consultation_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const consultationId = body.consultation_id;
  if (!consultationId || typeof consultationId !== "string") {
    return json({ error: "missing_consultation_id" }, 400);
  }

  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(accessToken);
  if (userErr || !userData.user) return json({ error: "invalid_jwt" }, 401);
  const authUserId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: patient, error: patientErr } = await admin
    .from("patients")
    .select("id, full_name")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (patientErr) return json({ error: "patient_lookup_failed", detail: patientErr.message }, 500);
  if (!patient) return json({ error: "not_a_patient" }, 403);

  const { data: consultation, error: consultErr } = await admin
    .from("consultations")
    .select("id, patient_id, livekit_room_name")
    .eq("id", consultationId)
    .maybeSingle();

  if (consultErr) return json({ error: "consultation_lookup_failed", detail: consultErr.message }, 500);
  if (!consultation) return json({ error: "consultation_not_found" }, 404);
  if (consultation.patient_id !== patient.id) return json({ error: "not_your_consultation" }, 403);
  if (!consultation.livekit_room_name) {
    return json({ error: "doctor_has_not_called_yet" }, 409);
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: `patient_${patient.id}`,
    name: patient.full_name,
    ttl: "2h",
  });
  at.addGrant({
    roomJoin: true,
    room: consultation.livekit_room_name,
    canPublish: true,
    canSubscribe: true,
  });
  const token = await at.toJwt();

  return json({
    room_name: consultation.livekit_room_name,
    token,
    livekit_url: livekitUrl,
  });
});
