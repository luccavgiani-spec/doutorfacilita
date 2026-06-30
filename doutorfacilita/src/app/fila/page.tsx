import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConsultaAtiva } from "@/lib/consultas/hasConsultaPaga";
import FilaShell from "@/components/fila/FilaShell";

// Guard do funil:
//   anônimo              → /login
//   doctor               → /cockpit
//   paciente SEM ativa   → /checkout (consulta 'completed' NÃO autoriza a fila)
//   paciente COM ativa   → renderiza FilaShell (que troca pra LiveKit quando
//                          o paciente clicar "Entrar na Consulta")
//
// Exige consulta ATIVA (in_queue|in_progress). O ?consultation= da URL é só
// dica: a fonte de verdade é a consulta ativa do paciente autenticado — assim
// um link/refresh apontando para uma consulta já concluída cai no /checkout.
export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (doctor) redirect("/cockpit");

  const consulta = await getConsultaAtiva(user.id);
  if (!consulta) redirect("/checkout");

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <FilaShell
      consultationId={consulta.id}
      displayName={patient?.full_name ?? user.email ?? ""}
    />
  );
}
