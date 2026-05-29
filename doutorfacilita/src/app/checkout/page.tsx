import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { createClient } from "@/lib/supabase/server";
import { hasConsultaPaga } from "@/lib/consultas/hasConsultaPaga";
import CheckoutForm from "@/components/checkout/CheckoutForm";

function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const d = cpf.replace(/\D/g, "").slice(0, 11);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default async function CheckoutPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (doctor) redirect("/cockpit");

  const consulta = await hasConsultaPaga(user.id);
  if (consulta) redirect(`/fila?consultation=${consulta.id}`);

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name, email, cpf")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: flag } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", "checkout_stub_payment")
    .maybeSingle();

  return (
    <CheckoutForm
      stubEnabled={Boolean(flag?.enabled)}
      patientName={patient?.full_name ?? user.email ?? ""}
      patientEmail={patient?.email ?? user.email ?? ""}
      patientCpf={maskCpf(patient?.cpf)}
    />
  );
}
