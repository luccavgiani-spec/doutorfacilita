// mp-process-payment — cria o pagamento no Mercado Pago (cartão E PIX) via
// Payments API (/v1/payments). Invocada pelo cliente via supabase.functions.invoke.
//
// Fluxo:
//   1. valida JWT → resolve patients (patients.user_id = auth.uid())
//   2. carrega a consulta pendente; exige ownership + status='created'
//   3. GUARD anti-tamper: valor vem de consultations.amount_cents (422 se NULL/≤0)
//   4. seleciona o access token do app certo (card→CARTAO, pix→PIX)
//   5. monta payer + additional_info completos (nota +90) e chama /v1/payments
//   6. cartão aprovado (síncrono) → marca a consulta paga (in_queue) idempotente
//   7. 3DS (pending_challenge) → devolve { status:'challenge', three_ds:{url} }
//   8. PIX → devolve qr_code / qr_code_base64 para exibição + polling
//
// SELF-CONTAINED de propósito: helpers (CORS/JSON/MP/resolvePatient) inline para
// deploy robusto (imports ../_shared já quebraram deploy no passado).
//
// Secrets: MP_ACCESS_TOKEN_CARTAO, MP_ACCESS_TOKEN_PIX (+ SUPABASE_* automáticos).
// verify_jwt: false (valida o JWT internamente via resolvePatient).

import { createClient } from "npm:@supabase/supabase-js@2";

const MP_API = "https://api.mercadopago.com";
// ATENÇÃO: o MP limita o statement_descriptor a 13 chars. Com 14+ ele responde
// 500 internal_error (não trunca) e derruba o pagamento inteiro. Mantemos ≤13.
const STATEMENT_DESCRIPTOR = "PLANTAODIGITA"; // 13 chars (de "PLANTAODIGITAL")

type Metodo = "pix" | "card";

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

const onlyDigits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

/** Normaliza celular BR → 10/11 dígitos (descarta DDI 55), ou undefined. */
function normalizarCelularBR(v: string | null | undefined): string | undefined {
  let d = onlyDigits(v);
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : undefined;
}

function splitPhoneBR(
  celular: string | null | undefined,
  fallback: string | null | undefined,
): { area_code: string; number: string } | undefined {
  const norm = normalizarCelularBR(celular) ?? normalizarCelularBR(fallback);
  if (!norm) return undefined;
  return { area_code: norm.slice(0, 2), number: norm.slice(2) };
}

function mpToken(metodo: Metodo): string {
  const t = metodo === "pix"
    ? Deno.env.get("MP_ACCESS_TOKEN_PIX")
    : Deno.env.get("MP_ACCESS_TOKEN_CARTAO");
  return (t ?? "").trim();
}

interface PatientRow {
  id: string;
  full_name: string | null;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  celular: string | null;
  address_line: string | null;
  address_number: string | null;
  postal_code: string | null;
}

function buildPayer(p: PatientRow, emailFallback: string) {
  const nome = (p.full_name ?? "").trim();
  const first = nome.split(/\s+/)[0] ?? "";
  const last = nome.split(/\s+/).slice(1).join(" ") || first;
  const phone = splitPhoneBR(p.celular, p.phone);
  const cep = onlyDigits(p.postal_code);

  const payer: Record<string, unknown> = {
    email: p.email ?? emailFallback,
    first_name: first,
    last_name: last,
    identification: { type: "CPF", number: onlyDigits(p.cpf) },
  };
  if (phone) payer.phone = phone;
  if (p.address_line || cep) {
    payer.address = {
      zip_code: cep,
      street_name: (p.address_line ?? "").trim(),
      street_number: (p.address_number ?? "").trim() || "S/N",
    };
  }
  return payer;
}

function buildItem(
  serviceCode: string | null,
  serviceName: string | null,
  consultationId: string,
  amountReais: number,
) {
  return {
    id: serviceCode ?? consultationId,
    title: serviceName ?? "Teleconsulta",
    description: serviceName ?? "Teleconsulta por vídeo",
    category_id: "services",
    quantity: 1,
    unit_price: amountReais,
  };
}

function extract3dsUrl(data: Record<string, unknown>): string | null {
  const info = (data.three_ds_info ?? data.three_d_secure_info) as
    | Record<string, unknown>
    | undefined;
  if (!info) return null;
  const url = info.external_resource_url ?? info.url ?? info.creq;
  return typeof url === "string" && url ? url : null;
}

/** Resolve o paciente pelo JWT (user client valida → service_role busca). */
// deno-lint-ignore no-explicit-any
async function resolvePatient(req: Request): Promise<
  { error: Response } | { patient: PatientRow; authEmail: string | null; admin: any }
> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return { error: json({ error: "supabase_env_missing" }, 500) };
  }
  const accessToken = (req.headers.get("Authorization") ?? "")
    .replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return { error: json({ error: "missing_authorization" }, 401) };

  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(accessToken);
  if (userErr || !userData?.user) return { error: json({ error: "invalid_jwt" }, 401) };
  const authEmail = (userData.user.email as string | undefined) ?? null;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: patient, error: pErr } = await admin
    .from("patients")
    .select("id, full_name, cpf, email, phone, celular, address_line, address_number, postal_code")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (pErr) return { error: json({ error: "patient_lookup_failed", detail: pErr.message }, 500) };
  if (!patient) return { error: json({ error: "not_a_patient" }, 403) };

  return { patient: patient as PatientRow, authEmail, admin };
}

interface Body {
  consultation_id?: string;
  metodo?: string;
  token?: string;
  payment_method_id?: string;
  issuer_id?: string;
  installments?: number;
  device_id?: string;
}

function clientIpFrom(req: Request): string | undefined {
  const first = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim();
  return first || undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const metodo = body.metodo as Metodo;
  if (metodo !== "pix" && metodo !== "card") return json({ error: "metodo_invalido" }, 400);
  if (!body.consultation_id) return json({ error: "consultation_id_obrigatorio" }, 400);

  const token = mpToken(metodo);
  if (!token) {
    return json(
      {
        error: "mp_nao_configurada",
        message: `Access token do app ${metodo} ausente. Aguardando credenciais.`,
      },
      503,
    );
  }

  const resolved = await resolvePatient(req);
  if ("error" in resolved) return resolved.error;
  const { patient, authEmail, admin } = resolved;

  const { data: consulta, error: cErr } = await admin
    .from("consultations")
    .select("id, patient_id, status, amount_cents, service_code, service_name")
    .eq("id", body.consultation_id)
    .maybeSingle();

  if (cErr) return json({ error: "consulta_lookup_failed", detail: cErr.message }, 500);
  if (!consulta) return json({ error: "consulta_nao_encontrada" }, 404);
  if (consulta.patient_id !== patient.id) {
    return json({ error: "consulta_de_outro_paciente" }, 403);
  }
  if (consulta.status !== "created") {
    return json({ error: "consulta_nao_pendente", status: consulta.status }, 409);
  }

  const amountCents = consulta.amount_cents as number | null;
  if (amountCents == null || amountCents <= 0) {
    return json({ error: "valor_invalido", message: "amount_cents ausente ou ≤ 0." }, 422);
  }
  const amountReais = Number((amountCents / 100).toFixed(2));

  const clientIp = clientIpFrom(req);
  const externalRef = consulta.id as string;
  const payer = buildPayer(patient, authEmail ?? "");
  const item = buildItem(
    consulta.service_code as string | null,
    consulta.service_name as string | null,
    consulta.id as string,
    amountReais,
  );
  const description = (consulta.service_name as string | null) ?? "Teleconsulta";

  // Registro em pagamentos_mp (SELECT → INSERT explícito).
  const { data: existente } = await admin
    .from("pagamentos_mp")
    .select("id")
    .eq("consultation_id", consulta.id)
    .eq("metodo", metodo)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let pagamentoId = existente?.id as string | undefined;
  if (!pagamentoId) {
    const { data: novo, error: insErr } = await admin
      .from("pagamentos_mp")
      .insert({
        consultation_id: consulta.id,
        metodo,
        status: "pending",
        valor_cents: amountCents,
        external_reference: externalRef,
      })
      .select("id")
      .single();
    if (insErr) return json({ error: "pagamento_insert_failed", detail: insErr.message }, 500);
    pagamentoId = novo.id as string;
  }

  let mpBody: Record<string, unknown>;
  let idempotencyKey: string;

  if (metodo === "card") {
    if (!body.token || !body.payment_method_id) {
      return json({ error: "token_ou_payment_method_ausente" }, 400);
    }
    mpBody = {
      transaction_amount: amountReais,
      description,
      external_reference: externalRef,
      token: body.token,
      payment_method_id: body.payment_method_id,
      installments: Number(body.installments) || 1,
      statement_descriptor: STATEMENT_DESCRIPTOR.slice(0, 13),
      binary_mode: false,
      three_d_secure_mode: "optional",
      payer,
      additional_info: {
        items: [item],
        payer: {
          first_name: payer.first_name,
          last_name: payer.last_name,
          phone: payer.phone,
          address: payer.address,
        },
        ip_address: clientIp,
      },
      metadata: { consultation_id: consulta.id },
    };
    if (body.issuer_id) mpBody.issuer_id = body.issuer_id;
    idempotencyKey = `${consulta.id}:card:${body.token.slice(0, 12)}`;
  } else {
    mpBody = {
      transaction_amount: amountReais,
      description,
      external_reference: externalRef,
      payment_method_id: "pix",
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification,
      },
      additional_info: { items: [item], ip_address: clientIp },
      metadata: { consultation_id: consulta.id },
    };
    idempotencyKey = `${consulta.id}:pix`;
  }

  // Chama o Mercado Pago (headers fora do body).
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Idempotency-Key": idempotencyKey,
  };
  if (body.device_id) h["X-meli-session-id"] = body.device_id;
  if (clientIp) h["X-Forwarded-For"] = clientIp;

  const mpRes = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: h,
    body: JSON.stringify(mpBody),
  });
  const result = await mpRes.json().catch(() => ({} as Record<string, unknown>));

  if (!mpRes.ok) {
    console.error("[mp-process-payment] MP error", mpRes.status, JSON.stringify(result));
    await admin.from("pagamentos_mp").update({ status: "error" }).eq("id", pagamentoId);
    const detail = result?.message ?? result?.error ?? "erro no gateway";
    return json(
      { error: "mp_error", message: String(detail), mp_status: mpRes.status, detail },
      mpRes.status >= 400 && mpRes.status < 500 ? 400 : 502,
    );
  }

  const mpPaymentId = String(result.id ?? "");
  const status = String(result.status ?? "pending");
  const statusDetail = String(result.status_detail ?? "");

  await admin
    .from("pagamentos_mp")
    .update({ mp_payment_id: mpPaymentId || null, status })
    .eq("id", pagamentoId);

  if (status === "approved") {
    await markConsultaPaga(admin, consulta.id as string, mpPaymentId);
    return json({ status: "approved", consultation_id: consulta.id });
  }

  if (metodo === "card" && statusDetail === "pending_challenge") {
    const url = extract3dsUrl(result);
    if (url) return json({ status: "challenge", three_ds: { url }, payment_id: mpPaymentId });
    return json({ status: "pending", payment_id: mpPaymentId });
  }

  if (metodo === "pix") {
    const poi = (result.point_of_interaction ?? {}) as Record<string, unknown>;
    const td = (poi.transaction_data ?? {}) as Record<string, unknown>;
    return json({
      status: "pending",
      metodo: "pix",
      payment_id: mpPaymentId,
      qr_code: td.qr_code ?? null,
      qr_code_base64: td.qr_code_base64 ?? null,
      ticket_url: td.ticket_url ?? null,
    });
  }

  if (status === "rejected") return json({ status: "rejected", status_detail: statusDetail });
  return json({ status: "pending", payment_id: mpPaymentId });
});

/** Marca a consulta paga → fila. Idempotente: só transiciona de 'created'. */
// deno-lint-ignore no-explicit-any
async function markConsultaPaga(admin: any, consultationId: string, paymentId: string) {
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
    .eq("id", consultationId)
    .eq("status", "created");
}
