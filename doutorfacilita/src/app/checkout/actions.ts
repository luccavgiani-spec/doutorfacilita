"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { checkoutSchema, type CheckoutInput } from "@/lib/forms/checkoutSchema";
import { createPayment } from "@/lib/payments/mercadopago";

const VALOR_CENTAVOS = 5900;
const SERVICE_CODE = "AVULSA";
const SERVICE_NAME = "Consulta avulsa";

async function getPatient(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select("id, full_name, email, cpf")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

async function getStubEnabled(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", "checkout_stub_payment")
    .maybeSingle();
  return Boolean(data?.enabled);
}

// Cria a linha de consulta em status='created' (ainda não paga).
async function getOrCreatePendingConsulta(patientId: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("consultations")
    .select("id")
    .eq("patient_id", patientId)
    .eq("status", "created")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existente) return { id: existente.id };

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      patient_id: patientId,
      service_code: SERVICE_CODE,
      service_name: SERVICE_NAME,
      amount_cents: VALOR_CENTAVOS,
      status: "created",
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Não foi possível criar a consulta." };
  return { id: data.id };
}

/**
 * Finaliza a compra. ÚNICO ponto que vira gateway real depois.
 * - Valida payload (PIX ou cartão) com zod.
 * - Cria/recupera a consulta pendente.
 * - Chama o wrapper de pagamento (hoje stub; futuro: MP Payments API/Orders API).
 * - Em sucesso, marca status='in_queue' + paid_at + payment_id e redireciona /fila.
 */
export async function finalizarCompra(
  rawInput: CheckoutInput,
): Promise<{ error: string } | void> {
  const stubEnabled = await getStubEnabled();
  if (!stubEnabled) {
    return { error: "Pagamento em breve (stub desabilitado)." };
  }

  const parsed = checkoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: "Dados de pagamento inválidos." };
  }
  const payload = parsed.data;

  const user = await getAuthUser();
  if (!user) return { error: "Sessão expirada." };

  const patient = await getPatient(user.id);
  if (!patient) return { error: "Perfil de paciente não encontrado." };

  const consulta = await getOrCreatePendingConsulta(patient.id);
  if ("error" in consulta) return { error: consulta.error };

  const pay = await createPayment(
    {
      consultationId: consulta.id,
      amount_cents: VALOR_CENTAVOS,
      description: SERVICE_NAME,
      payer: {
        email: patient.email ?? user.email ?? "",
        name: patient.full_name ?? "",
        cpf: (patient.cpf ?? "").replace(/\D/g, ""),
      },
    },
    payload,
  );

  if (!pay.success) {
    return { error: "Pagamento recusado. Tente outro cartão." };
  }

  const supabase = await createClient();
  const { error: updErr } = await supabase
    .from("consultations")
    .update({
      status: "in_queue",
      paid_at: new Date().toISOString(),
      queued_at: new Date().toISOString(),
      payment_id: pay.payment_id,
    })
    .eq("id", consulta.id);

  if (updErr) return { error: updErr.message };

  redirect(`/fila?consultation=${consulta.id}`);
}

export async function isStubEnabled(): Promise<boolean> {
  return getStubEnabled();
}
