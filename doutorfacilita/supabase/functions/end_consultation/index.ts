// end_consultation — Doctor saiu da chamada → encerra a sala LiveKit
// (kicka todos os participantes) e marca a consulta como 'completed'.
//
// Idempotente: chamar 2× não dá erro (deleteRoom devolve 404 silenciosamente
// se a sala já foi deletada; o UPDATE não regride status).
//
// Required edge function secrets:
//   LIVEKIT_API_KEY
//   LIVEKIT_API_SECRET
//   LIVEKIT_URL                ← wss://… (convertido pra https:// internamente)
//   SUPABASE_URL               ← auto-provided
//   SUPABASE_SERVICE_ROLE_KEY  ← auto-provided
//
// Body: { consultation_id: string }
// Auth: Bearer JWT do médico (ownership validado contra consultations.doctor_id).

import { createClient } from "npm:@supabase/supabase-js@2";
import { RoomServiceClient } from "npm:livekit-server-sdk@2";

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

  const { data: doctor, error: doctorErr } = await admin
    .from("doctors")
    .select("id")
    .eq("user_id", authUserId)
    .maybeSingle();
  if (doctorErr) return json({ error: "doctor_lookup_failed", detail: doctorErr.message }, 500);
  if (!doctor) return json({ error: "not_a_doctor" }, 403);

  const { data: consultation, error: consultErr } = await admin
    .from("consultations")
    .select("id, doctor_id, status, livekit_room_name, started_at")
    .eq("id", consultationId)
    .maybeSingle();
  if (consultErr) return json({ error: "consultation_lookup_failed", detail: consultErr.message }, 500);
  if (!consultation) return json({ error: "consultation_not_found" }, 404);
  if (consultation.doctor_id !== doctor.id) {
    return json({ error: "not_your_consultation" }, 403);
  }

  // 1) Encerra a sala LiveKit (kicka todos os participantes).
  //    RoomServiceClient usa HTTP, não wss; converte aqui.
  const livekitHttp = livekitUrl.replace(/^wss?:\/\//i, "https://");
  const svc = new RoomServiceClient(livekitHttp, apiKey, apiSecret);
  let roomDeleted = false;
  if (consultation.livekit_room_name) {
    try {
      await svc.deleteRoom(consultation.livekit_room_name);
      roomDeleted = true;
    } catch (err) {
      // Sala pode já ter sido deletada por outra chamada (idempotência);
      // log e segue, não bloqueia o UPDATE no DB.
      console.error("[end_consultation] deleteRoom failed:", err);
    }
  }

  // 2) Marca consulta como completed (não regride status).
  const nowIso = new Date().toISOString();
  const startedAtIso =
    typeof consultation.started_at === "string" ? consultation.started_at : null;
  const durationSeconds = startedAtIso
    ? Math.max(0, Math.floor((Date.now() - new Date(startedAtIso).getTime()) / 1000))
    : null;

  const advance =
    consultation.status === "in_progress" || consultation.status === "in_queue";
  const update: Record<string, unknown> = { ended_at: nowIso };
  if (advance) update.status = "completed";
  if (durationSeconds !== null) update.duration_seconds = durationSeconds;

  const { error: updateErr } = await admin
    .from("consultations")
    .update(update)
    .eq("id", consultationId);
  if (updateErr) {
    return json({ error: "consultation_update_failed", detail: updateErr.message }, 500);
  }

  return json({
    ok: true,
    room_deleted: roomDeleted,
    duration_seconds: durationSeconds,
  });
});
