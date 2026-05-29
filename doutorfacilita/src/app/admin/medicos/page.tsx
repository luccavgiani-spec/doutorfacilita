import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DataTable, Pagination } from "@/components/ui/data-table";
import MedicoRoleToggles from "@/components/admin/MedicoRoleToggles";
import NewDoctorButton from "@/components/admin/NewDoctorButton";
import type { AdminRole } from "@/app/admin/medicos/actions";

const PAGE_SIZE = 25;
const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Doctor = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  council: string | null;
  council_state: string | null;
  council_number: string | null;
  primary_specialty: string | null;
  email: string | null;
};

export default async function MedicosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from("doctors")
    .select(
      "id, user_id, full_name, council, council_state, council_number, primary_specialty, email",
    )
    .order("full_name", { ascending: true })
    .range(from, from + PAGE_SIZE); // +1 p/ detectar próxima página

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,council_number.ilike.%${q}%`,
    );
  }

  const { data: docsRaw, error } = await query;
  const docs = (docsRaw ?? []) as Doctor[];
  const hasNext = docs.length > PAGE_SIZE;
  const pageDocs = docs.slice(0, PAGE_SIZE);

  const userIds = pageDocs.map((d) => d.user_id).filter(Boolean) as string[];
  const doctorIds = pageDocs.map((d) => d.id);

  const [{ data: stats }, { data: roles }] = await Promise.all([
    supabase
      .from("v_admin_doctor_stats")
      .select("doctor_id, total_atendimentos, receita_centavos")
      .in("doctor_id", doctorIds.length ? doctorIds : ["—"]),
    supabase
      .from("user_roles")
      .select("user_id, role")
      .is("revoked_at", null)
      .in("user_id", userIds.length ? userIds : ["—"]),
  ]);

  const statById = new Map(
    (stats ?? []).map((s) => [s.doctor_id as string, s]),
  );
  const rolesByUser = new Map<string, Set<string>>();
  for (const r of roles ?? []) {
    const set = rolesByUser.get(r.user_id as string) ?? new Set();
    set.add(r.role as string);
    rolesByUser.set(r.user_id as string, set);
  }

  return (
    <div>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Médicos</h1>
          <p className="text-xs text-txt-2">
            {pageDocs.length} médico(s) nesta página · papéis gravados em
            user_roles (soft-delete, auditado)
          </p>
        </div>
        <NewDoctorButton />
      </header>

      <form className="mb-4" action="/admin/medicos">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome, e-mail ou CRM…"
          className="w-full max-w-md rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
        />
      </form>

      {error && (
        <p className="mb-4 rounded-lg bg-red-l px-4 py-3 text-sm text-red">
          Erro ao carregar médicos: {error.message}
        </p>
      )}

      <DataTable<Doctor>
        rows={pageDocs}
        rowKey={(d) => d.id}
        columns={[
          {
            key: "nome",
            header: "Médico",
            render: (d) => (
              <Link
                href={`/admin/medicos/${d.id}`}
                className="font-medium text-blue hover:underline"
              >
                {d.full_name ?? "—"}
              </Link>
            ),
          },
          {
            key: "crm",
            header: "Conselho",
            render: (d) =>
              d.council_number
                ? `${d.council ?? "CRM"}-${d.council_state ?? ""} ${d.council_number}`
                : "—",
          },
          {
            key: "esp",
            header: "Especialidade",
            render: (d) => d.primary_specialty ?? "—",
          },
          {
            key: "at",
            header: "Atendimentos",
            render: (d) =>
              statById.get(d.id)?.total_atendimentos ?? 0,
          },
          {
            key: "rec",
            header: "Receita",
            render: (d) =>
              brl(Number(statById.get(d.id)?.receita_centavos ?? 0)),
          },
          {
            key: "roles",
            header: "Papéis",
            render: (d) => {
              const set = d.user_id ? rolesByUser.get(d.user_id) : undefined;
              const active = {
                admin: !!set?.has("admin"),
                carteira: !!set?.has("carteira"),
                agendamento: !!set?.has("agendamento"),
              } as Record<AdminRole, boolean>;
              return (
                <MedicoRoleToggles
                  targetUserId={d.user_id}
                  active={active}
                />
              );
            },
          },
        ]}
      />

      <Pagination
        basePath="/admin/medicos"
        page={page}
        hasNext={hasNext}
        query={{ q }}
      />
    </div>
  );
}
