import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { createClient } from "@/lib/supabase/server";
import MedicoShell from "@/components/area-do-medico/MedicoShell";

// Shell único da Área do Médico (navbar da marca + guarda de acesso).
// Envolve /area-do-medico/relatorios e /area-do-medico/perfil.

export default async function AreaMedicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("full_name, primary_specialty")
    .eq("user_id", user.id)
    .maybeSingle();

  // Não é médico → fora da área do médico.
  if (!doctor) redirect("/login/redirect");

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  return (
    <MedicoShell
      nome={doctor.full_name || "Médico"}
      sub={doctor.primary_specialty || "Área do médico"}
      avatarUrl={avatarUrl}
    >
      {children}
    </MedicoShell>
  );
}
