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
