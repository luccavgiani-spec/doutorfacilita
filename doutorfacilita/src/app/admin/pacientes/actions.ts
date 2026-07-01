"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin/audit";

export type PatientEdit = {
  full_name: string;
  email: string;
  phone: string;
  celular: string;
  endereco_completo: string;
  // Endereço estruturado (fonte do payer.address do Mercado Pago).
  address_line: string;
  address_number: string;
  address_complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  alergias: string[];
  // CPF e birth_date NÃO editáveis aqui (regra do plano: CPF travado).
};

export async function updatePatient(
  id: string,
  p: PatientEdit,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({
      full_name: p.full_name,
      email: p.email || null,
      phone: p.phone || null,
      celular: p.celular || null,
      endereco_completo: p.endereco_completo || null,
      address_line: p.address_line || null,
      address_number: p.address_number || null,
      address_complement: p.address_complement || null,
      neighborhood: p.neighborhood || null,
      city: p.city || null,
      state: p.state || null,
      postal_code: p.postal_code || null,
      alergias: p.alergias,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await logAdminAction({
    action: "update",
    entity_type: "patient",
    entity_id: id,
  });
  revalidatePath(`/admin/pacientes/${id}`);
  revalidatePath("/admin/pacientes");
  return { ok: true };
}

/** Loga abertura do detalhe (compliance: acesso a dado de paciente). */
export async function logPatientView(id: string): Promise<void> {
  await logAdminAction({
    action: "view",
    entity_type: "patient",
    entity_id: id,
  });
}
