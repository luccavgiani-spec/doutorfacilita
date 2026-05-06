// create_enter_doc — Doctor presses "Chamar próximo" → reuses or creates a
// LiveKit room for this consultation, marks doctor_called_at, returns the
// doctor's join token. Idempotent: clicking twice does NOT regress state nor
// rotate the room.
//
// Required edge function secrets:
//   LIVEKIT_API_KEY
//   LIVEKIT_API_SECRET
//   LIVEKIT_URL                ← wss://… (also exposed to client as NEXT_PUBLIC_LIVEKIT_URL)
//   SUPABASE_URL               ← auto-provided by Supabase Functions runtime
//   SUPABASE_SERVICE_ROLE_KEY  ← auto-provided
//
// Body: { consultation_id: string }
// Auth: Bearer JWT of the doctor (validated; doctor_id must match auth.uid()).

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

  // User-scoped client validates the JWT and gives us the auth user.
  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(accessToken);
  if (userErr || !userData.user) return json({ error: "invalid_jwt" }, 401);
  const authUserId = userData.user.id;

  // Service-role client for trusted reads/writes after we know the doctor.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: doctor, error: doctorErr } = await admin
    .from("doctors")
    .select("id, full_name, is_active, accepts_new_consultations")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (doctorErr) return json({ error: "doctor_lookup_failed", detail: doctorErr.message }, 500);
  if (!doctor) return json({ error: "not_a_doctor" }, 403);
  if (!doctor.is_active) return json({ error: "doctor_inactive" }, 403);

  const { data: consultation, error: consultErr } = await admin
    .from("consultations")
    .select("id, patient_id, doctor_id, status, livekit_room_name, livekit_room_created_at, doctor_called_at")
    .eq("id", consultationId)
    .maybeSingle();

  if (consultErr) return json({ error: "consultation_lookup_failed", detail: consultErr.message }, 500);
  if (!consultation) return json({ error: "consultation_not_found" }, 404);

  // Cannot claim a consultation already assigned to a different doctor.
  if (consultation.doctor_id && consultation.doctor_id !== doctor.id) {
    return json({ error: "already_assigned_to_another_doctor" }, 409);
  }

  // Idempotent room name: reuse existing or create deterministic new one.
  const roomName = consultation.livekit_room_name ?? `consultation_${consultationId}`;

  // Single UPDATE that:
  //   * claims doctor_id (only if NULL)
  //   * stamps livekit_room_* and doctor_called_at if not yet set
  //   * advances status only from in_queue → in_progress (no regression)
  const { error: updateErr } = await admin
    .from("consultations")
    .update({
      doctor_id: doctor.id,
      livekit_room_name: roomName,
      livekit_room_created_at: consultation.livekit_room_created_at ?? new Date().toISOString(),
      doctor_called_at: consultation.doctor_called_at ?? new Date().toISOString(),
      status: consultation.status === "in_queue" ? "in_progress" : consultation.status,
    })
    .eq("id", consultationId);

  if (updateErr) {
    return json({ error: "consultation_update_failed", detail: updateErr.message }, 500);
  }

  // Generate doctor's LiveKit access token (2h TTL).
  const at = new AccessToken(apiKey, apiSecret, {
    identity: `doctor_${doctor.id}`,
    name: doctor.full_name,
    ttl: "2h",
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });
  const token = await at.toJwt();

  return json({
    room_name: roomName,
    token,
    livekit_url: livekitUrl,
  });
});
