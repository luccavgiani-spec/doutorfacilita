import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin/audit";
import { DataTable } from "@/components/ui/data-table";
import PatientEditForm from "@/components/admin/PatientEditForm";

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR") : "—";

export default async function PacienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("patients")
    .select(
      "id, full_name, cpf, birth_date, gender, phone, celular, email, endereco_completo, alergias",
    )
    .eq("id", id)
    .maybeSingle();

  if (!p) notFound();

  // Compliance: registra acesso ao dado do paciente.
  await logAdminAction({
    action: "view",
    entity_type: "patient",
    entity_id: id,
  });

  const [{ data: historico }, { data: consents }] = await Promise.all([
    supabase
      .from("v_patient_history")
      .select("*")
      .eq("patient_id", id)
      .limit(100),
    supabase
      .from("consents")
      .select("*")
      .eq("patient_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const histRows = (historico ?? []) as Record<string, unknown>[];
  const consentRows = (consents ?? []) as Record<string, unknown>[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/pacientes"
          className="text-xs font-semibold text-txt-2 hover:underline"
        >
          ← Pacientes
        </Link>
        <h1 className="mt-2 text-lg font-bold">{p.full_name ?? "—"}</h1>
        <p className="text-xs text-txt-2">
          CPF {p.cpf ?? "—"} ·{" "}
          {p.birth_date
            ? new Date(p.birth_date).toLocaleDateString("pt-BR")
            : "sem data de nascimento"}
        </p>
      </div>

      <PatientEditForm
        id={id}
        inicial={{
          full_name: p.full_name ?? "",
          email: p.email ?? "",
          phone: p.phone ?? "",
          celular: p.celular ?? "",
          endereco_completo: p.endereco_completo ?? "",
          alergias: (p.alergias as string[]) ?? [],
        }}
        cpf={p.cpf ?? "—"}
      />

      <section>
        <h2 className="mb-3 text-sm font-bold">
          Histórico (v_patient_history)
        </h2>
        <DataTable
          rows={histRows}
          rowKey={(r, i) => String((r.id as string) ?? i)}
          empty="Sem histórico."
          columns={Object.keys(histRows[0] ?? { info: 0 }).map((k) => ({
            key: k,
            header: k,
            render: (r: Record<string, unknown>) => {
              const v = r[k];
              if (v == null) return "—";
              const s = String(v);
              return /\d{4}-\d\d-\d\dT/.test(s) ? fmt(s) : s;
            },
          }))}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold">Consentimentos (LGPD/termos)</h2>
        <DataTable
          rows={consentRows}
          rowKey={(r, i) => String((r.id as string) ?? i)}
          empty="Nenhum consentimento registrado."
          columns={Object.keys(consentRows[0] ?? { info: 0 }).map((k) => ({
            key: k,
            header: k,
            render: (r: Record<string, unknown>) => {
              const v = r[k];
              if (v == null) return "—";
              const s = String(v);
              return /\d{4}-\d\d-\d\dT/.test(s) ? fmt(s) : s;
            },
          }))}
        />
      </section>
    </div>
  );
}
