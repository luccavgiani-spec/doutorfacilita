"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";

const VALOR_CENTAVOS = 3990;
const SERVICE_CODE = "AVULSA";
const SERVICE_NAME = "Consulta avulsa";

async function getPatient(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

// Cria (ou recupera) a linha de consulta em status='created' — ainda NÃO paga.
// O valor gravado aqui (amount_cents) é a fonte de verdade que a Edge Function
// mp-process-payment relê server-side (anti-tamper). O front nunca dita valor.
async function getOrCreatePendingConsulta(
  patientId: string,
): Promise<{ id: string; amountCents: number } | { error: string }> {
  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("consultations")
    .select("id, amount_cents")
    .eq("patient_id", patientId)
    .eq("status", "created")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existente) {
    return { id: existente.id, amountCents: existente.amount_cents ?? VALOR_CENTAVOS };
  }

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      patient_id: patientId,
      service_code: SERVICE_CODE,
      service_name: SERVICE_NAME,
      amount_cents: VALOR_CENTAVOS,
      status: "created",
    })
    .select("id, amount_cents")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar a consulta." };
  }
  return { id: data.id, amountCents: data.amount_cents ?? VALOR_CENTAVOS };
}

/**
 * Prepara o checkout: garante a consulta pendente e devolve seu id + valor.
 * A partir daqui o pagamento é conduzido no cliente (mp.cardForm / PIX) contra
 * as Edge Functions do Mercado Pago — que reconfirmam o valor pelo banco.
 * hasConsultaPaga() continua sendo a ÚNICA definição de "pago".
 */
export async function prepararConsulta(): Promise<
  { consultationId: string; amountCents: number } | { error: string }
> {
  const user = await getAuthUser();
  if (!user) return { error: "Sessão expirada." };

  const patient = await getPatient(user.id);
  if (!patient) return { error: "Perfil de paciente não encontrado." };

  const consulta = await getOrCreatePendingConsulta(patient.id);
  if ("error" in consulta) return { error: consulta.error };

  return { consultationId: consulta.id, amountCents: consulta.amountCents };
}
