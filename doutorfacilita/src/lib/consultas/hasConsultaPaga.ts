// ÚNICO ponto que define "consulta paga". Quando o modelo (avulsa vs
// assinatura vs flag) for cravado pelos mantenedores, mudar SÓ aqui.
//
// Hoje: existe consulta com paid_at NOT NULL e status em ('paid','in_queue','in_progress').
import { createClient } from "@/lib/supabase/server";

export type ConsultaAtiva = { id: string; status: string };

const ATIVOS = ["paid", "in_queue", "in_progress"] as const;

export async function hasConsultaPaga(userId: string): Promise<ConsultaAtiva | null> {
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!patient) return null;

  const { data: consulta } = await supabase
    .from("consultations")
    .select("id, status")
    .eq("patient_id", patient.id)
    .not("paid_at", "is", null)
    .in("status", ATIVOS as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!consulta) return null;
  return { id: consulta.id, status: consulta.status };
}
