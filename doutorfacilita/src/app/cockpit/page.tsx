import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import CockpitScreen from "@/components/CockpitScreen";

// TODO(fase-1): substituir guard por middleware unificado.

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ consultation?: string }>;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  // Perfil resolvido no server → DoctorMenu não precisa refazer getUser/query.
  // Fonte única: public.doctors (medico_profiles foi mergeada na migration 017).
  const supabase = await createClient();
  const { data: perfil } = await supabase
    .from("doctors")
    .select("id, full_name, council, council_number, council_state")
    .eq("user_id", user.id)
    .maybeSingle();

  // Guard: só doctor entra no cockpit. Paciente vai pro /login/redirect
  // (que manda pra /fila ou /checkout). Sem isso o paciente conseguia clicar
  // "Chamar próximo" e a edge function devolvia 403 not_a_doctor.
  if (!perfil) redirect("/login/redirect");

  const nome = perfil.full_name ?? (user.email ?? "");
  const sub = perfil.council_number
    ? `${perfil.council ?? "CRM"}-${perfil.council_state ?? ""} ${perfil.council_number}`
        .trim()
    : (user.email ?? "");

  const { consultation } = await searchParams;

  // Fallback: sem ?consultation= na URL, resolve a consulta ativa
  // (in_progress) do médico — é a que o card Mevo usa para emitir.
  let consultationId = consultation;
  if (!consultationId && perfil?.id) {
    const { data: ativa } = await supabase
      .from("consultations")
      .select("id")
      .eq("doctor_id", perfil.id)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    consultationId = ativa?.id ?? undefined;
  }

  return (
    <CockpitScreen
      consultationId={consultationId}
      doctorNome={nome}
      doctorSub={sub}
    />
  );
}
