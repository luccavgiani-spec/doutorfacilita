"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";

const VALOR_CENTAVOS_AVULSA = 5900;

/**
 * Override "Redirecionar para Prontia" — integration_configs id='prontia_redirect'.
 * config jsonb agora carrega:
 *   - destino_url: pra onde redirecionar
 *   - valor_cobrado_cents: quanto o paciente paga
 *   - valor_pago_prontia_cents: repasse pra Prontia (custo)
 *
 * A margem do dashboard é cobrado - repasse (calculado por linha de
 * prontia_encaminhamentos).
 */
export type ProntiaConfigInput = {
  enabled: boolean;
  destino_url: string;
  valor_cobrado_cents: number;
  valor_pago_prontia_cents: number;
};

export async function saveProntiaConfig(
  input: ProntiaConfigInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sem_sessao" };

  // valores negativos não fazem sentido
  const cobrado = Math.max(0, Math.round(Number(input.valor_cobrado_cents) || 0));
  const repasse = Math.max(0, Math.round(Number(input.valor_pago_prontia_cents) || 0));

  const { error } = await supabase
    .from("integration_configs")
    .update({
      enabled: input.enabled,
      config: {
        destino_url: input.destino_url,
        valor_cobrado_cents: cobrado,
        valor_pago_prontia_cents: repasse,
      },
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "prontia_redirect");

  if (error) return { ok: false, error: error.message };

  await logAdminAction({
    action: "update",
    entity_type: "integration_config",
    entity_id: "prontia_redirect",
    metadata: { enabled: input.enabled, valor_cobrado_cents: cobrado, valor_pago_prontia_cents: repasse },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/integracoes");
  return { ok: true };
}

/** Atualiza só a URL de destino do Prontia (mantém enabled e valores). */
export async function saveProntiaUrl(
  destinoUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sem_sessao" };

  const { data: current } = await supabase
    .from("integration_configs")
    .select("config")
    .eq("id", "prontia_redirect")
    .maybeSingle();
  const c = (current?.config ?? {}) as Record<string, unknown>;

  const { error } = await supabase
    .from("integration_configs")
    .update({
      config: { ...c, destino_url: destinoUrl },
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "prontia_redirect");

  if (error) return { ok: false, error: error.message };

  await logAdminAction({
    action: "update",
    entity_type: "integration_config",
    entity_id: "prontia_redirect",
    metadata: { destino_url: destinoUrl },
  });
  revalidatePath("/admin/integracoes");
  return { ok: true };
}

/** Atualiza só os valores (cobrado/repasse) do Prontia. */
export async function saveProntiaValores(
  valorCobradoCents: number,
  valorPagoProntiaCents: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sem_sessao" };

  const cobrado = Math.max(0, Math.round(Number(valorCobradoCents) || 0));
  const repasse = Math.max(0, Math.round(Number(valorPagoProntiaCents) || 0));

  const { data: current } = await supabase
    .from("integration_configs")
    .select("config")
    .eq("id", "prontia_redirect")
    .maybeSingle();
  const c = (current?.config ?? {}) as Record<string, unknown>;

  const { error } = await supabase
    .from("integration_configs")
    .update({
      config: { ...c, valor_cobrado_cents: cobrado, valor_pago_prontia_cents: repasse },
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "prontia_redirect");

  if (error) return { ok: false, error: error.message };

  await logAdminAction({
    action: "update",
    entity_type: "integration_config",
    entity_id: "prontia_redirect",
    metadata: { valor_cobrado_cents: cobrado, valor_pago_prontia_cents: repasse },
  });
  revalidatePath("/admin/integracoes");
  return { ok: true };
}

// ─── Registro manual de encaminhamento (stub p/ testes) ─────
// Em produção, o dispatcher (middleware/edge) que faz o redirect insere
// uma linha aqui. Este wrapper permite ao admin simular um encaminhamento
// pra popular o dashboard.
export async function registrarEncaminhamentoProntia(input: {
  patient_name: string;
  patient_email: string;
  patient_phone?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: cfg } = await supabase
    .from("integration_configs")
    .select("config")
    .eq("id", "prontia_redirect")
    .maybeSingle();
  const c = (cfg?.config ?? {}) as {
    destino_url?: string;
    valor_cobrado_cents?: number;
    valor_pago_prontia_cents?: number;
  };

  const { data, error } = await supabase
    .from("prontia_encaminhamentos")
    .insert({
      patient_name: input.patient_name.trim(),
      patient_email: input.patient_email.trim().toLowerCase(),
      patient_phone: input.patient_phone?.replace(/\D/g, "") || null,
      destino_url: c.destino_url ?? null,
      valor_cobrado_cents: c.valor_cobrado_cents ?? 0,
      valor_pago_prontia_cents: c.valor_pago_prontia_cents ?? 0,
      status: "sent",
      metadata: { via: "admin_manual" },
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "erro desconhecido" };
  }

  await logAdminAction({
    action: "create",
    entity_type: "integration_config",
    entity_id: "prontia_encaminhamento",
    metadata: { id: data.id, manual: true },
  });

  revalidatePath("/admin/integracoes");
  return { ok: true, id: data.id };
}

// ─── Check de CPF duplicado (validação de UI em tempo real) ──────
// Usa service-role pra ler ambas as tabelas (RLS não bloqueia admin),
// mas o handler também faz double-check via has_role no `audit` do
// AdminShell. Não vaza dados — só retorna { exists, kind }.
export type CpfCheckResult = {
  exists: boolean;
  kind?: "patient" | "doctor";
  full_name?: string | null;
};

export async function checkCpfExists(cpfRaw: string): Promise<CpfCheckResult> {
  const cpf = (cpfRaw ?? "").replace(/\D/g, "");
  if (cpf.length !== 11) return { exists: false };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { exists: false };
  }

  // patients.cpf é gravado só dígitos pelo wizard, mas pode estar mascarado
  // se vier de outro lugar. Usa regex no banco pra normalizar.
  const { data: p } = await admin
    .from("patients")
    .select("id, full_name, cpf")
    .or(`cpf.eq.${cpf},cpf.eq.${formatCpf(cpf)}`)
    .limit(1)
    .maybeSingle();
  if (p) return { exists: true, kind: "patient", full_name: p.full_name };

  const { data: d } = await admin
    .from("doctors")
    .select("id, full_name, cpf")
    .or(`cpf.eq.${cpf},cpf.eq.${formatCpf(cpf)}`)
    .limit(1)
    .maybeSingle();
  if (d) return { exists: true, kind: "doctor", full_name: d.full_name };

  return { exists: false };
}

function formatCpf(d: string): string {
  if (d.length !== 11) return d;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ─── Quick action: criar paciente (sem signup completo) ──────────
// Use service-role pra criar auth.users já confirmado com senha temporária,
// e o trigger handle_new_user materializa a row em public.patients.
type QuickPatientInput = {
  full_name: string;
  email: string;
  cpf: string;          // só dígitos
  celular: string;      // só dígitos (10-11)
  birth_date?: string;  // YYYY-MM-DD
  gender?: string;      // F | M | O | N
};

export type QuickPatientResult =
  | { ok: true; patientId: string; tempPassword: string }
  | { ok: false; error: string };

export async function quickCreatePatient(
  input: QuickPatientInput,
): Promise<QuickPatientResult> {
  if (!input.full_name?.trim()) return { ok: false, error: "Nome obrigatório." };
  if (!input.email?.trim()) return { ok: false, error: "Email obrigatório." };
  if (input.cpf.replace(/\D/g, "").length !== 11)
    return { ok: false, error: "CPF deve ter 11 dígitos." };
  if (input.celular.replace(/\D/g, "").length < 10)
    return { ok: false, error: "Celular inválido." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY ausente no server: " +
        (err instanceof Error ? err.message : String(err)),
    };
  }

  const tempPassword = generateStrongPassword(12);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      role: "patient",
      full_name: input.full_name.trim(),
      cpf: input.cpf.replace(/\D/g, ""),
      celular: input.celular.replace(/\D/g, ""),
      birth_date: input.birth_date || null,
      gender: input.gender || null,
      accepts_communications: false,
      terms_accepted_at: new Date().toISOString(),
    },
  });

  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? "Falha ao criar usuário." };
  }

  // O trigger handle_new_user materializa public.patients. Buscar o id.
  const { data: patientRow } = await admin
    .from("patients")
    .select("id")
    .eq("user_id", created.user.id)
    .maybeSingle();

  if (!patientRow) {
    return {
      ok: false,
      error: "Trigger handle_new_user não materializou public.patients.",
    };
  }

  await logAdminAction({
    action: "create",
    entity_type: "patient",
    entity_id: patientRow.id,
    metadata: { email: input.email, via: "quick" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pacientes");

  return { ok: true, patientId: patientRow.id, tempPassword };
}

// ─── Quick action: criar consulta imediata pra paciente ──────────
// Insere consulta em status='in_queue' com paid_at=now() e payment_id='ADMIN-MANUAL-…'.
// Aparece automaticamente na fila do cockpit (via realtime).
export type QuickConsultaResult =
  | { ok: true; consultationId: string }
  | { ok: false; error: string };

export async function quickCreateConsultation(
  patientId: string,
  chiefComplaint?: string,
): Promise<QuickConsultaResult> {
  if (!patientId) return { ok: false, error: "patient_id ausente" };

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY ausente: " +
        (err instanceof Error ? err.message : String(err)),
    };
  }

  const nowIso = new Date().toISOString();
  const paymentId = `ADMIN-MANUAL-${crypto.randomUUID()}`;
  const { data, error } = await admin
    .from("consultations")
    .insert({
      patient_id: patientId,
      service_code: "AVULSA",
      service_name: "Consulta avulsa",
      amount_cents: VALOR_CENTAVOS_AVULSA,
      status: "in_queue",
      paid_at: nowIso,
      queued_at: nowIso,
      payment_id: paymentId,
      chief_complaint: chiefComplaint?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Falha ao criar consulta." };
  }

  await logAdminAction({
    action: "create",
    entity_type: "consultation",
    entity_id: data.id,
    metadata: { via: "admin_manual", patient_id: patientId, payment_id: paymentId },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pacientes");
  return { ok: true, consultationId: data.id };
}

// ─── Update paciente (admin sobrescreve dados básicos) ──────────
type UpdatePatientInput = {
  full_name?: string;
  email?: string;
  celular?: string;
  phone?: string;
  birth_date?: string | null;
  gender?: string | null;
  endereco_completo?: string;
};

export async function adminUpdatePatient(
  patientId: string,
  input: UpdatePatientInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!patientId) return { ok: false, error: "patient_id ausente" };
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY ausente: " +
        (err instanceof Error ? err.message : String(err)),
    };
  }
  const update: Record<string, unknown> = {};
  if (input.full_name !== undefined) update.full_name = input.full_name.trim();
  if (input.email !== undefined) update.email = input.email.trim().toLowerCase();
  if (input.celular !== undefined) update.celular = input.celular.replace(/\D/g, "");
  if (input.phone !== undefined) update.phone = input.phone.replace(/\D/g, "");
  if (input.birth_date !== undefined) update.birth_date = input.birth_date || null;
  if (input.gender !== undefined) update.gender = input.gender || null;
  if (input.endereco_completo !== undefined)
    update.endereco_completo = input.endereco_completo;

  const { error } = await admin
    .from("patients")
    .update(update)
    .eq("id", patientId);
  if (error) return { ok: false, error: error.message };

  await logAdminAction({
    action: "update",
    entity_type: "patient",
    entity_id: patientId,
    metadata: { fields: Object.keys(update) },
  });
  revalidatePath("/admin/pacientes");
  return { ok: true };
}

// ─── Helper: senha forte ────────────────────────────────────
function generateStrongPassword(len = 12): string {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = upper + lower + digits + symbols;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  // garante 1 de cada categoria + resto aleatório
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: Math.max(0, len - required.length) }, () =>
    pick(all),
  );
  const arr = [...required, ...rest];
  // shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}
