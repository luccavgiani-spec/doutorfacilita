import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { NewPatientsChart } from "@/components/admin/AdminCharts";
import { bucketDailyCount, sinceIso } from "@/lib/admin/timeseries";
import QuickActionsPanel from "@/components/admin/QuickActionsPanel";
import EditPatientButton from "@/components/admin/EditPatientButton";

const PAGE_SIZE = 25;
const PERIODS = [7, 15, 30, 60, 90] as const;
const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type PatientRow = {
  id: string;
  full_name: string | null;
  cpf: string | null;
  celular: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  endereco_completo: string | null;
  created_at: string | null;
};

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; periodo?: string }>;
}) {
  const { q, page: pageRaw, periodo: perRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const periodo = PERIODS.includes(Number(perRaw) as never) ? Number(perRaw) : 30;
  const since = sinceIso(periodo);

  const supabase = await createClient();

  let listQuery = supabase
    .from("patients")
    .select(
      "id, full_name, cpf, celular, phone, email, birth_date, gender, endereco_completo, created_at",
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE);
  if (q) {
    listQuery = listQuery.or(
      `full_name.ilike.%${q}%,cpf.ilike.%${q}%,celular.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }
  const { data: rowsRaw, error } = await listQuery;
  const all = (rowsRaw ?? []) as PatientRow[];
  const hasNext = all.length > PAGE_SIZE;
  const rows = all.slice(0, PAGE_SIZE);

  const [
    { count: totalPacientes },
    { data: novosRows },
    { data: pacientesComConsultas },
    { data: receitaRows },
    { data: patientsForQuick },
  ] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase
      .from("patients")
      .select("id, created_at")
      .gte("created_at", since)
      .limit(10000),
    supabase
      .from("consultations")
      .select("patient_id")
      .in("status", ["completed"])
      .limit(20000),
    supabase
      .from("consultations")
      .select("amount_cents")
      .eq("status", "completed")
      .gte("created_at", since)
      .limit(20000),
    supabase
      .from("patients")
      .select("id, full_name, email, cpf")
      .order("full_name", { ascending: true })
      .limit(500),
  ]);

  const totalNovos = novosRows?.length ?? 0;

  const counts = new Map<string, number>();
  for (const r of (pacientesComConsultas ?? []) as { patient_id: string }[]) {
    counts.set(r.patient_id, (counts.get(r.patient_id) ?? 0) + 1);
  }
  const recorrentes = Array.from(counts.values()).filter((n) => n >= 2).length;

  const receitaPeriodo = (receitaRows ?? []).reduce(
    (s, r) => s + (Number(r.amount_cents) || 0),
    0,
  );
  const ticketMedio =
    (receitaRows ?? []).length > 0
      ? Math.round(receitaPeriodo / (receitaRows ?? []).length)
      : 0;

  const novosSeries = bucketDailyCount(
    (novosRows ?? []) as { created_at: string }[],
    (r) => r.created_at,
    Math.min(periodo, 90),
  ).map((b) => ({ dia: b.dia, novos: b.total }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">Pacientes</h1>
          <p className="text-xs text-txt-2">
            Base completa · {totalPacientes ?? 0} pacientes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form>
            <select
              name="periodo"
              defaultValue={String(periodo)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>Últimos {p} dias</option>
              ))}
            </select>
          </form>
          <QuickActionsPanel
            patients={(patientsForQuick ?? []) as never}
            compact
          />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total na base" value={String(totalPacientes ?? 0)} />
        <Kpi label={`Novos · últimos ${periodo}d`} value={String(totalNovos)} tone="green" />
        <Kpi label="Recorrentes (≥2 consultas)" value={String(recorrentes)} tone="blue" />
        <Kpi label="Ticket médio (período)" value={brl(ticketMedio)} />
      </section>

      <div className="rounded-xl border border-border bg-white p-6">
        <h3 className="text-sm font-bold">Novos pacientes por dia</h3>
        <p className="mb-4 text-xs text-txt-2">Cohort dos últimos {periodo} dias</p>
        <NewPatientsChart data={novosSeries} />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold">Lista</h2>
          <form className="flex gap-2" action="/admin/pacientes">
            <input type="hidden" name="periodo" value={String(periodo)} />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar por nome, CPF, celular ou e-mail…"
              className="w-80 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white"
            >
              Buscar
            </button>
          </form>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-l px-4 py-3 text-sm text-red">
            Erro: {error.message}
          </p>
        )}

        <DataTable<PatientRow>
          rows={rows}
          rowKey={(r) => r.id}
          empty="Nenhum paciente encontrado."
          columns={[
            {
              key: "full_name",
              header: "Nome",
              render: (r) => (
                <Link
                  href={`/admin/pacientes/${r.id}`}
                  className="font-medium text-blue hover:underline"
                >
                  {r.full_name || "—"}
                </Link>
              ),
            },
            { key: "cpf", header: "CPF", render: (r) => r.cpf || "—" },
            {
              key: "celular",
              header: "Celular",
              render: (r) => r.celular || r.phone || "—",
            },
            { key: "email", header: "E-mail", render: (r) => r.email || "—" },
            {
              key: "birth_date",
              header: "Nascimento",
              render: (r) =>
                r.birth_date
                  ? new Date(r.birth_date).toLocaleDateString("pt-BR")
                  : "—",
            },
            {
              key: "cad",
              header: "Cadastrado em",
              render: (r) =>
                r.created_at
                  ? new Date(r.created_at).toLocaleDateString("pt-BR")
                  : "—",
            },
            {
              key: "actions",
              header: "",
              render: (r) => <EditPatientButton patient={r} />,
            },
          ]}
        />

        <Pagination
          basePath="/admin/pacientes"
          page={page}
          hasNext={hasNext}
          query={{ q, periodo: String(periodo) }}
        />
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "red" | "blue";
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-txt-2">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold ${
          tone === "green" ? "text-green"
          : tone === "red" ? "text-red"
          : tone === "blue" ? "text-blue"
          : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
