"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tick = { fontSize: 11, fill: "#55647E" } as const;
const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.08)",
  fontSize: 12,
} as const;

const fmtBrl = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtBrlShort = (v: number) =>
  `R$${(Number(v) / 1000).toFixed(Number(v) >= 1000 ? 0 : 1)}k`;

// ─── Receita ao longo do tempo (line) ─────────────────────────
export function RevenueTimeChart({
  data,
}: {
  data: { dia: string; receita: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: 10, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
        <XAxis dataKey="dia" tick={tick} />
        <YAxis tick={tick} tickFormatter={(v) => fmtBrlShort(Number(v))} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmtBrl(Number(v)), "Receita"]}
          labelStyle={{ fontSize: 11, color: "#55647E" }}
        />
        <Line
          type="monotone"
          dataKey="receita"
          stroke="#10B981"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#10B981" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Atendimentos por dia (area) ─────────────────────────────
export function AppointmentsTimeChart({
  data,
  color = "#1E5AE8",
}: {
  data: { dia: string; total: number }[];
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: 0, right: 10 }}>
        <defs>
          <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
        <XAxis dataKey="dia" tick={tick} />
        <YAxis tick={tick} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="total"
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#appGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Novos pacientes ao longo do tempo (area verde) ───────────
export function NewPatientsChart({
  data,
}: {
  data: { dia: string; novos: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: 0, right: 10 }}>
        <defs>
          <linearGradient id="patGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
        <XAxis dataKey="dia" tick={tick} />
        <YAxis tick={tick} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="novos"
          stroke="#10B981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#patGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Distribuição de status (bar horizontal) ──────────────────
export function StatusDistributionChart({
  data,
}: {
  data: { status: string; total: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ left: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
        <XAxis type="number" tick={tick} allowDecimals={false} />
        <YAxis type="category" dataKey="status" tick={tick} width={110} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]}>
          {data.map((d, i) => {
            const colorByStatus: Record<string, string> = {
              completed: "#10B981",
              in_progress: "#1E5AE8",
              in_queue: "#1E5AE8",
              paid: "#123FBF",
              created: "#8B97AD",
              cancelled: "#EF4444",
              refunded: "#EF4444",
              no_show: "#F59E0B",
            };
            return (
              <Cell
                key={i}
                fill={colorByStatus[d.status] ?? "#8B97AD"}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
