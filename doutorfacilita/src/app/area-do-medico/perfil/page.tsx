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
      "full_name, council_number, council_state, primary_specialty, cpf, phone, endereco, bio, address_line, address_complement, neighborhood, city, state, postal_code"
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
        address_line: data.address_line ?? "",
        address_complement: data.address_complement ?? "",
        neighborhood: data.neighborhood ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        postal_code: data.postal_code ?? "",

      }
    : PERFIL_VAZIO;

  const avatarInicial =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  return (
    <PerfilForm
      userId={user.id}
      email={user.email ?? ""}
      inicial={inicial}
      avatarInicial={avatarInicial}
    />
  );
}
