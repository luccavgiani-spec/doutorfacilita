"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";

/**
 * Concede/revoga papéis em user_roles. Soft-delete: conceder = INSERT nova
 * linha; revogar = UPDATE set revoked_at=now() na linha ativa. NUNCA DELETE.
 *
 * Papéis: 'admin' (acesso /admin), 'carteira' e 'agendamento' (features
 * stub — o papel é registrado, a feature vem depois).
 */

export type AdminRole = "admin" | "carteira" | "agendamento";

type Result = { ok: true } | { ok: false; error: string };

async function getAdminId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function grantRole(
  targetUserId: string,
  role: AdminRole,
): Promise<Result> {
  const supabase = await createClient();
  const grantedBy = await getAdminId(supabase);
  if (!grantedBy) return { ok: false, error: "sem_sessao" };

  // Já ativo? não duplica.
  const { data: existing } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", targetUserId)
    .eq("role", role)
    .is("revoked_at", null)
    .maybeSingle();
  if (existing) return { ok: true };

  const { data: inserted, error } = await supabase
    .from("user_roles")
    .insert({ user_id: targetUserId, role, granted_by: grantedBy })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await logAdminAction({
    action: "grant_role",
    entity_type: "user_role",
    entity_id: inserted.id,
    metadata: { role, target_user_id: targetUserId },
  });

  revalidatePath("/admin/medicos");
  return { ok: true };
}

/**
 * Cadastra um novo médico.
 *
 * Fluxo:
 *  1. service-role: `auth.admin.createUser({email,password,email_confirm:true})`
 *     com senha forte gerada server-side. Metadata traz `role:'doctor'`
 *     (impede o trigger handle_new_user de criar linha em patients).
 *  2. INSERT public.doctors com os dados do form.
 *  3. INSERT public.user_roles role='doctor' (pra has_role('doctor') = true).
 *  4. audit_log (action='create', entity_type='doctor').
 *  5. Retorna o doctorId E a senha gerada (admin copia e envia ao médico).
 *
 * Idempotência: se o email já existir, reaproveita o user e segue.
 */
type InviteDoctorInput = {
  full_name: string;
  email: string;
  cpf: string;          // só dígitos
  council: string;       // CRM, CRO, etc.
  council_state: string; // UF
  council_number: string;
  primary_specialty: string;
  phone?: string;
};

export type InviteResult =
  | { ok: true; doctorId: string; tempPassword: string | null; alreadyExisted: boolean }
  | { ok: false; error: string };

function generateDoctorPassword(len = 14): string {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = upper + lower + digits + symbols;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: Math.max(0, len - required.length) }, () =>
    pick(all),
  );
  const arr = [...required, ...rest];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

export async function inviteDoctor(input: InviteDoctorInput): Promise<InviteResult> {
  const supabase = await createClient();
  const adminUserId = await getAdminId(supabase);
  if (!adminUserId) return { ok: false, error: "Sessão expirada." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      ok: false,
      error:
        "Service role key não configurada no servidor. " +
        (err instanceof Error ? err.message : String(err)),
    };
  }

  // 1) Cria o user com senha forte já confirmado (sem email de verificação)
  const tempPassword = generateDoctorPassword(14);
  const create = await admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      role: "doctor",
      full_name: input.full_name,
    },
  });

  let authUserId: string | null = create.data?.user?.id ?? null;
  let alreadyExisted = false;
  let passwordToReturn: string | null = tempPassword;

  if (create.error && !authUserId) {
    const msg = create.error.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      // Já existe — busca pelo email e segue. Não exponhe senha nova (porque
      // não trocamos a senha do user existente).
      alreadyExisted = true;
      passwordToReturn = null;
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find(
        (u) => u.email?.toLowerCase() === input.email.toLowerCase(),
      );
      authUserId = existing?.id ?? null;
    }
  }

  if (!authUserId) {
    return {
      ok: false,
      error: `Falha ao criar usuário: ${create.error?.message ?? "desconhecido"}`,
    };
  }

  // 2) Insert doctors (idempotente: ON CONFLICT user_id)
  const { data: doctorRow, error: docErr } = await admin
    .from("doctors")
    .upsert(
      {
        user_id: authUserId,
        full_name: input.full_name,
        cpf: input.cpf,
        email: input.email,
        phone: input.phone ?? "",
        council: input.council,
        council_state: input.council_state,
        council_number: input.council_number,
        primary_specialty: input.primary_specialty,
        specialties: input.primary_specialty ? [input.primary_specialty] : [],
        council_active: true,
        is_active: true,
        accepts_new_consultations: true,
      },
      { onConflict: "user_id" },
    )
    .select("id")
    .single();

  if (docErr || !doctorRow) {
    return {
      ok: false,
      error: `Erro ao salvar médico: ${docErr?.message ?? "sem retorno"}`,
    };
  }

  // 3) user_roles role='doctor' (idempotente)
  const { data: existingRole } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", authUserId)
    .eq("role", "doctor")
    .is("revoked_at", null)
    .maybeSingle();
  if (!existingRole) {
    await admin.from("user_roles").insert({
      user_id: authUserId,
      role: "doctor",
      granted_by: adminUserId,
    });
  }

  // 4) Audit
  await logAdminAction({
    action: "create",
    entity_type: "doctor",
    entity_id: doctorRow.id,
    metadata: { email: input.email, full_name: input.full_name },
  });

  revalidatePath("/admin/medicos");
  return {
    ok: true,
    doctorId: doctorRow.id,
    tempPassword: passwordToReturn,
    alreadyExisted,
  };
}

export async function revokeRole(
  targetUserId: string,
  role: AdminRole,
): Promise<Result> {
  const supabase = await createClient();
  const adminId = await getAdminId(supabase);
  if (!adminId) return { ok: false, error: "sem_sessao" };

  const { data: updated, error } = await supabase
    .from("user_roles")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", targetUserId)
    .eq("role", role)
    .is("revoked_at", null)
    .select("id");

  if (error) return { ok: false, error: error.message };

  await logAdminAction({
    action: "revoke_role",
    entity_type: "user_role",
    entity_id: updated?.[0]?.id,
    metadata: { role, target_user_id: targetUserId },
  });

  revalidatePath("/admin/medicos");
  return { ok: true };
}
