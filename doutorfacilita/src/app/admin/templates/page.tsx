import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import TemplateAtivoToggle from "@/components/admin/TemplateAtivoToggle";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("prontuario_templates")
    .select("id, nome, especialidade, ativo, updated_at")
    .order("updated_at", { ascending: false });
  if (q) query = query.or(`nome.ilike.%${q}%,especialidade.ilike.%${q}%`);

  const { data, error } = await query;
  const rows = (data ?? []) as Record<string, unknown>[];

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Templates de prontuário</h1>
          <p className="text-xs text-txt-2">
            Aplicáveis aos campos SOAP de medical_records no cockpit
          </p>
        </div>
        <Link
          href="/admin/templates/novo"
          className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-d"
        >
          + Novo template
        </Link>
      </header>

      <form className="mb-4" action="/admin/templates">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome ou especialidade…"
          className="w-full max-w-md rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
        />
      </form>

      {error && (
        <p className="mb-4 rounded-lg bg-red-l px-4 py-3 text-sm text-red">
          Erro: {error.message}
        </p>
      )}

      <DataTable
        rows={rows}
        rowKey={(r) => r.id as string}
        empty="Nenhum template. Crie o primeiro."
        columns={[
          {
            key: "nome",
            header: "Nome",
            render: (r) => (
              <Link
                href={`/admin/templates/${r.id}`}
                className="font-medium text-blue hover:underline"
              >
                {(r.nome as string) || "—"}
              </Link>
            ),
          },
          { key: "especialidade", header: "Especialidade", render: (r) => (r.especialidade as string) || "—" },
          {
            key: "ativo",
            header: "Status",
            render: (r) =>
              r.ativo ? (
                <StatusBadge label="ativo" tone="green" />
              ) : (
                <StatusBadge label="inativo" tone="neutral" />
              ),
          },
          {
            key: "toggle",
            header: "",
            render: (r) => (
              <TemplateAtivoToggle id={r.id as string} ativo={!!r.ativo} />
            ),
          },
        ]}
      />
    </div>
  );
}
