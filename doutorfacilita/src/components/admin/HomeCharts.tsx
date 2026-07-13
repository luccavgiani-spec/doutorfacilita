"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tick = { fontSize: 11, fill: "#5f6368" } as const;
const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.08)",
  fontSize: 12,
} as const;

export function FunnelChart({
  data,
}: {
  data: { etapa: string; total: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
        <XAxis dataKey="etapa" tick={tick} />
        <YAxis tick={tick} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={`hsl(222, 82%, ${62 - i * 7}%)`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DoctorRevenueChart({
  data,
}: {
  data: { doctor_name: string; receita: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
        <XAxis
          type="number"
          tick={tick}
          tickFormatter={(v) => `R$${Number(v) / 1000}k`}
        />
        <YAxis type="category" dataKey="doctor_name" tick={tick} width={140} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [
            Number(v).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }),
            "Receita",
          ]}
        />
        <Bar dataKey="receita" fill="#10B981" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
