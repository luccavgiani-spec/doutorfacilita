import { createClient } from "@/lib/supabase/server";
import { Pagination } from "@/components/ui/data-table";
import { DoctorRevenueChart } from "@/components/admin/HomeCharts";
import {
  RevenueTimeChart,
  NewPatientsChart,
} from "@/components/admin/AdminCharts";
import { bucketDailyCount, bucketDailyValue, sinceIso } from "@/lib/admin/timeseries";
import QuickActionsPanel from "@/components/admin/QuickActionsPanel";
import SalesTable from "@/components/admin/SalesTable";

const PERIODS = [7, 15, 30, 60, 90] as const;
const PAGE_SIZE = 20;
const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{
    periodo?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const periodo = PERIODS.includes(Number(sp.periodo) as never)
    ? Number(sp.periodo)
    : 30;
  const since = sinceIso(periodo);
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // ── Contagens do funil (mantém pros KPIs, sem o gráfico) ──
  const c = () =>
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);

  // ── Tabela de vendas (v_admin_sales) — builder com filtros ──
  let vq = supabase
    .from("v_admin_sales")
    .select(
      "consultation_id, sale_at, paid_at, queued_at, started_at, ended_at, status, amount_cents, payment_id, service_name, service_code, cancellation_reason, patient_name, patient_email, patient_phone, doctor_name",
    )
    .gte("sale_at", since)
    .order("sale_at", { ascending: false })
    .range(from, from + PAGE_SIZE);
  if (sp.status) vq = vq.eq("status", sp.status);
  if (sp.q)
    vq = vq.or(`patient_name.ilike.%${sp.q}%,patient_email.ilike.%${sp.q}%`);

  // Todas as leituras são independentes → um único Promise.all (1 ida à rede)
  // em vez de 4 fases sequenciais para o Supabase (sa-east-1).
  const [
    pagas,
    concluidas,
    noShows,
    { data: recRows },
    { data: estRows },
    { data: novosPacientesRows },
    { count: totalPacientes },
    { count: totalMedicosAtivos },
    { data: patientsForQuick },
    { data: vendasRaw },
    { data: docStats },
  ] = await Promise.all([
    c().not("paid_at", "is", null),
    c().eq("status", "completed"),
    c().eq("status", "no_show"),
    supabase
      .from("consultations")
      .select("amount_cents, created_at, ended_at")
      .eq("status", "completed")
      .gte("created_at", since)
      .limit(10000),
    supabase
      .from("consultations")
      .select("amount_cents")
      .eq("status", "refunded")
      .gte("created_at", since)
      .limit(10000),
    supabase
      .from("patients")
      .select("id, created_at")
      .gte("created_at", since)
      .limit(10000),
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase
      .from("doctors")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    // Pacientes pro autocomplete da quick action (limite p/ caber em memória)
    supabase
      .from("patients")
      .select("id, full_name, email, cpf")
      .order("full_name", { ascending: true })
      .limit(500),
    vq,
    supabase
      .from("v_admin_doctor_stats")
      .select("doctor_name, total_atendimentos, receita_centavos")
      .order("receita_centavos", { ascending: false })
      .limit(20),
  ]);

  const nConcl = concluidas.count ?? 0;
  const nNoShow = noShows.count ?? 0;
  const taxaNoShow =
    nConcl + nNoShow > 0 ? Math.round((nNoShow / (nConcl + nNoShow)) * 100) : 0;

  const receita = (recRows ?? []).reduce(
    (s, r) => s + (Number(r.amount_cents) || 0),
    0,
  );
  const estornada = (estRows ?? []).reduce(
    (s, r) => s + (Number(r.amount_cents) || 0),
    0,
  );
  const ticketMedio =
    (recRows ?? []).length > 0
      ? Math.round(receita / (recRows ?? []).length)
      : 0;

  const revSeries = bucketDailyValue(
    (recRows ?? []) as { amount_cents: number; created_at: string; ended_at: string | null }[],
    (r) => r.ended_at ?? r.created_at,
    (r) => (Number(r.amount_cents) || 0) / 100,
    Math.min(periodo, 90),
  ).map((b) => ({ dia: b.dia, receita: b.total }));

  const novosPacSeries = bucketDailyCount(
    (novosPacientesRows ?? []) as { created_at: string }[],
    (r) => r.created_at,
    Math.min(periodo, 90),
  ).map((b) => ({ dia: b.dia, novos: b.total }));

  const vendasAll = (vendasRaw ?? []) as Parameters<typeof SalesTable>[0]["rows"];
  const vendasHasNext = vendasAll.length > PAGE_SIZE;
  const vendas = vendasAll.slice(0, PAGE_SIZE);

  const docChart = (docStats ?? []).map((d) => ({
    doctor_name: (d.doctor_name as string) ?? "—",
    receita: Number(d.receita_centavos ?? 0) / 100,
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Home</h1>
          <p className="text-xs text-txt-2">
            Visão geral · ações rápidas, KPIs e vendas
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
      </header>

      {/* 1ª seção — Ações rápidas */}
      <QuickActionsPanel patients={(patientsForQuick ?? []) as never} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Receita realizada" value={brl(receita)} tone="green" />
        <Kpi label="Receita estornada" value={brl(estornada)} tone="red" />
        <Kpi label="Vendas pagas" value={String(pagas.count ?? 0)} />
        <Kpi label="Ticket médio" value={brl(ticketMedio)} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Pacientes ativos" value={String(totalPacientes ?? 0)} tone="blue" />
        <Kpi label="Médicos ativos" value={String(totalMedicosAtivos ?? 0)} tone="blue" />
        <Kpi
          label="Taxa de no-show"
          value={`${taxaNoShow}%`}
          tone={taxaNoShow > 10 ? "red" : undefined}
        />
        <Kpi label="Concluídas no período" value={String(nConcl)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card titulo="Receita por dia" desc={`Realizada nos últimos ${periodo} dias`}>
          <RevenueTimeChart data={revSeries} />
        </Card>
        <Card titulo="Novos pacientes por dia" desc={`Cohort dos últimos ${periodo} dias`}>
          <NewPatientsChart data={novosPacSeries} />
        </Card>
      </div>

      <Card titulo="Receita por médico" desc="Top 20 por receita realizada">
        <DoctorRevenueChart data={docChart} />
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Vendas</h2>
        </div>
        <form className="mb-4 flex flex-wrap gap-2" action="/admin">
          <input type="hidden" name="periodo" value={periodo} />
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar paciente (nome/e-mail)…"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos status</option>
            {[
              "created", "paid", "in_queue", "in_progress",
              "completed", "cancelled", "no_show", "refunded",
            ].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white"
          >
            Filtrar
          </button>
        </form>

        <SalesTable rows={vendas} />
        <Pagination
          basePath="/admin"
          page={page}
          hasNext={vendasHasNext}
          query={{ periodo: String(periodo), status: sp.status, q: sp.q }}
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
