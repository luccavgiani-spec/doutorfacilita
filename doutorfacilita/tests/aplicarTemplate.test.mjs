// Testes do módulo puro de aplicação de template no prontuário.
// Rodar: npm test  (node --test; o Node 24 remove os tipos do .ts nativamente)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TEMPLATE_VARS,
  aplicarTemplate,
  substituirVariaveis,
} from "../src/lib/prontuario/aplicarTemplate.ts";

const VAZIO = {
  chief_complaint: "",
  history_present_illness: "",
  physical_exam: "",
  diagnostic_hypothesis: "",
  cid10_codes: [],
  conduct: "",
};

const TEMPLATE = {
  chief_complaint_template: "QP do template",
  history_present_illness_template: "HDA do template",
  physical_exam_template: "EF do template",
  diagnostic_hypothesis_template: "HD do template",
  conduct_template: "Conduta do template",
  cid10_suggested: ["J06.9", "R50.9"],
};

// Atendimento às 14:05 de 07/03/2026 (horário local).
const CTX = {
  paciente: {
    full_name: "Maria Almeida Souza",
    birth_date: "1992-03-15",
    cpf: "12345678901",
  },
  medico: { nome: "Dr. Carlos Mendes", especialidade: "Clínica Geral" },
  consulta: {
    chief_complaint: "Dor de garganta há 2 dias",
    started_at: new Date(2026, 2, 7, 14, 5).toISOString(),
  },
  agora: new Date(2026, 5, 1, 9, 0),
};

test("C3 preenche os 5 campos com os *_template não nulos", () => {
  const r = aplicarTemplate(VAZIO, TEMPLATE, CTX);
  assert.equal(r.chief_complaint, "QP do template");
  assert.equal(r.history_present_illness, "HDA do template");
  assert.equal(r.physical_exam, "EF do template");
  assert.equal(r.diagnostic_hypothesis, "HD do template");
  assert.equal(r.conduct, "Conduta do template");
});

test("C3 campo com *_template nulo ou vazio fica como estava", () => {
  const atual = { ...VAZIO, diagnostic_hypothesis: "minha HD", conduct: "" };
  const r = aplicarTemplate(
    atual,
    { ...TEMPLATE, diagnostic_hypothesis_template: null, conduct_template: "" },
    CTX,
  );
  assert.equal(r.diagnostic_hypothesis, "minha HD");
  assert.equal(r.conduct, "");
});

test("C3 CIDs sugeridos entram sem duplicar os existentes", () => {
  const atual = { ...VAZIO, cid10_codes: ["R50.9", "B34.9"] };
  const r = aplicarTemplate(atual, TEMPLATE, CTX);
  assert.deepEqual(r.cid10_codes, ["R50.9", "B34.9", "J06.9"]);
});

test("C3 CID sugerido em minúsculas/espaço vira o mesmo chip (sem duplicar)", () => {
  const atual = { ...VAZIO, cid10_codes: ["J06.9"] };
  const r = aplicarTemplate(atual, { ...TEMPLATE, cid10_suggested: [" j06.9 ", "r50.9"] }, CTX);
  assert.deepEqual(r.cid10_codes, ["J06.9", "R50.9"]);
});

test("C3 não muta o prontuário recebido", () => {
  const atual = { ...VAZIO, cid10_codes: ["A00"] };
  aplicarTemplate(atual, TEMPLATE, CTX);
  assert.deepEqual(atual, { ...VAZIO, cid10_codes: ["A00"] });
});

test("C4 campo com texto: acrescenta depois de uma linha em branco", () => {
  const atual = { ...VAZIO, history_present_illness: "Texto já digitado" };
  const r = aplicarTemplate(atual, TEMPLATE, CTX);
  assert.equal(r.history_present_illness, "Texto já digitado\n\nHDA do template");
});

test("C4 aplicar duas vezes acrescenta de novo, nunca apaga", () => {
  const uma = aplicarTemplate(VAZIO, TEMPLATE, CTX);
  const duas = aplicarTemplate(uma, TEMPLATE, CTX);
  assert.equal(duas.conduct, "Conduta do template\n\nConduta do template");
  assert.deepEqual(duas.cid10_codes, ["J06.9", "R50.9"]);
});

test("C4 campo só com espaços conta como vazio", () => {
  const r = aplicarTemplate({ ...VAZIO, conduct: "   \n" }, TEMPLATE, CTX);
  assert.equal(r.conduct, "Conduta do template");
});

test("C5 TEMPLATE_VARS são exatamente as 9 do editor", () => {
  assert.deepEqual(
    TEMPLATE_VARS.map((v) => v.key),
    ["nome_paciente", "primeiro_nome", "idade", "cpf", "data", "hora", "medico", "especialidade", "queixa"],
  );
});

const ESPERADO = {
  nome_paciente: "Maria Almeida Souza",
  primeiro_nome: "Maria",
  idade: "33", // 15/03/1992 → 33 anos em 07/03/2026 (antes do aniversário)
  cpf: "123.456.789-01",
  data: "07/03/2026",
  hora: "14:05",
  medico: "Dr. Carlos Mendes",
  especialidade: "Clínica Geral",
  queixa: "Dor de garganta há 2 dias",
};

for (const [k, v] of Object.entries(ESPERADO)) {
  test(`C5 {{${k}}} → ${v}`, () => {
    assert.equal(substituirVariaveis(`[{{${k}}}]`, CTX), `[${v}]`);
  });
}

test("C5 variável fora da lista permanece literal", () => {
  assert.equal(
    substituirVariaveis("a {{desconhecida}} b {{ nome_paciente }} c", CTX),
    "a {{desconhecida}} b {{ nome_paciente }} c",
  );
});

test("C5 substitui todas as ocorrências e em todos os campos aplicados", () => {
  const r = aplicarTemplate(
    VAZIO,
    {
      ...TEMPLATE,
      chief_complaint_template: "{{primeiro_nome}}, {{primeiro_nome}}",
      conduct_template: "Assinado: {{medico}}",
    },
    CTX,
  );
  assert.equal(r.chief_complaint, "Maria, Maria");
  assert.equal(r.conduct, "Assinado: Dr. Carlos Mendes");
});

test("C5 {{queixa}} sem queixa na consulta usa a do prontuário antes de aplicar", () => {
  const ctx = { ...CTX, consulta: { ...CTX.consulta, chief_complaint: null } };
  const r = aplicarTemplate(
    { ...VAZIO, chief_complaint: "Febre" },
    { ...TEMPLATE, conduct_template: "Queixa: {{queixa}}" },
    ctx,
  );
  assert.equal(r.conduct, "Queixa: Febre");
});

test("C5 {{data}}/{{hora}} sem started_at usam o instante da aplicação", () => {
  const ctx = { ...CTX, consulta: { chief_complaint: null, started_at: null } };
  assert.equal(substituirVariaveis("{{data}} {{hora}}", ctx), "01/06/2026 09:00");
});

test("C5 dados ausentes viram texto vazio (nunca 'null'/'undefined')", () => {
  const ctx = {
    paciente: { full_name: null, birth_date: null, cpf: null },
    medico: { nome: "", especialidade: null },
    consulta: { chief_complaint: null, started_at: null },
    agora: CTX.agora,
  };
  assert.equal(
    substituirVariaveis("{{nome_paciente}}|{{primeiro_nome}}|{{idade}}|{{cpf}}|{{especialidade}}|{{queixa}}", ctx),
    "|||||",
  );
});
