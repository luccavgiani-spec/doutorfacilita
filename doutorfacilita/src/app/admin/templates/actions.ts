"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin/audit";

export type StructuredField = {
  key: string;
  label: string;
  type: "texto" | "numero" | "select" | "textarea" | "checkbox";
  options?: string[];
  required?: boolean;
};

export type TemplatePayload = {
  nome: string;
  especialidade: string;
  descricao: string;
  chief_complaint_template: string;
  history_present_illness_template: string;
  physical_exam_template: string;
  diagnostic_hypothesis_template: string;
  conduct_template: string;
  cid10_suggested: string[];
  structured_fields: StructuredField[];
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
};

function row(t: TemplatePayload) {
  return {
    nome: t.nome,
    especialidade: t.especialidade || null,
    descricao: t.descricao || null,
    chief_complaint_template: t.chief_complaint_template || null,
    history_present_illness_template: t.history_present_illness_template || null,
    physical_exam_template: t.physical_exam_template || null,
    diagnostic_hypothesis_template: t.diagnostic_hypothesis_template || null,
    conduct_template: t.conduct_template || null,
    cid10_suggested: t.cid10_suggested,
    structured_fields: t.structured_fields,
    attachment_path: t.attachment_path ?? null,
    attachment_name: t.attachment_name ?? null,
    attachment_mime: t.attachment_mime ?? null,
  };
}

export async function createTemplate(t: TemplatePayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("prontuario_templates")
    .insert({ ...row(t), created_by: user?.id })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    action: "create",
    entity_type: "template",
    entity_id: data.id,
    metadata: { nome: t.nome },
  });
  revalidatePath("/admin/templates");
  redirect(`/admin/templates/${data.id}`);
}

export async function updateTemplate(id: string, t: TemplatePayload) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prontuario_templates")
    .update(row(t))
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    action: "update",
    entity_type: "template",
    entity_id: id,
    metadata: { nome: t.nome },
  });
  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${id}`);
  return { ok: true as const };
}

export async function toggleTemplateAtivo(id: string, ativo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prontuario_templates")
    .update({ ativo })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    action: "update",
    entity_type: "template",
    entity_id: id,
    metadata: { ativo },
  });
  revalidatePath("/admin/templates");
  return { ok: true as const };
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prontuario_templates")
    .delete()
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    action: "delete",
    entity_type: "template",
    entity_id: id,
  });
  revalidatePath("/admin/templates");
  redirect("/admin/templates");
}
