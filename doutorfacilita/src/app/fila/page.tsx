import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasConsultaPaga } from "@/lib/consultas/hasConsultaPaga";
import FilaShell from "@/components/fila/FilaShell";

// Guard do funil:
//   anônimo            → /login
//   doctor             → /cockpit
//   paciente sem paga  → /checkout
//   paciente com paga  → renderiza FilaShell (que troca pra LiveKit quando
//                        o paciente clicar "Entrar na Consulta")
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ consultation?: string }>;
}) {
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

  const consulta = await hasConsultaPaga(user.id);
  if (!consulta) redirect("/checkout");

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const { consultation } = await searchParams;
  const id = consultation ?? consulta.id;

  return (
    <FilaShell
      consultationId={id}
      displayName={patient?.full_name ?? user.email ?? ""}
    />
  );
}
