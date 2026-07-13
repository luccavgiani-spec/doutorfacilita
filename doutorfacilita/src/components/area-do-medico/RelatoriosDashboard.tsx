"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PALETA, type RelatoriosData, type TempoMedio } from "@/lib/relatorios/getRelatoriosData";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtMin = (m: number) =>
  `${m.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min`;

export default function RelatoriosDashboard({ data }: { data: RelatoriosData }) {
  const {
    temDados,
    kpis,
    consultasPorDia,
    faturamentoPorMes,
    distribuicaoStatus,
    topPacientes,
    faturamentoCumulativo,
    consultasRecentes,
    tempoMedio,
  } = data;

  const temConsultasDia = consultasPorDia.some((p) => p.consultas > 0);
  const temFaturamento = faturamentoPorMes.some((p) => p.valor > 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Relatórios</h1>
        <p className="text-sm text-txt-2">Seu desempenho e faturamento</p>
      </div>

      {!temDados && (
          <div className="mb-6 rounded-xl border border-dashed border-border bg-white p-8 text-center">
            <p className="text-sm font-semibold">Ainda sem consultas registradas</p>
            <p className="mt-1 text-xs text-txt-2">
              Seus indicadores aparecem aqui assim que você concluir os primeiros
              atendimentos.
            </p>
          </div>
        )}

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-xl border border-border bg-white p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-txt-2">
                {k.label}
              </p>
              <p className="mt-2 text-2xl font-bold">{k.valor}</p>
              <p
                className={`mt-1 text-xs font-semibold ${
                  k.delta === null
                    ? "text-txt-2"
                    : k.positivo
                      ? "text-green"
                      : "text-red"
                }`}
              >
                {k.delta === null ? "sem base do mês anterior" : `${k.delta} vs mês anterior`}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card
            titulo="Consultas por dia"
            desc="Volume diário de atendimentos concluídos nos últimos 30 dias"
            full
          >
            {temConsultasDia ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={consultasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                  <XAxis dataKey="dia" tick={tick} interval={4} />
                  <YAxis tick={tick} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="consultas"
                    stroke={PALETA.indigo}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty height={280} />
            )}
          </Card>

          <Card
            titulo="Faturamento por mês"
            desc="Receita de consultas concluídas nos últimos 6 meses"
          >
            {temFaturamento ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={faturamentoPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                  <XAxis dataKey="mes" tick={tick} />
                  <YAxis tick={tick} tickFormatter={(v) => `R$${Number(v) / 1000}k`} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [brl(Number(v)), "Faturamento"]}
                  />
                  <Bar dataKey="valor" fill={PALETA.esmeralda} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty height={280} />
            )}
          </Card>

          <Card
            titulo="Distribuição por status"
            desc="Desfecho das consultas: concluídas, canceladas e no-show"
          >
            {distribuicaoStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={distribuicaoStatus}
                    dataKey="valor"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={55}
                    paddingAngle={3}
                  >
                    {distribuicaoStatus.map((f) => (
                      <Cell key={f.status} fill={f.cor} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty height={280} />
            )}
          </Card>

          <Card
            titulo="Top 10 pacientes mais atendidos"
            desc="Pacientes com mais consultas concluídas no período"
          >
            {topPacientes.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={topPacientes}
                  layout="vertical"
                  margin={{ left: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                  <XAxis type="number" tick={tick} allowDecimals={false} />
                  <YAxis type="category" dataKey="nome" tick={tick} width={120} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="atendimentos" fill={PALETA.rosa} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty height={320} />
            )}
          </Card>

          {/* Card novo — ocupa o slot vazio à direita do Top 10 pacientes */}
          <TempoMedioCard tm={tempoMedio} />

          <Card
            titulo="Evolução cumulativa de faturamento"
            desc="Faturamento acumulado nos últimos 6 meses"
            full
          >
            {temFaturamento ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={faturamentoCumulativo}>
                  <defs>
                    <linearGradient id="grad-acc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETA.ciano} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={PALETA.ciano} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                  <XAxis dataKey="mes" tick={tick} />
                  <YAxis tick={tick} tickFormatter={(v) => `R$${Number(v) / 1000}k`} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [brl(Number(v)), "Acumulado"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="acumulado"
                    stroke={PALETA.ciano}
                    strokeWidth={2.5}
                    fill="url(#grad-acc)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty height={280} />
            )}
          </Card>
        </div>

        {/* Tabela */}
        <div className="mt-6 rounded-xl border border-border bg-white p-6">
          <h3 className="text-sm font-bold">Últimas 20 consultas</h3>
          <p className="mb-4 text-xs text-txt-2">
            Atendimentos mais recentes e seu status
          </p>
          {consultasRecentes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-txt-2">
                    <th className="py-2.5 pr-4 font-semibold">Data</th>
                    <th className="py-2.5 pr-4 font-semibold">Paciente</th>
                    <th className="py-2.5 pr-4 font-semibold">Duração</th>
                    <th className="py-2.5 pr-4 font-semibold">Valor</th>
                    <th className="py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {consultasRecentes.map((c, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="py-2.5 pr-4 text-txt-2">{c.data}</td>
                      <td className="py-2.5 pr-4 font-medium">{c.paciente}</td>
                      <td className="py-2.5 pr-4 text-txt-2">
                        {c.duracaoMin === null ? "—" : fmtMin(c.duracaoMin)}
                      </td>
                      <td className="py-2.5 pr-4">{brl(c.valor)}</td>
                      <td className="py-2.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            c.status === "Concluída"
                              ? "bg-green-light text-green-dark"
                              : c.status === "Cancelada" || c.status === "Estornada"
                                ? "bg-red-light text-red"
                                : c.status === "No-show"
                                  ? "bg-yellow-light text-yellow"
                                  : "bg-bg-3 text-txt-2"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-txt-2">
              Nenhuma consulta registrada ainda.
            </p>
          )}
        </div>
      </main>
  );
}

const tick = { fontSize: 11, fill: "#5f6368" } as const;

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.08)",
  fontSize: 12,
} as const;

/** Card de "Tempo médio de consulta" — comparação com a média dos médicos. */
function TempoMedioCard({ tm }: { tm: TempoMedio }) {
  if (tm.doutorMin === null) {
    return (
      <Card
        titulo="Tempo médio de consulta"
        desc="Sua média comparada aos demais médicos"
      >
        <Empty height={320} texto="Sem consultas com duração registrada ainda" />
      </Card>
    );
  }

  const doutor = tm.doutorMin;
  const plat = tm.plataformaMin;
  const compData = [
    { nome: "Você", min: doutor },
    { nome: "Média dos médicos", min: plat ?? 0 },
  ];

  // Insight de comparação
  let comparacao: React.ReactNode = null;
  if (plat !== null) {
    const diff = doutor - plat;
    const pct = plat > 0 ? Math.round((Math.abs(diff) / plat) * 100) : 0;
    const abaixo = diff < 0;
    comparacao = (
      <p className="text-xs text-txt-2">
        {Math.abs(diff) < 0.1 ? (
          <>Praticamente na média da plataforma ({fmtMin(plat)}).</>
        ) : (
          <>
            <span className={`font-semibold ${abaixo ? "text-green" : "text-txt"}`}>
              {pct}% {abaixo ? "abaixo" : "acima"}
            </span>{" "}
            da média da plataforma ({fmtMin(plat)}).
          </>
        )}
      </p>
    );
  }

  return (
    <Card
      titulo="Tempo médio de consulta"
      desc="Sua média comparada aos demais médicos"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{fmtMin(doutor)}</span>
        <span className="text-xs text-txt-2">
          em {tm.amostra} consulta{tm.amostra === 1 ? "" : "s"}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={compData} margin={{ top: 16, left: 0, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
          <XAxis dataKey="nome" tick={tick} />
          <YAxis tick={tick} tickFormatter={(v) => `${v}m`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtMin(Number(v)), "Média"]} />
          <Bar dataKey="min" radius={[6, 6, 0, 0]}>
            {compData.map((d) => (
              <Cell key={d.nome} fill={d.nome === "Você" ? PALETA.indigo : PALETA.cinza} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
        {comparacao}
        {tm.maisRapidoQuePct !== null && (
          <p className="text-xs text-txt-2">
            Mais rápido que{" "}
            <span className="font-semibold text-txt">{tm.maisRapidoQuePct}%</span>{" "}
            dos {tm.totalMedicos} médicos com atendimentos medidos.
          </p>
        )}
      </div>
    </Card>
  );
}

function Empty({ height, texto }: { height: number; texto?: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-bg-3/40 text-xs text-txt-2"
      style={{ height }}
    >
      {texto ?? "Sem dados no período"}
    </div>
  );
}

function Card({
  titulo,
  desc,
  children,
  full,
}: {
  titulo: string;
  desc: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-white p-6 ${
        full ? "lg:col-span-2" : ""
      }`}
    >
      <h3 className="text-sm font-bold">{titulo}</h3>
      <p className="mb-4 text-xs text-txt-2">{desc}</p>
      {children}
    </div>
  );
}
