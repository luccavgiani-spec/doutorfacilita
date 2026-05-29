"use client";

import Link from "next/link";
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
import {
  PALETA,
  consultasPorDia,
  consultasRecentes,
  distribuicaoTipo,
  faturamentoCumulativo,
  faturamentoPorMes,
  kpis,
  topPacientes,
} from "@/mocks/relatoriosMock";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function RelatoriosDashboard() {
  return (
    <div className="min-h-screen bg-bg font-sans text-txt">
      <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold">Relatórios</h1>
          <p className="text-xs text-txt-2">
            Área do médico · desempenho e faturamento{" "}
            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              dados de demonstração
            </span>
          </p>
        </div>
        <Link
          href="/cockpit"
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-txt-2 hover:bg-bg-3"
        >
          ← Voltar ao cockpit
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
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
                  k.positivo ? "text-green" : "text-red"
                }`}
              >
                {k.delta} vs mês anterior
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card
            titulo="Consultas por dia"
            desc="Volume diário de atendimentos nos últimos 30 dias"
            full
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={consultasPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                <XAxis dataKey="dia" tick={tick} interval={4} />
                <YAxis tick={tick} />
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
          </Card>

          <Card
            titulo="Faturamento por mês"
            desc="Receita bruta dos últimos 6 meses"
          >
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
          </Card>

          <Card
            titulo="Distribuição por tipo de consulta"
            desc="Proporção entre primeira consulta, retorno e urgência"
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={distribuicaoTipo}
                  dataKey="valor"
                  nameKey="tipo"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={55}
                  paddingAngle={3}
                >
                  {distribuicaoTipo.map((f) => (
                    <Cell key={f.tipo} fill={f.cor} />
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
          </Card>

          <Card
            titulo="Top 10 pacientes mais atendidos"
            desc="Pacientes com mais consultas no período"
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={topPacientes}
                layout="vertical"
                margin={{ left: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                <XAxis type="number" tick={tick} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  tick={tick}
                  width={120}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="atendimentos"
                  fill={PALETA.rosa}
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card
            titulo="Evolução cumulativa de faturamento"
            desc="Faturamento acumulado ao longo do ano"
            full
          >
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
          </Card>
        </div>

        {/* Tabela */}
        <div className="mt-6 rounded-xl border border-border bg-white p-6">
          <h3 className="text-sm font-bold">Últimas 20 consultas</h3>
          <p className="mb-4 text-xs text-txt-2">
            Atendimentos mais recentes e seu status
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-txt-2">
                  <th className="py-2.5 pr-4 font-semibold">Data</th>
                  <th className="py-2.5 pr-4 font-semibold">Paciente</th>
                  <th className="py-2.5 pr-4 font-semibold">Tipo</th>
                  <th className="py-2.5 pr-4 font-semibold">Valor</th>
                  <th className="py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {consultasRecentes.map((c, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-2.5 pr-4 text-txt-2">{c.data}</td>
                    <td className="py-2.5 pr-4 font-medium">{c.paciente}</td>
                    <td className="py-2.5 pr-4 text-txt-2">{c.tipo}</td>
                    <td className="py-2.5 pr-4">{brl(c.valor)}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          c.status === "Concluída"
                            ? "bg-green-light text-green-dark"
                            : c.status === "Cancelada"
                              ? "bg-red-light text-red"
                              : "bg-yellow-light text-yellow"
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
        </div>
      </main>
    </div>
  );
}

const tick = { fontSize: 11, fill: "#5f6368" } as const;

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.08)",
  fontSize: 12,
} as const;

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
