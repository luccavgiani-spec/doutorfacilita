import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com SERVICE ROLE — bypassa RLS.
 *
 * ⚠️ NUNCA importar em Client Component. Só pode ser usado em:
 *   - Server Components / Server Actions
 *   - Route Handlers
 *   - Scripts/migrations server-side
 *
 * Lê SUPABASE_SERVICE_ROLE_KEY do env. Em ambiente sem essa env (ex.: build
 * de preview sem secrets), o factory ainda funciona mas a chave fica vazia
 * e qualquer query falha — chamadores devem validar antes de invocar.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL ausentes",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
