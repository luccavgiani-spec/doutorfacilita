import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { createClient } from "@/lib/supabase/server";
import ConsultaLive from "@/components/consulta/ConsultaLive";

interface SearchParams {
  consultation?: string;
}

export default async function ConsultaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const { consultation } = await searchParams;
  if (!consultation) redirect("/login/redirect");

  const supabase = await createClient();

  // Detecta role pelo perfil
  const [{ data: doctor }, { data: patient }] = await Promise.all([
    supabase.from("doctors").select("id, full_name").eq("user_id", user.id).maybeSingle(),
    supabase.from("patients").select("id, full_name").eq("user_id", user.id).maybeSingle(),
  ]);

  const role: "doctor" | "patient" | null = doctor ? "doctor" : patient ? "patient" : null;
  if (!role) redirect("/login/redirect");

  const displayName = doctor?.full_name ?? patient?.full_name ?? (user.email ?? "");

  return (
    <ConsultaLive
      consultationId={consultation}
      role={role}
      displayName={displayName}
    />
  );
}
