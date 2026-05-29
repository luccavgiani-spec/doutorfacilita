import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplateEditor from "@/components/admin/TemplateEditor";
import DeleteTemplateButton from "@/components/admin/DeleteTemplateButton";
import type {
  StructuredField,
  TemplatePayload,
} from "@/app/admin/templates/actions";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("prontuario_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!t) notFound();

  const inicial: TemplatePayload = {
    nome: t.nome ?? "",
    especialidade: t.especialidade ?? "",
    descricao: t.descricao ?? "",
    chief_complaint_template: t.chief_complaint_template ?? "",
    history_present_illness_template: t.history_present_illness_template ?? "",
    physical_exam_template: t.physical_exam_template ?? "",
    diagnostic_hypothesis_template: t.diagnostic_hypothesis_template ?? "",
    conduct_template: t.conduct_template ?? "",
    cid10_suggested: (t.cid10_suggested as string[]) ?? [],
    structured_fields: (t.structured_fields as StructuredField[]) ?? [],
    attachment_path: (t.attachment_path as string) ?? null,
    attachment_name: (t.attachment_name as string) ?? null,
    attachment_mime: (t.attachment_mime as string) ?? null,
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link
            href="/admin/templates"
            className="text-xs font-semibold text-txt-2 hover:underline"
          >
            ← Templates
          </Link>
          <h1 className="mt-2 text-lg font-bold">{inicial.nome}</h1>
        </div>
        <DeleteTemplateButton id={id} />
      </div>
      <TemplateEditor id={id} inicial={inicial} />
    </div>
  );
}
