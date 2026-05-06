import { createClient } from "@/lib/supabase/server";

// TODO(fase-1): substituir por auth completa com claims/JWT customizados.
// Hoje a detecção de role é feita por lookup nas tabelas doctors/patients.

export type UserRole = "doctor" | "patient" | null;

export async function getUserRole(): Promise<{
  role: UserRole;
  consultationId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { role: null, consultationId: null };

  // Tenta médico primeiro
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (doctor) {
    const { data: consultation } = await supabase
      .from("consultations")
      .select("id")
      .or(`doctor_id.eq.${doctor.id},doctor_id.is.null`)
      .in("status", ["in_queue", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { role: "doctor", consultationId: consultation?.id ?? null };
  }

  // Tenta paciente
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (patient) {
    const { data: consultation } = await supabase
      .from("consultations")
      .select("id")
      .eq("patient_id", patient.id)
      .in("status", ["in_queue", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { role: "patient", consultationId: consultation?.id ?? null };
  }

  return { role: null, consultationId: null };
}
