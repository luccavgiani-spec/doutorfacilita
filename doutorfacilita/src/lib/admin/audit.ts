import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Auditoria do /admin. Toda Server Action de admin DEVE chamar isso antes
 * de retornar — `audit_log` é imutável (trigger prevent_audit_modification).
 *
 * Usa o client server-side com o cookie do admin (RLS aplicada). Nunca
 * service_role. Padrão de `action` é lowercase (o enum audit_action tem
 * duplicatas UPPER/lower legadas — usamos só lowercase nas ações novas).
 */

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "view"
  | "export"
  | "grant_role"
  | "revoke_role";

export type EntityType =
  | "integration_config"
  | "feature_flag"
  | "user_role"
  | "patient"
  | "doctor"
  | "template"
  | "consultation"
  | "consent";

export async function logAdminAction(params: {
  action: AuditAction;
  entity_type: EntityType;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const h = await headers();

  const { error } = await supabase.from("audit_log").insert({
    user_id: user?.id,
    user_email: user?.email,
    user_role: "admin",
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id ?? null,
    metadata: params.metadata ?? {},
    ip_address: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });

  // Auditoria não pode derrubar a operação principal silenciosamente, mas
  // tem que ser visível: logar no server. Se virar requisito de compliance
  // "sem audit não commita", transformar em throw aqui.
  if (error) {
    console.error("[admin/audit] falha ao gravar audit_log:", error.message);
  }
}
