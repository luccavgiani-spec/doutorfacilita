"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth/getAuthUser";

export type FinalizadoItem = {
  id: string;
  patient_name: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
};

// Início do dia de HOJE no fuso America/Sao_Paulo, em ISO. O Brasil não tem
// mais horário de verão desde 2019, então o offset -03:00 é estável.
function brtDayBounds(): { start: string; end: string } {
  const now = new Date();
  // "YYYY-MM-DD" do dia corrente em BRT (en-CA dá o formato ISO de data).
  const dateBRT = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const start = new Date(`${dateBRT}T00:00:00-03:00`).toISOString();
  const end = new Date(`${dateBRT}T00:00:00-03:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end: end.toISOString() };
}

/**
 * Consultas CONCLUÍDAS HOJE (BRT) do médico logado, para a aba "Finalizados"
 * do cockpit.
 *
 * Lê com SERVICE ROLE (mesmo padrão das demais server actions do projeto) e
 * escopa server-side em doctor_id = médico autenticado — sem furar RLS na
 * camada de banco e sem novas policies. A RLS de `patients` não libera o nome
 * para consultas já concluídas; por isso o join roda aqui, server-side e
 * restrito ao próprio médico.
 */
export async function getFinalizadosHoje(): Promise<FinalizadoItem[]> {
  const user = await getAuthUser();
  if (!user) return [];

  // Resolve o médico pela sessão (RLS-safe: o doctor lê a própria linha).
  const supabase = await createClient();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!doctor) return [];

  const { start, end } = brtDayBounds();

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return [];
  }

  const { data, error } = await admin
    .from("consultations")
    .select("id, ended_at, duration_seconds, patients(full_name)")
    .eq("status", "completed")
    .eq("doctor_id", doctor.id)
    .gte("ended_at", start)
    .lt("ended_at", end)
    .order("ended_at", { ascending: false });

  if (error || !data) return [];

  return data.map((c) => {
    const p = c.patients as { full_name: string | null } | { full_name: string | null }[] | null;
    const full_name = Array.isArray(p) ? p[0]?.full_name ?? null : p?.full_name ?? null;
    return {
      id: c.id as string,
      patient_name: full_name,
      ended_at: (c.ended_at as string | null) ?? null,
      duration_seconds: (c.duration_seconds as number | null) ?? null,
    };
  });
}
