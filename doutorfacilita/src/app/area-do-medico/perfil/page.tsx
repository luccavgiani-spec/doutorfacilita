import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import PerfilForm, {
  type PerfilData,
  PERFIL_VAZIO,
} from "@/components/area-do-medico/PerfilForm";

// TODO(fase-1): substituir guard por middleware unificado.

export default async function Page() {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  // Fonte única: public.doctors (medico_profiles foi mergeada na migration 017).
  const supabase = await createClient();
  const { data } = await supabase
    .from("doctors")
    .select(
      "full_name, council_number, council_state, primary_specialty, cpf, phone, endereco, bio"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const inicial: PerfilData = data
    ? {
        nome_completo: data.full_name ?? "",
        crm: data.council_number ?? "",
        crm_estado: data.council_state ?? "SP",
        especialidade: data.primary_specialty ?? "",
        cpf: data.cpf ?? "",
        telefone: data.phone ?? "",
        endereco: data.endereco ?? "",
        bio: data.bio ?? "",
      }
    : PERFIL_VAZIO;

  return (
    <PerfilForm
      userId={user.id}
      email={user.email ?? ""}
      inicial={inicial}
    />
  );
}
