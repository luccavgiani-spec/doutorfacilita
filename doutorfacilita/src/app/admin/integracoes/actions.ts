"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin/audit";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Toggle do enabled de uma integração em integration_configs.
 * Use pra Mevo/Prontia/etc. — IDs canônicos da tabela: 'mevo', 'prontia_redirect', 'livekit'.
 */
export async function toggleIntegrationEnabled(
  id: string,
  enabled: boolean,
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sem_sessao" };

  const { error } = await supabase
    .from("integration_configs")
    .update({ enabled, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await logAdminAction({
    action: "update",
    entity_type: "integration_config",
    entity_id: id,
    metadata: { enabled },
  });

  revalidatePath("/admin/integracoes");
  return { ok: true };
}
