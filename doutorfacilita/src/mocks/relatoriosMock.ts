// TODO: substituir por queries reais ao Supabase quando as tabelas de consultas/pagamentos existirem

export interface Kpi {
  label: string;
  valor: string;
  delta: string;
  positivo: boolean;
}

export interface PontoDia {
  dia: string; // "01/05"
  consultas: number;
}

export interface FaturamentoMes {
  mes: string; // "Dez"
  valor: number; // em R$
}

export interface FatiaTipo {
  tipo: string;
  valor: number;
  cor: string;
}

export interface PacienteTop {
  nome: string;
  atendimentos: number;
}

export interface PontoCumulativo {
  mes: string;
  acumulado: number;
}

export interface ConsultaRecente {
  data: string;
  paciente: string;
  tipo: "Primeira consulta" | "Retorno" | "Urgência";
  valor: number;
  status: "Concluída" | "Cancelada" | "No-show";
}

// Paleta consistente usada em todos os gráficos
export const PALETA = {
  indigo: "#6366f1",
  esmeralda: "#10b981",
  ambar: "#f59e0b",
  rosa: "#ec4899",
  ciano: "#06b6d4",
  violeta: "#8b5cf6",
} as const;

export const kpis: Kpi[] = [
  { label: "Consultas no mês", valor: "248", delta: "+12,4%", positivo: true },
  { label: "Pacientes únicos", valor: "211", delta: "+8,1%", positivo: true },
  { label: "Valor acumulado", valor: "R$ 14.632", delta: "+15,9%", positivo: true },
  { label: "Ticket médio", valor: "R$ 59,00", delta: "0,0%", positivo: true },
];

// Consultas por dia — últimos 30 dias
export const consultasPorDia: PontoDia[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 3, 19 + i); // 19/abr → 18/mai
  const base = 6 + Math.round(Math.sin(i / 3) * 3) + (i % 7 === 0 || i % 7 === 6 ? -3 : 2);
  return {
    dia: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
    consultas: Math.max(2, base + (i % 5)),
  };
});

export const faturamentoPorMes: FaturamentoMes[] = [
  { mes: "Dez", valor: 9820 },
  { mes: "Jan", valor: 10460 },
  { mes: "Fev", valor: 11240 },
  { mes: "Mar", valor: 12015 },
  { mes: "Abr", valor: 13380 },
  { mes: "Mai", valor: 14632 },
];

export const distribuicaoTipo: FatiaTipo[] = [
  { tipo: "Primeira consulta", valor: 132, cor: PALETA.indigo },
  { tipo: "Retorno", valor: 84, cor: PALETA.esmeralda },
  { tipo: "Urgência", valor: 32, cor: PALETA.ambar },
];

export const topPacientes: PacienteTop[] = [
  { nome: "Maria Almeida", atendimentos: 9 },
  { nome: "José Ferreira", atendimentos: 8 },
  { nome: "Patrícia Lima", atendimentos: 7 },
  { nome: "Roberto Souza", atendimentos: 7 },
  { nome: "Ana Beatriz Costa", atendimentos: 6 },
  { nome: "Carlos Eduardo Dias", atendimentos: 6 },
  { nome: "Fernanda Rocha", atendimentos: 5 },
  { nome: "Lucas Martins", atendimentos: 5 },
  { nome: "Juliana Pereira", atendimentos: 4 },
  { nome: "Marcos Antônio", atendimentos: 4 },
];

export const faturamentoCumulativo: PontoCumulativo[] = (() => {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai"];
  const mensal = [10460, 11240, 12015, 13380, 14632];
  let acc = 0;
  return meses.map((mes, i) => {
    acc += mensal[i];
    return { mes, acumulado: acc };
  });
})();

export const consultasRecentes: ConsultaRecente[] = [
  { data: "18/05 14:32", paciente: "Maria Almeida", tipo: "Primeira consulta", valor: 59, status: "Concluída" },
  { data: "18/05 13:58", paciente: "José Ferreira", tipo: "Retorno", valor: 59, status: "Concluída" },
  { data: "18/05 11:20", paciente: "Patrícia Lima", tipo: "Urgência", valor: 59, status: "Concluída" },
  { data: "18/05 10:05", paciente: "Roberto Souza", tipo: "Primeira consulta", valor: 59, status: "Concluída" },
  { data: "17/05 17:44", paciente: "Ana Beatriz Costa", tipo: "Retorno", valor: 59, status: "Concluída" },
  { data: "17/05 16:10", paciente: "Carlos Eduardo Dias", tipo: "Primeira consulta", valor: 59, status: "No-show" },
  { data: "17/05 15:02", paciente: "Fernanda Rocha", tipo: "Urgência", valor: 59, status: "Concluída" },
  { data: "17/05 09:48", paciente: "Lucas Martins", tipo: "Retorno", valor: 59, status: "Concluída" },
  { data: "16/05 18:21", paciente: "Juliana Pereira", tipo: "Primeira consulta", valor: 59, status: "Cancelada" },
  { data: "16/05 14:33", paciente: "Marcos Antônio", tipo: "Primeira consulta", valor: 59, status: "Concluída" },
  { data: "16/05 12:09", paciente: "Beatriz Nunes", tipo: "Retorno", valor: 59, status: "Concluída" },
  { data: "16/05 10:55", paciente: "Rafael Gomes", tipo: "Urgência", valor: 59, status: "Concluída" },
  { data: "15/05 17:30", paciente: "Camila Ribeiro", tipo: "Primeira consulta", valor: 59, status: "Concluída" },
  { data: "15/05 15:47", paciente: "Diego Fernandes", tipo: "Retorno", valor: 59, status: "Concluída" },
  { data: "15/05 13:12", paciente: "Larissa Mendes", tipo: "Primeira consulta", valor: 59, status: "No-show" },
  { data: "15/05 09:25", paciente: "Thiago Barbosa", tipo: "Urgência", valor: 59, status: "Concluída" },
  { data: "14/05 16:58", paciente: "Vanessa Cardoso", tipo: "Retorno", valor: 59, status: "Concluída" },
  { data: "14/05 14:40", paciente: "Bruno Carvalho", tipo: "Primeira consulta", valor: 59, status: "Concluída" },
  { data: "14/05 11:33", paciente: "Aline Teixeira", tipo: "Primeira consulta", valor: 59, status: "Cancelada" },
  { data: "14/05 10:02", paciente: "Gabriel Moreira", tipo: "Retorno", valor: 59, status: "Concluída" },
];
