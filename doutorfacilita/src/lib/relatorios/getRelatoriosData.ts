// Dados REAIS do dashboard /area-do-medico/relatorios, escopados ao médico
// logado. Substitui o antigo @/mocks/relatoriosMock (100% demonstração).
//
// Segurança: roda SÓ no server. Usa o admin client (service role) estritamente
// filtrado pelo doctor_id resolvido a partir do usuário autenticado — nenhum
// dado individual de OUTRO médico chega ao browser. O único cruzamento entre
// médicos exposto é a MÉDIA agregada de tempo de consulta (um número), usada
// na comparação "vs média dos médicos".
import { createAdminClient } from "@/lib/supabase/admin";

// Paleta consistente entre os gráficos.
export const PALETA = {
  indigo: "#6366f1",
  esmeralda: "#10b981",
  ambar: "#f59e0b",
  rosa: "#ec4899",
  ciano: "#06b6d4",
  violeta: "#8b5cf6",
  cinza: "#94a3b8",
} as const;

const MESES_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export interface KpiReal {
  label: string;
  valor: string;
  delta: string | null; // null quando não há base de comparação (mês anterior zero)
  positivo: boolean;
}
export interface PontoDia { dia: string; consultas: number; }
export interface FaturamentoMes { mes: string; valor: number; }
export interface FatiaStatus { status: string; valor: number; cor: string; }
export interface PacienteTop { nome: string; atendimentos: number; }
export interface PontoCumulativo { mes: string; acumulado: number; }
export interface ConsultaRecente {
  data: string;
  paciente: string;
  duracaoMin: number | null;
  valor: number;
  status: string;
}
export interface TempoMedio {
  doutorMin: number | null;    // média do médico (min); null = sem consultas medidas
  plataformaMin: number | null; // média entre os médicos da plataforma (min)
  amostra: number;             // nº de consultas do médico com duração medida
  totalMedicos: number;        // médicos com pelo menos 1 consulta medida
  maisRapidoQuePct: number | null; // % de médicos mais lentos que este
}
export interface RelatoriosData {
  doctorName: string;
  temDados: boolean;
  kpis: KpiReal[];
  consultasPorDia: PontoDia[];
  faturamentoPorMes: FaturamentoMes[];
  distribuicaoStatus: FatiaStatus[];
  topPacientes: PacienteTop[];
  faturamentoCumulativo: PontoCumulativo[];
  consultasRecentes: ConsultaRecente[];
  tempoMedio: TempoMedio;
}

interface ConsultaRow {
  id: string;
  status: string;
  amount_cents: number | null;
  created_at: string;
  paid_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  patient_id: string | null;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
const dayKey = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Duração em minutos, descartando registros inconsistentes/outliers. */
function durMin(started: string | null, ended: string | null): number | null {
  if (!started || !ended) return null;
  const s = new Date(started).getTime();
  const e = new Date(ended).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
  const min = (e - s) / 60000;
  if (min <= 0 || min > 180) return null;
  return min;
}

/** delta percentual mês-a-mês → string "+12,4%" | "-3,0%" | null (sem base). */
function pctDelta(atual: number, anterior: number): { delta: string | null; positivo: boolean } {
  if (anterior === 0) {
    if (atual === 0) return { delta: "0,0%", positivo: true };
    return { delta: null, positivo: true }; // sem base de comparação
  }
  const p = ((atual - anterior) / anterior) * 100;
  const sinal = p >= 0 ? "+" : "";
  return {
    delta: `${sinal}${p.toFixed(1).replace(".", ",")}%`,
    positivo: p >= 0,
  };
}

export async function getRelatoriosData(userId: string): Promise<RelatoriosData | null> {
  const admin = createAdminClient();

  // 1) Resolve o médico a partir do usuário autenticado. Sem doctor → não é médico.
  const { data: doctor } = await admin
    .from("doctors")
    .select("id, full_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (!doctor) return null;

  const doctorId = doctor.id as string;
  const doctorName = (doctor.full_name as string) ?? "Médico";

  const now = new Date();
  const treizeMesesAtras = new Date(now.getFullYear(), now.getMonth() - 12, 1);

  // 2) Consultas do médico (janela de ~13 meses cobre KPIs, séries e tabela).
  const { data: rowsData } = await admin
    .from("consultations")
    .select("id, status, amount_cents, created_at, paid_at, started_at, ended_at, patient_id")
    .eq("doctor_id", doctorId)
    .gte("created_at", treizeMesesAtras.toISOString())
    .order("created_at", { ascending: false });

  const rows = (rowsData ?? []) as ConsultaRow[];
  const completadas = rows.filter((r) => r.status === "completed");

  // ── KPIs (mês atual vs mês anterior) ──────────────────────────────
  const thisMonth = monthKey(now);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = monthKey(prevMonthDate);

  const refDate = (r: ConsultaRow) => new Date(r.ended_at ?? r.paid_at ?? r.created_at);
  const compThis = completadas.filter((r) => monthKey(refDate(r)) === thisMonth);
  const compPrev = completadas.filter((r) => monthKey(refDate(r)) === prevMonth);

  const somaCents = (arr: ConsultaRow[]) =>
    arr.reduce((acc, r) => acc + (r.amount_cents ?? 0), 0);
  const pacientesUnicos = (arr: ConsultaRow[]) =>
    new Set(arr.map((r) => r.patient_id).filter(Boolean)).size;

  const consultasDelta = pctDelta(compThis.length, compPrev.length);
  const pacDelta = pctDelta(pacientesUnicos(compThis), pacientesUnicos(compPrev));
  const fatThis = somaCents(compThis);
  const fatPrev = somaCents(compPrev);
  const fatDelta = pctDelta(fatThis, fatPrev);
  const ticketThis = compThis.length ? Math.round(fatThis / compThis.length) : 0;
  const ticketPrev = compPrev.length ? Math.round(fatPrev / compPrev.length) : 0;
  const ticketDelta = pctDelta(ticketThis, ticketPrev);

  const kpis: KpiReal[] = [
    { label: "Consultas no mês", valor: String(compThis.length), ...consultasDelta },
    { label: "Pacientes únicos", valor: String(pacientesUnicos(compThis)), ...pacDelta },
    { label: "Faturamento no mês", valor: brl(fatThis), ...fatDelta },
    { label: "Ticket médio", valor: brl(ticketThis), ...ticketDelta },
  ];

  // ── Consultas por dia (últimos 30 dias) ───────────────────────────
  const dias: PontoDia[] = [];
  const contagemDia = new Map<string, number>();
  for (const r of completadas) {
    const k = dayKey(refDate(r));
    contagemDia.set(k, (contagemDia.get(k) ?? 0) + 1);
  }
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const k = dayKey(d);
    dias.push({ dia: k, consultas: contagemDia.get(k) ?? 0 });
  }

  // ── Faturamento por mês + cumulativo (últimos 6 meses) ─────────────
  const buckets: { key: string; mes: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: monthKey(d), mes: MESES_PT[d.getMonth()] });
  }
  const fatMap = new Map<string, number>();
  for (const r of completadas) {
    const k = monthKey(refDate(r));
    fatMap.set(k, (fatMap.get(k) ?? 0) + (r.amount_cents ?? 0));
  }
  const faturamentoPorMes: FaturamentoMes[] = buckets.map((b) => ({
    mes: b.mes,
    valor: Math.round((fatMap.get(b.key) ?? 0) / 100),
  }));
  let acc = 0;
  const faturamentoCumulativo: PontoCumulativo[] = faturamentoPorMes.map((p) => {
    acc += p.valor;
    return { mes: p.mes, acumulado: acc };
  });

  // ── Distribuição por status (reformulação de "tipo de consulta") ───
  const statusMap: { key: string; label: string; cor: string }[] = [
    { key: "completed", label: "Concluída", cor: PALETA.esmeralda },
    { key: "no_show", label: "No-show", cor: PALETA.ambar },
    { key: "cancelled", label: "Cancelada", cor: PALETA.rosa },
    { key: "refunded", label: "Estornada", cor: PALETA.cinza },
  ];
  const distribuicaoStatus: FatiaStatus[] = statusMap
    .map((s) => ({
      status: s.label,
      valor: rows.filter((r) => r.status === s.key).length,
      cor: s.cor,
    }))
    .filter((f) => f.valor > 0);

  // ── Top 10 pacientes + nomes ──────────────────────────────────────
  const porPaciente = new Map<string, number>();
  for (const r of completadas) {
    if (!r.patient_id) continue;
    porPaciente.set(r.patient_id, (porPaciente.get(r.patient_id) ?? 0) + 1);
  }
  const topIds = [...porPaciente.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // nomes de pacientes (top + recentes)
  const recentesRows = rows.slice(0, 20);
  const idsNecessarios = new Set<string>([
    ...topIds.map(([id]) => id),
    ...recentesRows.map((r) => r.patient_id).filter(Boolean) as string[],
  ]);
  const nomeMap = new Map<string, string>();
  if (idsNecessarios.size > 0) {
    const { data: pacientes } = await admin
      .from("patients")
      .select("id, full_name")
      .in("id", [...idsNecessarios]);
    for (const p of pacientes ?? []) {
      nomeMap.set(p.id as string, (p.full_name as string) ?? "Paciente");
    }
  }
  const topPacientes: PacienteTop[] = topIds.map(([id, n]) => ({
    nome: nomeMap.get(id) ?? "Paciente",
    atendimentos: n,
  }));

  // ── Últimas 20 consultas ──────────────────────────────────────────
  const statusLabel: Record<string, string> = {
    completed: "Concluída",
    cancelled: "Cancelada",
    no_show: "No-show",
    refunded: "Estornada",
    in_progress: "Em atendimento",
    in_queue: "Na fila",
    paid: "Paga",
    created: "Criada",
  };
  const consultasRecentes: ConsultaRecente[] = recentesRows.map((r) => {
    const d = refDate(r);
    return {
      data: `${dayKey(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      paciente: r.patient_id ? (nomeMap.get(r.patient_id) ?? "Paciente") : "—",
      duracaoMin: durMin(r.started_at, r.ended_at),
      valor: Math.round((r.amount_cents ?? 0) / 100),
      status: statusLabel[r.status] ?? r.status,
    };
  });

  // ── Tempo médio de consulta (médico vs plataforma) ────────────────
  const duracoesDoutor = completadas
    .map((r) => durMin(r.started_at, r.ended_at))
    .filter((v): v is number => v !== null);
  const doutorMin = duracoesDoutor.length
    ? duracoesDoutor.reduce((a, b) => a + b, 0) / duracoesDoutor.length
    : null;

  // Média entre os médicos da plataforma: agregação server-side; só o número
  // final é exposto (nunca dados individuais de outros médicos).
  // TODO(escala): mover p/ RPC/view agregada quando o volume crescer.
  const { data: platRows } = await admin
    .from("consultations")
    .select("doctor_id, started_at, ended_at")
    .eq("status", "completed")
    .not("started_at", "is", null)
    .not("ended_at", "is", null);

  const porMedico = new Map<string, number[]>();
  const platList = (platRows ?? []) as {
    doctor_id: string | null;
    started_at: string | null;
    ended_at: string | null;
  }[];
  for (const r of platList) {
    const m = durMin(r.started_at, r.ended_at);
    if (m === null || !r.doctor_id) continue;
    const arr = porMedico.get(r.doctor_id) ?? [];
    arr.push(m);
    porMedico.set(r.doctor_id, arr);
  }
  const mediasPorMedico = new Map<string, number>();
  for (const [did, arr] of porMedico) {
    mediasPorMedico.set(did, arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  const totalMedicos = mediasPorMedico.size;
  const plataformaMin = totalMedicos
    ? [...mediasPorMedico.values()].reduce((a, b) => a + b, 0) / totalMedicos
    : null;

  let maisRapidoQuePct: number | null = null;
  const minhaMedia = mediasPorMedico.get(doctorId);
  if (minhaMedia !== undefined && totalMedicos > 1) {
    const outros = [...mediasPorMedico.entries()].filter(([did]) => did !== doctorId);
    const maisLentos = outros.filter(([, m]) => m > minhaMedia).length;
    maisRapidoQuePct = Math.round((maisLentos / outros.length) * 100);
  }

  const tempoMedio: TempoMedio = {
    doutorMin: doutorMin === null ? null : Math.round(doutorMin * 10) / 10,
    plataformaMin: plataformaMin === null ? null : Math.round(plataformaMin * 10) / 10,
    amostra: duracoesDoutor.length,
    totalMedicos,
    maisRapidoQuePct,
  };

  return {
    doctorName,
    temDados: rows.length > 0,
    kpis,
    consultasPorDia: dias,
    faturamentoPorMes,
    distribuicaoStatus,
    topPacientes,
    faturamentoCumulativo,
    consultasRecentes,
    tempoMedio,
  };
}
