"use client";

import { useState, useTransition } from "react";
import {
  type StructuredField,
  type TemplatePayload,
  createTemplate,
  updateTemplate,
} from "@/app/admin/templates/actions";
import { createClient } from "@/lib/supabase/client";

const input =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15";

const EMPTY: TemplatePayload = {
  nome: "",
  especialidade: "",
  descricao: "",
  chief_complaint_template: "",
  history_present_illness_template: "",
  physical_exam_template: "",
  diagnostic_hypothesis_template: "",
  conduct_template: "",
  cid10_suggested: [],
  structured_fields: [],
  attachment_path: null,
  attachment_name: null,
  attachment_mime: null,
};

// Variáveis suportadas — substituídas no cockpit ao aplicar o template.
const TEMPLATE_VARS: Array<{ key: string; desc: string }> = [
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

export default function TemplateEditor({
  id,
  inicial,
}: {
  id?: string;
  inicial?: TemplatePayload;
}) {
  const [t, setT] = useState<TemplatePayload>(inicial ?? EMPTY);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [cidInput, setCidInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Cria URL assinada (1h) pra baixar o anexo já salvo
  async function refreshDownloadUrl() {
    if (!t.attachment_path) {
      setDownloadUrl(null);
      return;
    }
    try {
      const sb = createClient();
      const { data } = await sb.storage
        .from("template-attachments")
        .createSignedUrl(t.attachment_path, 3600);
      setDownloadUrl(data?.signedUrl ?? null);
    } catch {
      setDownloadUrl(null);
    }
  }
  if (t.attachment_path && downloadUrl === null) {
    void refreshDownloadUrl();
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const sb = createClient();
      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${id ?? "draft"}/${Date.now()}-${safeName}`;
      const { error } = await sb.storage
        .from("template-attachments")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || `application/${ext}`,
        });
      if (error) throw error;
      set("attachment_path", path);
      set("attachment_name", file.name);
      set("attachment_mime", file.type || `application/${ext}`);
      setMsg({ ok: true, t: "Anexo enviado. Lembre-se de salvar o template." });
      setDownloadUrl(null); // próxima vez gera nova signed URL
    } catch (err) {
      setMsg({
        ok: false,
        t: `Erro no upload: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAttachment() {
    if (!t.attachment_path) return;
    try {
      const sb = createClient();
      await sb.storage.from("template-attachments").remove([t.attachment_path]);
    } catch {
      /* segue: zera localmente mesmo se o delete falhar */
    }
    set("attachment_path", null);
    set("attachment_name", null);
    set("attachment_mime", null);
    setDownloadUrl(null);
  }

  function set<K extends keyof TemplatePayload>(k: K, v: TemplatePayload[K]) {
    setT((p) => ({ ...p, [k]: v }));
  }

  function addField() {
    set("structured_fields", [
      ...t.structured_fields,
      { key: `campo_${t.structured_fields.length + 1}`, label: "", type: "texto" },
    ]);
  }
  function updField(i: number, patch: Partial<StructuredField>) {
    const arr = [...t.structured_fields];
    arr[i] = { ...arr[i], ...patch };
    set("structured_fields", arr);
  }
  function rmField(i: number) {
    set(
      "structured_fields",
      t.structured_fields.filter((_, j) => j !== i),
    );
  }
  function addCid() {
    const v = cidInput.trim();
    if (v && !t.cid10_suggested.includes(v)) {
      set("cid10_suggested", [...t.cid10_suggested, v]);
    }
    setCidInput("");
  }

  function salvar() {
    setMsg(null);
    start(async () => {
      const r = id
        ? await updateTemplate(id, t)
        : await createTemplate(t); // createTemplate redireciona em sucesso
      if (r && !r.ok) setMsg({ ok: false, t: `Erro: ${r.error}` });
      else if (r && r.ok) setMsg({ ok: true, t: "Salvo." });
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── Form ── */}
      <div className="flex flex-col gap-4">
        <Field label="Nome">
          <input className={input} value={t.nome} onChange={(e) => set("nome", e.target.value)} />
        </Field>
        <Field label="Especialidade">
          <input className={input} value={t.especialidade} onChange={(e) => set("especialidade", e.target.value)} />
        </Field>
        <Field label="Descrição">
          <input className={input} value={t.descricao} onChange={(e) => set("descricao", e.target.value)} />
        </Field>

        <Sec titulo="Anexo de referência (Word/PDF)">
          <p className="text-xs text-txt-2">
            Anexo opcional como base. O texto editável que o médico vai ver é o
            dos <b>campos SOAP</b> abaixo — o arquivo fica disponível pra
            consulta/cópia.
          </p>
          {t.attachment_path ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-bg-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  📎 {t.attachment_name ?? "anexo"}
                </div>
                <div className="text-[11px] text-txt-3">
                  {t.attachment_mime ?? "tipo desconhecido"}
                </div>
              </div>
              <div className="flex gap-2">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs font-semibold text-blue hover:underline"
                  >
                    abrir
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="text-xs font-semibold text-red hover:underline"
                >
                  remover
                </button>
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-bg-3 px-3 py-4 text-xs font-semibold text-txt-2 hover:bg-bg-4">
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f);
                  e.currentTarget.value = "";
                }}
              />
              {uploading ? "Enviando…" : "📎 Anexar PDF ou Word"}
            </label>
          )}
        </Sec>

        <Sec titulo="Variáveis dinâmicas">
          <p className="text-xs text-txt-2">
            Use <code className="rounded bg-bg-3 px-1">{"{{variavel}}"}</code> dentro
            de qualquer campo SOAP. No cockpit, o médico pode editar o resultado
            antes de salvar.
          </p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARS.map((v) => (
              <button
                key={v.key}
                type="button"
                title={v.desc}
                onClick={() => navigator.clipboard?.writeText(`{{${v.key}}}`)}
                className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-semibold text-blue-d hover:bg-blue-l"
              >
                <code>{`{{${v.key}}}`}</code>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-txt-3">
            Clique numa variável pra copiar e cole onde quiser usar.
          </p>
        </Sec>

        <Sec titulo="Campos SOAP (pré-preenchimento)">
          <Ta label="Queixa principal" v={t.chief_complaint_template} on={(v) => set("chief_complaint_template", v)} />
          <Ta label="História da doença atual" v={t.history_present_illness_template} on={(v) => set("history_present_illness_template", v)} />
          <Ta label="Exame físico" v={t.physical_exam_template} on={(v) => set("physical_exam_template", v)} />
          <Ta label="Hipótese diagnóstica" v={t.diagnostic_hypothesis_template} on={(v) => set("diagnostic_hypothesis_template", v)} />
          <Ta label="Conduta" v={t.conduct_template} on={(v) => set("conduct_template", v)} />
        </Sec>

        <Sec titulo="CID-10 sugeridos">
          <div className="flex flex-wrap gap-2">
            {t.cid10_suggested.map((c) => (
              <span key={c} className="flex items-center gap-1 rounded-full bg-blue-l px-2.5 py-1 text-xs font-semibold text-blue">
                {c}
                <button type="button" onClick={() => set("cid10_suggested", t.cid10_suggested.filter((x) => x !== c))}>×</button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className={input}
              value={cidInput}
              onChange={(e) => setCidInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCid())}
              placeholder="Ex.: J02.9"
            />
            <button type="button" onClick={addCid} className="rounded-lg border border-border px-3 text-sm font-semibold hover:bg-bg-3">
              +
            </button>
          </div>
        </Sec>

        <Sec titulo="Campos extras (structured_data)">
          {t.structured_fields.map((f, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="grid grid-cols-2 gap-2">
                <input className={input} placeholder="key" value={f.key} onChange={(e) => updField(i, { key: e.target.value })} />
                <input className={input} placeholder="label" value={f.label} onChange={(e) => updField(i, { label: e.target.value })} />
                <select className={input} value={f.type} onChange={(e) => updField(i, { type: e.target.value as StructuredField["type"] })}>
                  <option value="texto">texto</option>
                  <option value="numero">número</option>
                  <option value="select">select</option>
                  <option value="textarea">textarea</option>
                  <option value="checkbox">checkbox</option>
                </select>
                {f.type === "select" && (
                  <input
                    className={input}
                    placeholder="opções (vírgula)"
                    value={(f.options ?? []).join(",")}
                    onChange={(e) => updField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-txt-2">
                  <input type="checkbox" checked={!!f.required} onChange={(e) => updField(i, { required: e.target.checked })} />
                  obrigatório
                </label>
                <button type="button" onClick={() => rmField(i)} className="text-xs font-semibold text-red">
                  remover
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addField} className="rounded-lg border border-dashed border-border px-3 py-2 text-sm font-semibold text-txt-2 hover:bg-bg-3">
            + adicionar campo
          </button>
        </Sec>

        <div className="flex items-center gap-4">
          <button type="button" onClick={salvar} disabled={pending} className="rounded-lg bg-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-d disabled:opacity-60">
            {pending ? "Salvando…" : id ? "Salvar alterações" : "Criar template"}
          </button>
          {msg && <span className={`text-sm font-medium ${msg.ok ? "text-green" : "text-red"}`}>{msg.t}</span>}
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="rounded-xl border border-border bg-white p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-txt-3">
          Preview — como renderiza no cockpit
        </p>
        <h3 className="text-base font-bold">{t.nome || "Template sem nome"}</h3>
        <p className="mb-4 text-xs text-txt-2">{t.especialidade || "—"}</p>
        <Prev label="Queixa principal" v={t.chief_complaint_template} />
        <Prev label="História da doença atual" v={t.history_present_illness_template} />
        <Prev label="Exame físico" v={t.physical_exam_template} />
        <Prev label="Hipótese diagnóstica" v={t.diagnostic_hypothesis_template} />
        <Prev label="Conduta" v={t.conduct_template} />
        {t.structured_fields.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-txt-3">Campos extras</p>
            {t.structured_fields.map((f, i) => (
              <p key={i} className="mt-1 text-sm">
                <span className="text-txt-2">{f.label || f.key}</span>{" "}
                <span className="text-txt-3">({f.type}{f.required ? ", obrigatório" : ""})</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-txt-2">{label}</span>
      {children}
    </label>
  );
}
function Sec({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-txt-2">{titulo}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
function Ta({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-txt-2">{label}</span>
      <textarea className={`${input} min-h-[60px] resize-y`} value={v} onChange={(e) => on(e.target.value)} />
    </label>
  );
}
function Prev({ label, v }: { label: string; v: string }) {
  if (!v) return null;
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-txt-3">{label}</p>
      <p className="whitespace-pre-wrap text-sm">{v}</p>
    </div>
  );
}
