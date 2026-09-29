// Aplicação de um template de prontuário (prontuario_templates) sobre o
// prontuário da consulta no cockpit. Módulo puro e sem imports: é usado pelo
// ChartPanel, pelo TemplateEditor (lista de variáveis) e pelos testes
// (`npm test`, Node roda o .ts direto).

export type ProntuarioCampos = {
  chief_complaint: string;
  history_present_illness: string;
  physical_exam: string;
  diagnostic_hypothesis: string;
  cid10_codes: string[];
  conduct: string;
};

export type TemplateAplicavel = {
  chief_complaint_template: string | null;
  history_present_illness_template: string | null;
  physical_exam_template: string | null;
  diagnostic_hypothesis_template: string | null;
  conduct_template: string | null;
  cid10_suggested: string[] | null;
};

export type ContextoTemplate = {
  paciente: {
    full_name: string | null;
    birth_date: string | null;
    cpf: string | null;
  };
  medico: { nome: string | null; especialidade: string | null };
  consulta: { chief_complaint: string | null; started_at: string | null };
  /** Instante da aplicação — usado em {{data}}/{{hora}} sem started_at. */
  agora: Date;
};

// Variáveis suportadas — substituídas no cockpit ao aplicar o template.
export const TEMPLATE_VARS: ReadonlyArray<{ key: string; desc: string }> = [
  { key: "nome_paciente", desc: "Nome completo do paciente" },
  { key: "primeiro_nome", desc: "Primeiro nome do paciente" },
  { key: "idade", desc: "Idade calculada da data de nascimento" },
  { key: "cpf", desc: "CPF mascarado (000.000.000-00)" },
  { key: "data", desc: "Data do atendimento (DD/MM/AAAA)" },
  { key: "hora", desc: "Hora do atendimento (HH:MM)" },
  { key: "medico", desc: "Nome do médico atendendo" },
  { key: "especialidade", desc: "Especialidade do médico" },
  { key: "queixa", desc: "Queixa principal informada" },
];

const CAMPOS: ReadonlyArray<[keyof TemplateAplicavel, Exclude<keyof ProntuarioCampos, "cid10_codes">]> = [
  ["chief_complaint_template", "chief_complaint"],
  ["history_present_illness_template", "history_present_illness"],
  ["physical_exam_template", "physical_exam"],
  ["diagnostic_hypothesis_template", "diagnostic_hypothesis"],
  ["conduct_template", "conduct"],
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function idade(birth: string | null, ref: Date): string {
  if (!birth) return "";
  // "AAAA-MM-DD" como data local (new Date("AAAA-MM-DD") seria UTC).
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birth);
  if (!m) return "";
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let anos = ref.getFullYear() - ano;
  const dm = ref.getMonth() + 1 - mes;
  if (dm < 0 || (dm === 0 && ref.getDate() < dia)) anos--;
  return anos >= 0 ? String(anos) : "";
}

function cpfMascarado(cpf: string | null): string {
  if (!cpf) return "";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function valores(ctx: ContextoTemplate, queixaProntuario: string): Record<string, string> {
  const inicio = ctx.consulta.started_at ? new Date(ctx.consulta.started_at) : null;
  const quando = inicio && !Number.isNaN(inicio.getTime()) ? inicio : ctx.agora;
  const nome = (ctx.paciente.full_name ?? "").trim();
  return {
    nome_paciente: nome,
    primeiro_nome: nome.split(/\s+/)[0] ?? "",
    idade: idade(ctx.paciente.birth_date, quando),
    cpf: cpfMascarado(ctx.paciente.cpf),
    data: `${pad2(quando.getDate())}/${pad2(quando.getMonth() + 1)}/${quando.getFullYear()}`,
    hora: `${pad2(quando.getHours())}:${pad2(quando.getMinutes())}`,
    medico: (ctx.medico.nome ?? "").trim(),
    especialidade: (ctx.medico.especialidade ?? "").trim(),
    queixa: (ctx.consulta.chief_complaint ?? "").trim() || queixaProntuario.trim(),
  };
}

/** Troca `{{var}}` das TEMPLATE_VARS; qualquer outro `{{...}}` fica literal. */
export function substituirVariaveis(
  texto: string,
  ctx: ContextoTemplate,
  queixaProntuario = "",
): string {
  const v = valores(ctx, queixaProntuario);
  return texto.replace(/\{\{(\w+)\}\}/g, (inteiro, chave: string) =>
    Object.prototype.hasOwnProperty.call(v, chave) ? v[chave] : inteiro,
  );
}

/**
 * Devolve o prontuário com o template aplicado (não muta o recebido):
 * campo vazio recebe o texto; campo com texto recebe `texto + "\n\n" + template`;
 * CIDs sugeridos entram normalizados (trim + maiúsculas) sem duplicar.
 */
export function aplicarTemplate(
  atual: ProntuarioCampos,
  template: TemplateAplicavel,
  ctx: ContextoTemplate,
): ProntuarioCampos {
  const next: ProntuarioCampos = { ...atual, cid10_codes: [...atual.cid10_codes] };
  for (const [origem, destino] of CAMPOS) {
    const bruto = template[origem];
    if (typeof bruto !== "string" || !bruto.trim()) continue;
    const texto = substituirVariaveis(bruto, ctx, atual.chief_complaint);
    const existente = atual[destino];
    next[destino] = existente.trim() ? `${existente}\n\n${texto}` : texto;
  }
  for (const c of template.cid10_suggested ?? []) {
    const code = c.trim().toUpperCase();
    if (code && !next.cid10_codes.includes(code)) next.cid10_codes.push(code);
  }
  return next;
}
