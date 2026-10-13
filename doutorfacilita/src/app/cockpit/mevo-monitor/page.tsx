import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import MevoMonitor from "@/components/cockpit/MevoMonitor";

export const metadata: Metadata = { title: "Monitor Mevo · Plantão Digital" };

/**
 * Monitor ao vivo da integração Mevo — feito para ficar ao lado do Cockpit
 * (tela dividida) durante a validação. Admin vê todos os eventos; médico vê
 * os das próprias prescrições (RLS de mevo_eventos).
 */
export default async function Page() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: isAdmin }, { data: doctor }] = await Promise.all([
    supabase.rpc("has_role", { check_role: "admin" }),
    supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!isAdmin && !doctor) redirect("/login/redirect");

  return <MevoMonitor escopo={isAdmin ? "todos" : "meus"} />;
}
