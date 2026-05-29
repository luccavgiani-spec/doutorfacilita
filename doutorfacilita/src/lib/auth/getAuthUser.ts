import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Retorna o usuário autenticado validado contra o Supabase.
 *
 * Envolvido em React `cache()`: dentro do MESMO request de renderização,
 * múltiplos Server Components / pages que chamarem isso compartilham uma
 * única ida à rede em vez de uma `auth.getUser()` cada.
 *
 * Continua sendo `getUser()` (valida o token no servidor) — não troque por
 * `getSession()`, que só lê o cookie sem validar.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
