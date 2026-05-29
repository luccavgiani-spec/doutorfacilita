import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import {
  AppointmentsTimeChart,
  RevenueTimeChart,
} from "@/components/admin/AdminCharts";
import { bucketDailyCount, bucketDailyValue, sinceIso } from "@/lib/admin/timeseries";

const PERIODS = [7, 15, 30, 60, 90] as const;
const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR") : "—";

export default async function MedicoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periodo?: string; criado?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const periodo = PERIODS.includes(Number(sp.periodo) as never) ? Number(sp.periodo) : 30;
  const since = sinceIso(periodo);

  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("doctors")
    .select(
      "id, user_id, full_name, cpf, email, phone, council, council_state, council_number, primary_specialty, endereco, bio, is_active, accepts_new_consultations",
    )
    .eq("id", id)
    .maybeSingle();
  if (!doc) notFound();

  const [
    { data: consultasPeriodo },
    { data: consultasRecentes },
    { data: prescricoes },
    { data: roles },
  ] = await Promise.all([
    supabase
      .from("consultations")
      .select("id, status, amount_cents, started_at, ended_at, duration_seconds, created_at")
      .eq("doctor_id", id)
      .gte("created_at", since)
      .limit(5000),
    supabase
      .from("consultations")
      .select("id, status, amount_cents, started_at, ended_at, created_at, patient:patients(full_name)")
      .eq("doctor_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("prescricoes_mevo")
      .select("id, status, ambiente, created_at, mevo_token")
      .eq("doctor_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    doc.user_id
      ? supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", doc.user_id)
          .is("revoked_at", null)
      : Promise.resolve({ data: [] as { role: string }[], error: null }),
  ]);

  type CRow = {
    id: string; status: string; amount_cents: number | null;
    started_at: string | null; ended_at: string | null;
    duration_seconds: number | null; created_at: string;
  };
  const rows = (consultasPeriodo ?? []) as CRow[];

  const totalAtendimentos = rows.filter((r) => r.status === "completed").length;
  const noShows = rows.filter((r) => r.status === "no_show").length;
  const cancelled = rows.filter((r) => r.status === "cancelled").length;
  const receitaCentavos = rows
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + (Number(r.amount_cents) || 0), 0);
  const duracoes = rows
    .filter((r) => r.status === "completed" && r.duration_seconds && r.duration_seconds > 0)
    .map((r) => Number(r.duration_seconds));
  const tempoMedioMin =
    duracoes.length > 0
      ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length / 60)
      : 0;

  const appsSeries = bucketDailyCount(
    rows.filter((r) => r.status === "completed"),
    (r) => r.ended_at ?? r.created_at,
    Math.min(periodo, 90),
  );
  const revSeries = bucketDailyValue(
    rows.filter((r) => r.status === "completed"),
    (r) => r.ended_at ?? r.created_at,
    (r) => (Number(r.amount_cents) || 0) / 100,
    Math.min(periodo, 90),
  ).map((b) => ({ dia: b.dia, receita: b.total }));

  const roleSet = new Set(
    ((roles ?? []) as { role: string }[]).map((r) => r.role),
  );
  const isAdmin = roleSet.has("admin");
  const isDoctor = roleSet.has("doctor");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/medicos" className="text-xs font-semibold text-txt-2 hover:underline">
          ← Médicos
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold">{doc.full_name ?? "—"}</h1>
            <p className="text-xs text-txt-2">
              {doc.council ?? "CRM"}-{doc.council_state ?? ""} {doc.council_number} ·{" "}
              {doc.primary_specialty ?? "sem especialidade"}
            </p>
          </div>
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
        </div>
        {sp.criado && (
          <p className="mt-3 rounded-lg border border-green bg-green-l px-4 py-2 text-sm text-green-d">
            Médico cadastrado. Um email de convite foi enviado para <b>{doc.email}</b>.
          </p>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Atendimentos (concluídos)" value={String(totalAtendimentos)} tone="blue" />
        <Kpi label="Receita realizada" value={brl(receitaCentavos)} tone="green" />
        <Kpi label="Tempo médio" value={`${tempoMedioMin} min`} />
        <Kpi
          label="No-show / cancelamentos"
          value={`${noShows} / ${cancelled}`}
          tone={noShows > 0 ? "red" : undefined}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card titulo="Atendimentos por dia" desc={`Últimos ${periodo} dias`}>
          <AppointmentsTimeChart data={appsSeries} />
        </Card>
        <Card titulo="Receita por dia" desc={`Últimos ${periodo} dias`}>
          <RevenueTimeChart data={revSeries} />
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-white p-6">
          <h3 className="mb-3 text-sm font-bold">Dados de cadastro</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Field label="E-mail" value={doc.email} />
            <Field label="Telefone" value={doc.phone} />
            <Field label="CPF" value={doc.cpf} />
            <Field label="Endereço" value={doc.endereco} />
            <Field label="Bio" value={doc.bio} colSpan={2} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="mb-3 text-sm font-bold">Status do perfil</h3>
          <ul className="flex flex-col gap-2 text-sm">
            <StatusItem ok={isDoctor} label="has_role('doctor')" desc="Acesso ao cockpit + fila" />
            <StatusItem ok={isAdmin} label="has_role('admin')" desc="Acesso ao painel /admin" />
            <StatusItem ok={!!doc.is_active} label="is_active" desc="Médico ativo no sistema" />
            <StatusItem
              ok={!!doc.accepts_new_consultations}
              label="accepts_new_consultations"
              desc="Recebe novos pacientes da fila"
            />
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold">Últimas 20 consultas</h2>
        <DataTable
          rows={(consultasRecentes ?? []) as Record<string, unknown>[]}
          rowKey={(r) => r.id as string}
          empty="Nenhuma consulta registrada."
          columns={[
            { key: "created_at", header: "Data", render: (r) => fmt(r.created_at as string) },
            {
              key: "paciente",
              header: "Paciente",
              render: (r) =>
                (((r.patient as { full_name?: string } | null) ?? {}).full_name) ?? "—",
            },
            {
              key: "status",
              header: "Status",
              render: (r) => {
                const s = r.status as string;
                const tone =
                  s === "completed" ? "green"
                  : s === "refunded" || s === "cancelled" ? "red"
                  : s === "no_show" ? "yellow"
                  : "neutral";
                return <StatusBadge label={s} tone={tone} />;
              },
            },
            { key: "amount_cents", header: "Valor", render: (r) => brl(Number(r.amount_cents ?? 0)) },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold">Prescrições Mevo (20)</h2>
        <DataTable
          rows={(prescricoes ?? []) as Record<string, unknown>[]}
          rowKey={(r) => r.id as string}
          empty="Nenhuma prescrição emitida."
          columns={[
            { key: "created_at", header: "Data", render: (r) => fmt(r.created_at as string) },
            { key: "mevo_token", header: "Token", render: (r) => (r.mevo_token as string) ?? "—" },
            { key: "ambiente", header: "Ambiente" },
            {
              key: "status",
              header: "Status",
              render: (r) => {
                const s = r.status as string;
                return (
                  <StatusBadge
                    label={s}
                    tone={
                      s === "finalizada" ? "green"
                      : s === "finalizada_com_erro" ? "red"
                      : "neutral"
                    }
                  />
                );
              },
            },
          ]}
        />
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  colSpan,
}: {
  label: string;
  value: string | null;
  colSpan?: number;
}) {
  return (
    <div className={colSpan === 2 ? "col-span-2" : undefined}>
      <p className="text-xs font-semibold uppercase tracking-wide text-txt-3">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
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

function Card({
  titulo,
  desc,
  children,
}: {
  titulo: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <h3 className="text-sm font-bold">{titulo}</h3>
      <p className="mb-4 text-xs text-txt-2">{desc}</p>
      {children}
    </div>
  );
}

function StatusItem({ ok, label, desc }: { ok: boolean; label: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
          ok ? "bg-green" : "bg-bg-4"
        }`}
      >
        {ok ? "✓" : "—"}
      </span>
      <div>
        <div className="text-sm font-mono font-medium">{label}</div>
        <div className="text-xs text-txt-2">{desc}</div>
      </div>
    </li>
  );
}
