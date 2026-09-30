"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin/audit";

/**
 * Salva config NÃO-secreta da Mevo em integration_configs (id='mevo').
 * Secrets (MEVO_AUTH_B64) NUNCA passam por aqui — ficam em supabase secrets.
 *
 * Decisão do plano (item 1, opção A): as Edge Functions Mevo passam a ler
 * esta linha DB-first com fallback pro Deno.env. Esta action só persiste +
 * audita; a alteração das Edge Functions é item separado da task 6.
 */

export type MevoConfig = {
  enabled: boolean;
  ambiente: "homologacao" | "producao";
  subparceiro: string;
  logo_url: string;
  cor_primaria: string;
  cor_secundaria: string;
  certificado_obrigatorio: boolean;
  permitir_impressao: boolean;
  exibir_email: boolean;
  establishment_name: string;
  establishment_cnpj: string;
  establishment_cnes: string;
  establishment_logo: string;
  establishment_phone: string;
  establishment_address_line: string;
  establishment_address_complement: string;
  establishment_neighborhood: string;
  establishment_city: string;
  establishment_state: string;
  establishment_postal_code: string;

};

export async function saveMevoConfig(
  cfg: MevoConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sem_sessao" };

  const { error } = await supabase
    .from("integration_configs")
    .update({
      enabled: cfg.enabled,
      ambiente: cfg.ambiente,
      config: {
        subparceiro: cfg.subparceiro,
        logo_url: cfg.logo_url,
        cor_primaria: cfg.cor_primaria,
        cor_secundaria: cfg.cor_secundaria,
        certificado_obrigatorio: cfg.certificado_obrigatorio,
        permitir_impressao: cfg.permitir_impressao,
        exibir_email: cfg.exibir_email,
        establishment_name: cfg.establishment_name.trim(),
        establishment_cnpj: cfg.establishment_cnpj.trim(),
        establishment_cnes: cfg.establishment_cnes.trim(),
        establishment_logo: cfg.establishment_logo.trim(),
        establishment_phone: cfg.establishment_phone.trim(),
        establishment_address_line: cfg.establishment_address_line.trim(),
        establishment_address_complement: cfg.establishment_address_complement.trim(),
        establishment_neighborhood: cfg.establishment_neighborhood.trim(),
        establishment_city: cfg.establishment_city.trim(),
        establishment_state: cfg.establishment_state.trim(),
        establishment_postal_code: cfg.establishment_postal_code.trim(),

      },
      updated_by: user.id,
    })
    .eq("id", "mevo");

  if (error) return { ok: false, error: error.message };

  await logAdminAction({
    action: "update",
    entity_type: "integration_config",
    entity_id: "mevo",
    metadata: { enabled: cfg.enabled, ambiente: cfg.ambiente },
  });

  revalidatePath("/admin/mevo");
  return { ok: true };
}
