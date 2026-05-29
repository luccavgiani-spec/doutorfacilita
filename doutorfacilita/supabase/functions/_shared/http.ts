// Helpers HTTP compartilhados pelas Edge Functions Mevo.
// Mesma convenção de CORS/json das funções de LiveKit já existentes.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type Json = Record<string, unknown>;

export function json(body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function preflight(): Response {
  return new Response("ok", { headers: corsHeaders });
}

/**
 * Resolve o médico (doctors) a partir do JWT recebido.
 * Mesmo padrão das Edge Functions de LiveKit:
 *   1. user-scoped client valida o JWT → auth user id
 *   2. service_role busca doctors.user_id = authUserId
 *
 * Retorna { error } com status pronto, ou { doctor, authUserId, admin }.
 */
// deno-lint-ignore no-explicit-any
export async function resolveDoctor(req: Request, createClient: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return { error: json({ error: "supabase_env_missing" }, 500) };
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return { error: json({ error: "missing_authorization" }, 401) };
  }

  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(
    accessToken,
  );
  if (userErr || !userData?.user) {
    return { error: json({ error: "invalid_jwt" }, 401) };
  }
  const authUserId = userData.user.id as string;
  const authEmail = (userData.user.email as string | undefined) ?? null;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: doctor, error: doctorErr } = await admin
    .from("doctors")
    .select(
      "id, user_id, full_name, cpf, email, phone, council, council_state, council_number, council_active, primary_specialty, is_active",
    )
    .eq("user_id", authUserId)
    .maybeSingle();

  if (doctorErr) {
    return {
      error: json(
        { error: "doctor_lookup_failed", detail: doctorErr.message },
        500,
      ),
    };
  }
  if (!doctor) return { error: json({ error: "not_a_doctor" }, 403) };
  if (doctor.is_active === false) {
    return { error: json({ error: "doctor_inactive" }, 403) };
  }

  return { doctor, authUserId, authEmail, admin };
}
